"use strict";
/* ==================================================================
   DROP THE BEAN - core: canvas, saved data, words, cats, sound.
   Files load in this order: core, art, play, screens, main.
=================================================================== */

const LEVELS = window.LEVELS || [];
const CHAPTER_SIZE = 25;
const CHAPTER_KEYS = ["c_nap", "c_rails", "c_lock", "c_blanket", "c_gate", "c_house", "c_maze", "c_dream",
  "c_9", "c_10", "c_11", "c_12", "c_13", "c_14", "c_15", "c_16", "c_17", "c_18", "c_19", "c_20"];
const INK = "#252A5C";
const SOFT = "#5F6AA6";
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", system-ui, sans-serif';
const LEAVE = 0.95;                 // seconds a full bed takes to wake up, cheer and go
const lerp = (a, b, v) => a + (b - a) * v;
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOutBack = v => { const c = 1.70158; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };

/* ---------- canvas ---------- */
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const nameInput = document.getElementById("nameInput");
let W = 0, H = 0, time = 0;

const probe = document.createElement("div");
probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
  "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);";
document.body.appendChild(probe);
function safeArea() {
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}

/* ---------- the cast ----------
   Bean and Meowsy are the two stars. "mark" picks the fur pattern. */
const CATS = {
  k: { name: "Bean",   mark: "tux",      fur: "#2C2C3A", dark: "#0B0B12", light: "#FFFFFF", bed: "#4A4A63", bedIn: "#D4D4E6", face: "#1B1B28", lid: "#F2F2FA", eye: "#FFE35A", tip: "#FFFFFF" },
  g: { name: "Meowsy", mark: "tabbytux", fur: "#A6ABBB", dark: "#474D61", light: "#FFFFFF", bed: "#7E869F", bedIn: "#ECEEF4", face: "#2E3345", eye: "#8FDD5F", tip: "#FFFFFF", stripe: "#6A7086" },
  o: { name: "Pinto",  mark: "tabby",    fur: "#FFA63D", dark: "#B9590A", light: "#FFE3B8", bed: "#FF8A1F", face: "#4A2A12" },
  b: { name: "Navy",   mark: "belly",    fur: "#5AA9FF", dark: "#1F57B0", light: "#DCEBFF", bed: "#3B8BEF", face: "#16335F" },
  w: { name: "Butter", mark: "patch",    fur: "#FFFFFF", dark: "#8F9AC4", light: "#FFFFFF", bed: "#D3DBF3", face: "#3A3F66" },
  p: { name: "Jelly",  mark: "points",   fur: "#B981FF", dark: "#6431BD", light: "#EFE2FF", bed: "#9C5BF4", face: "#35176E", ear: "#8E55E6", tail: "#8E55E6" },
  m: { name: "Eda",    mark: "belly",    fur: "#82DD5C", dark: "#35891E", light: "#E1F8D3", bed: "#5FCB36", face: "#1E4D12", sprout: true },
};
const CAST = ["k", "g", "o", "b", "w", "p", "m"];
const HATS = [
  { id: "bow", price: 60 }, { id: "cap", price: 90 }, { id: "flower", price: 120 },
  { id: "party", price: 160 }, { id: "crown", price: 250 },
];
const POWERUPS = [
  { id: "hint", price: 30 }, { id: "snooze", price: 25 }, { id: "treat", price: 45 },
];
const PAIR = [["#FFC93C", "#8A5A00"], ["#FF7EB6", "#A02567"], ["#5FE0C0", "#1E7A62"]];     // lock-and-key pair colors
// Boards are a reward for stars.
const THEMES = [
  { id: "sky",    stars: 0,   bg: ["#A9DCFF", "#E3F4FF"], tray: "#4A5BC4", trayDark: "#2B3783", wall: "#6577DC", wallDark: "#35449E", tiles: ["#F4F7FF", "#E5EBFC"] },
  { id: "sunset", stars: 30,  bg: ["#FFC2A1", "#FFF0DC"], tray: "#C4573B", trayDark: "#8C3521", wall: "#E07A5F", wallDark: "#A6452D", tiles: ["#FFF8F0", "#FBE8D8"] },
  { id: "garden", stars: 120, bg: ["#A8E6C4", "#EAFBF1"], tray: "#2F8F6B", trayDark: "#1D6349", wall: "#4DB58D", wallDark: "#247256", tiles: ["#F5FFF9", "#E0F5E9"] },
  { id: "dusk",   stars: 300, bg: ["#A7A2F0", "#E4DDFF"], tray: "#3B2F8F", trayDark: "#241C63", wall: "#5B4DC0", wallDark: "#30267A", tiles: ["#F7F5FF", "#E7E2FA"] },
];

