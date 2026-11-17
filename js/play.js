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
let aim = null;                     // "treat", "hint" or "hammer" while she is choosing what to use the powerup on
let snoozed = false, usedPowerup = false;   // this level: was a Snooze used, was any powerup used
let meterStars = 3, meterJump = -9; // the slide meter remembers the last star count, to jump when one is lost
let creaky = [];                    // per cell: 0 plain floor, 1 a creaky board, 2 a board that broke (a hole)
let holeT = {};                     // when each hole opened (r * cols + c), so it can open with a little give
let fixT = {};                      // when each hole was fixed with a Hammer, for a little pop
let oneway = [];                    // per cell: -1, or the only way a bed on it may slide (0 up, 1 down, 2 left, 3 right)
let arrowT = {};                    // when each arrow last refused a bed, so it can flash
let stuck = false;                  // a broken board or an arrow left no bed a way to any of its cats
let stuckJob = null;                // the search that checks for that, a little each frame
let thinking = null;                // a hint being worked out, a little each frame (see hintTick)
let memo = null;                    // the last whole solution found, and how far along it she is
let combo = 0, lastTuckT = -9;      // cats tucked in one after another, and when the last one was
// The chain of cats tucked in one after another: still going, the coins it has won this level,
// where its last cat went to bed (for the coin), and whether the cat chorus has sung this level.
let comboOpen = false, comboCoins = 0, comboAt = [0, 0], chorusDone = false;
let popups = [];                    // the small "x3" bubbles and the combo coin, floating over the board
// Yarn balls: "y" in a level's map. Each is { r, c, x, y, rot }: x and y follow r and c
// smoothly, rot turns as it rolls. A ball never sits under a bed, a cat or on a special tile.
let balls = [], lastPushT = -9;

function go(where) {
  if (where === "home" && screen !== "home" && typeof maybeRemindSave === "function") setTimeout(maybeRemindSave, 600);
  save();                                             // keeps the time played and anything else that changed
  screen = where;
  fade = S.calm ? 0 : 1;
  overlay = null; paused = false; aim = null; thinking = null;
  tryOn = null;                                       // a hat being tried on in My cat comes off
  layout();
}

function layout() {
  const s = safeArea();
  topY = s.t + 8;
  if (screen !== "game" || !L) return;
  const top = topY + 120, bottom = 104 + (L.hint ? 56 : 0) + s.b;
  const availW = W - 44, availH = H - top - bottom;
  cell = Math.max(24, Math.floor(Math.min(availW / cols, availH / rows, 86)));   // never collapses on a very short screen
  gx = Math.round((W - cols * cell) / 2);
  gy = Math.round(top + Math.max(0, (availH - rows * cell) * 0.45));
}

function toast(text) { toastMsg = { text, t: 0 }; }

/* ---------- twists ----------
   Each twist has a card she sees once, the first time she opens the level that brings it in
   (its "hint" words, and a small picture). The order is fixed: S.twists and the backup code
   keep these numbers, so only add new twists at the end. */
