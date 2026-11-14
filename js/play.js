"use strict";
/* ==================================================================
   DROP THE BEAN - play: the rules of a level, hints, powerups, rewards.
=================================================================== */

let screen = "home", fade = 0;
let L = null, levelIndex = 0, rows = 0, cols = 0;
let walls = [], floorCats = [], beds = [], leaving = [], effects = [], confetti = [], flying = [], undoStack = [], buttons = [];
let catsLeft = 0, timeLeft = 0, timerOn = false, overlay = null, drag = null, touched = false, lastTick = 0;
let slides = 0, isDaily = false, guideRuns = [], guideIdx = 0, hinting = false, paused = false, introT = 9;
let cell = 60, gx = 0, gy = 0, topY = 0;
let toastMsg = null, press = null;

function go(where) {
  screen = where;
  fade = S.calm ? 0 : 1;
  overlay = null; paused = false;
  layout();
}

function layout() {
  const s = safeArea();
  topY = s.t + 8;
  if (screen !== "game" || !L) return;
  const top = topY + 122, bottom = 104 + (L.hint ? 56 : 0) + s.b;
  const availW = W - 44, availH = H - top - bottom;
  cell = Math.max(24, Math.floor(Math.min(availW / cols, availH / rows, 86)));   // never collapses on a very short screen
  gx = Math.round((W - cols * cell) / 2);
  gy = Math.round(top + Math.max(0, (availH - rows * cell) * 0.45));
}

function toast(text) { toastMsg = { text, t: 0 }; }

/* ---------- starting a level ---------- */
function makeBed(id, r, c, need) {
  const src = L.beds[id];
  const fills = [];
  for (let i = 0; i < src.need - need; i++) fills.push({ t: 9, fr: r, fc: c });
  return { id, color: src.color, need, total: src.need, cells: src.cells, axis: src.axis, lock: src.lock,
    r, c, x: c, y: r, nx: 0, ny: 0, squash: 0, fills, leaveT: 0 };
}

function startLevel(i, asDaily) {
  levelIndex = i; L = LEVELS[i]; isDaily = !!asDaily; slides = 0;
  rows = L.rows; cols = L.cols;
  walls = []; floorCats = []; catsLeft = 0;
  for (let r = 0; r < rows; r++) {
    walls[r] = []; floorCats[r] = [];
    for (let c = 0; c < cols; c++) {
      const ch = L.map[r][c];
      walls[r][c] = ch === "#";
      floorCats[r][c] = (ch !== "." && ch !== "#") ? { color: ch, seed: Math.random() * 10, hidden: false, gate: null, peek: 1 } : null;
      if (floorCats[r][c]) catsLeft++;
    }
  }
  for (const [r, c] of L.blankets || []) if (floorCats[r][c]) floorCats[r][c].hidden = true;
  for (const [r, c, color] of L.gates || []) if (floorCats[r][c]) floorCats[r][c].gate = color;
  beds = L.beds.map((b, id) => makeBed(id, b.r, b.c, b.need));
  leaving = []; effects = []; confetti = []; undoStack = [];
  drag = null; touched = false; hinting = false;
  timeLeft = L.time; timerOn = false; lastTick = 0; introT = 0;
  go("game");
  setGuide(L.guide || []);
  peekAround(true);
}

/* ---------- the finger demo (teaching levels and hints) ---------- */
function setGuide(runs) {
  guideIdx = 0; guideRuns = [];
  const at = {}; beds.forEach(b => { at[b.id] = [b.r, b.c]; });
  for (const g of runs) {
    if (!at[g.bed]) break;
    const start = at[g.bed].slice();
    const end = g.path.reduce((q, [dr, dc]) => [q[0] + dr, q[1] + dc], start);
    at[g.bed] = end;
    guideRuns.push({ bed: g.bed, path: g.path, start, end });
  }
}
function runsOf(path) {
  const runs = [];
  for (const [bed, dr, dc] of path) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && lastRun.bed === bed) lastRun.path.push([dr, dc]); else runs.push({ bed, path: [[dr, dc]] });
  }
  return runs;
}