/* ---------- saved on this device ---------- */
const SAVE_KEY = "dropthebean.save.v2";
function freshSave() {
  return { stars: {}, coins: 60, pu: { hint: 3, snooze: 2, treat: 1 }, hero: "k", names: {}, hat: "", hats: [],
    theme: "sky", sound: true, music: true, track: 0, meow: 0, timer: true, shapes: false, calm: false,
    daily: { last: "", streak: 0 }, setup: false };
}
function loadSave() {
  const base = freshSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const got = JSON.parse(raw);
      Object.assign(base, got);
      base.pu = Object.assign(freshSave().pu, got.pu || {});
      base.daily = Object.assign(freshSave().daily, got.daily || {});
    }
  } catch (e) { /* private mode or damaged data: start fresh */ }
  if (!CATS[base.hero]) base.hero = "k";
  return base;
}
let S = loadSave();
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* play on without saving */ } }

const totalStars = () => Object.values(S.stars).reduce((a, b) => a + b, 0);
const nextUnsolved = () => { for (let i = 0; i < LEVELS.length; i++) if (!S.stars[i]) return i; return 0; };
const theme = () => { const th = THEMES.find(q => q.id === S.theme); return th && totalStars() >= th.stars ? th : THEMES[0]; };

// The player's own cat takes Bean's place in every level; Bean takes that cat's place.
function skin(key) {
  if (S.hero === "k") return key;
  if (key === "k") return S.hero;
  if (key === S.hero) return "k";
  return key;
}
const catName = key => (key === S.hero && S.names[key]) || CATS[key].name;

/* ---------- daily puzzle ---------- */
const todayKey = d => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
function dailyIndex() { let h = 7; for (const ch of todayKey()) h = (h * 31 + ch.charCodeAt(0)) % 100003; return 5 + h % Math.max(1, LEVELS.length - 5); }
const dailyDone = () => S.daily.last === todayKey();
function dailyStreak() {
  if (dailyDone()) return S.daily.streak || 1;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return S.daily.last === todayKey(y) ? (S.daily.streak || 0) : 0;
}
function markDaily() {
  if (dailyDone()) return false;
  S.daily = { last: todayKey(), streak: dailyStreak() + 1 };
  return true;
}