const TWISTS = [["h_rail", "rail"], ["h_lock", "lock"], ["h_blanket", "blanket"], ["h_gate", "gate"], ["h_creaky", "creaky"], ["h_oneway", "oneway"], ["h_yarn", "yarn"]];
function closeTwist() {
  const o = overlay;
  if (!o || o.kind !== "twist") return;
  if (!S.twists.includes(o.tw)) { S.twists.push(o.tw); save(); }
  overlay = null;
}

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
  walls = []; floorCats = []; creaky = []; oneway = []; holeT = {}; fixT = {}; arrowT = {}; catsLeft = 0; balls = []; lastPushT = -9;
  for (let r = 0; r < rows; r++) {
    walls[r] = []; floorCats[r] = []; creaky[r] = []; oneway[r] = [];
    for (let c = 0; c < cols; c++) {
      const ch = L.map[r][c];
      walls[r][c] = ch === "#";
      creaky[r][c] = ch === "c" ? 1 : 0;                 // "c" is a creaky board: floor, not a cat
      oneway[r][c] = ARROWS.indexOf(ch);                 // "^ v < >" are one-way floor: floor, not cats, and they never break
      if (ch === "y") balls.push(newBall(r, c));         // "y" is a yarn ball: floor, not a cat
      floorCats[r][c] = (".#c^v<>y".indexOf(ch) < 0) ? { color: ch, seed: Math.random() * 10, hidden: false, gate: null, peek: 1 } : null;
      if (floorCats[r][c]) catsLeft++;
    }
  }
  for (const [r, c] of L.blankets || []) if (floorCats[r][c]) floorCats[r][c].hidden = true;
  for (const [r, c, color] of L.gates || []) if (floorCats[r][c]) floorCats[r][c].gate = color;
  beds = L.beds.map((b, id) => makeBed(id, b.r, b.c, b.need));
  leaving = []; effects = []; confetti = []; undoStack = [];
  drag = null; touched = false; hinting = false;
  timeLeft = L.time; timerOn = false; lastTick = 0; introT = 0;
  meterStars = 3; meterJump = -9; snoozed = false; usedPowerup = false;
  stuck = false; stuckJob = null; memo = null; combo = 0; lastTuckT = -9;
  comboOpen = false; comboCoins = 0; chorusDone = false; popups = [];
  go("game");
  setGuide(L.guide || []);
  peekAround(true);
  // the first time she meets a twist: a small card that shows it, before she plays
  const tw = TWISTS.findIndex(x => x[0] === L.hint);
  if (tw >= 0 && !S.twists.includes(tw)) overlay = { kind: "twist", tw, t: 1, delay: 0, at: time };
  if (i >= HAMMER_AT && !S.hammerGot) {                    // she reached level 501: the Hammer shows up, with 2 to start
    S.hammerGot = true; S.pu.hammer = (S.pu.hammer || 0) + 2; save();
    toast(t("hammer_new"));
  }
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
    boards: creaky.map(row => row.slice()),              // broken boards come back on undo
    balls: balls.map(b => [b.r, b.c]),                   // and yarn balls go back where they were
    catsLeft, slides, comboCoins,
  };
}
function undo() {
  if (!undoStack.length || overlay) return;
  const s = undoStack.pop();
  beds = s.beds.map(b => makeBed(b.id, b.r, b.c, b.need));
  floorCats = s.cats; catsLeft = s.catsLeft; slides = s.slides;        // a Treat's 4 extra slides go back with it
  if (s.boards) creaky = s.boards;
  if (s.balls) balls = s.balls.map(([r, c]) => newBall(r, c));
  // a step back ends a chain of cats without its coins, and takes back coins won after the snapshot
  comboOpen = false; combo = 0; lastTuckT = -9; popups = [];
  if (s.comboCoins !== undefined) comboCoins = s.comboCoins;
  stuck = false; stuckJob = null; thinking = null; memo = null;
  if (s.treat) { S.pu.treat++; save(); }                               // undoing a Treat hands the Treat back (its count goes up)
  if (s.hammer) { S.pu.hammer++; save(); }                             // and undoing a Hammer hands the Hammer back
  leaving = []; drag = null; aim = null;
  if (hinting) { hinting = false; guideRuns = []; }
  sfx.undo();
  if (tricky()) checkStuck();                                          // a step back can still be a trap from an earlier move
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

// One-way floor: the way a slide goes, as an arrow number (0 up "^", 1 down "v", 2 left "<", 3 right ">").
const wayOf = (dr, dc) => (dr < 0 ? 0 : dr > 0 ? 1 : dc < 0 ? 2 : 3);
// The arrows that refuse this slide: every arrow under the bed, before or after the slide,
// must point the way it goes. Used to flash them when a held bed bumps.
function arrowsRefuse(bed, dr, dc) {
  const way = wayOf(dr, dc), out = [];
  for (const [sr, sc] of bed.cells) for (const [r, c] of [[bed.r + sr, bed.c + sc], [bed.r + sr + dr, bed.c + sc + dc]]) {
    const w = oneway[r] ? oneway[r][c] : -1;
    if (w >= 0 && w !== way) out.push([r, c]);
  }
  return out;
}
const onArrow = cells => cells.some(([r, c]) => oneway[r] && oneway[r][c] >= 0);
// A level where one careless slide can ruin it: creaky boards or one-way floor.
// Yarn balls too: a ball pushed into a corner stays stuck.
const tricky = () => !!L && L.map.some(row => /[c^v<>y]/.test(row));

/* ---------- yarn balls ----------
   When a bed slides one cell, every ball in a cell it newly covers is pushed one cell further
   the same way. The ball may only go onto plain floor inside the board: no wall, hole, creaky
   board, arrow tile, cat, bed (the moving bed's new cells count), and no other ball (no pushing
   two at once). If any ball cannot go, the bed does not slide. Balls never disappear.
   The search (makeSearch) follows the same rule, with "y" in its board string. */
const newBall = (r, c) => ({ r, c, x: c, y: r, rot: Math.random() * 6 });
const ballAt = (r, c) => balls.findIndex(b => b.r === r && b.c === c);
function ballCanGo(r, c, bed, dr, dc) {
  if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
  if (walls[r][c] || creaky[r][c] || oneway[r][c] >= 0 || floorCats[r][c] || ballAt(r, c) >= 0) return false;
  if (bedAtCell(r, c, bed)) return false;
  return !bed.cells.some(([sr, sc]) => bed.r + dr + sr === r && bed.c + dc + sc === c);
}

// Can this bed slide one cell? Returns the cats it would tuck in, or null if blocked.
function canStep(bed, dr, dc) {
  if (bed.axis === "h" && dr) return null;        // rails: side to side only
  if (bed.axis === "v" && dc) return null;        // rails: up and down only
  if (isLocked(bed)) return null;
  const got = [], way = wayOf(dr, dc);
  for (const [sr, sc] of bed.cells) {
    const from = oneway[bed.r + sr][bed.c + sc];
    if (from >= 0 && from !== way) return null;   // one-way floor: a bed on an arrow only slides the way it points
    const r = bed.r + dr + sr, c = bed.c + dc + sc;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    if (oneway[r][c] >= 0 && oneway[r][c] !== way) return null;   // and it only slides onto an arrow the way it points
    if (walls[r][c] || creaky[r][c] === 2) return null;   // a broken board is a hole: like a wall
    if (bedAtCell(r, c, bed)) return null;
    const cat = floorCats[r][c];
    if (cat) {
      if (cat.color !== bed.color || gateShut(cat)) return null;
      got.push([r, c]);
    }
  }
  if (got.length > bed.need) return null;
  // yarn balls in the way: each is pushed one cell on, or the slide is refused.
  // (A ball is never under a bed, so any ball in the cells it slides into is newly covered.)
  got.balls = [];
  if (balls.length) for (const [sr, sc] of bed.cells) {
    const r = bed.r + dr + sr, c = bed.c + dc + sc, k = ballAt(r, c);
    if (k < 0) continue;
    if (!ballCanGo(r + dr, c + dc, bed, dr, dc)) return null;
    got.balls.push([k, r + dr, c + dc]);
  }
  return got;
}

// Creaky boards: any of these cells that no bed covers any more breaks for good.
// Returns true if one broke.
function breakUncovered(cells) {
  let broke = false;
  for (const [r, c] of cells) {
    if (!creaky[r] || creaky[r][c] !== 1 || bedAtCell(r, c, null)) continue;
    creaky[r][c] = 2; broke = true; holeT[r * cols + c] = time;
    burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "splinter", "#A8713F", 10);
  }
  if (broke) sfx.crack();
  return broke;
}
const bedCells = bed => bed.cells.map(([sr, sc]) => [bed.r + sr, bed.c + sc]);
// After a board breaks, a bed steps onto a creaky board, or a bed crosses an arrow: can the
// level still be won from here? If not, say so gently. The search runs a little each frame (searchTick), and a search that
// gives up early says nothing.
const STUCK_CAP = 150000;
function checkStuck() {
  stuckJob = null;
  if (!catsLeft || overlay || stuck) return;
  // a whole solution from here: only "none" (proved: no way to win) shows the card; a search
  // that reaches its cap says nothing
  stuckJob = makeSearch(boardForSearch(undefined, true, STUCK_CAP));
}