/* ---------- undo ---------- */
function snapshot() {
  return {
    beds: beds.map(b => ({ id: b.id, r: b.r, c: b.c, need: b.need })),
    cats: floorCats.map(row => row.map(c => c ? { color: c.color, seed: c.seed, hidden: c.hidden, gate: c.gate, peek: 1 } : null)),
    catsLeft, slides,
  };
}
function undo() {
  if (!undoStack.length || overlay) return;
  const s = undoStack.pop();
  beds = s.beds.map(b => makeBed(b.id, b.r, b.c, b.need));
  floorCats = s.cats; catsLeft = s.catsLeft; slides = s.slides;
  leaving = []; drag = null;
  if (hinting) { hinting = false; guideRuns = []; }
  sfx.undo();
}

/* ---------- rules ---------- */
function bedAtCell(r, c, except) {
  for (const b of beds) {
    if (b === except) continue;
    for (const [dr, dc] of b.cells) if (b.r + dr === r && b.c + dc === c) return b;
  }
  return null;
}
// A locked bed waits until its key bed is full and gone.
const isLocked = bed => bed.lock !== undefined && beds.some(b => b.id === bed.lock);
const pairOf = id => { const n = L.beds.filter(b => b.lock !== undefined).findIndex(b => b === L.beds[id]); return PAIR[Math.max(0, n) % PAIR.length]; };
// A gate stays shut until the bed of the gate's color is full and gone.
const gateShut = cat => !!cat.gate && beds.some(b => b.color === cat.gate);

// Can this bed slide one cell? Returns the cats it would tuck in, or null if blocked.
function canStep(bed, dr, dc) {
  if (bed.axis === "h" && dr) return null;        // rails: side to side only
  if (bed.axis === "v" && dc) return null;        // rails: up and down only
  if (isLocked(bed)) return null;
  const got = [];
  for (const [sr, sc] of bed.cells) {
    const r = bed.r + dr + sr, c = bed.c + dc + sc;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    if (walls[r][c]) return null;
    if (bedAtCell(r, c, bed)) return null;
    const cat = floorCats[r][c];
    if (cat) {
      if (cat.color !== bed.color || gateShut(cat)) return null;
      got.push([r, c]);
    }
  }
  if (got.length > bed.need) return null;
  return got;
}

function tuck(bed, r, c) {
  floorCats[r][c] = null;
  bed.need--; catsLeft--;
  bed.fills.push({ t: S.calm ? 1 : 0, fr: r, fc: c });
  burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "spark", CATS[skin(bed.color)].fur, 7);
}

function doStep(bed, dr, dc) {
  const got = canStep(bed, dr, dc);
  if (!got) return false;
  bed.r += dr; bed.c += dc; slides++;
  if (got.length) { sfx.tuck(); bed.squash = 1; } else sfx.slide();
  for (const [r, c] of got) tuck(bed, r, c);
  if (bed.need === 0) completeBed(bed);
  peekAround(false);
  if (catsLeft === 0 && !overlay) finish("win", LEAVE + 0.1);
  return true;
}

function completeBed(bed) {
  beds = beds.filter(b => b !== bed);
  bed.leaveT = 0;
  leaving.push(bed);
  if (drag && drag.bed === bed) drag = null;
  burst(gx + (bed.c + 0.5) * cell, gy + (bed.r + 0.5) * cell, "heart", "#FF5C8A", 5);
  sfx.done(VOICE[skin(bed.color)]);                       // every full bed gets a meow, in that cat's own voice
  let opened = false;
  for (const b of beds) if (b.lock === bed.id) {            // this bed was a key: its lock pops open
    burst(gx + (b.c + 0.5) * cell, gy + (b.r + 0.5) * cell, "spark", pairOf(b.id)[0], 12);
    opened = true;
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cat = floorCats[r][c];
    if (cat && cat.gate === bed.color) {                    // gates of this color swing open
      burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "spark", CATS[skin(bed.color)].bed, 10);
      opened = true;
    }
  }
  if (opened) sfx.unlock();
}

// Lift the blanket off any hidden cat that a bed is now next to.
function peekAround(quiet) {
  let any = false;
  for (const b of beds) for (const [sr, sc] of b.cells) {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = b.r + sr + dr, c = b.c + sc + dc;
      const cat = r >= 0 && c >= 0 && r < rows && c < cols ? floorCats[r][c] : null;
      if (cat && cat.hidden) {
        cat.hidden = false; cat.peek = quiet ? 1 : 0; any = true;
        if (!quiet) burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "puff", "#DCD0FB", 8);
      }
    }
  }
  if (any && !quiet) sfx.peek();
}