/* ---------- words ---------- */
const WORDS = {
  en: {
    play: "Play level {0}", daily: "Daily nap", daily_done: "Daily nap done", streak: "Streak: {0}",
    mycat: "My cat", shop: "Shop", settings: "Settings", level: "Level {0}",
    left: "{0} left", slides: "{0} slides", slide1: "1 slide",
    win: "All tucked in!", lose: "Time's up!", paused: "Paused",
    time_left: "Time left: {0}", slides_line: "{0} slides. Fewest possible: {1}.",
    coins_won: "+{0} coins", gift: "A gift: 1 {0}!", new_board: "New board: {0}!", streak_days: "Daily streak: {0}",
    next: "Next level", again: "Play again", retry: "Try again", home: "Home", resume: "Resume", restart: "Restart",
    done: "Done", back: "Back", start: "Start playing",
    need_bed: "{0} cats still need a bed.", need_bed1: "1 cat still needs a bed.", use_snooze: "Snooze: 30 more seconds",
    s_sound: "Sound: {0}", s_music: "Music: {0}", m_0: "Lullaby", m_1: "Sunny Window", m_2: "Tiptoe", m_3: "Dreamy", m_4: "Zoomies", m_5: "Hot Springs Town", m_6: "Happy Adventure", m_7: "Flowerbed Fields",
    s_meow: "Meow: {0}", w_0: "Mrow", w_1: "Soft mew", w_2: "Kitten", w_3: "Siamese", w_4: "House cat", w_5: "Young cat", s_timer: "Timer: On", s_timer_off: "Timer: Off (relaxed)",
    s_shapes: "Color shapes: {0}", s_calm: "Calm motion: {0}", s_board: "Board: {0}", on: "On", off: "Off",
    next_board: "Next board, {0}, at {1} stars", all_boards: "All boards unlocked",
    pu_hint: "Hint", pu_snooze: "Snooze", pu_treat: "Treat",
    pu_hint_d: "Shows your next move", pu_snooze_d: "Adds 30 seconds", pu_treat_d: "Tucks in one cat for you",
    bought: "Bought 1 {0}", need_coins: "You need {0} more coins", no_timer: "No timer in relaxed mode",
    pick_cat: "Pick your cat", name_cat: "Tap the name to change it", hats: "Hats", no_hat: "None", wear: "Wearing",
    hat_bow: "Bow", hat_cap: "Nightcap", hat_flower: "Flower", hat_party: "Party hat", hat_crown: "Crown",
    powerups: "Powerups", boards: "Boards", stars_need: "{0} stars", have: "You have {0}",
    th_sky: "Sky", th_sunset: "Sunset", th_garden: "Garden", th_dusk: "Dusk",
    c_nap: "Nap Time", c_rails: "On Rails", c_lock: "Lock and Key", c_blanket: "Blanket Fort",
    c_gate: "Baby Gates", c_house: "Full House", c_maze: "Pillow Maze", c_dream: "Dream Team",
    c_9: "Night Train", c_10: "Safe and Sound", c_11: "Side Tracks", c_12: "Hide and Sleep",
    c_13: "Pajama Party", c_14: "Midnight Snack", c_15: "Deep Sleep", c_16: "Rail Yard",
    c_17: "Under Lock and Key", c_18: "Pillow Fort", c_19: "Full Moon", c_20: "Sweet Dreams",
    b_k: "Naps anywhere. Even on your keyboard.", b_g: "Chirps at birds. Has never caught one.",
    b_o: "Thinks every box is a gift for him.", b_b: "Loves the rain. From indoors.",
    b_w: "Soft as butter. Steals your pillow.", b_p: "Wobbles when she runs. Runs a lot.",
    b_m: "Grows a little sprout when happy.",
    h_drag: ["Drag the bed over the sleeping cats.", "It takes cats of its own color."],
    h_block: ["Another cat blocks the way.", "Tuck that cat in first."],
    h_rail: ["New: beds with arrows are on rails.", "They only slide the way the arrows point."],
    h_lock: ["New: a locked bed can't move.", "Fill the bed with the key to open it."],
    h_blanket: ["New: who is under the blanket?", "Slide a bed next to it to peek."],
    h_gate: ["New: a gate keeps beds away from a cat.", "Fill the bed of the gate's color to open it."],
    h_mix: ["Rails and locks together.", "Plan the order before you slide."],
    h_mix2: ["Gates, locks and blankets.", "Peek first, then plan."],
    h_all: ["Everything at once.", "Take your time. You know all the tricks."],
  },
};
function t(key) {
  const v = WORDS.en[key] || key;
  if (typeof v !== "string") return v;
  const args = arguments;
  return v.replace(/\{(\d)\}/g, (_, n) => args[Number(n) + 1]);
}
const clock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

/* ---------- sound: made on the fly, no audio files ---------- */
let actx = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (e) { return null; }
    loadMeows();
  }
  // An iPhone pauses audio when you leave the game ("suspended" or "interrupted").
  // Wake it again on the next touch, whatever the paused state is called.
  if (actx.state !== "running") { try { const p = actx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* try again next touch */ } }
  return actx;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && actx && (S.sound || S.music)) audio(); recordedMusic(false); });