function tuck(bed, r, c) {
  floorCats[r][c] = null;
  bed.need--; catsLeft--;
  bed.fills.push({ t: S.calm ? 1 : 0, fr: r, fc: c });
  burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "spark", CATS[skin(bed.color)].fur, 4);
}

function doStep(bed, dr, dc) {
  const got = canStep(bed, dr, dc);
  if (!got) return false;
  const before = bedCells(bed), pending = !!stuckJob;
  thinking = null; stuckJob = null;                         // the board changes: a search still running is out of date
  // following the last whole solution found keeps it good for the next hint
  if (memo && memo.at < memo.path.length && memo.path[memo.at][0] === bed.id && memo.path[memo.at][1] === dr && memo.path[memo.at][2] === dc) memo.at++;
  else memo = null;
  bed.r += dr; bed.c += dc; slides++;
  for (const [k, r, c] of got.balls) { balls[k].r = r; balls[k].c = c; }        // yarn balls roll on ahead of the bed
  if (got.balls.length) { lastPushT = time; sfx.yarn(); }
  if (got.length) {
    const goingOn = time - lastTuckT < 1.5;
    if (!goingOn) endCombo();                              // the last chain ran out (its coin, if it earned one)
    combo = goingOn ? combo + 1 : 0;                       // one cat right after another: each note a step higher
    lastTuckT = time;
    sfx.tuck(combo); bed.squash = 1;
    comboStep(bed);
  } else sfx.slide();
  for (const [r, c] of got) tuck(bed, r, c);
  if (bed.need === 0) completeBed(bed);
  // the boards it slid off break; a bed that just filled up leaves its boards too
  const broke = breakUncovered(before.concat(bedCells(bed)));
  peekAround(false);
  // check only when it can have changed: a board broke, a bed filled up while there are holes,
  // the bed slid on or off an arrow (a slide it may not undo), the bed slid onto a creaky board
  // (the board will break once it leaves, so the level can already be lost now), or a check was
  // still running. The check is the same sliced, capped search: it says something only when it
  // proves no way is left, and nothing if it gives up.
  const ontoCreaky = bed.need > 0 && bedCells(bed).some(([r, c]) => creaky[r] && creaky[r][c] === 1);
  if (broke || pending || ontoCreaky || got.balls.length || onArrow(before) || onArrow(bedCells(bed)) || (bed.need === 0 && creaky.some(row => row.includes(2)))) checkStuck();
  if (catsLeft === 0 && !overlay) finish("win", LEAVE + 0.1);
  return true;
}

function completeBed(bed) {
  beds = beds.filter(b => b !== bed);
  bed.leaveT = 0;
  leaving.push(bed);
  if (drag && drag.bed === bed) drag = null;
  burst(gx + (bed.c + 0.5) * cell, gy + (bed.r + 0.5) * cell, "heart", "#FF5C8A", 3);
  const C = CATS[skin(bed.color)];                          // a small, short sparkle in the cat's own color
  for (const [r, c] of bedCells(bed)) burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "glint", C.fur === "#FFFFFF" ? C.dark : C.fur, 2);
  sfx.done(VOICE[skin(bed.color)]);                       // every full bed gets a meow, in that cat's own voice
  sfx.tuckIn();                                             // and a quiet purr as its cover is pulled over
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

/* ---------- combos ----------
   Cats tucked in one after another (each within 1.5 seconds of the last) make a chain; "combo"
   counts from 0, so the chain is combo + 1 cats long. The rising notes are in sfx.tuck.
   3 or more: a small "x3" bubble floats up from the bed. 6: two soft meows sing together, once
   a level. When a chain of 5 or more ends, it wins 2 coins per cat past 4, shown as one coin. */