/* ---------- winning, losing, rewards ---------- */
function finish(kind, delay) {
  timerOn = false; drag = null;
  let stars;
  if (S.timer) { const frac = timeLeft / L.time; stars = frac >= 0.5 ? 3 : frac >= 0.2 ? 2 : 1; }
  else { const ratio = slides / Math.max(1, L.best); stars = ratio <= 1.6 ? 3 : ratio <= 2.6 ? 2 : 1; }   // relaxed: fewer slides, more stars
  overlay = { kind, stars, delay, t: 0, left: timeLeft, rang: false, coins: 0, gift: null, unlocked: null, daily: false };
  if (kind !== "win") return;
  const first = !S.stars[levelIndex], before = totalStars();
  if ((S.stars[levelIndex] || 0) < stars) S.stars[levelIndex] = stars;
  let coins = first ? 10 + stars * 5 : 3;
  if (first && (levelIndex + 1) % CHAPTER_SIZE === 0) coins += 50;          // finishing a chapter
  if (isDaily && markDaily()) { coins += 40; overlay.daily = true; }
  if (first && (levelIndex + 1) % 5 === 0) {                               // a gift every fifth level
    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)].id;
    S.pu[pu]++; overlay.gift = pu;
  }
  S.coins += coins; overlay.coins = coins;
  overlay.unlocked = THEMES.find(th => th.stars > before && th.stars <= totalStars()) || null;
  save();
}

function burst(x, y, type, color, n) {
  if (S.calm) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 130;
    const life = type === "heart" ? 1.1 : 0.55;
    effects.push({ type, color, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (type === "heart" ? 110 : 30),
      life, max: life, rot: Math.random() * 6 });
  }
}
function throwConfetti() {
  if (S.calm) return;
  const palette = CAST.map(k => CATS[k].fur).concat(["#FFD84D", "#FF5C8A"]);
  for (let i = 0; i < 70; i++) {
    confetti.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 60,
      vy: 140 + Math.random() * 160, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, color: palette[i % palette.length] });
  }
}

/* ---------- hint: the game works out your next move ----------
   From where the board is now, search for the shortest way to tuck in
   one more cat. With one bed per color no move can ever ruin a level,
   so "the next cat" is always a safe thing to aim for. */
function hintPath() {
  const N = rows * cols, colors = L.beds.map(b => b.color);
  const live = id => beds.find(b => b.id === id);
  const start = {
    pos: L.beds.map((_, i) => { const b = live(i); return b ? b.r * cols + b.c : -1; }),
    need: L.beds.map((_, i) => { const b = live(i); return b ? b.need : 0; }),
    cats: "",
  };
  const gate = new Int8Array(N).fill(-1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cat = floorCats[r][c];
    start.cats += walls[r][c] ? "#" : cat ? cat.color : ".";
    if (cat && cat.gate) gate[r * cols + c] = colors.indexOf(cat.gate);
  }
  const shapes = L.beds.map(b => b.cells), axis = L.beds.map(b => b.axis || "");
  const lock = L.beds.map(b => b.lock === undefined ? -1 : b.lock);
  const keyOf = s => s.pos.join(",") + "/" + s.cats;
  const states = [start], parent = [-1], mv = [null], seen = new Set([keyOf(start)]);
  const occ = new Int8Array(N), DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let head = 0; head < states.length && states.length < 40000; head++) {
    const s = states[head];
    occ.fill(-1);
    for (let i = 0; i < s.pos.length; i++) if (s.pos[i] >= 0) {
      const br = (s.pos[i] / cols) | 0, bc = s.pos[i] % cols;
      for (const [dr, dc] of shapes[i]) occ[(br + dr) * cols + bc + dc] = i;
    }
    for (let i = 0; i < s.pos.length; i++) {
      if (s.pos[i] < 0 || (lock[i] >= 0 && s.pos[lock[i]] >= 0)) continue;
      for (const [dr, dc] of DIRS) {
        if ((axis[i] === "h" && dr) || (axis[i] === "v" && dc)) continue;
        const br = ((s.pos[i] / cols) | 0) + dr, bc = (s.pos[i] % cols) + dc;
        let ok = true, ate = false;
        for (const [sr, sc] of shapes[i]) {
          const r = br + sr, c = bc + sc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) { ok = false; break; }
          const idx = r * cols + c, ch = s.cats[idx];
          if ((occ[idx] !== -1 && occ[idx] !== i) || ch === "#" || (gate[idx] >= 0 && s.pos[gate[idx]] >= 0)) { ok = false; break; }
          if (ch !== ".") { if (ch !== colors[i]) { ok = false; break; } ate = true; }
        }
        if (!ok) continue;
        if (ate) {                                         // found it: walk back to the first move
          const out = [[i, dr, dc]];
          for (let j = head; j > 0; j = parent[j]) out.push(mv[j]);
          return out.reverse();
        }
        const pos = s.pos.slice(); pos[i] = br * cols + bc;
        const ns = { pos, need: s.need, cats: s.cats }, k = keyOf(ns);
        if (seen.has(k)) continue;
        seen.add(k); states.push(ns); parent.push(head); mv.push([i, dr, dc]);
      }
    }
  }
  return null;
}