function tone(freq, dur, o) {
  o = o || {};
  if (!(o.music ? S.music : S.sound)) return;
  const a = audio(); if (!a || a.state !== "running") return;
  const osc = a.createOscillator(), g = a.createGain(), t0 = o.at || a.currentTime + (o.delay || 0);
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t0 + (o.attack || 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}
// Each cat has its own voice: higher or lower.
const VOICE = { k: 1.0, g: 1.18, o: 0.86, b: 0.95, w: 1.3, p: 1.42, m: 1.1 };

// A meow, built from scratch: a buzzy note that rises ("me") then falls ("ow"),
// pushed through a filter that slides from a bright "e" sound to a round "o" sound.
// Six recordings to choose from in Settings (see CREDITS.md). The first is the owner's own pick: it is the default.
const MEOW_FILES = ["sounds/meow-mrow.wav", "sounds/meow-soft.wav", "sounds/meow-kitten.wav", "sounds/meow-siamese.wav", "sounds/meow-house.wav", "sounds/meow-young.wav"];
const MEOW_GAIN = [0.8, 0.6, 0.45, 0.7, 0.7, 0.6];
const MEOW_SPREAD = [0.1, 0.4, 0.4, 0.4, 0.4, 0.4];      // how much each cat's voice shifts the pitch (the default stays close to the original)
const meowBuffers = [];
function loadMeows() {
  MEOW_FILES.forEach((url, i) => {
    fetch(url).then(r => r.arrayBuffer())
      .then(data => actx.decodeAudioData(data, buf => { meowBuffers[i] = buf; }, () => {}))
      .catch(() => { /* no recording: the built-in meow below is used */ });
  });
}

function meow(delay, pitch) {
  if (!S.sound) return;
  const a = audio(); if (!a || a.state !== "running") return;
  const rec = meowBuffers[S.meow];
  if (rec) {                                       // the real recording, a little higher or lower for each cat
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = rec;
    const spread = MEOW_SPREAD[S.meow] || 0.4;
    src.playbackRate.value = 1 - spread * 0.2 + ((pitch || 1) - 0.86) * spread;
    g.gain.value = MEOW_GAIN[S.meow] || 0.6;
    src.connect(g); g.connect(a.destination);
    src.start(a.currentTime + (delay || 0));
    return;
  }
  const t0 = a.currentTime + (delay || 0), dur = 0.5 + Math.random() * 0.12;
  const f0 = 540 * (pitch || 1) * (0.97 + Math.random() * 0.06);
  const osc = a.createOscillator(); osc.type = "sawtooth";
  osc.frequency.setValueAtTime(f0 * 0.72, t0);
  osc.frequency.linearRampToValueAtTime(f0 * 1.28, t0 + 0.13);
  osc.frequency.linearRampToValueAtTime(f0 * 1.08, t0 + 0.3);
  osc.frequency.linearRampToValueAtTime(f0 * 0.6, t0 + dur);
  const mouth = a.createBiquadFilter(); mouth.type = "bandpass"; mouth.Q.value = 3.2;
  mouth.frequency.setValueAtTime(2400, t0);
  mouth.frequency.linearRampToValueAtTime(1500, t0 + 0.2);
  mouth.frequency.linearRampToValueAtTime(780, t0 + dur);
  const body = a.createBiquadFilter(); body.type = "lowpass"; body.frequency.value = 1000;
  const g = a.createGain(), g2 = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.07);
  g.gain.setValueAtTime(0.55, t0 + 0.28);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(0.07, t0 + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(mouth); mouth.connect(g); g.connect(a.destination);
  osc.connect(body); body.connect(g2); g2.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

let lastBump = 0;
const sfx = {
  slide:  () => tone(320, 0.04, { type: "triangle", vol: 0.05 }),
  tuck:   () => { tone(520, 0.13, { to: 900, vol: 0.15 }); tone(780, 0.1, { to: 1350, vol: 0.05, delay: 0.03 }); },
  // a bed is full: a soft chime, then that cat's own meow
  done:   pitch => { [659, 831, 988].forEach((f, i) => tone(f, 0.22, { vol: 0.05, delay: i * 0.05, type: "triangle" })); meow(0.1, pitch); },
  purr:   () => { for (let i = 0; i < 12; i++) tone(52 + (i % 2) * 6, 0.05, { type: "sawtooth", vol: 0.045, delay: 0.15 + i * 0.045 }); },
  meow:   (d, pitch) => meow(d, pitch),
  win:    () => { [523, 659, 784, 1047].forEach((f, i) => { tone(f, 0.26, { vol: 0.14, delay: 0.1 + i * 0.11, type: "triangle" }); tone(f * 1.5, 0.2, { vol: 0.04, delay: 0.1 + i * 0.11 }); }); },
  lose:   () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, { vol: 0.13, delay: i * 0.16, type: "triangle" })),
  bump:   () => { if (time - lastBump > 0.25) { lastBump = time; tone(120, 0.07, { type: "square", vol: 0.04 }); } },
  tick:   () => tone(880, 0.05, { vol: 0.07 }),
  tap:    () => tone(440, 0.05, { vol: 0.07, type: "triangle" }),
  undo:   () => tone(500, 0.1, { to: 300, vol: 0.1, type: "triangle" }),
  unlock: () => { tone(700, 0.08, { vol: 0.12, type: "square", delay: 0.2 }); tone(1100, 0.16, { vol: 0.12, type: "triangle", delay: 0.28 }); },
  coin:   () => { tone(1319, 0.07, { vol: 0.1 }); tone(1760, 0.16, { vol: 0.1, delay: 0.06 }); },
  peek:   () => tone(600, 0.1, { to: 1000, vol: 0.08, type: "triangle" }),
  magic:  () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.18, { vol: 0.08, delay: i * 0.05 })),
  no:     () => tone(200, 0.12, { to: 150, vol: 0.08, type: "triangle" }),
};

