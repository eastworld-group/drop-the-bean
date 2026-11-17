"use strict";
/* ==================================================================
   DROP THE BEAN - self-test. One tap checks a whole update:
   - every level is replayed from its stored solution (tools/solutions.json)
   - the level data is checked for mistakes
   - every screen and pop-up card is drawn at five screen sizes, with an
     empty save and a full save, with Calm motion off and on
   - backup codes are made, read back, damaged and restored
   - every sound file the game names is fetched
   The real game files run inside a hidden frame. Before any of them runs, the frame's
   saved data is swapped for an in-memory stand-in, sound is switched off, the service
   worker is not registered, and the game's own animation loop is never started: each
   frame is driven from here with the game's update(dt) and render().
=================================================================== */
(() => {
  const ROOT = new URL("../", location.href).href;        // the game's folder (works on GitHub Pages and locally)
  const RUN_ID = Date.now().toString(36);                  // makes the browser fetch fresh copies of the game files
  const $ = id => document.getElementById(id);

  // Sizes to draw at: [width, height, name, notch and home bar of that phone]
  const SIZES = [
    [375, 812, "iPhone 11 Pro size", { t: 47, b: 34 }],
    [390, 844, "iPhone 14 size", { t: 47, b: 34 }],
    [320, 480, "small old phone", { t: 20, b: 0 }],
    [667, 375, "phone on its side", { t: 0, b: 0 }],
    [1280, 600, "computer window", { t: 0, b: 0 }],
  ];

  // Hooks for checking the checker (used only by hand, from the browser's console):
  // selfTest.hooks.solutions = sol => sol      changes the solutions before they are used
  // selfTest.hooks.gameLoaded = (win, phase) => {}   runs each time the game is loaded into the frame
  const selfTest = window.selfTest = { hooks: {} };

  /* ---------- small helpers ---------- */
  // Let the page breathe between chunks of work. A message is not slowed down in a background tab.
  const channel = new MessageChannel(), waiting = [];
  channel.port1.onmessage = () => { const fn = waiting.shift(); if (fn) fn(); };
  const breathe = () => new Promise(resolve => { waiting.push(resolve); channel.port2.postMessage(0); });
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
  const fresh = url => url + (url.includes("?") ? "&" : "?") + "selftest=" + RUN_ID;
  const plural = (n, one, many) => n.toLocaleString("en-US") + " " + (n === 1 ? one : many || one + "s");
  // A short, plain reason from an error: its message and where in the game it happened.
  function describe(e) {
    if (e === null || e === undefined) return "unknown error";
    if (typeof e !== "object") return String(e);
    let where = "";
    for (const m of String(e.stack || "").matchAll(/\/((?:js\/)?[\w.-]+\.js)(?:\?[^:)\s]*)?:(\d+):\d+/g)) {
      if (/selftest\.js/.test(m[1])) continue;                // the first place in the game itself, not in this test
      where = " (at " + m[1] + " line " + m[2] + ")"; break;
    }
    return (e.name && e.name !== "Error" ? e.name + ": " : "") + (e.message || String(e)) + where;
  }

  async function getText(path) {
    const res = await fetch(fresh(ROOT + path), { cache: "no-store" });
    if (!res.ok) throw new Error("could not fetch " + path + " (status " + res.status + ")");
    return res.text();
  }

  // An in-memory stand-in for localStorage. The game reads and writes this one instead.
  function memoryStorage() {
    const data = new Map();
    return {
      get length() { return data.size; },
      key: i => Array.from(data.keys())[i] ?? null,
      getItem: k => (data.has(String(k)) ? data.get(String(k)) : null),
      setItem: (k, v) => { data.set(String(k), String(v)); },
      removeItem: k => { data.delete(String(k)); },
      clear: () => data.clear(),
    };
  }

  /* ---------- the player's real save: kept safe ---------- */
  let saveKeyPrefix = "dropthebean";
  function realSaveSnapshot() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(saveKeyPrefix)) out[k] = localStorage.getItem(k);
      }
    } catch (e) { /* storage blocked: nothing to protect */ }
    return out;
  }
  // The game in the test frame only ever sees the stand-in. As a second lock, any write that still
  // reaches the real storage from inside the frame is refused and counted here.
  let realBefore = null, blockedWrites = [];
  function changedKeys() {
    if (!realBefore) return [];
    const now = realSaveSnapshot();
    return Array.from(new Set(Object.keys(realBefore).concat(Object.keys(now)))).filter(k => realBefore[k] !== now[k]);
  }

  /* ---------- results ---------- */
  const GROUPS = [
    ["levels", "Every level replayed"],
    ["guides", "Teaching levels"],
    ["data", "Level data"],
    ["screens", "Screens and cards drawn"],
    ["codes", "Backup codes"],
    ["sounds", "Sound files"],
    ["safety", "Hidden and safe"],
  ];
  let results = [], planned = 0, done = 0, failed = 0, running = false, startedAt = 0, finishedIn = 0, foundNote = "";
  function record(group, name, reason) {
    results.push({ group, name, ok: !reason, reason: reason || "" });
    done++; if (reason) failed++;
    tickUI();
  }
  let lastUI = 0;
  function tickUI(force) {
    const now = performance.now();
    if (!force && now - lastUI < 120) return;
    lastUI = now;
    $("barFill").style.width = (planned ? Math.min(100, (done / planned) * 100) : 0).toFixed(1) + "%";
    $("count").textContent = plural(done, "check") + " done of about " + planned.toLocaleString("en-US") + (failed ? ", " + failed + " failed" : ", none failed");
  }
  const say = text => { $("now").textContent = text; };

  /* ---------- the game inside a hidden frame ---------- */
  let game = null, frameHTML = "", gameTags = "";
  function showStage(w, h, label) {
    const box = $("stageBox"), stage = $("stage");
    const k = Math.min(1, 300 / w, 220 / h);
    box.style.width = Math.round(w * k) + "px"; box.style.height = Math.round(h * k) + "px";
    stage.style.transform = `scale(${k})`;
    $("stageLabel").textContent = label || (w + " x " + h);
  }
  function closeGame() {
    if (game && game.fr) game.fr.remove();
    game = null;
  }
  // Load the real game into a fresh frame of this size. Resolves with helpers to drive it.
  async function openGame(w, h, phase) {
    closeGame();
    const fr = document.createElement("iframe");
    fr.title = "Game being tested"; fr.tabIndex = -1; fr.setAttribute("aria-hidden", "true");
    fr.style.width = w + "px"; fr.style.height = h + "px";
    $("stage").appendChild(fr);
    showStage(w, h);
    const store = memoryStorage();
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("the game did not finish loading in 30 seconds")), 30000);
      window.__selftestReady = win => { clearTimeout(timer); resolve(win); };
      window.__selftestFail = msg => { clearTimeout(timer); reject(new Error(msg)); };
    });
    // Runs inside the frame before any game file. Returns false (and nothing of the game loads) if
    // the stand-in save could not be put in place.
    window.__selftestPrepare = win => {
      try {
        Object.defineProperty(win, "localStorage", { configurable: true, get: () => store });
        Object.defineProperty(win, "sessionStorage", { configurable: true, get: () => store });
        if (win.localStorage !== store) return false;
        const proto = win.Storage && win.Storage.prototype;      // the real storage: writes are refused
        if (proto) for (const m of ["setItem", "removeItem", "clear"]) {
          const orig = proto[m];
          proto[m] = function (...args) {
            blockedWrites.push(m + "(" + String(args[0] || "") + ")");
            if (this === store) return orig.apply(this, args);
          };
        }
      } catch (e) { return false; }
      win.__errors = [];
      win.addEventListener("error", e => { win.__errors.push(describe(e.error || e.message)); });
      win.addEventListener("unhandledrejection", e => { win.__errors.push("unhandled promise: " + describe(e.reason)); });
      win.requestAnimationFrame = () => 0;                     // the game's own loop never starts
      win.cancelAnimationFrame = () => {};
      win.AudioContext = undefined; win.webkitAudioContext = undefined;   // no sound at all
      try { win.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; } catch (e) { /* fine */ }
      const quiet = () => Promise.resolve(false);
      try { Object.defineProperty(win.navigator, "serviceWorker", { configurable: true, value: { register: quiet, getRegistrations: () => Promise.resolve([]), addEventListener() {} } }); } catch (e) { /* fine */ }
      try { Object.defineProperty(win.navigator, "storage", { configurable: true, value: { persist: quiet, persisted: quiet } }); } catch (e) { /* fine */ }
      try { Object.defineProperty(win.navigator, "share", { configurable: true, value: undefined }); } catch (e) { /* fine */ }
      return true;
    };
    window.__selftestTags = gameTags;
    const doc = fr.contentDocument;
    doc.open(); doc.write(frameHTML); doc.close();
    const win = await ready;
    const g = { fr, win, store, w, h, bad: null };
    g.ev = code => win.eval(code);                             // runs code in the game's own global scope
    if (win.__errors.length) throw new Error("the game had an error while loading: " + win.__errors[0]);
    g.lib = g.ev("({" + Object.values(LIB).map(fn => fn.toString()).join(",\n") + "})");
    watchNumbers(g);
    game = g;
    if (selfTest.hooks.gameLoaded) selfTest.hooks.gameLoaded(win, phase);
    return g;
  }
  // Change the frame's size and tell the game, like turning or resizing a phone.
  function setSize(g, w, h, safe, label) {
    g.fr.style.width = w + "px"; g.fr.style.height = h + "px"; g.w = w; g.h = h;
    showStage(w, h, label);
    g.win.__safe = safe || { t: 0, b: 0 };
    g.ev("safeArea = function () { return window.__safe; }");  // pretend there is a notch and a home bar
    g.ev("resize()");
    if (g.ev("W") !== w || g.ev("H") !== h) {                   // the frame had not caught up yet: set it by hand
      g.ev(`W = ${w}; H = ${h}; cv.width = ${w}; cv.height = ${h}; ctx.setTransform(1, 0, 0, 1, 0, 0); layout();`);
    }
  }
  // Canvas drawing quietly ignores broken numbers (NaN), so a layout mistake would draw nothing
  // and nobody would notice. Note the first one, and where it came from.
  function watchNumbers(g) {
    const ctx = g.ev("ctx");
    for (const m of ["fillRect", "strokeRect", "clearRect", "rect", "roundRect", "moveTo", "lineTo", "arc", "arcTo", "ellipse",
      "quadraticCurveTo", "bezierCurveTo", "translate", "scale", "rotate", "fillText", "strokeText", "drawImage", "setTransform", "transform"]) {
      const orig = ctx[m];
      if (typeof orig !== "function") continue;
      ctx[m] = function (...args) {
        if (!g.bad) for (const v of args) {
          if (typeof v === "number" && !Number.isFinite(v)) {
            g.bad = m + "(" + args.map(a => (typeof a === "number" ? String(Math.round(a * 10) / 10) : typeof a)).join(", ") + ")" + (describe(new Error("")).replace(/^.*?(\(at|$)/, " $1"));
            break;
          }
        }
        return orig.apply(this, args);
      };
    }
  }
  // Run one drawing check. Returns null if all went well, or the reason it failed.
  function attempt(g, fn) {
    g.bad = null; g.win.__errors.length = 0;
    let reason = null;
    try { const r = fn(); if (typeof r === "string" && r) reason = r; } catch (e) { reason = describe(e); }
    if (!reason && g.win.__errors.length) reason = g.win.__errors[0];
    if (!reason && g.bad) reason = "drew with a broken number: " + g.bad;
    if (reason) { try { g.ev("resize()"); } catch (e) { /* the next check will say */ } }   // reset the drawing state, like the game does
    return reason;
  }

  /* ==================================================================
     LIB: little helpers that run INSIDE the game's frame. Each one is copied into
     the frame as text, so it can use the game's own names (S, screen, go, ...).
  =================================================================== */
  const LIB = {
    frames(n, dt) {
      dt = dt || 1 / 60;
      for (let i = 0; i < n; i++) {
        time += dt; if (typeof frameNo === "number") frameNo++; update(dt); render();
        if (overlay && !(overlay.delay > 0)) (window.__kindsDrawn = window.__kindsDrawn || new Set()).add(overlay.kind);   // which cards really got drawn
      }
    },
    tag(e, where) {
      if (!e || typeof e !== "object") e = new Error(String(e));
      try { e.message = where + ": " + e.message; } catch (x) { /* read-only: keep it as it is */ }
      return e;
    },
    step(where, fn) { try { fn(); } catch (e) { throw this.tag(e, where); } },
    // Start from this save, quiet, with nothing open. The save goes in through the game's own
    // loadSave(), the way a real (maybe older) save does, so new fields get filled in.
    reset(json, calm) {
      localStorage.setItem(SAVE_KEY, json); S = loadSave();
      S.sound = false; S.music = false; S.calm = !!calm;
      overlay = null; toastMsg = null; paused = false; aim = null; thinking = null; drag = null; press = null;
      stuck = false; stuckJob = null; hinting = false; chapDrag = null; chapVel = 0; page = -1; fade = 0;
      roomSig = ""; screen = "home"; layout();
    },
    emptySave() { return JSON.stringify(freshSave()); },
    // A save with everything: 3 stars and a paw stamp on every level, lots of coins, every cat,
    // hat, neck thing and room thing, and most notes and chests.
    fullSave() {
      const f = freshSave(), chapters = Math.ceil(LEVELS.length / CHAPTER_SIZE);
      f.setup = true; f.player = "Liza";
      for (let i = 0; i < LEVELS.length; i++) { f.stars[i] = 3; f.perfect[i] = 1; }
      f.coins = 54321;
      for (const p of POWERUPS) f.pu[p.id] = 12;
      f.hammerGot = true;
      f.hero = HEROES.includes("a") ? "a" : HEROES[HEROES.length - 1];
      f.cats = HEROES.filter(k => CAT_STARS[k] > 0);
      f.names = { k: "Bean Bean" }; f.names[f.hero] = "Mochi";
      f.hats = HATS.map(h => h.id); f.hat = f.hats[f.hats.length - 1] || "";
      f.necks = NECKS.map(q => q.id); f.neck = f.necks[f.necks.length - 1] || "";
      f.room = { own: ROOM_ITEMS.filter(it => it.price > 0).map(it => it.id), put: {} };
      for (const spot of ALL_SPOTS) { const list = ROOM_ITEMS.filter(it => it.spot === spot); if (list.length) f.room.put[spot] = list[list.length - 1].id; }
      f.notes = []; f.chests = [];
      for (let n = 0; n < chapters; n++) { if (n < chapters - 1) f.notes.push(n); if (n % 2 === 0) f.chests.push(n); }
      f.daily = { last: todayKey(), streak: 12 };
      f.gift = { last: "", day: 6, weeks: 3 };
      f.stats = { cats: 98765, time: 200000, best: 40, gifts: 77 };
      f.saved = { at: Date.now() - 3 * 86400000, levels: LEVELS.length - 30, reminded: "" };
      f.track = Math.max(0, TRACK_FILES.length - 1); f.meow = MEOW_COUNT - 1; f.timer = true; f.shapes = true;
      return JSON.stringify(f);
    },

    /* ----- levels ----- */
    // A card that pops up as a level starts (like "A new twist!"): do what she does, and tap its
    // button once the short no-double-tap wait is over. A card with more choices is set aside.
    closeStartCard() {
      for (let tries = 0; tries < 3 && overlay && screen === "game" && catsLeft; tries++) {
        time += 1; this.frames(1);
        if (overlay && buttons.length === 1) buttons[0].onTap(); else overlay = null;
      }
      paused = false;
    },
    // Replay one stored solution with the game's own rules. Returns null, or what went wrong.
    replay(i, steps, draw) {
      const way = (dr, dc) => (dr < 0 ? "up" : dr > 0 ? "down" : dc < 0 ? "left" : "right");
      startLevel(i);
      if (draw) render();
      this.closeStartCard();
      for (let k = 0; k < steps.length; k++) {
        const [id, dr, dc] = steps[k], bed = beds.find(b => b.id === id);
        if (!bed) return `step ${k + 1} of ${steps.length}: bed ${id} is not on the board any more`;
        if (!doStep(bed, dr, dc)) return `step ${k + 1} of ${steps.length}: bed ${id} can't slide ${way(dr, dc)}`;
      }
      if (beds.length) return `${beds.length} bed${beds.length > 1 ? "s" : ""} left after the last step`;
      if (catsLeft) return `${catsLeft} cat${catsLeft > 1 ? "s" : ""} still on the floor after the last step`;
      if (!overlay || overlay.kind !== "win") return "no win card after the last step";
      if (!S.stars[i]) return "the win did not give any stars";
      if (draw) { update(LEAVE + 0.2); this.frames(1); this.frames(1, 1); }
      return null;
    },
    // The finger demo on a teaching level must only show moves the game allows.
    guide(i) {
      startLevel(i); this.closeStartCard();
      const runs = LEVELS[i].guide || [];
      let n = 0;
      for (const g of runs) for (const [dr, dc] of g.path) {
        n++;
        const bed = beds.find(b => b.id === g.bed);
        if (!bed) return `move ${n}: bed ${g.bed} is not on the board`;
        if (!doStep(bed, dr, dc)) return `move ${n}: bed ${g.bed} can't slide that way`;
      }
      return null;
    },
    hintWords(key) { const v = t(key); return Array.isArray(v) ? v.length : typeof v === "string" && v !== key ? 1 : 0; },

    /* ----- screens ----- */
    home() {
      const pages = Math.ceil(LEVELS.length / CHAPTER_SIZE);
      go("home"); this.frames(2);
      for (let p = 0; p < pages; p++) this.step("chapter page " + (p + 1), () => { page = p; this.frames(1); });
      page = -1; this.frames(1, 1);
    },
    mycat(tab) { catTab = tab; go("mycat"); this.frames(3); this.frames(1, 1); },
    backup(showIt) {
      openBackup(); this.frames(2);
      if (showIt) { showCode = true; codeBox.value = makeCode(); this.frames(2); }
    },
    room(view, giftReady) {
      S.roomView = view; S.gift.last = giftReady ? "" : todayKey(); roomSig = "";
      go("room"); this.frames(3); this.frames(6, 0.5);
    },
    chapters() {
      openChapters(); this.frames(2);
      chapScroll = 0; this.frames(1);
      chapScroll = 1e9; this.frames(1);
      chapVel = -4000; this.frames(4, 0.05);
    },
    album(tab) { openAlbum(); albumTab = tab; albumPage = 0; this.frames(2); albumPage = 99; this.frames(1); },
    shop() { go("shop"); this.frames(3); },
    anyScreen(name) { go(name); this.frames(3); },

    /* ----- pop-up cards ----- */
    settings() { go("home"); overlay = { kind: "settings", t: 1, delay: 0 }; this.frames(2); },
    choose(what) {
      go("home");
      overlay = { kind: "choose", what, t: 1, delay: 0, at: time - 1, prev: { kind: "settings", t: 1, delay: 0 } };
      this.frames(2);
    },
    buy() {
      go("shop");
      const things = POWERUPS.map(p => ["pu", p.id, p.price, t("pu_" + p.id)])
        .concat(HATS.map(h => ["hat", h.id, h.price, t("hat_" + h.id)]), NECKS.map(q => ["neck", q.id, q.price, t("neck_" + q.id)]));
      ROOMS.forEach((R, i) => {
        const it = ROOM_ITEMS.filter(q => q.price > 0 && R.spots.includes(q.spot)).pop();
        if (it) things.push(["room", it.id, it.price, t("ri_" + it.id)]);
      });
      for (const [kind, id, price, name] of things) this.step("buying " + kind + " " + id, () => {
        overlay = { kind: "buy", t: 1, delay: 0, at: time - 1, item: { name, price, pic: [kind, id] }, onYes() {}, prev: null };
        this.frames(1);
      });
    },
    note() {
      openAlbum(); albumTab = "notes";
      const chapters = Math.ceil(LEVELS.length / CHAPTER_SIZE);
      for (const n of [0, 1, chapters - 1, MAX_CHAPTERS - 1]) this.step("note " + (n + 1), () => {
        openNote(n); this.frames(1); this.frames(1, 1);
      });
    },
    loadsave() {
      openBackup();
      const got = readCode(makeCode());
      if (!got) throw new Error("the game could not read its own backup code");
      overlay = { kind: "loadsave", t: 0, delay: 0, at: time - 1, got };
      this.frames(2);
    },
    chest() {
      openChapters();
      for (const item of [["hat", HATS[0].id], ["neck", NECKS[0].id], null]) this.step("chest with " + (item ? item.join(" ") : "coins only"), () => {
        overlay = { kind: "chest", t: 0, delay: 0, at: time - 1, n: 0, coins: item ? CHEST_COINS : CHEST_COINS + CHEST_EXTRA, item };
        this.frames(1); this.frames(1, 1);
      });
    },
    gift() {
      go("room");
      const item = ROOM_ITEMS.find(it => it.price > 0).id;
      const gifts = [[1, { coins: 40, pu: "", item: "" }], [3, { coins: 0, pu: "hint", item: "" }], [5, { coins: 0, pu: "", item }], [7, { coins: 150, pu: "treat", item }]];
      for (const [day, got] of gifts) this.step("gift on day " + day, () => {
        overlay = { kind: "gift", t: 0, delay: 0, at: time - 1, day, key: S.hero, got };
        this.frames(1); this.frames(1, 1);
      });
    },
    calendar() {
      go("room");
      for (let d = 0; d <= 7; d++) for (const ready of [true, false]) this.step("gift week day " + d + (ready ? ", gift waiting" : ""), () => {
        S.gift.day = d; S.gift.last = ready ? "" : todayKey();
        overlay = { kind: "calendar", t: 1, delay: 0, at: time - 1 };
        this.frames(1);
      });
    },
    roompick() {
      for (const spot of ALL_SPOTS) this.step("picker for " + spot, () => {
        S.roomView = roomOfSpot(spot); roomSig = ""; go("room");
        openPicker(spot); this.frames(1);
      });
    },
    anyCard(kind) { go("home"); overlay = { kind, t: 1, delay: 0, at: time - 1 }; this.frames(2); },
    // The win card in every mood: first win, chapter end with confetti, golden, a note, a gift, a new cat, a new room, daily.
    winCards(i, steps) {
      const why = this.replay(i, steps, false);
      if (why) throw new Error("level " + (i + 1) + " did not win: " + why);
      update(LEAVE + 0.2); this.frames(2);
      const base = Object.assign({}, overlay);
      const moods = [["plain", {}], ["confetti", { party: true }], ["golden", { golden: true }], ["love note", { note: 0 }],
        ["gift", { gift: POWERUPS[0].id }], ["new cat", { unlocked: HEROES[2] }], ["new room", { room: 1 }], ["daily", { daily: true }],
        ["perfect", { perfect: true }], ["everything", { party: true, golden: true, note: 0, gift: POWERUPS[1].id, unlocked: HEROES[3], room: 2, daily: true, perfect: true }]];
      for (const [name, extra] of moods) this.step("win card, " + name, () => {
        if (extra.party && !S.calm) throwConfetti();
        overlay = Object.assign({}, base, extra, { delay: 0, t: 0, rang: true });
        this.frames(2); this.frames(1, 0.5); this.frames(1, 2);
      });
      this.step("win card, relaxed mode", () => { S.timer = false; overlay = Object.assign({}, base, { delay: 0, t: 0, rang: true }); this.frames(2); S.timer = true; });
      this.step("win card, daily nap", () => { isDaily = true; overlay = Object.assign({}, base, { delay: 0, t: 0, rang: true, daily: true }); this.frames(2); isDaily = false; });
    },
    // A level in all its moments: starting, a toast, a bed held, half done, undo, the finger,
    // each powerup being aimed, a hint thinking, stuck, paused, time's up, and the win card.
    gameStates(i, steps) {
      this.step("start", () => { startLevel(i); this.frames(2); this.frames(1, 2); this.closeStartCard(); this.frames(1); });
      this.step("a message showing", () => { toast(t("bed_wait")); this.frames(1); });
      this.step("holding a bed", () => {
        const b = beds[0];
        drag = { bed: b, offX: 0, offY: 0, snap: snapshot(), saved: false }; b.popT = time; this.frames(2); drag = null;
      });
      const half = Math.floor(steps.length / 2);
      this.step("half way through", () => {
        undoStack.push(snapshot());
        for (let k = 0; k < half; k++) {
          const [id, dr, dc] = steps[k], bed = beds.find(b => b.id === id);
          if (!bed || !doStep(bed, dr, dc)) throw new Error("the stored solution did not play (move " + (k + 1) + ")");
          if (k % 3 === 0) this.frames(1);
        }
        this.frames(2); this.frames(1, 0.3);
      });
      this.step("the finger showing the next moves", () => {
        setGuide(runsOf(steps.slice(half, half + 4))); hinting = true; this.frames(3); hinting = false; guideRuns = [];
      });
      this.step("aiming a Hint", () => { aim = "hint"; this.frames(2); aim = null; });
      this.step("aiming a Treat", () => { aim = "treat"; this.frames(2); aim = null; });
      this.step("aiming a Hammer at a hole", () => {
        outer: for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (creaky[r][c] === 1 && !bedAtCell(r, c, null)) { creaky[r][c] = 2; holeT[r * cols + c] = time; break outer; }
        aim = "hammer"; this.frames(2); aim = null;
      });
      this.step("a hint thinking", () => { if (beds.length) { startHint(beds[0]); this.frames(3); thinking = null; } });
      this.step("stuck", () => { stuck = true; this.frames(2); stuck = false; });
      this.step("undo", () => { undo(); this.frames(2); });
      this.step("pause card", () => { paused = true; overlay = { kind: "pause", t: 0, delay: 0 }; this.frames(2); overlay = null; paused = false; });
      this.step("time's up card", () => { timerOn = true; timeLeft = 0.01; this.frames(1); if (!overlay) finish("lose", 0); this.frames(2); this.frames(1, 1); this.frames(1, 0.5); });
      this.step("win card", () => {
        const why = this.replay(i, steps, false);
        if (why) throw new Error(why);
        this.frames(3); update(LEAVE + 0.2); this.frames(2); this.frames(1, 1); this.frames(1, 2);
      });
    },
    daily(steps) {
      const i = dailyIndex();
      startLevel(i, true); this.frames(2); this.closeStartCard();
      if (steps) {
        for (const [id, dr, dc] of steps) { const bed = beds.find(b => b.id === id); if (bed) doStep(bed, dr, dc); }
        update(LEAVE + 0.2); this.frames(2); this.frames(1, 1);
      }
      return i;
    },

    /* ----- backup codes ----- */
    roundTrip() {
      const code = makeCode(), got = readCode(code);
      if (!got) return { err: "a fresh code could not be read back" };
      const keep = S; S = got;
      const again = makeCode(); S = keep;
      return { code, again, stars: Object.keys(got.stars).length, want: Object.keys(S.stars).length, coins: got.coins, wantCoins: S.coins };
    },
    read(code) { const got = readCode(code); return got ? JSON.stringify(got) : null; },
    restore(code) {
      const got = readCode(code);
      if (!got) return null;
      useSave(got); S.sound = false; S.music = false;
      this.frames(2); this.frames(1, 2.5);
      return JSON.stringify({ screen, S });
    },
  };

  /* ==================================================================
     THE RUN
  =================================================================== */
  async function runAll() {
    running = true; results = []; done = 0; failed = 0; planned = 0; startedAt = performance.now(); foundNote = "";
    $("run").disabled = true; $("run").textContent = "Testing...";
    say("Starting"); tickUI(true);
    $("summary").className = "card"; $("summary").innerHTML = "";
    $("progress").style.display = "block"; $("results").style.display = "none"; $("stageWrap").style.display = "block";
    realBefore = realSaveSnapshot(); blockedWrites = [];
    try {
      await everything();
    } catch (e) {
      record("safety", "The test itself ran to the end", "stopped early: " + describe(e));
    } finally {
      closeGame();
      record("safety", "The game in the test never wrote to the real save", blockedWrites.length ? "it tried " + plural(blockedWrites.length, "time") + " (each one refused): " + blockedWrites.slice(0, 3).join(", ") : null);
      const changed = changedKeys();
      if (!changed.length) record("safety", "Your real save on this phone is exactly as it was", null);
      else if (!blockedWrites.length) record("safety", "Your real save was not touched by the test (it was saved by another open copy of the game during the run, and left as that game saved it)", null);
      else record("safety", "Your real save on this phone is exactly as it was", "it changed during the run (" + changed.join(", ") + ")");
      await tidyOfflineCopy();
      finishedIn = (performance.now() - startedAt) / 1000;
      running = false;
      $("run").disabled = false; $("run").textContent = "Run all tests again";
      $("stageWrap").style.display = "none";
      planned = done; tickUI(true);
      say("Finished in " + finishedIn.toFixed(1) + " seconds");
      showResults();
    }
  }

  const workerScopes = async () => {
    try { return "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).map(r => r.scope).sort().join(", ") : ""; } catch (e) { return ""; }
  };
  let scopesBefore = "";
  async function everything() {
    scopesBefore = await workerScopes();
    /* ----- read the game ----- */
    say("Reading the game files");
    const indexText = await getText("index.html");
    const page = new DOMParser().parseFromString(indexText, "text/html");
    const scripts = Array.from(page.querySelectorAll("script")).map(s => ({ src: s.getAttribute("src"), text: s.src ? "" : s.textContent }));
    const srcs = scripts.filter(s => s.src).map(s => s.src);
    if (!srcs.length) throw new Error("index.html has no game scripts");
    const styles = Array.from(page.querySelectorAll("style")).map(s => s.outerHTML).join("");
    const bodyHTML = Array.from(page.body.children).filter(el => el.tagName !== "SCRIPT").map(el => el.outerHTML).join("");
    gameTags = scripts.map(s => s.src
      ? `<script src="${esc(fresh(s.src))}" onerror="parent.__selftestFail('could not load ${esc(s.src)}')"><\/script>`
      : `<script>${s.text}<\/script>`).join("") + "<script>parent.__selftestReady(window)<\/script>";
    frameHTML = `<!doctype html><html><head><meta charset="utf-8"><base href="${esc(ROOT)}">${styles}</head><body>${bodyHTML}` +
      `<script>if (parent.__selftestPrepare(window)) document.write(parent.__selftestTags); else parent.__selftestFail("could not swap the save for a stand-in, so nothing was run");<\/script></body></html>`;
    const sources = {};
    for (const src of srcs) if (!/levels-data\.js$/.test(src)) sources[src] = await getText(src.replace(/^\.?\//, ""));
    const swText = await getText("sw.js").catch(() => "");
    const code = Object.values(sources).join("\n");
    const keyMatch = code.match(/SAVE_KEY\s*=\s*"([^".]+)/);
    if (keyMatch) saveKeyPrefix = keyMatch[1];
    let solutions = JSON.parse(await getText("tools/solutions.json"));
    if (selfTest.hooks.solutions) solutions = selfTest.hooks.solutions(solutions) || solutions;

    /* ----- what the code says exists ----- */
    const found = (re, text) => Array.from(new Set(Array.from((text || code).matchAll(re), m => m[1])));
    const screens = found(/\bscreen\s*===\s*"(\w+)"/g).concat(found(/\bgo\("(\w+)"\)/g)).filter((v, i, a) => a.indexOf(v) === i);
    const kinds = found(/\b(?:o|overlay)\.kind\s*===\s*"(\w+)"/g).concat(found(/\boverlay\s*=\s*\{\s*kind:\s*"(\w+)"/g)).filter((v, i, a) => a.indexOf(v) === i);
    const soundFiles = found(/["'`]((?:\.\/)?sounds\/[^"'`\s]+\.(?:wav|m4a|mp3|ogg|aac|caf))["'`]/g, code + "\n" + swText).map(f => f.replace(/^\.\//, ""));

    /* ----- load the game once for the levels ----- */
    say("Loading the game");
    let g = await openGame(375, 812, "levels");
    setSize(g, 375, 812, SIZES[0][3], "Replaying levels");
    const LEVELS = JSON.parse(JSON.stringify(g.win.LEVELS || []));
    const N = LEVELS.length, CH = g.ev("CHAPTER_SIZE") || 25;
    const CAST = g.ev("CAST.join('')");
    const floorMatch = (sources["js/play.js"] || code).match(/"(\.#[^"]*)"\.indexOf\(ch\)/);
    const floorTiles = floorMatch ? floorMatch[1] : null;

    /* ----- plan, so the progress bar knows how far it is ----- */
    const picks = pickLevels(LEVELS, CAST, g);
    const screenTests = planScreens(screens, kinds);
    const combos = SIZES.length * 2 * 2;
    planned = N + 14 + LEVELS.filter(l => l.hint).length + combos * (screenTests.length + screenTests.newKinds.length + picks.length + 1) + 6 + soundFiles.length + 4;
    foundNote = "Found in the code: screens " + screens.join(", ") + ". Cards " + kinds.join(", ") + ". " +
      "Levels drawn in every state: " + picks.map(p => (p.i + 1) + " (" + p.why + ")").join(", ") + ".";
    tickUI(true);

    /* ----- level data ----- */
    say("Checking the level data");
    dataChecks(LEVELS, solutions, CH, CAST, floorTiles, g);
    await breathe();

    /* ----- teaching levels ----- */
    for (let i = 0; i < N; i++) {
      const l = LEVELS[i];
      if (!l.hint) continue;
      const words = g.lib.hintWords(l.hint);
      let why = !words ? `its hint "${l.hint}" has no words in the game` : !(l.guide && l.guide.length) ? "it has a hint but no finger guide" : null;
      if (!why) why = attempt(g, () => g.lib.guide(i));
      record("guides", `Level ${i + 1}: hint "${l.hint}" with words and a finger guide that plays`, why);
    }

    /* ----- every level, replayed ----- */
    g.lib.reset(g.lib.emptySave(), false);
    for (let i = 0; i < N; i++) {
      if (i % 10 === 0) { say(`Replaying levels: ${i} of ${N}`); await breathe(); }
      const steps = solutions[i];
      let why;
      if (!Array.isArray(steps)) why = "no stored solution";
      else why = attempt(g, () => g.lib.replay(i, steps, true));
      record("levels", `Level ${i + 1}`, why);
    }
    say(`Replayed ${N} levels`);

    /* ----- backup codes ----- */
    say("Checking backup codes");
    g = await openGame(390, 844, "codes");
    setSize(g, 390, 844, SIZES[1][3], "Backup codes");
    await codeChecks(g);

    /* ----- every screen and card ----- */
    for (const saveName of ["empty save", "full save"]) {
      g = await openGame(SIZES[0][0], SIZES[0][1], "screens");
      const json = saveName === "empty save" ? g.lib.emptySave() : g.lib.fullSave();
      for (const [w, h, sizeName, safe] of SIZES) {
        for (const calm of [false, true]) {
          const where = `${w}x${h}, ${saveName}, Calm motion ${calm ? "on" : "off"}`;
          g.ev("window.__kindsDrawn = new Set()");
          setSize(g, w, h, safe, `${w} x ${h} (${sizeName}), ${saveName}, Calm ${calm ? "on" : "off"}`);
          say("Drawing screens and cards: " + where);
          for (const st of screenTests) {
            const why = attempt(g, () => { g.lib.reset(json, calm); return st.run(g); });
            record("screens", `${st.name} [${where}]`, why);
          }
          await breathe();
          for (const p of picks) {
            const why = attempt(g, () => { g.lib.reset(json, calm); g.lib.gameStates(p.i, solutions[p.i] || []); });
            record("screens", `Level ${p.i + 1} (${p.why}) in every state [${where}]`, why);
            if (p.i % 4 === 0) await breathe();
          }
          {
            const why = attempt(g, () => {
              g.lib.reset(json, calm);
              const di = g.ev("dailyIndex()");
              g.lib.daily(solutions[di]);
            });
            record("screens", `Daily nap, played to the win card [${where}]`, why);
          }
          // Cards found in the code that this page has no setup for: fine if the game opened them
          // itself during the tests above; otherwise try a bare one.
          for (const k of screenTests.newKinds) {
            const drawn = g.ev(`window.__kindsDrawn.has(${JSON.stringify(k)})`);
            const why = drawn ? null : attempt(g, () => { g.lib.reset(json, calm); g.lib.anyCard(k); });
            record("screens", `Card "${k}" (new, ${drawn ? "drawn when the game opened it itself" : "basic check only"}) [${where}]`,
              why ? "this page has no setup for this new card yet, and the game did not open it during the tests: " + why : null);
          }
          await breathe();
        }
      }
    }

    /* ----- sounds ----- */
    say("Checking sound files");
    for (const f of soundFiles) {
      let why = null;
      try {
        let res = await fetch(fresh(ROOT + f), { method: "HEAD", cache: "no-store" });
        if (res.status === 405 || res.status === 501) res = await fetch(fresh(ROOT + f), { cache: "no-store" });
        if (res.status !== 200) why = "status " + res.status;
      } catch (e) { why = "could not be fetched: " + describe(e); }
      record("sounds", f, why);
    }

    /* ----- hidden and safe ----- */
    const linkRe = /["'(=]\s*(?:\.\/|\/)?tests(?:\/|["')]|\/index\.html)/;
    record("safety", "The game does not link to this page", linkRe.test(indexText + code) ? "a link to tests/ was found in index.html or js/" : null);
    const filesList = (swText.match(/FILES\s*=\s*\[([\s\S]*?)\]/) || [, ""])[1];
    record("safety", "This page is not in the offline list (sw.js)", !swText ? "could not read sw.js" : /tests\//.test(filesList) ? "sw.js lists a tests/ file" : null);
    const scopesNow = await workerScopes();
    record("safety", "The test did not register the game's service worker", scopesNow === scopesBefore ? null : "service workers before: [" + scopesBefore + "], after: [" + scopesNow + "]");
  }

  // The levels worth drawing in every state: plain, each new twist, each kind of tile, golden, the biggest boards.
  function pickLevels(LEVELS, CAST, g) {
    const picks = [], add = (i, why) => {
      if (!(i >= 0 && i < LEVELS.length)) return;
      const had = picks.find(p => p.i === i);
      if (!had) picks.push({ i, why }); else if (!had.why.split(", ").includes(why)) had.why += ", " + why;
    };
    const firstWhere = test => LEVELS.findIndex(test);
    add(firstWhere(l => !l.hint && !l.blankets && !l.gates && l.beds.every(b => !b.axis && b.lock === undefined) && /^[.#]*$/.test(l.map.join("").replace(new RegExp("[" + CAST + "]", "g"), ""))), "plain");
    const tiles = new Set(LEVELS.flatMap(l => l.map.join("").split("")));
    for (const ch of tiles) if (ch !== "." && ch !== "#" && !CAST.includes(ch)) add(firstWhere(l => l.map.join("").includes(ch)), `tile "${ch}"`);
    const axes = new Set(LEVELS.flatMap(l => l.beds.map(b => b.axis).filter(Boolean)));
    for (const ax of axes) add(firstWhere(l => l.beds.some(b => b.axis === ax)), `rails "${ax}"`);
    add(firstWhere(l => l.beds.some(b => b.lock !== undefined)), "lock and key");
    add(firstWhere(l => l.blankets && l.blankets.length), "blanket");
    add(firstWhere(l => l.gates && l.gates.length), "gate");
    const hints = new Set(LEVELS.map(l => l.hint).filter(Boolean));
    for (const h of hints) add(firstWhere(l => l.hint === h), `hint ${h}`);
    for (let i = 0; i < LEVELS.length; i++) if (g.ev(`isGolden(${i})`)) add(i, "golden finale");
    const most = key => LEVELS.reduce((best, l, i) => (key(l) > key(LEVELS[best]) ? i : best), 0);
    add(most(l => l.rows * l.cols), "biggest board");
    add(most(l => l.cols), "widest board");
    add(most(l => l.rows), "tallest board");
    add(most(l => l.beds.length), "most beds");
    add(LEVELS.length - 1, "last level");
    return picks;
  }

  // Every screen and card, each with its own way of being opened. A screen or card found in the
  // code that is not on this list still gets a basic check, and is marked "new".
  function planScreens(screens, kinds) {
    const list = [], has = new Set();
    const add = (key, name, run) => { has.add(key); list.push({ name, run }); };
    add("home", "Home, every chapter page", g => g.lib.home());
    for (const tab of ["cats", "hats", "neck"]) add("mycat", `My cat, ${tab} tab`, g => g.lib.mycat(tab));
    add("backup", "Name and saving", g => g.lib.backup(false));
    add("backup", "Name and saving, with the code boxes", g => g.lib.backup(true));
    for (const [v, name] of [[0, "Bedroom"], [1, "Kitchen"], [2, "Garden"]]) {
      add("room", `My room, ${name}, gift waiting`, g => g.lib.room(v, true));
      add("room", `My room, ${name}, gift opened`, g => g.lib.room(v, false));
    }
    add("chapters", "Chapters list, scrolled top to bottom", g => g.lib.chapters());
    for (const tab of ["pics", "notes", "stickers", "stats"]) add("album", `Album, ${tab} tab, first and last page`, g => g.lib.album(tab));
    add("shop", "Shop", g => g.lib.shop());
    has.add("game");                                            // the game screen has its own tests (levels in every state)
    for (const s of screens) if (!has.has(s)) add(s, `Screen "${s}" (new: basic check only)`, g => g.lib.anyScreen(s));

    const cards = new Set(["win", "lose", "pause"]);          // drawn in the level tests
    const card = (key, name, run) => { cards.add(key); list.push({ name, run }); };
    card("settings", "Settings card", g => g.lib.settings());
    card("choose", "Music list card", g => g.lib.choose("music"));
    card("choose", "Meow list card", g => g.lib.choose("meow"));
    card("buy", "Buy card for every powerup, hat, neck thing and a room thing", g => g.lib.buy());
    card("note", "Love note cards", g => g.lib.note());
    card("loadsave", "Load a save card", g => g.lib.loadsave());
    card("chest", "Treasure chest cards", g => g.lib.chest());
    card("gift", "Daily gift cards", g => g.lib.gift());
    card("calendar", "Gift week card, every day", g => g.lib.calendar());
    card("roompick", "Room picker for every spot", g => g.lib.roompick());
    card("win", "Win card in every mood", g => g.lib.winCards(LAST_LEVEL_GUESS.i, LAST_LEVEL_GUESS.steps));
    list.newKinds = kinds.filter(k => !cards.has(k));          // checked after the level tests (see everything)
    return list;
  }
  // The win-card test plays level 25 (a chapter end), set before planning.
  const LAST_LEVEL_GUESS = { i: 24, steps: [] };

  function dataChecks(LEVELS, solutions, CH, CAST, floorTiles, g) {
    const N = LEVELS.length;
    LAST_LEVEL_GUESS.i = Math.min(N - 1, CH - 1); LAST_LEVEL_GUESS.steps = solutions[LAST_LEVEL_GUESS.i] || [];
    const list = (bad, what) => (bad.length ? plural(bad.length, what) + ": " + bad.slice(0, 5).join("; ") + (bad.length > 5 ? "; ..." : "") : null);
    record("data", `There are ${N} levels and ${solutions.length} stored solutions`, N === solutions.length ? null : "the counts are different");
    record("data", `The level count (${N}) is a whole number of chapters of ${CH}`, N > 0 && N % CH === 0 ? null : `${N % CH} levels left over`);

    const shape = [], need = [], counts = [], tiles = [], starts = [], links = [], timing = [], best = [];
    LEVELS.forEach((l, i) => {
      const n = i + 1;
      if (!Array.isArray(l.map) || l.map.length !== l.rows || l.map.some(row => row.length !== l.cols)) { shape.push(`level ${n}`); return; }
      const cells = l.map.join("");
      for (const ch of new Set(cells)) if (floorTiles && !floorTiles.includes(ch) && !CAST.includes(ch)) tiles.push(`level ${n} has "${ch}"`);
      const cats = {}, wants = {};
      for (const ch of cells) if (CAST.includes(ch)) cats[ch] = (cats[ch] || 0) + 1;
      const taken = new Set();
      l.beds.forEach((b, bi) => {
        if (!Array.isArray(b.cells) || b.need !== b.cells.length) need.push(`level ${n} bed ${bi} needs ${b.need} with ${b.cells ? b.cells.length : 0} cells`);
        wants[b.color] = (wants[b.color] || 0) + b.need;
        for (const [dr, dc] of b.cells || []) {
          const r = b.r + dr, c = b.c + dc, ch = l.map[r] && l.map[r][c];
          if (ch === undefined) starts.push(`level ${n} bed ${bi} starts off the board`);
          else if (ch === "#" || CAST.includes(ch)) starts.push(`level ${n} bed ${bi} starts on "${ch}"`);
          else if (taken.has(r * 99 + c)) starts.push(`level ${n} bed ${bi} starts on top of another bed`);
          taken.add(r * 99 + c);
        }
        if (b.lock !== undefined && (!l.beds[b.lock] || b.lock === bi)) links.push(`level ${n} bed ${bi} is locked by a bed that is not there`);
      });
      for (const k of new Set(Object.keys(cats).concat(Object.keys(wants)))) if ((cats[k] || 0) !== (wants[k] || 0)) counts.push(`level ${n}: ${cats[k] || 0} "${k}" cats, beds for ${wants[k] || 0}`);
      for (const [r, c, color] of l.gates || []) if (!CAST.includes((l.map[r] || "")[c]) || !l.beds.some(b => b.color === color)) links.push(`level ${n} gate at ${r},${c}`);
      for (const [r, c] of l.blankets || []) if (!CAST.includes((l.map[r] || "")[c])) links.push(`level ${n} blanket at ${r},${c} has no cat under it`);
      if (!(l.time > 0) || !(l.best > 0)) timing.push(`level ${n}`);
      if (Array.isArray(solutions[i]) && l.best > 0 && solutions[i].length < l.best) best.push(`level ${n}: solved in ${solutions[i].length}, best says ${l.best}`);
    });
    record("data", "Every board is the size it says", list(shape, "level"));
    record("data", "Every tile is one the game knows" + (floorTiles ? ` (floor "${floorTiles}", cats "${CAST}")` : ""), floorTiles ? list(tiles, "problem") : "could not find the floor tiles in js/play.js");
    record("data", "Every bed needs as many cats as it has cells", list(need, "bed"));
    record("data", "Every cat has a bed place of its color, no more and no fewer", list(counts, "problem"));
    record("data", "Beds start on open floor, inside the board, apart", list(starts, "problem"));
    record("data", "Locks, gates and blankets point at real beds and cats", list(links, "problem"));
    record("data", "Every level has a time and a best", list(timing, "level"));
    record("data", "No stored solution is shorter than the level's best", list(best, "level"));

    // Each twist is taught where it first appears: the first level of that chapter has a hint and a finger guide.
    const twists = [];
    const tileSet = new Set(LEVELS.flatMap(l => l.map.join("").split("")));
    for (const ch of tileSet) if (ch !== "." && ch !== "#" && !CAST.includes(ch)) twists.push([`tile "${ch}"`, l => l.map.join("").includes(ch)]);
    twists.push(["rails", l => l.beds.some(b => b.axis)], ["lock and key", l => l.beds.some(b => b.lock !== undefined)],
      ["blankets", l => !!(l.blankets && l.blankets.length)], ["gates", l => !!(l.gates && l.gates.length)]);
    const untaught = [], where = [];
    for (const [name, test] of twists) {
      const first = LEVELS.findIndex(test);
      if (first < 0) continue;
      const start = Math.floor(first / CH) * CH, l = LEVELS[start];
      where.push(`${name}: chapter ${start / CH + 1}`);
      if (!l.hint || !(l.guide && l.guide.length) || !g.lib.hintWords(l.hint)) untaught.push(`${name} first shows up in level ${first + 1}, but level ${start + 1} has no ${!l.hint ? "hint" : !g.lib.hintWords(l.hint) ? "hint words" : "finger guide"}`);
    }
    record("data", "Each new twist starts its chapter with a hint and a finger guide (" + where.join(", ") + ")", list(untaught, "problem"));
    const keys = Array.from(new Set(LEVELS.map(l => l.hint).filter(Boolean)));
    const noWords = keys.filter(k => !g.lib.hintWords(k));
    record("data", `Every hint in the data has words in the game (${keys.join(", ")})`, noWords.length ? "no words for " + noWords.join(", ") : null);
    const odd = solutions.map((s, i) => (Array.isArray(s) && s.every(m => Array.isArray(m) && m.length === 3 && Math.abs(m[1]) + Math.abs(m[2]) === 1) ? null : `solution ${i + 1}`)).filter(Boolean);
    record("data", "Every stored solution is a list of single slides [bed, row step, column step]", list(odd, "problem"));
  }

  async function codeChecks(g) {
    // A full save's code reads back and makes the same code again.
    g.lib.reset(g.lib.fullSave(), false);
    let why = null, rt = null;
    why = attempt(g, () => { rt = g.lib.roundTrip(); return rt.err; });
    if (!why && rt.code !== rt.again) why = "the code read back made a different code";
    if (!why && (rt.stars !== rt.want || rt.coins !== rt.wantCoins)) why = `read back ${rt.stars} levels and ${rt.coins} coins, expected ${rt.want} and ${rt.wantCoins}`;
    record("codes", "A new code from a full save reads back and makes the same code again", why);
    const code = rt && rt.code;

    // An empty save's code too.
    g.lib.reset(g.lib.emptySave(), false);
    let rt2 = null;
    why = attempt(g, () => { rt2 = g.lib.roundTrip(); return rt2.err; });
    if (!why && rt2.code !== rt2.again) why = "the code read back made a different code";
    record("codes", "A code from an empty save reads back the same", why);

    // A damaged code is turned away.
    if (code) {
      const at = Math.floor(code.length / 2), swap = code[at] === "A" ? "B" : "A";
      const damaged = [["one letter changed", code.slice(0, at) + swap + code.slice(at + 1)], ["cut short", code.slice(0, -7)], ["made up", "BEAN-SGVsbG8-1234"]];
      const wrong = damaged.filter(([, c]) => g.lib.read(c) !== null).map(([n]) => n);
      record("codes", "A damaged code is turned away (one letter changed, cut short, made up)", wrong.length ? "accepted a code that was " + wrong.join(", ") : null);
      const pasted = "my code:\n " + code.slice(0, 30) + "\n" + code.slice(30) + "  thanks!";
      record("codes", "A code pasted with line breaks and words around it still reads", g.lib.read(pasted) ? null : "it was turned away");
    } else {
      record("codes", "A damaged code is turned away", "no code to damage");
      record("codes", "A code pasted with line breaks and words around it still reads", "no code to paste");
    }

    // An old-format code (from before the room, chests and the rest) still restores. Built here
    // by hand, the way the first version of the game made them, so it does not lean on today's code.
    const b64 = bytes => btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sum = body => { let s = 0; for (const ch of body) s = (s * 31 + ch.charCodeAt(0)) % 65536; return s.toString(16).padStart(4, "0"); };
    const stars = new Uint8Array(8);                           // levels 1 to 30: 3, 2, 1, 3, 2, 1 ...
    for (let i = 0; i < 30; i++) stars[i >> 2] |= (3 - (i % 3)) << ((i & 3) * 2);
    const old = { v: 1, p: "Liza", s: b64(stars), c: 777, u: [4, 3, 2], h: "o", n: { o: "Kahel" }, t: "bow", o: ["bow", "cap"], th: 2,
      d: ["2026-01-02", 5], x: [0, 0, 3, 1, 1, 0, 1] };
    const body = b64(new TextEncoder().encode(JSON.stringify(old)));
    const oldCode = "BEAN-" + body + "-" + sum(body);
    let after = null;
    why = attempt(g, () => { const r = g.lib.restore(oldCode); if (!r) return "the game turned the old code away"; after = JSON.parse(r); });
    if (!why) {
      const s = after.S, wrong = [];
      if (Object.keys(s.stars).length !== 30 || s.stars[0] !== 3 || s.stars[1] !== 2 || s.stars[2] !== 1) wrong.push("stars");
      if (s.coins !== 777) wrong.push("coins");
      if (s.pu.hint !== 4 || s.pu.snooze !== 3 || s.pu.treat !== 2) wrong.push("powerups");
      if (s.hero !== "o" || (s.names || {}).o !== "Kahel") wrong.push("cat and name");
      if (s.hat !== "bow" || String(s.hats) !== "bow,cap") wrong.push("hats");
      if (s.player !== "Liza") wrong.push("player name");
      if (s.daily.last !== "2026-01-02" || s.daily.streak !== 5) wrong.push("daily streak");
      if (s.track !== 3 || s.meow !== 1 || !s.timer || s.shapes || !s.calm) wrong.push("settings");
      if (after.screen !== "home") wrong.push("did not go back to the home screen");
      if (wrong.length) why = "restored, but these came back wrong: " + wrong.join(", ");
    }
    record("codes", "An old-format code (v, p, s, c, u, h, n, t, o, th, d, x only) restores", why);
  }

  // When this page is opened on the live site in a browser that has the game installed, the game's
  // service worker keeps a copy of every file it sees, this page's too. Take those out again.
  async function tidyOfflineCopy() {
    try {
      if (!("caches" in window)) return;
      for (const key of await caches.keys()) {
        if (!/^drop-the-bean/.test(key)) continue;
        const cache = await caches.open(key);
        for (const req of await cache.keys()) {
          const u = new URL(req.url);
          if (u.origin === location.origin && (/\/tests\//.test(u.pathname) || /\/tools\//.test(u.pathname) || u.searchParams.has("selftest"))) await cache.delete(req);
        }
      }
    } catch (e) { /* nothing kept, or no access: fine */ }
  }

  /* ---------- showing the results ---------- */
  function showResults() {
    const fails = results.filter(r => !r.ok), total = results.length;
    const sum = $("summary");
    if (!fails.length) {
      sum.className = "card pass";
      sum.innerHTML = `All ${total.toLocaleString("en-US")} checks passed <span style="font-weight:600;font-size:14px">(${finishedIn.toFixed(0)} seconds)</span>`;
    } else {
      sum.className = "card fail";
      sum.innerHTML = `${plural(fails.length, "check")} failed, ${(total - fails.length).toLocaleString("en-US")} passed` +
        "<ul>" + fails.slice(0, 6).map(f => `<li>${esc(f.name)}: ${esc(f.reason)}</li>`).join("") + (fails.length > 6 ? `<li>and ${fails.length - 6} more below</li>` : "") + "</ul>";
    }
    const box = $("groups");
    box.innerHTML = "";
    for (const [id, title] of GROUPS) {
      const rows = results.filter(r => r.group === id);
      if (!rows.length) continue;
      const bad = rows.filter(r => !r.ok);
      const d = document.createElement("details");
      if (bad.length) d.open = true;
      d.innerHTML = `<summary>${esc(title)}: <span class="${bad.length ? "bad" : "ok"}">${bad.length ? bad.length + " failed, " : ""}${(rows.length - bad.length).toLocaleString("en-US")} passed</span></summary>`;
      const ul = document.createElement("ul");
      ul.className = "list";
      ul.innerHTML = bad.map(r => `<li class="f">${esc(r.name)}: ${esc(r.reason)}</li>`).join("");
      d.appendChild(ul);
      // the passed ones are only listed when opened (there can be thousands)
      d.addEventListener("toggle", () => {
        if (!d.open || d.dataset.filled) return;
        d.dataset.filled = "1";
        ul.insertAdjacentHTML("beforeend", rows.filter(r => r.ok).map(r => `<li class="p">${esc(r.name)}</li>`).join(""));
      });
      box.appendChild(d);
    }
    $("found").textContent = foundNote;
    $("results").style.display = "block";
  }

  function reportText() {
    const fails = results.filter(r => !r.ok), lines = [];
    lines.push("Drop the Bean self-test", new Date().toString(), location.href, navigator.userAgent, "");
    lines.push(fails.length ? `${fails.length} of ${results.length} checks FAILED` : `All ${results.length} checks passed`);
    lines.push(`Took ${finishedIn.toFixed(1)} seconds`, "");
    for (const [id, title] of GROUPS) {
      const rows = results.filter(r => r.group === id);
      if (rows.length) lines.push(`${title}: ${rows.filter(r => r.ok).length} passed, ${rows.filter(r => !r.ok).length} failed`);
    }
    if (fails.length) {
      lines.push("", "Failures:");
      for (const f of fails) lines.push(`- ${f.name}: ${f.reason}`);
    }
    if (foundNote) lines.push("", foundNote);
    return lines.join("\n");
  }
  async function copyReport() {
    const text = reportText(), btn = $("copy");
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (x) { ok = false; }
      ta.remove();
    }
    btn.textContent = ok ? "Copied" : "Could not copy";
    setTimeout(() => { btn.textContent = "Copy report"; }, 2000);
  }

  $("run").addEventListener("click", () => { if (!running) runAll(); });
  $("copy").addEventListener("click", copyReport);
  // A wrong address like ".../tests" (no slash) would point "../" at the wrong folder.
  if (!/\/$|\.html$/.test(location.pathname)) location.replace(location.pathname + "/" + location.search);
  else {
    tidyOfflineCopy();
    if (/[?&]run\b/.test(location.search)) runAll();          // ".../tests/?run" starts at once
  }
  selfTest.run = () => (running ? null : runAll());
  selfTest.report = reportText;
  selfTest.results = () => results;
})();