/* ---------- powerups ---------- */
// Use one you own, or buy one on the spot if you have the coins.
function takePowerup(id) {
  if (S.pu[id] > 0) { S.pu[id]--; save(); return true; }
  const price = POWERUPS.find(q => q.id === id).price;
  if (S.coins >= price) { S.coins -= price; save(); toast(t("bought", t("pu_" + id))); sfx.coin(); return true; }
  toast(t("need_coins", price - S.coins)); sfx.no();
  return false;
}
function useHint() {
  if (overlay || !beds.length) return;
  const path = hintPath();
  if (!path) { sfx.no(); return; }
  if (!takePowerup("hint")) return;
  setGuide(runsOf(path)); hinting = true;
  sfx.magic();
}
function useSnooze() {
  if (!S.timer) { toast(t("no_timer")); sfx.no(); return; }
  if (overlay && overlay.kind !== "lose") return;
  if (!takePowerup("snooze")) return;
  timeLeft += 30; lastTick = 0;
  if (overlay) { overlay = null; timerOn = true; }           // time was up: back into the level
  sfx.magic();
  burst(W / 2, topY + 85, "spark", "#3B8BEF", 14);
}
function useTreat() {
  if (overlay || !catsLeft) return;
  const spots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (floorCats[r][c]) spots.push([r, c]);
  if (!takePowerup("treat")) return;
  const [r, c] = spots[Math.floor(Math.random() * spots.length)];
  const cat = floorCats[r][c], bed = beds.find(b => b.color === cat.color);
  undoStack.push(snapshot());
  timerOn = true; touched = true;
  cat.hidden = false;
  tuck(bed, r, c);
  sfx.magic(); sfx.meow(0.15, VOICE[skin(cat.color)]);
  if (hinting) { hinting = false; guideRuns = []; }
  if (bed.need === 0) completeBed(bed);
  if (catsLeft === 0 && !overlay) finish("win", LEAVE + 0.1);
}

/* ---------- dragging a bed ---------- */
function bedAtPoint(x, y) {
  const c = Math.floor((x - gx) / cell), r = Math.floor((y - gy) / cell);
  if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
  return bedAtCell(r, c, null);
}
// Follow the finger: slide the held bed cell by cell toward it.
function dragTo(px, py) {
  const d = drag, bed = d.bed;
  const tr = (py - d.offY - gy) / cell, tc = (px - d.offX - gx) / cell;
  for (let i = 0; i < 14 && drag; i++) {
    const dr = tr - bed.r, dc = tc - bed.c;
    const tryRow = () => Math.abs(dr) > 0.55 && doStep(bed, Math.sign(dr), 0);
    const tryCol = () => Math.abs(dc) > 0.55 && doStep(bed, 0, Math.sign(dc));
    const moved = Math.abs(dc) >= Math.abs(dr) ? (tryCol() || tryRow()) : (tryRow() || tryCol());
    if (moved) {
      if (!d.saved) { undoStack.push(d.snap); d.saved = true; }
      continue;
    }
    if (Math.abs(dr) > 0.9 || Math.abs(dc) > 0.9) {         // blocked: lean into the obstacle so the reason shows
      if (Math.abs(dc) >= Math.abs(dr)) bed.nx = Math.sign(dc) * 0.09; else bed.ny = Math.sign(dr) * 0.09;
      sfx.bump();
    }
    break;
  }
}