// Five music tracks to choose from in Settings. Each step can carry a melody note;
// every fourth step adds a low note with a gentle fifth above it.
const SONGS = [
  { beat: 0.42, wave: "triangle",          // Lullaby: slow and sleepy
    lead: [659, 0, 587, 523, 440, 0, 392, 0, 440, 523, 587, 0, 523, 0, 0, 0, 587, 0, 523, 440, 392, 0, 330, 0, 392, 440, 523, 0, 440, 0, 0, 0],
    bass: [131, 110, 87.3, 98, 131, 110, 87.3, 98] },
  { beat: 0.3, wave: "triangle",           // Sunny Window: bright and happy
    lead: [523, 659, 784, 0, 659, 784, 1047, 0, 880, 784, 659, 0, 784, 0, 0, 0, 587, 698, 880, 0, 698, 880, 1175, 0, 988, 880, 784, 0, 659, 0, 0, 0],
    bass: [131, 131, 175, 196, 147, 147, 196, 131] },
  { beat: 0.34, wave: "square",            // Tiptoe: sneaky and playful
    lead: [330, 0, 0, 392, 0, 0, 440, 0, 392, 0, 330, 0, 294, 0, 0, 0, 330, 0, 0, 440, 0, 0, 494, 0, 440, 0, 392, 0, 330, 0, 0, 0],
    bass: [82.4, 82.4, 110, 98, 82.4, 82.4, 123.5, 98] },
  { beat: 0.5, wave: "sine",               // Dreamy: wide and floaty
    lead: [784, 0, 0, 0, 659, 0, 587, 0, 0, 0, 523, 0, 587, 0, 0, 0, 880, 0, 0, 0, 784, 0, 659, 0, 0, 0, 587, 0, 659, 0, 0, 0],
    bass: [87.3, 131, 110, 98, 87.3, 131, 147, 98] },
  { beat: 0.22, wave: "triangle",          // Zoomies: fast and bouncy
    lead: [392, 494, 587, 494, 392, 494, 587, 784, 440, 523, 659, 523, 440, 523, 659, 880, 349, 440, 523, 440, 349, 440, 523, 698, 392, 494, 587, 784, 587, 494, 392, 0],
    bass: [98, 98, 110, 110, 87.3, 87.3, 98, 98] },
];
let songAt = 0, songStep = 0, songId = -1;
// Tracks 6 to 8 are recordings (see CREDITS.md). They play through a normal
// audio player, which is the most reliable way on an iPhone.
const TRACK_FILES = [null, null, null, null, null,
  "sounds/music-hot-springs.m4a", "sounds/music-happy-adventure.m4a", "sounds/music-flowerbed-fields.m4a"];
const players = {};
let playingTrack = -1;
// Start, switch or stop the recorded track so it matches the setting.
// A phone only lets sound start from a touch, so starting waits for one.
function recordedMusic(fromTouch) {
  const want = S.music && TRACK_FILES[S.track] && !document.hidden ? S.track : -1;
  if (playingTrack !== -1 && playingTrack !== want) { players[playingTrack].pause(); playingTrack = -1; }
  if (want === -1) return;
  let el = players[want];
  if (!el) {
    if (!fromTouch) return;
    el = players[want] = new Audio(TRACK_FILES[want]);
    el.loop = true; el.preload = "auto";
  }
  if (el.paused && fromTouch) { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); }
  if (!el.paused || fromTouch) playingTrack = want;
}

function musicTick() {
  recordedMusic(false);
  if (!S.music || TRACK_FILES[S.track] || !actx || actx.state !== "running") return;
  const id = SONGS[S.track] ? S.track : 0;
  if (id !== songId) { songId = id; songStep = 0; }
  const song = SONGS[id];
  if (songAt < actx.currentTime) songAt = actx.currentTime + 0.08;
  while (songAt < actx.currentTime + 0.25) {
    const i = songStep % song.lead.length;
    if (song.lead[i]) tone(song.lead[i], song.beat * 1.3, { at: songAt, vol: song.wave === "square" ? 0.014 : 0.028, type: song.wave, music: true });
    if (i % 4 === 0) {
      const b = song.bass[i / 4];
      tone(b, song.beat * 3.6, { at: songAt, vol: 0.034, music: true, attack: 0.05 });
      tone(b * 3, song.beat * 3.2, { at: songAt, vol: 0.012, music: true, attack: 0.2 });
    }
    songAt += song.beat; songStep++;
  }
}
// The music switch in menus steps through: Off, then each of the five tracks.
function cycleMusic() {
  if (!S.music) { S.music = true; S.track = 0; }
  else if (S.track < TRACK_FILES.length - 1) S.track++;
  else S.music = false;
  save(); if (S.music) audio();
  recordedMusic(true);
}
const musicLabel = () => t("s_music", S.music ? t("m_" + S.track) : t("off"));