const COMBO_COINS = n => (n >= 5 ? 2 * (n - 4) : 0);
function comboStep(bed) {
  const n = combo + 1, [x, y] = bedCenter(bed, gx + bed.c * cell, gy + bed.r * cell);
  comboOpen = true; comboAt = [x, y];
  if (n >= 3) {
    popups = popups.filter(p => p.kind !== "combo");     // one bubble at a time: the newest
    popups.push({ kind: "combo", text: "x" + n, x, y: y - cell * 0.35, t: 0, life: 1.1 });
  }
  if (n >= 6 && !chorusDone) { chorusDone = true; sfx.chorus(VOICE[skin(bed.color)]); }
}
function endCombo() {
  if (!comboOpen) return;
  comboOpen = false;
  const add = COMBO_COINS(combo + 1);
  if (!add) return;
  comboCoins += add;
  // beside the bed, so it never covers an "x" bubble that is still showing (a level that ends on a chain)
  popups.push({ kind: "coin", text: "+" + add, x: comboAt[0] + cell * 0.55, y: comboAt[1] + cell * 0.1, t: 0, life: 1.3 });
  sfx.comboCoin();
}
// Each frame (main.js update): yarn balls roll to their cells, popups float and fade,
// and a chain ends once 1.5 seconds pass with no new cat.
function playExtras(dt) {
  const ease = Math.min(1, dt * 26);
  for (const b of balls) {
    const px = b.x, py = b.y;
    b.x += (b.c - b.x) * ease; b.y += (b.r - b.y) * ease;
    if (!S.calm) b.rot += ((b.x - px) + (b.y - py)) * 2.6;      // it rolls a little as it goes (not with calm motion)
  }
  for (const p of popups) p.t += dt;
  popups = popups.filter(p => p.t < p.life);
  if (comboOpen && time - lastTuckT >= 1.5) endCombo();
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

/* ---------- winning, losing, rewards ----------
   Stars come from the time left on the clock:
   3 stars with half the time or more left, 2 stars with a fifth or more, else 1.
   A Snooze gives more time, so a level that used one gives at most 2 stars.
   In relaxed mode (no clock) stars quietly come from how few slides she used. */
const starMarks = best => [best + 2, Math.max(best + 6, Math.ceil(best * 1.5))];
const starsFor = (n, best) => { const [three, two] = starMarks(best); return n <= three ? 3 : n <= two ? 2 : 1; };
function starsNow() {
  if (!S.timer) return starsFor(slides, L.best);
  const frac = timeLeft / L.time;
  const st = frac >= 0.5 ? 3 : frac >= 0.2 ? 2 : 1;
  return snoozed ? Math.min(2, st) : st;
}

function finish(kind, delay) {
  timerOn = false; drag = null; aim = null;
  const stars = starsNow();
  overlay = { kind, stars, delay, t: 0, left: timeLeft, rang: false, coins: 0, gift: null, unlocked: null, daily: false, perfect: false,
    party: false, golden: false, note: -1, room: 0 };
  if (kind === "lose" && S.timer && !S.relaxSeen) { overlay.relax = true; S.relaxSeen = true; save(); }   // offered once: play without the clock
  if (kind !== "win") return;
  const first = !S.stars[levelIndex], before = totalStars();
  const chapterEnd = (levelIndex + 1) % CHAPTER_SIZE === 0;
  // Confetti only when a chapter is finished for the first time (season finales are chapter ends too).
  // Every other win gets a few soft sparkles.
  overlay.party = first && chapterEnd;
  // the first time she finishes a chapter, a love note waits for her (shown as she leaves the card)
  if (first && chapterEnd && pageOf(levelIndex) < MAX_CHAPTERS && !S.notes.includes(pageOf(levelIndex))) overlay.note = pageOf(levelIndex);
  S.stats.cats += L.map.join("").replace(/[.#c^v<>y]/g, "").length;      // every cat in the level went to bed
  const roomsBefore = [1, 2].filter(roomOpen);
  if ((S.stars[levelIndex] || 0) < stars) S.stars[levelIndex] = stars;     // stars already earned are never lowered
  if (stars === 3 && !usedPowerup) { S.perfect[levelIndex] = 1; overlay.perfect = true; }   // 3 stars with no powerups: a paw stamp on the home page
  // perfect levels in a row: any win that is not perfect starts the count again (a lost level does not count)
  S.roll = overlay.perfect ? S.roll + 1 : 0;
  S.rollBest = Math.max(S.rollBest, S.roll);
  overlay.roll = S.roll >= 3;
  endCombo();                                                               // the last chain ends with the level
  let coins = first ? 10 + stars * 5 : 1;
  if (first && chapterEnd) coins += 50;                                     // finishing a chapter
  if (first && chapterEnd && !isGolden(levelIndex)) { coins = Math.round(coins * 1.5); overlay.ribbon = true; }   // a ribbon level: 1.5 times the coins
  if (first && isGolden(levelIndex)) { coins *= 2; overlay.golden = true; }  // a golden finale: double coins
  if (isDaily && markDaily()) { coins += 40; overlay.daily = true; }
  if (first && (levelIndex + 1) % 10 === 0) {                              // a gift every tenth level
    const open = POWERUPS.filter(p => puOpen(p.id));       // no Hammer as a gift before she has met it
    const pu = open[Math.floor(Math.random() * open.length)].id;
    S.pu[pu]++; overlay.gift = pu;
  }
  coins += comboCoins; overlay.combo = comboCoins;                         // coins won by chains of cats
  S.coins += coins; overlay.coins = coins;
  overlay.room = [1, 2].find(i => roomOpen(i) && !roomsBefore.includes(i)) || 0;   // a new room opened
  // enough stars for a new cat to choose in My cat?
  overlay.unlocked = HEROES.find(k => CAT_STARS[k] > before && CAT_STARS[k] <= totalStars() && !S.cats.includes(k)) || null;
  save();
}

function burst(x, y, type, color, n) {
  if (S.calm) n = Math.ceil(n / 3);
  const small = type === "heart" || type === "glint" || type === "spark";
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = small ? 40 + Math.random() * 80 : 50 + Math.random() * 130;
    const life = type === "heart" ? 0.8 : type === "glint" ? 0.45 : type === "spark" ? 0.4 : 0.55;
    effects.push({ type, color, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (type === "heart" ? 110 : 30),
      life, max: life, rot: Math.random() * 6 });
  }
}
// An ordinary win: a few soft gold sparkles drift up and fade. Calm motion: none.
function softSparkle() {
  if (S.calm) return;
  for (let i = 0; i < 9; i++) {
    confetti.push({ soft: true, x: W / 2 + (Math.random() - 0.5) * Math.min(W, 320), y: H * (0.3 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 8,
      vy: -14 - Math.random() * 16, rot: 0, spin: 0, life: 1.6 + Math.random() * 0.8, max: 2.4, r: 3 + Math.random() * 3, color: "#FFD23F" });
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
   With no creaky boards and no arrows, no slide can ever ruin a level, so "the shortest way
   to tuck in one more cat" is always a safe hint. hintPath(bedId) asks that for one bed alone,
   with every other bed staying where it is.
   Creaky boards and one-way floor change that: a careless path can break a board that is
   needed later, or slide a bed where it can never come back from. So on those levels the
   hint only shows moves from a whole solution found from here, up to its next cat. If the
   search cannot finish, it says "Try undo or restart" and the Hint is not used up.
   On a phone a big search takes a while, so hints are worked out a little each frame
   (hintTick), while the Hint button shows that it is thinking. */
// One search over whole board states. Same rules as canStep and tools/levels.js slide():
// walls, holes, other beds, rails, locks, gates, cats of other colors, creaky boards
// breaking, one-way floor, and yarn balls pushed ahead of a bed.
// P: { rows, cols, colors, shapes, axis, lock, gate, ow, pos, cats, only, whole, cap }
//   cats: one character per cell: "#" a wall or a hole, "~" a creaky board, "y" a yarn ball, "." floor,
//   else a cat's color. Balls move, so where they are is part of each state (like the cats).
//   ow: per cell, -1, or the only way a bed on it may slide (an index into DIRS4).
//   whole = false: the shortest way to tuck in one more cat (any bed, or only bed "only").
//   whole = true: a way to tuck in every cat. With "only" set, that bed alone moves until it
//   has tucked in a cat. It aims for a finish first, so it may not be the very fewest slides.
// run(ms) works for about ms milliseconds, then returns null if it is not done yet, or
// { path } (every move as [bed, dr, dc, tucked a cat]), { none: true } or { capped: true }.
const DIRS4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];        // up, down, left, right: also the arrows ^ v < >
const ARROWS = "^v<>";
const SEARCH_WEIGHT = 3;                 // how much a whole search leans toward finishing over the fewest slides
function makeSearch(P) {
  const { rows, cols, colors, shapes, axis, lock, gate, ow, whole } = P;
  const nb = colors.length, N = rows * cols, cap = P.cap, only = P.only === undefined ? -1 : P.only;
  // the states, in arrays that grow as needed
  let size = 4096, posA = new Int16Array(size * nb), catsOf = new Int32Array(size), parent = new Int32Array(size);
  let mv = new Int16Array(size), gA = new Int16Array(size), freeA = new Uint8Array(size), hashA = new Int32Array(size);
  let heap = new Int32Array(size), pri = new Float64Array(size), table = new Int32Array(size * 2).fill(-1);
  const grow = () => {
    const more = (A, k) => { const B = new A.constructor(size * 2 * k); B.set(A); return B; };
    posA = more(posA, nb); catsOf = more(catsOf, 1); parent = more(parent, 1); mv = more(mv, 1); gA = more(gA, 1);
    freeA = more(freeA, 1); hashA = more(hashA, 1); heap = more(heap, 1); pri = more(pri, 1);
    size *= 2;
    table = new Int32Array(size * 2).fill(-1);                     // every state found so far, by its hash
    for (let s = 0; s < count; s++) { let at = hashA[s] & (table.length - 1); while (table[at] >= 0) at = (at + 1) & (table.length - 1); table[at] = s; }
  };
  const catsList = [], catsIds = new Map(), catsNeed = [], catsSpots = [];
  const colorAt = {}; colors.forEach((c, i) => { colorAt[c] = i; });
  const intern = s => {
    let id = catsIds.get(s);
    if (id === undefined) {
      id = catsList.length; catsList.push(s); catsIds.set(s, id);
      const need = new Int8Array(nb), spots = [];
      for (let k = 0; k < N; k++) { const b = colorAt[s[k]]; if (b !== undefined) { need[b]++; spots.push(k, b); } }
      catsNeed.push(need); catsSpots.push(spots);
    }
    return id;
  };
  // reach[b][p * N + k]: the fewest slides bed b needs from p to cover cell k, alone on the board
  // with the walls and holes there are now (rails and arrows count; 99: never). Holes only grow,
  // so this never says more than it really takes.
  const reach = !whole ? null : colors.map((_, b) => {
    const t = new Uint8Array(N * N).fill(99), sh = shapes[b], dist = new Uint8Array(N), q = new Int16Array(N);
    const fits = (r0, c0) => { for (const [sr, sc] of sh) { const r = r0 + sr, c = c0 + sc; if (r < 0 || c < 0 || r >= rows || c >= cols || P.cats[r * cols + c] === "#") return false; } return true; };
    for (let p0 = 0; p0 < N; p0++) {
      if (!fits((p0 / cols) | 0, p0 % cols)) continue;
      dist.fill(99); dist[p0] = 0;
      let qh = 0, qt = 0; q[qt++] = p0;
      while (qh < qt) {
        const p = q[qh++], pr = (p / cols) | 0, pc = p % cols;
        for (const [sr, sc] of sh) { const k = p0 * N + (pr + sr) * cols + pc + sc; if (dist[p] < t[k]) t[k] = dist[p]; }
        for (let d = 0; d < 4; d++) {
          const dr = DIRS4[d][0], dc = DIRS4[d][1], np = (pr + dr) * cols + pc + dc;
          if ((axis[b] === "h" && dr) || (axis[b] === "v" && dc) || !fits(pr + dr, pc + dc) || dist[np] !== 99) continue;
          let ok = true;
          for (const [sr, sc] of sh) { const a = (pr + sr) * cols + pc + sc, z = a + dr * cols + dc; if ((ow[a] >= 0 && ow[a] !== d) || (ow[z] >= 0 && ow[z] !== d)) { ok = false; break; } }
          if (ok) { dist[np] = dist[p] + 1; q[qt++] = np; }
        }
      }
    }
    return t;
  });
  // A guess of the slides still needed: each bed's farthest cat. -1: a bed can never reach one of its cats.
  const guess = (base, cid) => {
    if (!whole) return 0;
    const spots = catsSpots[cid], far = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let j = 0; j < spots.length; j += 2) {
      const b = spots[j + 1], p = posA[base + b];
      if (p < 0) continue;
      const d = reach[b][p * N + spots[j]];
      if (d === 99) return -1;
      if (d > far[b]) far[b] = d;
    }
    let h = 0;
    for (let b = 0; b < nb; b++) h += far[b];
    return h;
  };
  const hashOf = (base, cid, free) => {
    let h = Math.imul(cid + 1, 0x9E3779B1) ^ free;
    for (let i = 0; i < nb; i++) h = Math.imul(h ^ (posA[base + i] + 2), 0x85EBCA77) + 0x27D4EB2F | 0;
    return (h ^ (h >>> 15)) | 0;
  };
  // Is state t (already written at the end) one that was found before? If not, remember it.
  const isNew = t => {
    const h = hashA[t], tb = t * nb, mask = table.length - 1;
    let at = h & mask;
    for (let s = table[at]; s >= 0; at = (at + 1) & mask, s = table[at]) {
      if (hashA[s] !== h || catsOf[s] !== catsOf[t] || freeA[s] !== freeA[t]) continue;
      let same = true;
      for (let j = 0, sb = s * nb; j < nb; j++) if (posA[sb + j] !== posA[tb + j]) { same = false; break; }
      if (same) return false;
    }
    table[at] = t;
    return true;
  };
  let heapN = 0, count = 0, out = null;
  const push = s => {
    let i = heapN++;
    while (i > 0) { const up = (i - 1) >> 1; if (pri[heap[up]] <= pri[s]) break; heap[i] = heap[up]; i = up; }
    heap[i] = s;
  };
  const pop = () => {
    const top = heap[0], last = heap[--heapN];
    let i = 0;
    for (;;) {
      const a = 2 * i + 1;
      if (a >= heapN) break;
      const m = a + 1 < heapN && pri[heap[a + 1]] < pri[heap[a]] ? a + 1 : a;
      if (pri[heap[m]] >= pri[last]) break;
      heap[i] = heap[m]; i = m;
    }
    heap[i] = last;
    return top;
  };
  const walkBack = (s, last) => {
    const path = [last];
    for (let j = s; j > 0; j = parent[j]) { const m = mv[j], d = DIRS4[(m >> 1) & 3]; path.push([m >> 3, d[0], d[1], (m & 1) === 1]); }
    return path.reverse();
  };
  // the start
  for (let i = 0; i < nb; i++) posA[i] = P.pos[i];
  catsOf[0] = intern(P.cats); parent[0] = -1; hashA[0] = hashOf(0, catsOf[0], 0);
  count = 1; isNew(0); pri[0] = 0; push(0);
  if (P.pos.every(p => p < 0)) out = whole ? { path: [] } : { none: true };

  const occ = new Int8Array(N), eat = [], roll = [];
  function expand(s) {
    const base = s * nb, cid0 = catsOf[s], cats = catsList[cid0], need = catsNeed[cid0], free = freeA[s], g = gA[s];
    const creaks = cats.indexOf("~") >= 0;
    occ.fill(-1);
    for (let i = 0; i < nb; i++) { const p = posA[base + i]; if (p >= 0) { const pr = (p / cols) | 0, pc = p % cols; for (const [sr, sc] of shapes[i]) occ[(pr + sr) * cols + pc + sc] = i; } }
    for (let i = 0; i < nb; i++) {
      if (only >= 0 && i !== only && !free) continue;
      const p = posA[base + i];
      if (p < 0 || (lock[i] >= 0 && posA[base + lock[i]] >= 0)) continue;
      const pr = (p / cols) | 0, pc = p % cols;
      for (let d = 0; d < 4; d++) {
        const dr = DIRS4[d][0], dc = DIRS4[d][1];
        if ((axis[i] === "h" && dr) || (axis[i] === "v" && dc)) continue;
        const br = pr + dr, bc = pc + dc;
        let ok = true;
        eat.length = 0; roll.length = 0;
        for (const [sr, sc] of shapes[i]) {
          const r = br + sr, c = bc + sc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) { ok = false; break; }
          const idx = r * cols + c, ch = cats[idx], from = idx - dr * cols - dc;
          if ((occ[idx] !== -1 && occ[idx] !== i) || ch === "#" || (gate[idx] >= 0 && posA[base + gate[idx]] >= 0)) { ok = false; break; }
          if ((ow[idx] >= 0 && ow[idx] !== d) || (ow[from] >= 0 && ow[from] !== d)) { ok = false; break; }   // one-way floor
          if (ch === "y") {                                  // a yarn ball: pushed one cell on, onto plain floor only
            const yr = r + dr, yc = c + dc, yi = yr * cols + yc;
            if (yr < 0 || yc < 0 || yr >= rows || yc >= cols || cats[yi] !== "." || ow[yi] >= 0 || (occ[yi] !== -1 && occ[yi] !== i)) { ok = false; break; }
            for (const [tr, tc] of shapes[i]) if ((br + tr) * cols + bc + tc === yi) { ok = false; break; }   // nor into this bed's new cells
            if (!ok) break;
            roll.push(idx, yi);
            continue;
          }
          if (ch !== "." && ch !== "~") { if (ch !== colors[i]) { ok = false; break; } eat.push(idx); }
        }
        if (!ok || eat.length > need[i]) continue;
        if (eat.length && !whole) { out = { path: walkBack(s, [i, dr, dc, true]) }; return; }    // found the next cat
        const gone = eat.length > 0 && eat.length === need[i];
        // Tucked-in cats leave the floor. Creaky boards the bed no longer covers break; a full bed
        // leaves, and the boards under it break too.
        let a = null;
        if (eat.length) { a = cats.split(""); for (const e of eat) a[e] = "."; }
        if (roll.length) {
          a = a || cats.split("");
          for (let j = 0; j < roll.length; j += 2) a[roll[j]] = ".";
          for (let j = 0; j < roll.length; j += 2) a[roll[j + 1]] = "y";
        }
        if (creaks) for (const [sr, sc] of shapes[i]) {
          const from = (pr + sr) * cols + pc + sc, to = (br + sr) * cols + bc + sc;
          let still = false;
          if (!gone) for (const [tr, tc] of shapes[i]) if ((br + tr) * cols + bc + tc === from) { still = true; break; }
          if (!still && cats[from] === "~") (a || (a = cats.split("")))[from] = "#";
          if (gone && cats[to] === "~") (a || (a = cats.split("")))[to] = "#";
        }
        if (whole && gone) {
          let all = true;
          for (let j = 0; j < nb; j++) if (j !== i && posA[base + j] >= 0) { all = false; break; }
          if (all) { out = { path: walkBack(s, [i, dr, dc, true]) }; return; }     // every cat is in bed
        }
        if (count >= cap) { out = { capped: true }; return; }
        if (count >= size) grow();
        const t = count, tb = t * nb;
        for (let j = 0; j < nb; j++) posA[tb + j] = posA[base + j];
        posA[tb + i] = gone ? -1 : br * cols + bc;
        catsOf[t] = a ? intern(a.join("")) : cid0;
        freeA[t] = free || eat.length ? 1 : 0;
        hashA[t] = hashOf(tb, catsOf[t], freeA[t]);
        if (!isNew(t)) continue;
        parent[t] = s; mv[t] = (i << 3) | (d << 1) | (eat.length ? 1 : 0); gA[t] = g + 1;
        count++;
        const h = guess(tb, catsOf[t]);
        if (h < 0) continue;                                       // kept as seen, but a bed can never reach its cats from here
        pri[t] = g + 1 + SEARCH_WEIGHT * h - (g + 1) * 0.001;
        push(t);
      }
    }
  }
  return {
    get states() { return count; },
    run(ms) {
      const end = performance.now() + ms;
      for (let n = 1; !out; n++) {
        if (!heapN) { out = { none: true }; break; }
        if ((n & 7) === 0 && performance.now() > end) return null;
        expand(pop());
      }
      return out;
    },
  };
}

// The board as it is now, for a search.
function boardForSearch(only, whole, cap) {
  const N = rows * cols, colors = L.beds.map(b => b.color);
  const gate = new Int8Array(N).fill(-1), ow = new Int8Array(N).fill(-1);
  let cats = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cat = floorCats[r][c], k = r * cols + c;
    cats += walls[r][c] || creaky[r][c] === 2 ? "#" : cat ? cat.color : creaky[r][c] === 1 ? "~" : ballAt(r, c) >= 0 ? "y" : ".";
    if (cat && cat.gate) gate[k] = colors.indexOf(cat.gate);
    ow[k] = oneway[r][c];
  }
  const live = id => beds.find(b => b.id === id);
  return { rows, cols, colors, cats, gate, ow, only, whole, cap,
    shapes: L.beds.map(b => b.cells), axis: L.beds.map(b => b.axis || ""), lock: L.beds.map(b => b.lock === undefined ? -1 : b.lock),
    pos: L.beds.map((_, i) => { const b = live(i); return b ? b.r * cols + b.c : -1; }) };
}
const HINT_CAP = 300000, HINT_BED_CAP = 150000, NEXT_CAP = 200000, SLICE_MS = 5;
const THINK_MAX = 8000;              // milliseconds of searching before a hint gives up (a very slow phone)
// A whole solution's moves up to (and with) the one that tucks in the next cat.
const upToCat = path => path.slice(0, path.findIndex(m => m[3]) + 1 || path.length).map(m => m.slice(0, 3));

// The same answer a hint gives, worked out all at once (for checks). null: nothing safe to show.
function hintPath(only) {
  const solve = (o, whole, cap) => makeSearch(boardForSearch(o, whole, cap)).run(Infinity);
  if (tricky()) { const r = solve(only, true, only === undefined ? HINT_CAP : HINT_BED_CAP); return r.path ? upToCat(r.path) : null; }
  const r = solve(only, false, NEXT_CAP);
  return r.path ? r.path.map(m => m.slice(0, 3)) : null;
}

// She picked a bed: start thinking. Nothing is used up until there is a move to show.
// Levels that can be ruined: first a whole solution for any bed (or the rest of the last one,
// if she followed it); if its next cat is not for her bed, a whole solution where her bed goes
// first. Other levels: the next cat for her bed, else the next cat for any bed.
function startHint(bed) {
  thinking = { bed: bed.id, safe: tricky(), step: tricky() ? "any" : "bed", job: null, any: null, spent: 0 };
}
function hintStep(th) {
  if (th.safe && th.step === "any" && !th.job && memo && memo.at < memo.path.length) return { path: memo.path.slice(memo.at) };
  if (!th.job) {
    const whole = th.safe, only = th.step === "bed" ? th.bed : undefined;
    th.job = makeSearch(boardForSearch(only, whole, whole ? (only === undefined ? HINT_CAP : HINT_BED_CAP) : NEXT_CAP));
  }
  const t0 = performance.now(), r = th.job.run(SLICE_MS);
  th.spent += performance.now() - t0;
  return r;
}
function hintTick() {
  const th = thinking;
  if (!th) return;
  const r = hintStep(th);
  if (!r && th.spent > THINK_MAX) { hintDone(null); return; }            // a very slow phone: give up rather than make her wait
  if (!r) return;                                                         // still thinking
  th.job = null;
  if (!th.safe) {
    if (r.path) { hintDone(r.path.map(m => m.slice(0, 3)), th.step === "any"); return; }
    if (th.step === "bed") { th.step = "any"; return; }
    hintDone(null); return;
  }
  if (th.step === "any") {
    if (r.none) { stuck = true; sfx.no(); }                               // no way to win from here at all
    if (!r.path) { hintDone(null); return; }
    memo = { path: r.path, at: 0 };
    th.any = r.path;
    const next = r.path.find(m => m[3]);
    if (!next || next[0] === th.bed) { hintDone(upToCat(r.path), false); return; }
    th.step = "bed"; return;                                              // her bed: can it go first?
  }
  if (r.path) { memo = { path: r.path, at: 0 }; hintDone(upToCat(r.path), false); return; }
  hintDone(upToCat(th.any), true);                                        // her bed has to wait: show what helps instead
}
function hintDone(path, wait) {
  const safe = thinking && thinking.safe;
  thinking = null;
  if (!path || !path.length) { toast(t(safe ? "hint_lost" : "no_hint")); sfx.no(); return; }   // nothing to show: the hint is not used up
  if (S.pu.hint <= 0) return;
  S.pu.hint--; save(); usedPowerup = true;
  setGuide(runsOf(path)); hinting = true;
  if (wait) toast(t("bed_wait"));
  sfx.magic();
}
// Each frame: a few milliseconds of searching, for the hint first, then for the trapped check.
function searchTick() {
  if (screen !== "game" || overlay) return;
  if (thinking) { hintTick(); return; }
  if (stuckJob) {
    const r = stuckJob.run(SLICE_MS);
    if (!r) return;
    stuckJob = null;
    if (r.none && catsLeft && !overlay) { stuck = true; sfx.no(); }       // a card above the powerups says so (screens.js)
  }
}

/* ---------- buying: always ask first ----------
   Nothing is ever spent without a yes. askBuy shows a small card (drawn in
   screens.js) with the thing, its price and her coins. "item" is
   { name, price, pic: ["hat" | "neck" | "pu", id] }. onYes runs after the coins are taken. */
function askBuy(item, onYes) {
  if (S.coins < item.price) { toast(t("need_coins", item.price - S.coins)); sfx.no(); return; }
  overlay = { kind: "buy", t: 1, delay: 0, at: time, item, onYes, prev: overlay };    // "prev": the card to go back to (Time's up)
}
function buyNo() { if (overlay && overlay.kind === "buy") overlay = overlay.prev || null; }
function buyYes() {
  const o = overlay;
  if (!o || o.kind !== "buy") return;
  overlay = o.prev || null;
  if (S.coins < o.item.price) return;
  S.coins -= o.item.price;
  sfx.coin();
  o.onYes();
  save();
}

/* ---------- powerups ---------- */
// Run "then" once she owns at least one of this powerup. With none left she is
// asked whether to buy one; saying no changes nothing. Using it up is the caller's job.
function needPowerup(id, then) {
  if (S.pu[id] > 0) { then(); return; }
  const price = POWERUPS.find(q => q.id === id).price;
  askBuy({ name: t("pu_" + id), price, pic: ["pu", id] }, () => { S.pu[id]++; then(); });
}
function cancelAim() { aim = null; }

// Hint: she taps Hint, then a bed. The finger shows how that bed reaches its next cat.
function useHint() {
  if (overlay || !beds.length) return;
  if (thinking) { thinking = null; return; }             // tapping it while it thinks stops it (nothing used up)
  if (aim === "hint") { cancelAim(); return; }           // tapping the button again backs out
  needPowerup("hint", () => { aim = "hint"; });
}
function hintBed(bed) {
  aim = null;
  if (overlay || S.pu.hint <= 0 || !beds.includes(bed)) return;
  if (hinting) { hinting = false; guideRuns = []; }
  startHint(bed);                                        // the answer comes a few frames later (hintTick)
}
function useSnooze() {
  if (!S.timer) { toast(t("no_timer")); sfx.no(); return; }
  if (overlay && overlay.kind !== "lose") return;
  needPowerup("snooze", () => {
    S.pu.snooze--; save();
    timeLeft += 30; lastTick = 0; snoozed = true; usedPowerup = true;
    if (overlay) { overlay = null; timerOn = true; }         // time was up: back into the level
    sfx.magic();
    burst(W / 2, topY + 85, "spark", "#3B8BEF", 14);
  });
}
// Treat: she taps Treat, then the cat she wants tucked in.
function useTreat() {
  if (overlay || !catsLeft) return;
  if (aim === "treat") { cancelAim(); return; }
  needPowerup("treat", () => { aim = "treat"; });
}
function treatCat(r, c) {
  aim = null;
  const cat = floorCats[r] && floorCats[r][c];
  const bed = cat && beds.find(b => b.color === cat.color);
  if (overlay || !bed || S.pu.treat <= 0) return;
  S.pu.treat--; save(); usedPowerup = true;                // used up only now, when a cat was really chosen
  undoStack.push(Object.assign(snapshot(), { treat: true }));
  thinking = null; memo = null;
  slides += 4;                                             // a Treat skips real moves, so it counts as four slides
  timerOn = true; touched = true;
  cat.hidden = false;
  tuck(bed, r, c);
  sfx.magic(); sfx.meow(0.15, VOICE[skin(cat.color)]);
  if (hinting) { hinting = false; guideRuns = []; }
  if (bed.need === 0) { completeBed(bed); if (breakUncovered(bedCells(bed)) || creaky.some(row => row.includes(2))) checkStuck(); }
  if (catsLeft === 0 && !overlay) finish("win", LEAVE + 0.1);
}

// Hammer: she taps Hammer, then a hole. The hole becomes a creaky board again.
const hasHoles = () => creaky.some(row => row.includes(2));
function useHammer() {
  if (overlay) return;
  if (aim === "hammer") { cancelAim(); return; }
  if (!hasHoles()) { toast(t("no_holes")); sfx.no(); return; }      // nothing to fix, so nothing is used or bought
  needPowerup("hammer", () => { aim = "hammer"; });
}
function fixHole(r, c) {
  aim = null;
  if (overlay || S.pu.hammer <= 0 || !creaky[r] || creaky[r][c] !== 2) return;
  S.pu.hammer--; save(); usedPowerup = true;               // used up only now, when a hole was really fixed
  undoStack.push(Object.assign(snapshot(), { hammer: true }));
  creaky[r][c] = 1; fixT[r * cols + c] = time;
  thinking = null; memo = null;
  if (hinting) { hinting = false; guideRuns = []; }
  timerOn = true; touched = true;
  burst(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, "spark", "#D9A86C", 12);
  sfx.place(); sfx.magic();
  stuck = false; checkStuck();                             // a fixed board may open the way again
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
      const across = Math.abs(dc) >= Math.abs(dr);
      if (across) bed.nx = Math.sign(dc) * 0.09; else bed.ny = Math.sign(dr) * 0.09;
      if (time - lastBump > 0.25) {                         // and a short, gentle shake of this bed alone
        bed.shakeT = time; bed.shakeX = across ? 1 : 0; bed.shakeY = across ? 0 : 1;
      }
      // an arrow that says no flashes, so she can see why
      for (const [ddr, ddc] of [[Math.abs(dr) > 0.55 ? Math.sign(dr) : 0, 0], [0, Math.abs(dc) > 0.55 ? Math.sign(dc) : 0]]) {
        if (ddr || ddc) for (const [r, c] of arrowsRefuse(bed, ddr, ddc)) arrowT[r * cols + c] = time;
      }
      sfx.bump();
    }
    break;
  }
}
