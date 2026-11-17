// Level maker + checker for Drop the Bean.
//
// Rules (same as the game):
//  - A bed is a block of cells with a color and a number of cats it still needs.
//  - A bed slides one cell at a time: up, down, left or right.
//  - It can't leave the board, enter a wall, overlap another bed,
//    or move onto a cat of a different color.
//  - Moving onto cats of its own color tucks them in. When it needs
//    no more cats, the bed leaves the board.
//  - Each color has exactly one bed per level.
//  - Rail beds ("axis") only slide side to side ("h") or up and down ("v").
//  - A locked bed ("lock": id of its key bed) can't move until the key bed is full.
//  - A gate ([r, c, color]) fences in one cat. No bed may enter that cell
//    until the bed of the gate's color is full.
//  - Blankets ([r, c]) only hide a cat's color from the player. Rules don't change.
//  - Every bed needs exactly as many cats as it has cells: a 3-square bed takes 3 cats.
//  - Creaky boards ("c" in the map) are floor that any bed may slide onto. The
//    moment no bed covers a creaky board any more (the bed slid off it, or it
//    filled up and left while on it) the board breaks for good and is a wall.
//  - One-way tiles ("^", "v", "<", ">" in the map) are floor with an arrow. A bed
//    may only slide in the arrow's direction while any part of it is on such a
//    tile, before or after the slide. So it can only enter, ride along and
//    leave in that direction, and can not come back the same way. They never break.
//  - Yarn balls ("y" in the map) sit on plain floor. When a bed slides onto a
//    ball's cell, the ball rolls one cell on, the same way. It may only roll onto
//    plain floor ("."): no cat, no bed, no other ball, no wall, hole, creaky
//    board or one-way tile, and not off the board. If a ball can't roll, the
//    bed can't slide. Balls never go away, and a ball in a corner stays stuck.
//  - Creaky boards, one-way tiles and yarn balls are the things that can ruin a level.
//
// Levels are not just "solvable". Each candidate is played by a pretend player
// who never plans (always walks a bed to the nearest cat). Every time that
// player gets stuck because a bed has to step aside first, the level has a
// real puzzle in it. Only levels with enough of those moments are kept, and
// later chapters ask for more. Chapters are ordered in waves: harder, harder,
// peak, then a breather.
//
// Run:  node tools/levels.js 1        (makes chapter 1. Any chapter number works:
//                                      chapter 9 and up come from a formula, see "seasons")
//       node tools/levels.js topup 5  (fills chapter 5 up to 25 if it came out short)
//       node tools/levels.js swap 29  (swaps the levels SWAPS lists in that chapter file)
//       node tools/levels.js merge    (joins all chapter files there are, 1, 2, 3 ... until
//                                      one is missing, into levels-data.js)
//       node tools/check.js           (replays every stored solution and checks the rules)
// A chapter always comes out the same, on any computer, and does not look at
// other chapters. So new chapters can be added later without touching old ones.

"use strict";
const fs = require("fs");
const path = require("path");

const SHAPES = {
  dot: [[0, 0]],
  i2h: [[0, 0], [0, 1]], i2v: [[0, 0], [1, 0]],
  i3h: [[0, 0], [0, 1], [0, 2]], i3v: [[0, 0], [1, 0], [2, 0]],
  l3a: [[0, 0], [1, 0], [1, 1]], l3b: [[0, 0], [0, 1], [1, 0]],
  l3c: [[0, 0], [0, 1], [1, 1]], l3d: [[0, 1], [1, 0], [1, 1]],
  o4: [[0, 0], [0, 1], [1, 0], [1, 1]],
  l4a: [[0, 0], [1, 0], [2, 0], [2, 1]], l4b: [[0, 0], [0, 1], [0, 2], [1, 0]],
  l4c: [[0, 0], [0, 1], [1, 1], [2, 1]], l4d: [[0, 2], [1, 0], [1, 1], [1, 2]],
  t4a: [[0, 0], [0, 1], [0, 2], [1, 1]], t4b: [[0, 1], [1, 0], [1, 1], [2, 1]],
  t4c: [[0, 1], [1, 0], [1, 1], [1, 2]], t4d: [[0, 0], [1, 0], [1, 1], [2, 0]],
  // the family bed: 6 cells, so 6 cats. Only from chapter 33, at most one per level.
  f6h: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], f6v: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]],
};
// the shapes sorted by how many cells they have: BY_SIZE[3] = all the 3-cell shapes
const BY_SIZE = [[], [], [], [], []];
for (const cells of Object.values(SHAPES)) (BY_SIZE[cells.length] || (BY_SIZE[cells.length] = [])).push(cells);
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// one-way tiles, in the same order as DIRS: up, down, left, right
const ARROWS = "^v<>", FLOOR = ".c" + ARROWS;
// k = Bean (black and white), g = Meowsy (grey and white tabby): the two stars come first,
// so they are in almost every level. Then Pinto, Navy, Butter, Jelly, Eda.
const COLOR_ORDER = ["k", "g", "o", "b", "w", "p", "m"];

/* ---------- shared rule engine ---------- */
function prepare(level) {
  const { rows, cols } = level;
  const colors = level.beds.map(b => b.color);
  const gate = new Int8Array(rows * cols).fill(-1);
  for (const [r, c, color] of level.gates || []) gate[r * cols + c] = colors.indexOf(color);
  return {
    rows, cols, N: rows * cols, colors, gate,
    creaky: level.map.join("").includes("c"),
    yarn: level.map.join("").includes("y"),
    arrows: /[\^v<>]/.test(level.map.join("")),
    shapes: level.beds.map(b => b.cells),
    axis: level.beds.map(b => b.axis || ""),
    lock: level.beds.map(b => b.lock === undefined ? -1 : b.lock),
  };
}
const startState = level => ({
  pos: level.beds.map(b => b.r * level.cols + b.c),
  need: level.beds.map(b => b.need),
  cats: level.map.join(""),
});
const keyOf = s => s.pos.join(",") + "/" + s.need.join("") + "/" + s.cats;

function occupancy(P, s, occ) {
  occ.fill(-1);
  for (let i = 0; i < s.pos.length; i++) if (s.pos[i] >= 0) {
    const br = (s.pos[i] / P.cols) | 0, bc = s.pos[i] % P.cols;
    for (const [dr, dc] of P.shapes[i]) occ[(br + dr) * P.cols + bc + dc] = i;
  }
}

// One slide of bed i. Returns the new state, or null if the slide is not allowed.
function slide(P, s, occ, i, dr, dc) {
  if (s.pos[i] < 0) return null;
  if (P.lock[i] >= 0 && s.pos[P.lock[i]] >= 0) return null;
  if (P.axis[i] === "h" && dr !== 0) return null;
  if (P.axis[i] === "v" && dc !== 0) return null;
  const br = ((s.pos[i] / P.cols) | 0) + dr, bc = (s.pos[i] % P.cols) + dc;
  let eat = null, roll = null;
  for (const [sr, sc] of P.shapes[i]) {
    const r = br + sr, c = bc + sc;
    if (r < 0 || c < 0 || r >= P.rows || c >= P.cols) return null;
    const idx = r * P.cols + c;
    if (P.arrows) {
      // one-way tiles: every arrow under the bed, before or after the slide, must point the way it slides
      const way = dr < 0 ? "^" : dr > 0 ? "v" : dc < 0 ? "<" : ">";
      const before = s.cats[idx - dr * P.cols - dc], after = s.cats[idx];
      if (ARROWS.includes(before) && before !== way) return null;
      if (ARROWS.includes(after) && after !== way) return null;
    }
    if (occ[idx] !== -1 && occ[idx] !== i) return null;
    if (P.gate[idx] >= 0 && s.pos[P.gate[idx]] >= 0) return null;       // gate still closed
    const ch = s.cats[idx];
    if (ch === "#") return null;
    if (ch === "y") { (roll || (roll = [])).push(idx); continue; }        // a yarn ball: it has to roll on
    if (!FLOOR.includes(ch)) {
      if (ch !== P.colors[i]) return null;
      (eat || (eat = [])).push(idx);
    }
  }
  if (eat && eat.length > s.need[i]) return null;
  let rolled = null;
  if (roll) {
    // every ball rolls one cell on, onto plain floor that nothing else is on
    const mine = new Set(P.shapes[i].map(([sr, sc]) => (br + sr) * P.cols + bc + sc));
    for (const idx of roll) {
      const r = ((idx / P.cols) | 0) + dr, c = (idx % P.cols) + dc, to = r * P.cols + c;
      if (r < 0 || c < 0 || r >= P.rows || c >= P.cols) return null;
      if (s.cats[to] !== "." || occ[to] !== -1 || mine.has(to)) return null;
      (rolled || (rolled = [])).push([idx, to]);
    }
  }
  const pos = s.pos.slice();
  pos[i] = br * P.cols + bc;
  let cats = s.cats, need = s.need, gone = false, a = null;
  if (rolled) {
    a = cats.split("");
    for (const [from, to] of rolled) { a[from] = "."; a[to] = "y"; }
  }
  if (eat) {
    a = a || cats.split("");
    for (const e of eat) a[e] = ".";
    need = need.slice();
    need[i] -= eat.length;
    gone = need[i] === 0;
    if (gone) pos[i] = -1;
  }
  if (P.creaky) {
    // creaky boards the bed was on and is not on any more break. If the bed is
    // full and leaves, the boards under it break as well.
    const still = new Set();
    if (!gone) for (const [sr, sc] of P.shapes[i]) still.add((br + sr) * P.cols + bc + sc);
    const breakAt = idx => { if (cats[idx] === "c" && !still.has(idx)) (a || (a = cats.split("")))[idx] = "#"; };
    const or = (s.pos[i] / P.cols) | 0, oc = s.pos[i] % P.cols;
    for (const [sr, sc] of P.shapes[i]) { breakAt((or + sr) * P.cols + oc + sc); breakAt((br + sr) * P.cols + bc + sc); }
  }
  if (a) cats = a.join("");
  return { pos, need, cats, ate: !!eat };
}

/* ---------- solver: fewest single-cell slides ---------- */
function solve(level, cap = 150000) {
  const P = prepare(level), start = startState(level);
  const states = [start], parent = [-1], mv = [null];
  const seen = new Set([keyOf(start)]);
  const occ = new Int8Array(P.N);
  for (let head = 0; head < states.length; head++) {
    const s = states[head];
    occupancy(P, s, occ);
    for (let i = 0; i < s.pos.length; i++) for (const [dr, dc] of DIRS) {
      const ns = slide(P, s, occ, i, dr, dc);
      if (!ns) continue;
      const k = keyOf(ns);
      if (seen.has(k)) continue;
      seen.add(k);
      states.push(ns); parent.push(head); mv.push([i, dr, dc]);
      if (ns.ate && ns.pos.every(p => p < 0)) {
        const out = [];
        for (let j = states.length - 1; j > 0; j = parent[j]) out.push(mv[j]);
        out.reverse();
        let switches = 0;
        for (let j = 1; j < out.length; j++) if (out[j][0] !== out[j - 1][0]) switches++;
        return { d: out.length, switches, path: out, states: states.length };
      }
      if (states.length > cap) return { d: -2 };
    }
  }
  return { d: -1 };
}

/* ---------- how much thinking does a level need? ----------
   Round 1: which beds can finish on their own, with everything else frozen?
   Take those away. Round 2: which can finish now? And so on.
   More rounds = a longer chain of "this one first". If a round finds no bed
   at all, some bed has to step aside for another: that is marked "tricky". */
function soloFinish(P, s, i, cap = 4000) {
  const occ = new Int8Array(P.N);
  const seen = new Set([s.pos[i] + "/" + s.cats]);
  const queue = [s];
  for (let head = 0; head < queue.length && queue.length < cap; head++) {
    const cur = queue[head];
    occupancy(P, cur, occ);
    for (const [dr, dc] of DIRS) {
      const ns = slide(P, cur, occ, i, dr, dc);
      if (!ns) continue;
      if (ns.pos[i] < 0) return true;
      const k = ns.pos[i] + "/" + ns.cats;
      if (seen.has(k)) continue;
      seen.add(k); queue.push(ns);
    }
  }
  return false;
}
function thinking(level) {
  const P = prepare(level);
  let s = startState(level), rounds = 0, tricky = false;
  while (s.pos.some(p => p >= 0)) {
    const done = [];
    for (let i = 0; i < s.pos.length; i++) if (s.pos[i] >= 0 && soloFinish(P, s, i)) done.push(i);
    if (!done.length) { tricky = true; break; }
    const pos = s.pos.slice(), need = s.need.slice();
    let cats = s.cats;
    for (const i of done) { pos[i] = -1; need[i] = 0; cats = cats.split(P.colors[i]).join("."); }
    s = { pos, need, cats };
    rounds++;
  }
  return { rounds, tricky };
}

/* ---------- fast engine (only used while making levels) ----------
   The simple engine above is easy to read but slow. To try thousands of
   boards we turn a level into number tables once ("compile") and search
   on those. check.js still replays every kept level with the simple engine.

   The cats are numbered and kept in one number ("mask"): bit n is on while
   cat n is still on the floor. A bed is gone when all its cats are tucked in,
   so the fast engine needs every bed to have exactly as many cats as it needs.
   The creaky boards sit in the same number, above the cats: their bit is on
   while the board is whole. C.cats and C.creak say which bits are which.
   Yarn balls move, so they are kept in a second number ("balls", see
   packBalls). Every search keeps it next to the mask for each position. */
const STEPS = 4, NEVER = 9999;
function compile(level) {
  const { rows, cols } = level, N = rows * cols, nb = level.beds.length;
  const flat = level.map.join("");
  const colors = level.beds.map(b => b.color);
  const catAt = new Int8Array(N).fill(-1), catBed = [], own = [], shift = [], count = [];
  for (let b = 0; b < nb; b++) {
    shift.push(catBed.length);
    let m = 0;
    for (let i = 0; i < N; i++) if (flat[i] === colors[b]) { catAt[i] = catBed.length; m |= 1 << catBed.length; catBed.push(b); }
    own.push(m); count.push(catBed.length - shift[b]);
    if (count[b] !== level.beds[b].need || count[b] < 1) return null;
  }
  for (let i = 0; i < N; i++) if (flat[i] !== "#" && flat[i] !== "y" && !FLOOR.includes(flat[i]) && catAt[i] < 0) return null;   // a cat with no bed
  // yarn balls: where they start (at most 3, see packBalls), and where a ball may roll to:
  // plain floor, or a cat's cell once the cat is tucked in
  const ballCells = [];
  for (let i = 0; i < N; i++) if (flat[i] === "y") ballCells.push(i);
  if (ballCells.length > 3) return null;
  const rollable = new Uint8Array(N), wall = new Uint8Array(N);
  for (let i = 0; i < N; i++) wall[i] = flat[i] === "#" ? 1 : 0;
  for (let i = 0; i < N; i++) rollable[i] = flat[i] === "." || flat[i] === "y" || catAt[i] >= 0 ? 1 : 0;
  // step[cell * 4 + dir]: the next cell that way, or -1 off the board
  const step = new Int8Array(N * STEPS).fill(-1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) DIRS.forEach(([dr, dc], d) => {
    if (r + dr >= 0 && c + dc >= 0 && r + dr < rows && c + dc < cols) step[(r * cols + c) * STEPS + d] = (r + dr) * cols + c + dc;
  });
  // one-way tiles: which way each one points (-1: not an arrow)
  const arrowAt = new Int8Array(N).fill(-1);
  let nArrows = 0;
  for (let i = 0; i < N; i++) if (ARROWS.includes(flat[i])) { arrowAt[i] = ARROWS.indexOf(flat[i]); nArrows++; }
  const nCats = catBed.length, creakAt = new Int8Array(N).fill(-1);
  let nCreak = 0;
  for (let i = 0; i < N; i++) if (flat[i] === "c") creakAt[i] = nCats + nCreak++;
  if (nCats + nCreak > 30) return null;                              // would not fit in one number
  const gate = new Int8Array(N).fill(-1);
  for (const [r, c, color] of level.gates || []) gate[r * cols + c] = colors.indexOf(color);
  // cover[b][pos]: the cells bed b lies on when its corner is at pos (null: off the board or in a wall)
  // under[b][pos]: which of its own cats are under it there
  // next[b][pos * 4 + dir]: where one slide takes it, or -1
  // crk[b][pos]: the creaky boards under it there (as bits of the mask)
  // arw[b][pos]: a one-way tile under it there (its cell), or -1
  const cover = [], under = [], next = [], crk = [], arw = [];
  level.beds.forEach((bed, b) => {
    const cv = new Array(N).fill(null), un = new Uint8Array(N), nx = new Int8Array(N * STEPS).fill(-1), ck = new Int32Array(N), aw = new Int8Array(N).fill(-1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cells = [];
      for (const [dr, dc] of bed.cells) {
        const rr = r + dr, cc = c + dc;
        if (rr >= rows || cc >= cols || flat[rr * cols + cc] === "#") { cells.length = 0; break; }
        cells.push(rr * cols + cc);
      }
      if (!cells.length) continue;
      cv[r * cols + c] = cells;
      for (const idx of cells) if (catAt[idx] >= 0 && catBed[catAt[idx]] === b) un[r * cols + c] |= 1 << (catAt[idx] - shift[b]);
      for (const idx of cells) if (creakAt[idx] >= 0) ck[r * cols + c] |= 1 << creakAt[idx];
      for (const idx of cells) if (arrowAt[idx] >= 0) aw[r * cols + c] = idx;
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) DIRS.forEach(([dr, dc], d) => {
      if ((bed.axis === "h" && dr) || (bed.axis === "v" && dc)) return;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || !cv[rr * cols + cc]) return;
      // every arrow under the bed, before or after the slide, must point the way it slides
      if (nArrows && cv[r * cols + c] && cv[r * cols + c].concat(cv[rr * cols + cc]).some(idx => arrowAt[idx] >= 0 && arrowAt[idx] !== d)) return;
      nx[(r * cols + c) * STEPS + d] = rr * cols + cc;
    });
    cover.push(cv); under.push(un); next.push(nx); crk.push(ck); arw.push(aw);
  });
  const C = {
    rows, cols, N, nb, catAt, catBed, own, shift, count, gate, cover, under, next, crk, creakAt, nCreak, arw,
    arrows: nArrows,
    nBalls: ballCells.length, ball0: packBalls(ballCells), rollable, step, wall,
    risky: nCreak > 0 || nArrows > 0 || ballCells.length > 0,        // a slide can ruin this level
    lock: level.beds.map(b => b.lock === undefined ? -1 : b.lock),
    start: level.beds.map(b => b.r * cols + b.c),
    nCats, cats: (1 << nCats) - 1,                                   // the cat bits
    creak: ((1 << nCreak) - 1) << nCats,                             // the creaky board bits
    full: (1 << (nCats + nCreak)) - 1,
    solo: level.beds.map(() => new Map()),                           // memory for soloCan
  };
  C.far = level.beds.map((_, b) => farTable(C, b));
  // a bed that could not reach all its cats even on an empty board: no need to search
  for (let b = 0; b < nb; b++) if (C.far[b][C.start[b] << count[b] | ((1 << count[b]) - 1)] >= NEVER) return null;
  return C;
}

// far[b][pos << cats | left]: the fewest slides bed b needs from pos to tuck in the
// cats in "left", if it were alone on the board (only walls and its rail count).
// The real answer can never be smaller, which lets the solver skip hopeless paths.
function farTable(C, b) {
  const k = C.count[b], N = C.N, nx = C.next[b], un = C.under[b];
  const far = new Int16Array(N << k).fill(NEVER);
  for (let pos = 0; pos < N; pos++) far[pos << k] = 0;
  for (let left = 1; left < 1 << k; left++) {
    for (let changed = true; changed;) {
      changed = false;
      for (let pos = 0; pos < N; pos++) for (let d = 0; d < STEPS; d++) {
        const np = nx[pos * STEPS + d];
        if (np < 0) continue;
        const v = 1 + far[np << k | (left & ~un[np])];
        if (v < far[pos << k | left]) { far[pos << k | left] = v; changed = true; }
      }
    }
  }
  return far;
}

// Yarn balls, packed into one number: the cells, smallest first, 6 bits each.
const packBalls = cells => cells.slice().sort((a, b) => a - b).reduce((key, c, j) => key + (c + 1) * POW[j], 0);
const unpackBalls = key => { const out = []; for (; key > 0; key = Math.floor(key / 64)) out.push(key % 64 - 1); return out; };
// The mask and the balls together, as one number to look a position up by.
const withBalls = (mask, balls) => mask + balls * 2147483648;
// The balls of the position being looked at (set by fillOcc or setBalls), and
// after the last slide moveMask allowed.
let BALLS_NOW = 0, BALLS_AFTER = 0;
const BALL_AT = new Uint8Array(64);
function setBalls(C, balls) {
  BALLS_NOW = balls;
  if (!C.nBalls) return;
  BALL_AT.fill(0, 0, C.N);
  for (const c of unpackBalls(balls)) BALL_AT[c] = 1;
}
function fillOcc(C, occ, pos, at, mask, balls = 0) {
  occ.fill(-1);
  for (let i = 0; i < C.nb; i++) if (C.own[i] & mask) {
    const cells = C.cover[i][pos[at + i]];
    for (let k = 0; k < cells.length; k++) occ[cells[k]] = i;
  }
  if (C.nBalls) setBalls(C, balls);
}
// Bed i slides from p to np: roll the balls on its new cells one cell on.
// Sets BALLS_AFTER. false if a ball can't roll (then the bed can't slide).
function rollBalls(C, occ, mask, i, p, np) {
  BALLS_AFTER = BALLS_NOW;
  const cells = C.cover[i][np], old = C.cover[i][p], diff = np - p;
  const d = diff === -C.cols ? 0 : diff === C.cols ? 1 : diff === -1 ? 2 : 3;
  let moved = null;
  for (let k = 0; k < cells.length; k++) {
    const idx = cells[k];
    if (!BALL_AT[idx] || old.includes(idx)) continue;
    const to = C.step[idx * STEPS + d];
    if (to < 0 || !C.rollable[to] || occ[to] >= 0 || BALL_AT[to] || cells.includes(to)) return false;
    const ci = C.catAt[to];
    if (ci >= 0 && (mask >>> ci & 1)) return false;                 // a cat is still there
    (moved || (moved = [])).push(idx, to);
  }
  if (moved) {
    const list = unpackBalls(BALLS_NOW);
    for (let k = 0; k < moved.length; k += 2) list[list.indexOf(moved[k])] = moved[k + 1];
    BALLS_AFTER = packBalls(list);
  }
  return true;
}
// Bed i slides from "p" onto the cells of "np". Returns the mask afterwards
// (cats left and creaky boards still whole), or -1 if it can't. With yarn
// balls, the balls afterwards are in BALLS_AFTER.
function moveMask(C, occ, mask, i, p, np) {
  const cells = C.cover[i][np];
  let eat = 0;
  for (let k = 0; k < cells.length; k++) {
    const idx = cells[k], o = occ[idx];
    if (o >= 0 && o !== i) return -1;
    const g = C.gate[idx];
    if (g >= 0 && (C.own[g] & mask)) return -1;                    // gate still closed
    const ci = C.catAt[idx];
    if (ci >= 0 && (mask >>> ci & 1)) {
      if (C.catBed[ci] !== i) return -1;
      eat |= 1 << ci;
    }
  }
  if (C.nBalls && !rollBalls(C, occ, mask, i, p, np)) return -1;
  if (!C.creak) return mask & ~eat;
  const on = C.crk[i][np];
  if (on & ~mask) return -1;                                       // a broken board is a hole
  let nm = mask & ~eat & ~(C.crk[i][p] & ~on);                     // boards it slid off break
  if (!(nm & C.own[i])) nm &= ~on;                                 // full and gone: the boards under it break too
  return nm;
}
const canMove = (C, mask, i) => (C.own[i] & mask) && (C.lock[i] < 0 || !(C.own[C.lock[i]] & mask));

// one big scratch pad for the searches, so nothing is created per board
const MAXN = 1200000, W = 7, POW = [1, 64, 4096, 262144, 16777216, 1073741824, 68719476736];
const B_POS = new Int8Array(MAXN * W), B_MASK = new Int32Array(MAXN), B_G = new Int16Array(MAXN), B_H = new Int16Array(MAXN);
const B_PAR = new Int32Array(MAXN), B_MV = new Int8Array(MAXN), B_DONE = new Uint8Array(MAXN), B_KEY = new Float64Array(MAXN);
const B_BALL = new Int32Array(MAXN);

/* ---------- the player who never plans ----------
   This player only looks one cat ahead: walk some bed to the nearest cat it
   can reach on its own, again and again. That is how most people play, and a
   level this player breezes through feels easy.
   Sometimes no bed can reach a cat on its own: another bed is in the way and
   has to step aside first. Each time that happens is one "step-aside moment".
   They are the real puzzle in a level, so the generator counts them ("asides").
   For such a moment the player gets the shortest way to the next cat that uses
   several beds. That is exactly what the Hint button in the game works out, so
   "cap" also makes sure the hint search stays small enough for a phone.

   Without creaky boards no slide can ever ruin a level, so going for "the next
   cat" always works if the level can be finished at all. That makes this the
   solvable-or-not test too: it returns null if the level can't be finished (or
   the search got too big), else { slides, asides, dead: false }.

   With creaky boards or one-way tiles this player can walk into a dead end.
   Then the answer is { slides, asides, dead: true }: the slides and
   step-asides up to that point. */
function plainPlayer(C, cap = 25000) {
  if (C.risky) return plainCreaky(C, cap);
  const occ = new Int8Array(C.N), nb = C.nb, pos = C.start.slice();
  const seenAt = new Int32Array(C.N), queue = new Int8Array(C.N), depth = new Int16Array(C.N);
  let mask = C.full, slides = 0, asides = 0, stamp = 0;
  while (mask) {
    // 1. the nearest cat one bed can walk to while the others stay put
    fillOcc(C, occ, pos, 0, mask);
    let best = 0, bestBed = -1, bestPos = 0, bestMask = 0;
    for (let i = 0; i < nb; i++) {
      if (!canMove(C, mask, i)) continue;
      stamp++;
      let n = 1, found = false;
      queue[0] = pos[i]; depth[0] = 0; seenAt[pos[i]] = stamp;
      for (let head = 0; head < n && !found; head++) {
        if (bestBed >= 0 && depth[head] + 1 >= best) break;        // can't beat the best so far
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][queue[head] * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, mask, i, queue[head], np);
          if (nm < 0) continue;
          if (nm !== mask) { best = depth[head] + 1; bestBed = i; bestPos = np; bestMask = nm; found = true; break; }
          if (seenAt[np] === stamp) continue;
          seenAt[np] = stamp; queue[n] = np; depth[n] = depth[head] + 1; n++;
        }
      }
    }
    if (bestBed >= 0) { slides += best; pos[bestBed] = bestPos; mask = bestMask; continue; }
    // 2. nobody can: some bed must step aside. Shortest way to a cat with all beds together.
    const seen = new Set();
    let key = 0, n = 1, hit = false;
    for (let i = 0; i < nb; i++) { B_POS[i] = pos[i]; if (C.own[i] & mask) key += (pos[i] + 1) * POW[i]; }
    B_KEY[0] = key; B_G[0] = 0; seen.add(key);
    for (let head = 0; head < n && !hit; head++) {
      fillOcc(C, occ, B_POS, head * W, mask);
      for (let i = 0; i < nb && !hit; i++) {
        if (!canMove(C, mask, i)) continue;
        const p = B_POS[head * W + i];
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][p * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, mask, i, p, np);
          if (nm < 0) continue;
          if (nm !== mask) {                                       // a cat! carry on from here
            for (let j = 0; j < nb; j++) pos[j] = B_POS[head * W + j];
            pos[i] = np; mask = nm; slides += B_G[head] + 1; asides++; hit = true; break;
          }
          const k = B_KEY[head] + (np - p) * POW[i];
          if (seen.has(k)) continue;
          if (n >= cap) return null;
          seen.add(k);
          for (let j = 0; j < nb; j++) B_POS[n * W + j] = B_POS[head * W + j];
          B_POS[n * W + i] = np; B_KEY[n] = k; B_G[n] = B_G[head] + 1; n++;
        }
      }
    }
    if (!hit) return null;
  }
  return { slides, asides, dead: false };
}
// The same player on a level with creaky boards, one-way tiles or yarn balls.
// Boards break and balls roll under way, so "where am I" is the bed positions
// plus which boards are still whole plus where the balls are.
function plainCreaky(C, cap) {
  const occ = new Int8Array(C.N), nb = C.nb, pos = C.start.slice();
  let mask = C.full, balls = C.ball0, slides = 0, asides = 0;
  const soloKey = (np, nm, bl) => C.nBalls ? np + "," + nm + "," + bl : np + nm * 64;
  while (mask & C.cats) {
    // 1. the nearest cat one bed can walk to while the others stay put
    fillOcc(C, occ, pos, 0, mask, balls);
    let best = 0, bestBed = -1, bestPos = 0, bestMask = 0, bestBalls = 0;
    for (let i = 0; i < nb; i++) {
      if (!canMove(C, mask, i)) continue;
      const seen = new Set([soloKey(pos[i], mask, balls)]), qp = [pos[i]], qm = [mask], qd = [0], qb = [balls];
      let found = false;
      for (let head = 0; head < qp.length && !found; head++) {
        if (bestBed >= 0 && qd[head] + 1 >= best) break;           // can't beat the best so far
        if (C.nBalls) setBalls(C, qb[head]);
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][qp[head] * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, qm[head], i, qp[head], np);
          if (nm < 0) continue;
          const nbl = C.nBalls ? BALLS_AFTER : 0;
          if ((nm & C.cats) !== (mask & C.cats)) { best = qd[head] + 1; bestBed = i; bestPos = np; bestMask = nm; bestBalls = nbl; found = true; break; }
          const k = soloKey(np, nm, nbl);
          if (seen.has(k)) continue;
          seen.add(k); qp.push(np); qm.push(nm); qd.push(qd[head] + 1); qb.push(nbl);
        }
      }
    }
    if (bestBed >= 0) { slides += best; pos[bestBed] = bestPos; mask = bestMask; balls = bestBalls; continue; }
    // 2. nobody can: shortest way to a cat with all beds together
    const seen = new Map();
    let key = 0, n = 1, hit = false;
    for (let i = 0; i < nb; i++) { B_POS[i] = pos[i]; if (C.own[i] & mask) key += (pos[i] + 1) * POW[i]; }
    B_KEY[0] = key; B_G[0] = 0; B_MASK[0] = mask; B_BALL[0] = balls; seen.set(withBalls(mask, balls), new Set([key]));
    for (let head = 0; head < n && !hit; head++) {
      const hm = B_MASK[head];
      fillOcc(C, occ, B_POS, head * W, hm, B_BALL[head]);
      for (let i = 0; i < nb && !hit; i++) {
        if (!canMove(C, hm, i)) continue;
        const p = B_POS[head * W + i];
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][p * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, hm, i, p, np);
          if (nm < 0) continue;
          const nbl = C.nBalls ? BALLS_AFTER : 0;
          if ((nm & C.cats) !== (hm & C.cats)) {                   // a cat! carry on from here
            for (let j = 0; j < nb; j++) pos[j] = B_POS[head * W + j];
            pos[i] = np; mask = nm; balls = nbl; slides += B_G[head] + 1; asides++; hit = true; break;
          }
          const k = B_KEY[head] + (np - p) * POW[i];
          let m = seen.get(withBalls(nm, nbl));
          if (!m) seen.set(withBalls(nm, nbl), m = new Set());
          if (m.has(k)) continue;
          if (n >= cap) return null;
          m.add(k);
          for (let j = 0; j < nb; j++) B_POS[n * W + j] = B_POS[head * W + j];
          B_POS[n * W + i] = np; B_KEY[n] = k; B_G[n] = B_G[head] + 1; B_MASK[n] = nm; B_BALL[n] = nbl; n++;
        }
      }
    }
    if (!hit) return { slides, asides, dead: true };               // no cat can be reached any more
  }
  return { slides, asides, dead: false };
}

/* ---------- creaky boards and one-way tiles: is this position already lost? ----------
   soloCan: could bed b still tuck in all its cats if it were alone on the
   board (no other beds, no other cats, all gates open), with the boards that
   are broken now, the boards it will break itself, and the one-way tiles? If
   not even that works, the position is lost for sure. Cheap, and it catches
   most ruined levels: a broken board or a one-way lane has cut a bed off from
   one of its cats. */
function soloCan(C, b, pos, mask, balls = 0) {
  if (C.nBalls && balls) return soloCanYarn(C, b, pos, mask, balls);
  const k = C.count[b], own0 = (mask >>> C.shift[b]) & ((1 << k) - 1);
  if (!own0) return true;
  const key = (p, o, c) => p + o * 64 + (c >>> C.nCats) * 4096;
  const cr0 = mask & C.creak, key0 = key(pos, own0, cr0), memo = C.solo[b];
  let can = memo.get(key0);
  if (can !== undefined) return can;
  const seen = new Set([key0]), qp = [pos], qo = [own0], qc = [cr0], nx = C.next[b], crk = C.crk[b];
  can = false;
  for (let head = 0; head < qp.length && !can; head++) for (let d = 0; d < STEPS; d++) {
    const p = qp[head], np = nx[p * STEPS + d];
    if (np < 0) continue;
    const on = crk[np];
    if (on & ~qc[head]) continue;                                  // a broken board is a hole
    const o = qo[head] & ~C.under[b][np];
    if (!o) { can = true; break; }
    const c = qc[head] & ~(crk[p] & ~on), kk = key(np, o, c);
    if (seen.has(kk)) continue;
    seen.add(kk); qp.push(np); qo.push(o); qc.push(c);
  }
  memo.set(key0, can);
  return can;
}
// The balls that can never be pushed again, by any bed: on both lines through
// it (up-down and left-right) there is no side a bed could push from and a
// free cell to push it to (walls, holes, creaky boards, one-way tiles, the
// edge of the board and other stuck balls all count). Such a ball is as good
// as a wall. Other balls might still be pushed out of the way some day.
function frozenBalls(C, mask, balls) {
  const cells = unpackBalls(balls), frozen = new Set();
  const hole = c => C.wall[c] || (C.creakAt[c] >= 0 && !(mask >>> C.creakAt[c] & 1));
  for (let changed = true; changed;) {
    changed = false;
    for (const x of cells) {
      if (frozen.has(x)) continue;
      let canPush = false;
      for (let d = 0; d < STEPS && !canPush; d++) {
        const back = C.step[x * STEPS + (d ^ 1)], to = C.step[x * STEPS + d];
        if (back >= 0 && !hole(back) && !frozen.has(back) && to >= 0 && C.rollable[to] && !frozen.has(to)) canPush = true;
      }
      if (!canPush) { frozen.add(x); changed = true; }
    }
  }
  return frozen;
}
// soloCan with yarn balls: the stuck balls (frozenBalls) are walls, the
// others are left out, since another bed might push them away.
function soloCanYarn(C, b, pos, mask, balls) {
  const frozen = frozenBalls(C, mask, balls);
  if (!frozen.size) return soloCan(C, b, pos, mask);
  const k = C.count[b], own0 = (mask >>> C.shift[b]) & ((1 << k) - 1);
  if (!own0) return true;
  const fz = [...frozen].sort((x, y) => x - y).join(".");
  if (C.cover[b][pos].some(c => frozen.has(c))) return true;      // can't happen: a bed is never on a ball
  const cr0 = mask & C.creak, key0 = pos + "," + own0 + "," + cr0 + "," + fz, memo = C.solo[b];
  let can = memo.get(key0);
  if (can !== undefined) return can;
  const seen = new Set([key0]), qp = [pos], qo = [own0], qc = [cr0], nx = C.next[b], crk = C.crk[b];
  can = false;
  for (let head = 0; head < qp.length && !can; head++) for (let d = 0; d < STEPS; d++) {
    const p = qp[head], np = nx[p * STEPS + d];
    if (np < 0) continue;
    const on = crk[np];
    if (on & ~qc[head]) continue;                                  // a broken board is a hole
    if (C.cover[b][np].some(c => frozen.has(c))) continue;         // a stuck ball is a wall
    const o = qo[head] & ~C.under[b][np];
    if (!o) { can = true; break; }
    const c = qc[head] & ~(crk[p] & ~on), kk = np + "," + o + "," + c + "," + fz;
    if (seen.has(kk)) continue;
    seen.add(kk); qp.push(np); qo.push(o); qc.push(c);
  }
  memo.set(key0, can);
  return can;
}
// Lost for sure? "pos" holds the bed positions from index "at" on.
function lostForSure(C, pos, at, mask, balls = 0) {
  for (let i = 0; i < C.nb; i++) if ((C.own[i] & mask) && !soloCan(C, i, pos[at + i], mask, balls)) return true;
  return false;
}

// Fewest single-cell slides, like solve() above but much faster.
// d: -1 no way, -2 search got too big, -3 needs more than dMax slides.
// "from" ({ pos, mask, balls }) starts the search somewhere else than the level's start.
// "hurry" above 1 gives up on "fewest" and just looks for any way to finish, fast.
function solveFast(C, dMax = 120, cap = 400000, from = null, hurry = 1) {
  const nb = C.nb, occ = new Int8Array(C.N), start = from ? from.pos : C.start, mask0 = from ? from.mask : C.full;
  const balls0 = from ? from.balls || 0 : C.ball0;
  const farOf = (i, p, mask) => C.far[i][p << C.count[i] | (mask >>> C.shift[i] & ((1 << C.count[i]) - 1))];
  let h0 = 0, key0 = 0;
  for (let i = 0; i < nb; i++) {
    B_POS[i] = start[i];
    if (C.own[i] & mask0) { h0 += farOf(i, start[i], mask0); key0 += (start[i] + 1) * POW[i]; }
  }
  if (h0 >= NEVER) return { d: -1 };
  if (C.risky && lostForSure(C, start, 0, mask0, balls0)) return { d: -1 };
  B_MASK[0] = mask0; B_G[0] = 0; B_H[0] = h0; B_PAR[0] = -1; B_DONE[0] = 0; B_KEY[0] = key0; B_BALL[0] = balls0;
  let n = 1;
  const seen = new Map([[withBalls(mask0, balls0), new Map([[key0, 0]])]]);
  const buckets = []; buckets[h0 * hurry] = [0];
  for (let f = h0 * hurry; f <= dMax * hurry;) {
    const bk = buckets[f];
    if (!bk || !bk.length) { f++; continue; }
    {
      const at = bk.pop();
      if (B_DONE[at]) continue;
      B_DONE[at] = 1;
      const mask = B_MASK[at], g = B_G[at];
      if (!(mask & C.cats)) {
        const path = [];
        for (let j = at; B_PAR[j] >= 0; j = B_PAR[j]) path.push([B_MV[j] >> 2, DIRS[B_MV[j] & 3][0], DIRS[B_MV[j] & 3][1]]);
        path.reverse();
        let switches = 0;
        for (let j = 1; j < path.length; j++) if (path[j][0] !== path[j - 1][0]) switches++;
        return { d: path.length, switches, path, states: n };
      }
      fillOcc(C, occ, B_POS, at * W, mask, B_BALL[at]);
      const ballsHere = B_BALL[at];
      for (let i = 0; i < nb; i++) {
        if (!canMove(C, mask, i)) continue;
        const p = B_POS[at * W + i], hRest = B_H[at] - farOf(i, p, mask);
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][p * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, mask, i, p, np);
          if (nm < 0) continue;
          const gone = !(nm & C.own[i]);
          const h = gone ? hRest : hRest + farOf(i, np, nm);
          if (h >= NEVER || g + 1 + h > dMax) continue;
          const key = B_KEY[at] + ((gone ? 0 : np + 1) - (p + 1)) * POW[i];
          const nbl = C.nBalls ? BALLS_AFTER : 0, sk = withBalls(nm, nbl);
          let m = seen.get(sk);
          if (!m) seen.set(sk, m = new Map());
          let to = m.get(key);
          if (to !== undefined) {
            if (B_DONE[to] || B_G[to] <= g + 1) continue;          // been here just as fast
          } else {
            if (n >= cap) return { d: -2 };
            to = n++;
            m.set(key, to);
            for (let j = 0; j < nb; j++) B_POS[to * W + j] = B_POS[at * W + j];
            B_POS[to * W + i] = gone ? -1 : np;
            B_MASK[to] = nm; B_H[to] = h; B_KEY[to] = key; B_BALL[to] = nbl;
            // a board just broke, a bed went down a one-way lane, or a ball rolled: if that
            // cut a bed off from its cats, never go on from here
            B_DONE[to] = (((nm & C.creak) !== (mask & C.creak) || nbl !== ballsHere) && lostForSure(C, B_POS, to * W, nm, nbl))
              || (C.arrows && !gone && !soloCan(C, i, np, nm, nbl)) ? 1 : 0;
            if (B_DONE[to]) continue;
          }
          B_G[to] = g + 1; B_PAR[to] = at; B_MV[to] = i * 4 + d;
          const fNew = g + 1 + h * hurry;
          (buckets[fNew] || (buckets[fNew] = [])).push(to);
          if (fNew < f) f = fNew;                                  // only when in a hurry: go back for it
        }
      }
    }
  }
  return { d: -3 };
}

// Is the level lost from this position? true / false, or null if it could not be worked out.
function isLost(C, pos, mask, balls = 0) {
  if (lostForSure(C, pos, 0, mask, balls)) return true;
  const r = solveFast(C, 250, 60000, { pos, mask, balls }, 3);
  return r.d === -2 ? null : r.d < 0;
}

/* ---------- creaky boards and one-way tiles: where are the traps? ----------
   Looks at the positions within reach of the start (up to "cap" of them).
    - For each creaky board it takes the earliest moment that board can be
      broken and asks: is the level lost now? If yes, that board is a trap.
    - For each one-way tile it looks for a bed that rides it and is then cut
      off from one of its cats. If there is one, that tile is a trap.
    - For yarn balls it takes the earliest few pushes (up to 40) and asks the
      same: is the level lost now? Each ball that can be lost that way is a trap.
   A trap is a real dead end the player can walk into. Also counts how many of
   the very first slides already ruin the level ("ruin": 0 = none, 1 = all).
   Returns { traps, depth (slides to the nearest trap), ruin }. */
function trapsOf(C, cap = 20000) {
  const occ = new Int8Array(C.N), nb = C.nb;
  const first = new Map();                                         // board bit -> earliest position where it is broken
  const lane = new Map();                                          // one-way tile -> slides until a bed is lost on it
  const pushes = new Map();                                        // balls after a push -> earliest position
  const firstMoves = [];
  let key0 = 0, n = 1;
  for (let i = 0; i < nb; i++) { B_POS[i] = C.start[i]; key0 += (C.start[i] + 1) * POW[i]; }
  B_MASK[0] = C.full; B_G[0] = 0; B_KEY[0] = key0; B_BALL[0] = C.ball0;
  const seen = new Map([[withBalls(C.full, C.ball0), new Set([key0])]]);
  for (let head = 0; head < n && (first.size < C.nCreak || C.arrows || (C.nBalls && pushes.size < 40)); head++) {
    const hm = B_MASK[head], hb = B_BALL[head];
    fillOcc(C, occ, B_POS, head * W, hm, hb);
    for (let i = 0; i < nb; i++) {
      if (!canMove(C, hm, i)) continue;
      const p = B_POS[head * W + i];
      for (let d = 0; d < STEPS; d++) {
        const np = C.next[i][p * STEPS + d];
        if (np < 0) continue;
        const nm = moveMask(C, occ, hm, i, p, np);
        if (nm < 0) continue;
        const gone = !(nm & C.own[i]);
        const pos = Array.from(B_POS.subarray(head * W, head * W + nb));
        pos[i] = gone ? -1 : np;
        const tile = C.arrows ? (C.arw[i][np] >= 0 ? C.arw[i][np] : C.arw[i][p]) : -1;
        const nbl = C.nBalls ? BALLS_AFTER : 0, pushed = nbl !== hb;
        if (head === 0) firstMoves.push({ pos, mask: nm, balls: nbl, risky: C.crk[i][np] !== 0 || tile >= 0 || pushed });
        if (pushed && !pushes.has(nbl) && pushes.size < 40) pushes.set(nbl, { pos, mask: nm, balls: nbl, depth: B_G[head] + 1 });
        const broke = (hm & C.creak) & ~nm;
        for (let bit = broke; bit; bit &= bit - 1) {
          const one = bit & -bit;
          if (!first.has(one)) first.set(one, { pos, mask: nm, balls: nbl, depth: B_G[head] + 1 });
        }
        if (tile >= 0 && !gone && !soloCan(C, i, np, nm, nbl)) {   // rode a one-way tile and is cut off now
          if (!lane.has(tile)) lane.set(tile, B_G[head] + 1);
          continue;
        }
        const k = B_KEY[head] + ((gone ? 0 : np + 1) - (p + 1)) * POW[i];
        let m = seen.get(withBalls(nm, nbl));
        if (!m) seen.set(withBalls(nm, nbl), m = new Set());
        if (m.has(k) || n >= cap) continue;
        m.add(k);
        for (let j = 0; j < nb; j++) B_POS[n * W + j] = pos[j];
        B_KEY[n] = k; B_G[n] = B_G[head] + 1; B_MASK[n] = nm; B_BALL[n] = nbl; n++;
      }
    }
  }
  // the searches below use the same scratch pad, so they come after the walk above
  let traps = lane.size, depth = 99, ruined = 0;
  for (const d of lane.values()) depth = Math.min(depth, d);
  for (const w of first.values()) if (isLost(C, w.pos, w.mask, w.balls || 0) === true) { traps++; depth = Math.min(depth, w.depth); }
  // yarn: count the balls that can be pushed so the level is lost (at most 3)
  const lostBalls = new Set();
  for (const w of pushes.values()) {
    if (lostBalls.size >= 3) break;
    if (isLost(C, w.pos, w.mask, w.balls) !== true) continue;
    lostBalls.add(w.balls); depth = Math.min(depth, w.depth);
  }
  traps += lostBalls.size;
  // a first slide can only ruin the level if it puts a bed on a creaky board or a one-way tile, or pushes a ball
  for (const m of firstMoves) if (m.risky && isLost(C, m.pos, m.mask, m.balls) === true) ruined++;
  return { traps, depth, ruin: firstMoves.length ? ruined / firstMoves.length : 0 };
}

/* ---------- silent dead ends ----------
   A dead end is fair only if it shows itself. The game checks for one right
   after a board breaks, a bed rides an arrow, a bed steps onto a creaky board,
   or a ball rolls.
   Sneaky case 1: a bed steps onto a creaky board (nothing breaks yet), and that
   already loses the level, because the bed has to leave the board some day and
   then another bed can no longer get through. The player can go on tucking in
   cats for a long time before anything breaks.
   Sneaky case 2: a ball rolls somewhere that loses the level, but working that
   out takes a long search, so the game's check gives up and says nothing.
   Here a dead end after a push only counts as fair if isLost can prove it.
   (Other slides can never lose a level: a slide on plain floor can be slid
   back, and tucking in a cat only frees room.)
   This looks at every position near the start ("near" slides of play, up to
   "cap" positions) and at every position on the stored solution, and counts
   those sneaky slides. A level with any of them is thrown away. */
function silentDeadEnds(C, path, near = 4, cap = 1500) {
  if (!C.creak && !C.nBalls) return 0;
  const occ = new Int8Array(C.N), nb = C.nb, memo = new Map();
  const keyOf = (pos, mask, balls) => pos.join(",") + "/" + mask + "/" + balls;
  const lost = (pos, mask, balls) => {
    const k = keyOf(pos, mask, balls);
    if (!memo.has(k)) memo.set(k, isLost(C, pos, mask, balls));
    return memo.get(k);
  };
  // the positions to look at: near the start, and along the solution
  const todo = [], seen = new Set();
  const add = (pos, mask, balls, depth) => { const k = keyOf(pos, mask, balls); if (!seen.has(k) && todo.length < cap) { seen.add(k); todo.push({ pos, mask, balls, depth }); } };
  add(C.start.slice(), C.full, C.ball0, 0);
  {
    const pos = C.start.slice();
    let mask = C.full, balls = C.ball0;
    for (const [i, dr, dc] of path) {
      fillOcc(C, occ, pos, 0, mask, balls);
      const d = DIRS.findIndex(x => x[0] === dr && x[1] === dc), np = C.next[i][pos[i] * STEPS + d];
      mask = moveMask(C, occ, mask, i, pos[i], np);
      if (C.nBalls) balls = BALLS_AFTER;
      pos[i] = mask & C.own[i] ? np : -1;
      add(pos.slice(), mask, balls, near);                          // "near": do not walk on from here
    }
  }
  let found = 0;
  for (let head = 0; head < todo.length; head++) {
    const { pos, mask, balls, depth } = todo[head];
    fillOcc(C, occ, pos, 0, mask, balls);
    for (let i = 0; i < nb; i++) {
      if (!canMove(C, mask, i)) continue;
      const p = pos[i];
      for (let d = 0; d < STEPS; d++) {
        const np = C.next[i][p * STEPS + d];
        if (np < 0) continue;
        if (C.nBalls) setBalls(C, balls);                           // the searches below move them about
        const nm = moveMask(C, occ, mask, i, p, np);
        if (nm < 0) continue;
        const nbl = C.nBalls ? BALLS_AFTER : 0;
        const npos = pos.slice();
        npos[i] = nm & C.own[i] ? np : -1;
        // 1. quiet, and onto a board it was not on before?
        const onto = C.crk[i][np] & ~C.crk[i][p];
        if (onto && (nm & C.creak) === (mask & C.creak) && npos[i] >= 0 && lost(npos, nm, nbl) === true && lost(pos, mask, balls) === false) found++;
        // 2. a ball rolled, and nobody can tell quickly whether that lost the level?
        if (nbl !== balls && lost(npos, nm, nbl) === null && lost(pos, mask, balls) === false) found++;
        if (depth < near) add(npos, nm, nbl, depth + 1);
      }
    }
  }
  return found;
}

/* ---------- how many times must the player pick up a bed? ----------
   Sliding the same bed on and on counts as one "turn". A plain level needs
   one turn per bed. Every turn above that means a bed had to step aside,
   wait, and be picked up again later. More extra turns = a knottier puzzle.
   Returns { extra, exact }. If the search gets too big it stops and says
   "at least this many" (exact: false). */
function extraTurns(C, cap = 300000, stopAt = 99) {
  if (C.nBalls) throw new Error("extraTurns does not know yarn balls: count on the level without them");
  const nb = C.nb, occ = new Int8Array(C.N);
  const alive = mask => { let a = 0; for (let i = 0; i < nb; i++) if (C.own[i] & mask) a++; return a; };
  let key0 = 0;
  for (let i = 0; i < nb; i++) { B_POS[i] = C.start[i]; key0 += (C.start[i] + 1) * POW[i]; }
  key0 *= 8;                                                       // the last 3 bits hold "which bed is in hand"
  B_MASK[0] = C.full; B_G[0] = 0; B_DONE[0] = 0; B_KEY[0] = key0; B_MV[0] = -1;
  let n = 1;
  const seen = new Map([[C.full, new Map([[key0, 0]])]]);
  const buckets = []; buckets[nb] = [0];
  for (let f = nb; f < nb + 60; f++) {
    const bk = buckets[f];
    if (!bk) continue;
    if (f - nb >= stopAt) return { extra: f - nb, exact: false };
    while (bk.length) {
      const at = bk.pop();
      if (B_DONE[at]) continue;
      B_DONE[at] = 1;
      const mask = B_MASK[at], g = B_G[at], last = B_MV[at];
      if (!(mask & C.cats)) return { extra: f - nb, exact: true };
      fillOcc(C, occ, B_POS, at * W, mask);
      for (let i = 0; i < nb; i++) {
        if (!canMove(C, mask, i)) continue;
        const p = B_POS[at * W + i], g2 = g + (i === last ? 0 : 1);
        for (let d = 0; d < STEPS; d++) {
          const np = C.next[i][p * STEPS + d];
          if (np < 0) continue;
          const nm = moveMask(C, occ, mask, i, p, np);
          if (nm < 0) continue;
          const gone = !(nm & C.own[i]);
          // every bed still on the board needs at least one more turn, except the one in hand
          const f2 = g2 + alive(nm) - (gone ? 0 : 1);
          const key = B_KEY[at] - (last + 1) + (gone ? 0 : i + 1) + ((gone ? 0 : np + 1) - (p + 1)) * POW[i] * 8;
          let m = seen.get(nm);
          if (!m) seen.set(nm, m = new Map());
          let to = m.get(key);
          if (to !== undefined) {
            if (B_G[to] <= g2) continue;
          } else {
            if (n >= cap) return { extra: f - nb, exact: false };
            to = n++;
            m.set(key, to);
            for (let j = 0; j < nb; j++) B_POS[to * W + j] = B_POS[at * W + j];
            B_POS[to * W + i] = gone ? -1 : np;
            B_MASK[to] = nm; B_DONE[to] = 0; B_KEY[to] = key; B_MV[to] = gone ? -1 : i;
          }
          B_G[to] = g2;
          (buckets[f2] || (buckets[f2] = [])).push(to);
        }
      }
    }
  }
  return { extra: -1, exact: false };
}

// thinking(), on the fast engine. Same answer, much quicker.
function thinkingFast(C) {
  if (C.nBalls) throw new Error("thinkingFast does not know yarn balls: count on the level without them");
  const occ = new Int8Array(C.N), nb = C.nb, pos = C.start.slice();
  let mask = C.full, rounds = 0;
  const solo = i => {
    if (!canMove(C, mask, i)) return false;
    fillOcc(C, occ, pos, 0, mask);
    const seen = new Set([pos[i] + mask * 64]);
    const qp = [pos[i]], qm = [mask];
    for (let head = 0; head < qp.length; head++) for (let d = 0; d < STEPS; d++) {
      const np = C.next[i][qp[head] * STEPS + d];
      if (np < 0) continue;
      const nm = moveMask(C, occ, qm[head], i, qp[head], np);
      if (nm < 0) continue;
      if (!(nm & C.own[i])) return true;
      const k = np + nm * 64;
      if (seen.has(k)) continue;
      seen.add(k); qp.push(np); qm.push(nm);
    }
    return false;
  };
  while (mask & C.cats) {
    const done = [];
    for (let i = 0; i < nb; i++) if ((C.own[i] & mask) && solo(i)) done.push(i);
    if (!done.length) return { rounds, tricky: true };
    for (const i of done) mask &= ~C.own[i];
    rounds++;
  }
  return { rounds, tricky: false };
}

/* ---------- random level ---------- */
// A small random number maker. The same seed always gives the same numbers, so
// a chapter comes out the same every time. It keeps four numbers of state, so
// two chapters never run into each other's numbers (a one-number maker did, and
// two chapters ended up with the same board).
let rs = [0, 0, 0, 0];
const rnd = () => {
  const t = (((rs[0] + rs[1]) | 0) + rs[3]) | 0;
  rs[3] = (rs[3] + 1) | 0;
  rs[0] = rs[1] ^ (rs[1] >>> 9);
  rs[1] = (rs[2] + (rs[2] << 3)) | 0;
  rs[2] = (((rs[2] << 21) | (rs[2] >>> 11)) + t) | 0;
  return (t >>> 0) / 4294967296;
};
const setSeed = v => { rs = [v | 0, 0x9E3779B9 | 0, 0x243F6A88 | 0, 1]; for (let i = 0; i < 20; i++) rnd(); };
setSeed(7411);
const pick = a => a[Math.floor(rnd() * a.length)];
const between = v => Array.isArray(v) ? v[0] + Math.floor(rnd() * (v[1] - v[0] + 1)) : (v || 0);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Where can a bed ever lie? Walk it over the empty board (only walls and its
// rail stop it) and note every free cell it covers on the way. Its cats may
// only go there. This matters most for rail beds: a long bed on a rail along
// its own row would need a whole row of cats, which almost never fits. So a
// bed only gets a rail that leaves it comfortable room for its cats.
// g: the map as letters, taken: true where a wall, a bed or a cat already is.
function sweepCells(g, taken, b, axis) {
  const rows = g.length, cols = g[0].length;
  const fits = (r, c) => b.cells.every(([dr, dc]) => r + dr >= 0 && c + dc >= 0 && r + dr < rows && c + dc < cols && g[r + dr][c + dc] !== "#");
  const seen = new Set([b.r * cols + b.c]), queue = [[b.r, b.c]], cells = new Set();
  for (let head = 0; head < queue.length; head++) {
    const [r, c] = queue[head];
    for (const [dr, dc] of b.cells) if (!taken[r + dr][c + dc]) cells.add((r + dr) * cols + c + dc);
    for (const [dr, dc] of DIRS) {
      if ((axis === "h" && dr) || (axis === "v" && dc)) continue;
      const nr = r + dr, nc = c + dc;
      if (!fits(nr, nc) || seen.has(nr * cols + nc)) continue;
      seen.add(nr * cols + nc); queue.push([nr, nc]);
    }
  }
  return [...cells].map(i => [(i / cols) | 0, i % cols]);
}

function randomLevel(t) {
  const rows = t.rows, cols = t.cols;
  const g = Array.from({ length: rows }, () => new Array(cols).fill("."));
  const taken = Array.from({ length: rows }, () => new Array(cols).fill(false));
  // walls come in mirrored pairs, so boards look designed instead of scattered
  for (let left = between(t.walls); left > 0;) {
    const r = Math.floor(rnd() * rows), c = Math.floor(rnd() * Math.ceil(cols / 2));
    const m = cols - 1 - c;
    if (taken[r][c]) { left--; continue; }
    g[r][c] = "#"; taken[r][c] = true; left--;
    if (m !== c && left > 0) { g[r][m] = "#"; taken[r][m] = true; left--; }
  }
  const nBeds = Math.min(t.beds, COLOR_ORDER.length);
  // the two stars are always in; the friends take turns
  const bedColors = shuffle(COLOR_ORDER.slice(0, 2).concat(shuffle(COLOR_ORDER.slice(2))).slice(0, nBeds));
  // How big is each bed? Every bed needs as many cats as it has cells, so the
  // tier says how many bed cells the whole board may hold ("cells") and which
  // bed sizes to draw from ("sizes").
  // A family tier ("family": 1) gives one bed the 6-cell family shape, and the board
  // may hold 2 more bed cells. (Only those tiers roll the extra dice, so older
  // chapters come out exactly as before.)
  const family = t.family && rnd() < t.family, top = t.cells[1] + (family ? 2 : 0);
  let sizes = null;
  for (let tries = 0; tries < 60 && !sizes; tries++) {
    const s = bedColors.map(() => pick(t.sizes));
    if (family) s[Math.floor(rnd() * s.length)] = 6;
    const sum = s.reduce((a, b) => a + b, 0);
    if (sum >= t.cells[0] && sum <= top) sizes = s;
  }
  if (!sizes) return null;
  const beds = [];
  for (let bi = 0; bi < bedColors.length; bi++) {
    let placed = false;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const cells = pick(BY_SIZE[sizes[bi]]);
      const r = Math.floor(rnd() * rows), c = Math.floor(rnd() * cols);
      if (!cells.every(([dr, dc]) => r + dr < rows && c + dc < cols && !taken[r + dr][c + dc])) continue;
      cells.forEach(([dr, dc]) => { taken[r + dr][c + dc] = true; });
      beds.push({ color: bedColors[bi], need: cells.length, r, c, cells });   // a bed holds one cat per cell
      placed = true;
    }
    if (!placed) return null;
  }
  // Its cats may only go where the bed can ever lie (see sweepCells).
  const sweep = (b, axis) => sweepCells(g, taken, b, axis);
  if (t.rail) {
    const can = [];
    for (const b of beds) {
      const fits = ["h", "v"].filter(axis => sweep(b, axis).length >= b.need + 2);
      if (fits.length) can.push([b, pick(fits)]);
    }
    if (!can.length) return null;
    let any = false;
    for (const [b, axis] of can) if (rnd() < t.rail) { b.axis = axis; any = true; }
    if (!any) { const [b, axis] = pick(can); b.axis = axis; }
  }
  if (t.locks) {
    const ids = shuffle(beds.map((_, i) => i));
    const n = Math.min(between(t.locks), Math.floor(ids.length / 2));
    for (let j = 0; j < n; j++) beds[ids[j * 2]].lock = ids[j * 2 + 1];
  }
  // cats: the rail beds choose first, because they have the fewest places to choose from
  const catCells = [];
  for (const b of beds.filter(b => b.axis).concat(beds.filter(b => !b.axis))) {
    for (let n = 0; n < b.need; n++) {
      const free = sweep(b, b.axis);
      if (!free.length) return null;
      const [r, c] = pick(free);
      g[r][c] = b.color; taken[r][c] = true;
      catCells.push([r, c, b.color]);
    }
  }
  const level = { rows, cols, map: g.map(r => r.join("")), beds };
  if (t.gates) {
    // fence in a cat; the fence opens when another color's bed is full
    const gates = [];
    for (const [r, c, color] of shuffle(catCells.slice()).slice(0, between(t.gates))) {
      const others = bedColors.filter(x => x !== color);
      if (others.length) gates.push([r, c, pick(others)]);
    }
    if (!gates.length) return null;
    level.gates = gates;
  }
  if (t.blankets) {
    const hidden = catCells.filter(() => rnd() < t.blankets).map(([r, c]) => [r, c]);
    if (!hidden.length) hidden.push(catCells[0].slice(0, 2));
    level.blankets = hidden;
  }
  return level;
}

/* ---------- the chapters, 25 levels each ---------- */
const HAND_MADE = [
  {
    rows: 4, cols: 4, hint: "h_drag",
    map: ["....", "....", "....", ".kk."],
    beds: [{ color: "k", need: 2, r: 0, c: 1, cells: SHAPES.i2h }],
  },
  {
    rows: 4, cols: 4, hint: "h_block",
    map: ["#k##", "#g##", "....", "...."],
    beds: [
      { color: "k", need: 1, r: 3, c: 0, cells: SHAPES.dot },
      { color: "g", need: 1, r: 3, c: 3, cells: SHAPES.dot },
    ],
  },
];

// The board sizes, from tiny to the biggest a phone can show (8 rows, 6 columns).
// "cells" is how many bed cells the board holds in all. Every bed cell also
// means one cat, so a board with 16 bed cells has 16 cats on it.
const BOARDS = {
  s:  { rows: 4, cols: 4, beds: 2, walls: 0,      sizes: [1, 2, 2, 3],          cells: [2, 4],   dBase: 4,  dTop: 14, minRounds: 1 },
  a:  { rows: 5, cols: 5, beds: 3, walls: [0, 2], sizes: [1, 2, 2, 3, 3],       cells: [5, 7],   dBase: 8,  dTop: 26, minRounds: 2 },
  b:  { rows: 6, cols: 5, beds: 4, walls: [0, 2], sizes: [1, 2, 2, 3, 3, 4],    cells: [7, 10],  dBase: 12, dTop: 38, minRounds: 2 },
  c4: { rows: 6, cols: 6, beds: 4, walls: [0, 4], sizes: [1, 2, 2, 3, 3, 4],    cells: [8, 11],  dBase: 16, dTop: 46, minRounds: 2 },
  c:  { rows: 6, cols: 6, beds: 5, walls: [0, 4], sizes: [1, 2, 2, 3, 3, 4],    cells: [10, 13], dBase: 18, dTop: 54, minRounds: 3 },
  d5: { rows: 7, cols: 6, beds: 5, walls: [2, 6], sizes: [1, 2, 2, 3, 3, 4],    cells: [10, 13], dBase: 20, dTop: 62, minRounds: 3 },
  d:  { rows: 7, cols: 6, beds: 6, walls: [2, 4], sizes: [1, 2, 2, 3, 3, 4],    cells: [12, 15], dBase: 26, dTop: 70, minRounds: 3 },
  e:  { rows: 8, cols: 6, beds: 6, walls: [2, 6], sizes: [1, 2, 2, 3, 3, 4],    cells: [13, 17], dBase: 30, dTop: 84, minRounds: 4 },
  f:  { rows: 8, cols: 6, beds: 7, walls: [4, 8], sizes: [1, 2, 2, 3, 3, 4],    cells: [16, 19], dBase: 34, dTop: 96, minRounds: 4 },
};
/* ---------- the road to 2000 levels: seasons ----------
   The full plan is in PROGRESSION.md. In short: 80 chapters of 25 levels, in
   seasons. A season brings one new twist, teaches it gently, mixes it with the
   older ones and ends on a hard finale. The next season starts a little easier
   than that finale, but harder than the season before it started.

     season  chapters  what is new
       1      1 to 10  rails, locks, blankets, gates (chapters 2 to 5), then mixes
       2     11 to 20  nothing new: the four twists mixed, getting tighter
       3     21 to 28  creaky boards (taught in chapter 21). Only in some of
                       the levels: a fifth in chapter 22, 4 in 10 in chapter 28
       4     29 to 36  one-way floor (taught in chapter 29), then in most levels;
                       creaky boards stay in about a third
       5     37 to 44  yarn balls (taught in chapter 37), then in most levels
                       (6 to 8 in 10); one-way tiles and creaky boards in about
                       3 in 10 each
                       From chapter 33 on, about 1 level in 8 has a family bed
                       (6 cells, 6 cats) on a 7x6 or 8x6 board.
       6     45 to 52  ice patches        (not yet)
       7     53 to 60  buttons and doors  (not yet)
       8     61 to 68  cat flaps          (not yet)
       9     69 to 76  turntables         (not yet)
      10     77 to 80  nothing new: everything at once, the hardest levels

   Chapters 1 to 8 are the teaching chapters with a fixed plan (tiersFor, TWISTS).
   From chapter 9 on everything comes from one number, "climb" (see climbOf):
   it goes up inside a season, steps back a little when a new season starts, and
   grows slowly over all 80 chapters (fast at first, then ever slower), so there
   is still room to get harder at chapter 80. Until the new twists of seasons
   6 to 9 exist, those chapters are made with the twists we have: the formula
   works for any chapter number today. No creaky boards before chapter 21, no
   one-way tiles before chapter 29, no yarn before chapter 37, and creaky boards
   and one-way tiles are never in every level of a chapter. Every chapter ends
   on its hardest level (the game makes it the "cozy challenge"). */
const SEASONS = [[1, 10], [11, 20], [21, 28], [29, 36], [37, 44], [45, 52], [53, 60], [61, 68], [69, 76], [77, 80]];
function seasonOf(num) {
  let i = SEASONS.findIndex(([from, to]) => num >= from && num <= to);
  if (i < 0) i = SEASONS.length - 1;                               // past chapter 80: the last season goes on
  const [from, to] = SEASONS[i];
  return { season: i + 1, from, to, part: (num - from) / (to - from) };   // part: 0 at the season's first chapter, 1 at its finale
}
// The slow rise over all 80 chapters: fast at first, then ever slower.
// 0.34 in chapter 9, 0.65 in chapter 28, 1 in chapter 80.
const trendOf = num => Math.log(1 + num / 6) / Math.log(1 + 80 / 6);
// The trend with the seasons on top: a little under it when a season starts, a
// little over it at the finale. About 0.36 in chapter 9, 0.67 in 28, 1.02 in 80.
function climbOf(num) {
  return trendOf(num) + 0.032 * (seasonOf(num).part - 0.5);
}

// Which boards a chapter uses, and how many levels on each.
// Chapters 1 to 8 have a fixed plan. (Chapter 1 also has the two hand-made
// levels, so only 23 here.) From chapter 9 on it is a formula: the small
// boards fade out and the biggest board (8x6 with 7 beds, the most a phone
// can show) takes over. From chapter 21 on the mix stays put.
function boardsFor(num) {
  if (num === 1) return [["s", 3], ["a", 8], ["b", 7], ["c4", 5]];
  if (num <= 3)  return [["a", 5], ["b", 8], ["c", 7], ["d5", 5]];
  if (num <= 5)  return [["a", 4], ["b", 7], ["c", 8], ["d5", 6]];
  if (num <= 8)  return [["b", 4], ["c", 8], ["d", 8], ["e", 5]];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  const b = num === 9 ? 5 : 0;
  const f = clamp((num - 9) * 1.25, 0, 15);
  const c = clamp(8 - (num - 9) * 0.7, 0, 8) - (num === 9 ? 1 : 0);
  const d = clamp(8 - (num - 9) * 0.42, 3, 8);
  return [["b", b], ["c", c], ["d", d], ["e", PER_CHAPTER - b - c - d - f], ["f", f]].filter(x => x[1] > 0);
}

/* The teaching chapters, 1 to 8. Every chapter is a little harder than the one before:
    - sMin: how many "step-aside moments" the player who never plans must run
      into (see plainPlayer). This is the main filter. Chapters 2 and 3 ease the
      player in, from chapter 4 on every level has at least 3.
    - eMin / eMax: how many "extra turns" even the best player needs (see
      extraTurns). Never fewer than sMin.
    - dMin / dMax: the fewest slides. Both creep up with the chapter number.
    - lean: which part of the found levels to pick from. 0 = all of them,
      0.25 = skip the easiest quarter.
   Chapter 1 is kept gentle on purpose: tiny boards, at most one step-aside. */
function tiersFor(num, extra) {
  const boards = boardsFor(num);
  return boards.map(([name, n], j) => {
    const b = BOARDS[name];
    const sMin = num === 1 ? 0 : num === 2 ? [0, 1, 1, 2][j] : num === 3 ? [1, 2, 2, 2][j] : Math.floor(3 + (num - 4) / 4.5 + (j >= 2 ? 0.5 : 0));
    const eMin = num === 1 ? 0 : Math.max(sMin, Math.floor((num + j) / 3.2));
    const t = Object.assign({ n, name }, b, extra, {
      sMin, sMax: num === 1 ? 1 : sMin + 2,
      eMin, eMax: num === 1 ? (j < 3 ? 1 : 2) : eMin + 3,
      dMin: b.dBase + Math.round(num * 1.2),
      dMax: Math.min(b.dTop + num, 26 + 4 * num),
      lean: num <= 3 ? 0 : 0.25,
    });
    if (t.beds <= 3 && t.locks) t.locks = 1;
    return t;
  });
}

/* Chapter 9 and up: every knob is set by "climb" (see climbOf).
    - sAim: how many step-aside moments to aim for. About 4 in chapter 9, 6 in
      chapter 28, 8 in chapter 80; the bigger boards a little more. A level
      needs at least the whole number below it (sMin).
    - dMin / dMax: the fewest slides. Grows only a little: on the biggest board
      the climb should come from the puzzle, not from more sliding.
    - walls: one more from about chapter 17, another from about chapter 43.
    - traps (creaky boards, one-way tiles): see chapterFor. */
const S_STEP = { b: -1, c: -0.5, d: 0, e: 0.25, f: 0.5 };
function laterTiers(num, extra) {
  const climb = climbOf(num);
  return boardsFor(num).map(([name, n]) => {
    const b = BOARDS[name];
    const sAim = 4 + 6 * (climb - 0.36) + S_STEP[name];
    const dMin = b.dBase + Math.round(20 * climb);
    const t = Object.assign({ n, name }, b, extra, {
      sAim, sMin: Math.floor(sAim), sMax: 99,
      eMin: Math.floor(sAim), eMax: 99,
      dMin, dMax: Math.min(96, dMin + 32),
      grow: 400,                                                   // nudge boards into shape (see grow)
    });
    const more = (climb >= 0.5 ? 1 : 0) + (climb >= 0.8 ? 1 : 0);
    if (more) t.walls = [t.walls[0] + more, t.walls[1] + more];
    return t;
  });
}

// What each chapter adds on top of plain beds and cats.
// Chapters 1 to 8 teach one thing at a time. From chapter 9 on a formula takes
// turns through the four old twists: three of them per chapter up to chapter
// 15, all four after that. Each one gets stronger as the climb goes up.
// (Creaky boards and one-way tiles are handled in chapterFor.)
const TWISTS = {
  1: {},
  2: { hint: "h_rail",    rail: 0.5 },
  3: { hint: "h_lock",    locks: [1, 2] },
  4: { hint: "h_blanket", blankets: 0.6 },
  5: { hint: "h_gate",    gates: [1, 2] },
  6: { hint: "h_mix",     rail: 0.35, locks: [1, 2] },
  7: { hint: "h_mix2",    gates: [1, 2], locks: 1, blankets: 0.4 },
  8: { hint: "h_all",     rail: 0.25, locks: 1, gates: [1, 2], blankets: 0.4 },
};
function twistsFor(num) {
  if (num <= 8) return TWISTS[num];
  const climb = climbOf(num);
  const names = ["rail", "locks", "gates", "blankets"];
  const strong = {
    rail: Math.min(0.4, Math.round(25 + 22 * (climb - 0.36)) / 100),
    locks: climb < 0.5 ? [1, 2] : [2, 3],
    gates: climb < 0.5 ? [1, 2] : climb < 0.7 ? [2, 3] : climb < 0.9 ? [2, 4] : [3, 5],
    blankets: Math.min(0.9, Math.round(40 + 75 * (climb - 0.36)) / 100),
  };
  const out = num === 21 ? { hint: "h_creaky" } : num === 29 ? { hint: "h_oneway" } : num === 37 ? { hint: "h_yarn" } : {};
  const howMany = num < 16 ? 3 : 4;
  for (let i = 0; i < howMany; i++) out[names[(num + i) % 4]] = strong[names[(num + i) % 4]];
  return out;
}

/* Traps: creaky boards and one-way tiles. They are the two things that can
   ruin a level, so they come late and never take over:
    - creaky boards: none before chapter 21. Chapter 21 opens with 5 gentle
      teaching levels and has no others. Then a fifth of the levels in chapter
      22, rising to 4 in 10 in chapter 28. From chapter 29 on between a third
      and a half.
    - one-way tiles: none before chapter 29. Chapter 29 opens with 5 gentle
      teaching levels; after that they are in most levels (7 to 8 in 10).
    - a teaching level: a small board, no other twist, few step-asides, and a
      trap that sits within a few slides of the start.
   Every level with traps must have a real dead end: a board that can be broken
   early or a one-way lane that can be taken at the wrong time so the level is
   lost, or the player who never plans ends up with no cat in reach.
   Also, every dead end must show itself (see silentDeadEnds).
   "nasty" is the share of them where that player must fall in (none at first,
   a quarter in chapter 28, all by chapter 80). "nastiest": one of the very first
   slides can already ruin the level, or there are two traps (from about chapter 50). */
function chapterFor(num) {
  const { hint, ...extra } = twistsFor(num);
  const ch = { tiers: num < 9 ? tiersFor(num, extra) : laterTiers(num, extra) };
  if (hint) ch.hint = hint;
  if (num === 1) ch.handMade = HAND_MADE;
  if (num < 9) return ch;
  ch.target = targetFor(num);
  if (num < 21) return ch;
  const climb = climbOf(num), part = (from, width) => Math.max(0, Math.min(1, (climb - from) / width));
  const creakyShare = num === 21 ? 0 : num <= 28 ? 0.2 + 0.2 * (num - 22) / 6 : Math.min(0.45, 0.33 + 0.12 * (num - 29) / 51);
  const arrowShare = num < 29 ? 0 : num === 29 ? 0.6 : Math.min(0.8, 0.7 + 0.05 * (num - 30));
  const traps = {
    creaky: climb < 0.7 ? [1, 2] : climb < 0.85 ? [1, 3] : [2, 4],
    arrows: climb < 0.8 ? [2, 4] : [3, 6],
    yarn: climb < 0.8 ? [1, 2] : [1, 3],
    nasty: part(0.55, 0.45), nastiest: part(0.85, 0.17),
  };
  const tiers = [];
  // the chapter that teaches a trap opens with 5 gentle levels (taken from the biggest board's share)
  const teaches = num === 21 ? "creaky" : num === 29 ? "arrows" : num === 37 ? "yarn" : null;
  const teachAmount = { creaky: [1, 2], arrows: [2, 3], yarn: [1, 2] }, bridgeAmount = { creaky: [1, 2], arrows: [2, 4], yarn: [1, 2] };
  if (teaches) {
    const small = BOARDS[teaches === "arrows" ? "c" : "b"];
    tiers.push(Object.assign({ n: 5, name: "teaching " + teaches, intro: true }, small, {
      [teaches]: teachAmount[teaches], nasty: 0, nastiest: 0, trapDepth: 4,
      sAim: 2, sMin: 1, sMax: 4, eMin: 1, eMax: 6, dMin: small.dBase + 4, dMax: small.dBase + 30, grow: 400,
    }));
    ch.tiers[ch.tiers.length - 1].n -= 5;
    // then 3 bridging levels: the new trap again, on a middle board (7x6, 5 beds),
    // before the chapter goes on to the big boards
    const mid = BOARDS.d5;
    tiers.push(Object.assign({ n: 3, name: "bridging " + teaches, intro: true }, mid, {
      [teaches]: bridgeAmount[teaches], nasty: 0, nastiest: 0, trapDepth: 6,
      sAim: 3.5, sMin: 3, sMax: 6, eMin: 2, eMax: 99, dMin: mid.dBase + 6, dMax: mid.dBase + 40, grow: 400,
    }));
    ch.tiers[ch.tiers.length - 1].n -= 3;
  }
  if (num >= 37) laterTraps(num, ch.tiers, tiers, traps);
  else for (const t of ch.tiers) {
    const both = Math.round(t.n * arrowShare * creakyShare);
    const onlyArrows = Math.max(0, Math.round(t.n * arrowShare) - both), onlyCreaky = Math.max(0, Math.min(t.n - both - onlyArrows, Math.round(t.n * creakyShare) - both));
    // a level with traps is harder anyway, so it aims for half a step-aside less
    const sAim = t.sAim - 0.5, softer = { sAim, sMin: Math.floor(sAim), eMin: Math.floor(sAim), nasty: traps.nasty, nastiest: traps.nastiest };
    const add = (n, more) => { if (n > 0) tiers.push(Object.assign({}, t, more, { n })); };
    add(t.n - both - onlyArrows - onlyCreaky, {});
    add(onlyCreaky, { ...softer, creaky: traps.creaky, name: t.name + " creaky" });
    add(onlyArrows, { ...softer, arrows: traps.arrows, name: t.name + " one-way" });
    add(both, { ...softer, creaky: traps.creaky, arrows: traps.arrows, name: t.name + " one-way + creaky" });
  }
  // chapter 21 keeps the new boards going: one more creaky level among the big ones
  // (with the 3 bridging levels that makes 4 in levels 6 to 25)
  if (num === 21) {
    const big = tiers[tiers.length - 1];
    big.n--;
    tiers.push(Object.assign({}, big, { n: 1, name: big.name + " creaky", creaky: traps.creaky, sAim: big.sAim - 0.5, sMin: Math.floor(big.sAim - 0.5), eMin: Math.floor(big.sAim - 0.5), nasty: traps.nasty, nastiest: traps.nastiest }));
  }
  // From chapter 33: about 1 level in 8 has a family bed (6 cells). Never in the
  // teaching or bridging levels, only on the 7x6 and 8x6 boards: one level is
  // taken from each of the 3 biggest groups there.
  if (num >= 33) {
    const groups = tiers.filter(t => !t.intro && t.rows >= 7 && t.n >= 2).sort((a, b) => b.n - a.n).slice(0, 3);
    for (const g of groups) {
      g.n--;
      tiers.push(Object.assign({}, g, { n: 1, name: g.name + ", family bed", family: 1 }));
    }
  }
  ch.tiers = tiers;
  return ch;
}
// From chapter 37 (season 5): yarn balls in most levels, one-way tiles and
// creaky boards in a minority, any mix of them. Each group of levels is split
// so the shares come out right and the mixes spread out.
function laterTraps(num, from, tiers, traps) {
  const yarnShare = num === 37 ? 0.6 : Math.min(0.8, 0.7 + 0.05 * (num - 38)), arrowShare = 0.3, creakyShare = 0.3;
  for (const t of from) {
    const n = t.n, mix = Array.from({ length: n }, () => ({}));
    const nY = Math.round(n * yarnShare), nA = Math.round(n * arrowShare), nC = Math.round(n * creakyShare);
    for (let j = 0; j < nY; j++) mix[j].yarn = true;
    for (let j = 0; j < nA; j++) mix[(nY + j) % n].arrows = true;
    for (let j = 0; j < nC; j++) mix[(nY + nA + j) % n].creaky = true;
    const groups = new Map();
    for (const m of mix) { const k = ["yarn", "arrows", "creaky"].filter(x => m[x]).join(" + "); groups.set(k, (groups.get(k) || 0) + 1); }
    for (const [k, count] of groups) {
      if (!k) { tiers.push(Object.assign({}, t, { n: count })); continue; }
      // a level with traps is harder anyway, so it aims for half a step-aside less
      const sAim = t.sAim - 0.5, more = { sAim, sMin: Math.floor(sAim), eMin: Math.floor(sAim), nasty: traps.nasty, nastiest: traps.nastiest, name: t.name + " " + k };
      for (const x of k.split(" + ")) more[x] = traps[x];
      tiers.push(Object.assign({}, t, more, { n: count }));
    }
  }
}
const PER_CHAPTER = 25;

/* ---------- the difficulty score ----------
   One number per level for "how hard is this": the fewest slides, how often
   a bed must step aside, extra turns, how far the player who never plans
   strays, the board size, how many twists are in play, how tight the clock
   is, and for creaky boards and one-way tiles: how many, how many are traps,
   how many first slides ruin the level, and whether the player who never
   plans falls in.
   The generator sorts and picks levels by it, and each chapter from 9 on has
   a score to hit (targetFor), so the chapter averages follow the season plan:
   up inside a season, a small step back at a new season. */
function hardness(p) {
  return p.best + p.asides * 6 + p.extra * 6 + Math.min(1, p.wander - 1) * 80 + p.rounds * 4 + p.area * 0.3
    + p.boards * 3 + p.arrows * 2 + (p.balls || 0) * 3 + p.traps * 6 + p.ruin * 60 + (p.dies ? 15 : 0);
}
// the part of the score that is the same for every level of a tier: twists in play and the clock
function tierBonus(t, chapter) {
  const twists = ["rail", "locks", "gates", "blankets", "creaky", "arrows", "yarn"].filter(k => t[k]).length;
  return twists * 3 + (1 - squeezeOf(chapter)) * 60;
}
// The average score a chapter (9 and up) should come out at. (Chapters 1 to 8
// come out at 39 to 142 without a target.) The shape is the season plan:
//  - the slow rise over all chapters (trendOf),
//  - inside a season up by about 4 or 5 a chapter, so every chapter is harder
//    than the one before and the finale is the hardest,
//  - a new season starts a little under the last finale, but above the start
//    of the season before,
//  - a season that brings a new trap scores higher for it (creaky boards +8,
//    one-way tiles +14 more, yarn balls +8 more), and its first chapter, the
//    one that teaches the trap with five gentle levels, a little lower.
// In numbers: 146 in chapter 9, 153 in 10, 150 in 11, 190 in 20, 176 in 21,
// 207 in 28, 197 in 29, 214 in 32, 231 in 36, 215 in 37, 232 in 40.
// The numbers were fitted to what chapters 9 to 32 can give. If a later
// chapter can not reach its score, the log says so with "!!": then its knobs
// (laterTiers, chapterFor) need to give more, or a new twist has to add its own
// bonus here.
function targetFor(num) {
  if (num <= 10) return num === 9 ? 146 : 153;                     // the end of season 1, tied to where chapter 8 came out
  const { season, part } = seasonOf(num);
  const newTraps = season >= 5 ? 30 : season === 4 ? 22 : season === 3 ? 8 : 0;
  const teaching = num === 21 ? 3 : num === 29 || num === 37 ? 4 : 0;
  // the score counts a tight clock too; the targets were fitted with the clock as
  // first planned, so a kinder clock must not be made up for with harder puzzles
  const kinderClock = 60 * (squeezeOf(num) - plannedSqueeze(num));
  return 112.8 + 122 * trendOf(num) + 21 * (part - 0.5) + newTraps - teaching - kinderClock;
}

// Seconds on the clock. Three stars needs half of it left over.
// "switches" is how often the tidy solution changes to another bed: each change
// is a moment to stop and think. Later chapters get less time: the full time in
// chapter 1, 0.89 of it in chapter 8, 0.7 in chapter 28, 0.6 in chapter 80
// (straight lines in between), and it stays at 0.6 after that.
// The clock as it was first planned: 0.7 by chapter 28. The chapter score
// targets were fitted with it (see targetFor).
function plannedSqueeze(chapter) {
  if (chapter <= 8) return 1 - 0.3 * (chapter - 1) / 19;
  const at8 = 1 - 0.3 * 7 / 19;
  if (chapter <= 28) return at8 + (0.7 - at8) * (chapter - 8) / 20;
  return Math.max(0.6, 0.7 - 0.1 * (chapter - 28) / 52);
}
// The clock we use. Up to chapter 20 the same as planned. A play-test showed
// that sliding on to 0.7 took three stars away from everyone but the most
// careful players, so from chapter 21 it holds at about 0.77 up to chapter 28,
// and after that it slides slowly (about 0.003 a chapter) to 0.6 in chapter 80.
const HOLD = plannedSqueeze(21);
function squeezeOf(chapter) {
  if (chapter <= 20) return plannedSqueeze(chapter);
  if (chapter <= 28) return HOLD;
  return Math.max(0.6, HOLD - (HOLD - 0.6) * (chapter - 28) / 52);
}
// The breather levels of a chapter (places 5, 10, 15 and 20) get a fifth more
// time, from chapter 21 on, so a breather really feels like one.
const isBreather = slot => slot > 0 && slot < 25 && slot % 5 === 0;
function timeFor(d, switches, chapter, slot = 0) {
  const breather = chapter >= 21 && isBreather(slot) ? 1.2 : 1;
  return Math.max(30, Math.min(240, Math.ceil((22 + d * 1.9 + switches * 5) * squeezeOf(chapter) * breather / 5) * 5));
}
// Put slides of the same bed next to each other where the order does not matter.
// The solution keeps its length but reads as "this bed, then that bed" with as
// few hand-overs as it can. Every new order is replayed with the simple engine.
function tidy(level, path) {
  const P = prepare(level), occ = new Int8Array(P.N);
  const works = p => {
    let s = startState(level);
    for (const [b, dr, dc] of p) { occupancy(P, s, occ); s = slide(P, s, occ, b, dr, dc); if (!s) return false; }
    return s.pos.every(x => x < 0);
  };
  const group = p => {
    const runs = [];
    for (const m of p) { const last = runs[runs.length - 1]; if (last && last[0][0] === m[0]) last.push(m); else runs.push([m]); }
    return runs;
  };
  let runs = group(path);
  for (let better = true; better;) {
    better = false;
    for (let a = 0; a < runs.length && !better; a++) for (let b = a + 2; b < runs.length && !better; b++) {
      if (runs[b][0][0] !== runs[a][0][0]) continue;
      for (const early of [true, false]) {
        const order = runs.slice();
        if (early) order.splice(a + 1, 0, order.splice(b, 1)[0]);   // do the later run right away
        else order.splice(b - 1, 0, order.splice(a, 1)[0]);         // or hold the first run back
        const flat = [].concat(...order);
        if (works(flat)) { runs = group(flat); better = true; break; }
      }
    }
  }
  return [].concat(...runs);
}
const switchesOf = p => { let n = 0; for (let j = 1; j < p.length; j++) if (p[j][0] !== p[j - 1][0]) n++; return n; };
function runsOf(solution) {
  const runs = [];
  for (const [bed, dr, dc] of solution) {
    const last = runs[runs.length - 1];
    if (last && last.bed === bed) last.path.push([dr, dc]); else runs.push({ bed, path: [[dr, dc]] });
  }
  return runs;
}


/* ---------- growing a harder level ----------
   On the big boards a random level with enough step-asides is very rare (a
   handful in a hundred thousand tries). So instead of only rolling dice, take
   a board that can be finished and nudge it: move one cat, or move one bed to
   another free spot. Keep the nudge if the player who never plans has at least
   as hard a time as before. A few hundred nudges turn an ordinary board into a
   knotty one. Only used from chapter 9 on ("t.grow" = how many nudges to try). */
function nudge(lv) {
  const { rows, cols } = lv, g = lv.map.map(row => row.split(""));
  const taken = g.map(row => row.map(ch => ch !== "."));
  for (const b of lv.beds) for (const [dr, dc] of b.cells) taken[b.r + dr][b.c + dc] = true;
  const bi = Math.floor(rnd() * lv.beds.length), b = lv.beds[bi];
  if (rnd() < 0.7) {
    // move one of this bed's cats to another cell the bed can get to
    const mine = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (g[r][c] === b.color) mine.push([r, c]);
    const spots = sweepCells(g, taken, b, b.axis);
    if (!spots.length) return null;
    const [fr, fc] = pick(mine), [tr, tc] = pick(spots);
    g[fr][fc] = "."; g[tr][tc] = b.color;
    // a gate or a blanket on that cat moves along with it
    const follow = list => list.map(x => x[0] === fr && x[1] === fc ? [tr, tc].concat(x.slice(2)) : x);
    const out = { ...lv, map: g.map(row => row.join("")) };
    if (lv.gates) out.gates = follow(lv.gates);
    if (lv.blankets) out.blankets = follow(lv.blankets);
    return out;
  }
  // or move the bed itself (not a rail bed: its cats sit in its lane)
  if (b.axis) return null;
  for (const [dr, dc] of b.cells) taken[b.r + dr][b.c + dc] = false;
  const r = Math.floor(rnd() * rows), c = Math.floor(rnd() * cols);
  if (!b.cells.every(([dr, dc]) => r + dr < rows && c + dc < cols && !taken[r + dr][c + dc])) return null;
  return { ...lv, beds: lv.beds.map((x, i) => i === bi ? { ...x, r, c } : x) };
}
function grow(t, lv, C, plain) {
  // aim a little above the bar, so the levels are not all the same strength
  const aim = Math.min(t.sMax, Math.floor(t.sAim + rnd() * 2)), long = t.dMin + 6;
  const score = p => Math.min(p.asides, aim) * 1000 + Math.min(p.slides, long);
  let best = score(plain);
  for (let step = 0; step < t.grow && best < aim * 1000 + long; step++) {
    const lv2 = nudge(lv);
    if (!lv2) continue;
    const C2 = compile(lv2);
    if (!C2) continue;
    const p = plainPlayer(C2);
    if (!p || score(p) < best - 2) continue;                       // a little worse is fine: it keeps things moving
    lv = lv2; C = C2; plain = p; best = Math.max(best, score(p));
  }
  return { lv, C, plain };
}

// Why were boards thrown away? Counted per reason, so a tier that finds too
// little can be tuned by looking at its log instead of guessing.
let why = {};
const no = reason => { why[reason] = (why[reason] || 0) + 1; return null; };

// One random board, checked. Returns null if it does not fit the tier,
// else everything we know about it. This is the heart of the generator.
function candidate(t) {
  let lv = randomLevel(t);
  if (!lv) return no("could not be laid out");
  let C = compile(lv);
  if (!C) return no("a bed can never reach a cat");
  let plain = plainPlayer(C);
  if (!plain) return no("can not be finished");
  if (t.grow) ({ lv, C, plain } = grow(t, lv, C, plain));
  if (plain.asides < t.sMin || plain.asides > t.sMax) return no("step-asides not in range");   // the main filter
  let r = solveFast(C, t.dMax);
  if (r.d < t.dMin) return no("too short or too long");
  const th = thinkingFast(C);
  // creaky boards and one-way tiles go onto a level that is already a good puzzle without them
  const hasTraps = t.creaky || t.arrows || t.yarn, creaky = hasTraps ? addTraps(t, lv, r.path) : null;
  if (hasTraps && !creaky) return no("no good place for traps");
  let extra = 0;
  if (!th.tricky) {
    // plain level: every bed can walk to its cats once the beds before it are done
    if (t.eMin > 0 || th.rounds < t.minRounds) return no("too plain");
  } else {
    const e = extraTurns(C, 600000, t.eMax + 1);
    if (e.extra < t.eMin || e.extra > t.eMax) return no("extra turns not in range");
    if (!e.exact && t.eMax < 99) return no("extra turns not in range");   // could not count it for sure
    extra = e.extra;
  }
  // how hard is it? (see hardness)
  const parts = { best: r.d, asides: plain.asides, extra, wander: plain.slides / r.d, rounds: th.rounds, area: t.rows * t.cols, boards: 0, arrows: 0, balls: 0, traps: 0, ruin: 0, dies: false };
  if (creaky) {
    lv = creaky.lv;                                                // same solution, same fewest slides
    Object.assign(parts, { boards: creaky.boards, arrows: creaky.arrows, balls: creaky.balls, traps: creaky.trap.traps, ruin: creaky.trap.ruin, dies: creaky.plain.dead });
    parts.wander = creaky.plain.dead ? 1.5 : creaky.plain.slides / r.d;
  }
  return { lv, r, th, extra, plain, creaky, hard: hardness(parts) };
}

// The score of a finished level, worked out from the level alone (for reports
// and checks). Step-asides and extra turns are counted with the creaky boards
// and one-way tiles taken as plain floor, the same way the generator does it.
function difficulty(lv, chapter) {
  const flat = lv.map.join(""), boards = (flat.match(/c/g) || []).length, arrows = (flat.match(/[\^v<>]/g) || []).length, balls = (flat.match(/y/g) || []).length;
  const C = compile(lv), C0 = boards + arrows + balls ? compile({ ...lv, map: lv.map.map(row => row.replace(/[c^v<>y]/g, ".")) }) : C;
  const plain = plainPlayer(C0, 400000), th = thinkingFast(C0);
  const p = { best: lv.best, asides: plain.asides, extra: th.tricky ? extraTurns(C0, 600000, 100).extra : 0, wander: plain.slides / lv.best, rounds: th.rounds, area: lv.rows * lv.cols, boards, arrows, balls, traps: 0, ruin: 0, dies: false };
  if (boards + arrows + balls) {
    const trap = trapsOf(C), real = plainPlayer(C, 400000);
    Object.assign(p, { traps: trap.traps, ruin: trap.ruin, dies: real.dead });
    p.wander = real.dead ? 1.5 : real.slides / lv.best;
  }
  const twists = { rail: lv.beds.some(b => b.axis), locks: lv.beds.some(b => b.lock !== undefined), gates: !!lv.gates, blankets: !!lv.blankets, creaky: boards > 0, arrows: arrows > 0, yarn: balls > 0 };
  return { ...p, score: hardness(p) + tierBonus(twists, chapter) };
}

// Does this solution finish this level? (simple engine, one slide at a time)
function replays(lv, path) {
  const P = prepare(lv), occ = new Int8Array(P.N);
  let s = startState(lv);
  for (const [i, dr, dc] of path) { occupancy(P, s, occ); s = slide(P, s, occ, i, dr, dc); if (!s) return false; }
  return s.pos.every(p => p < 0);
}
// Can this level not be finished at all?
function cantFinish(C) {
  if (!C) return true;
  return C.risky ? isLost(C, C.start, C.full) === true : !plainPlayer(C);
}
// The empty cells of a level, each with a weight for "put a creaky board here".
// A board may only go where the solution we have still works: on a cell the
// beds slide over once and never come back to, or on a cell they never touch.
// Best are chokepoints: cells some bed has to cross, because with a wall there
// the level could not be finished. Break such a board too early and the level
// is lost: that is the trap. Cells the solution never touches are only decoys.
function creakySpots(lv, path) {
  const P = prepare(lv), occ = new Int8Array(P.N), flat = lv.map.join("");
  // 0 never covered, 1 a bed is on it, 2 a bed was on it and left, 3 covered a second time (no good)
  const state = new Int8Array(P.N), free = [];
  let s = startState(lv);
  occupancy(P, s, occ);
  for (let i = 0; i < P.N; i++) if (flat[i] === "." && occ[i] < 0) free.push(i);   // no bed may start on one
  for (const [i, dr, dc] of path) {
    const to = s.pos[i] + dr * P.cols + dc;
    s = slide(P, s, occ, i, dr, dc);
    occupancy(P, s, occ);
    // a bed that fills up on this slide is gone at once, but it was on its last cells for a moment
    if (s.pos[i] < 0) for (const [sr, sc] of P.shapes[i]) occ[to + sr * P.cols + sc] = i;
    for (const idx of free) {
      if (occ[idx] >= 0) state[idx] = state[idx] === 0 || state[idx] === 1 ? 1 : 3;
      else if (state[idx] === 1) state[idx] = 2;
    }
    if (s.pos[i] < 0) { occupancy(P, s, occ); for (const idx of free) if (occ[idx] < 0 && state[idx] === 1) state[idx] = 2; }
  }
  const spots = [];
  for (const idx of free) {
    if (state[idx] === 3) continue;
    spots.push({ idx, weight: !state[idx] ? 1 : cantFinish(compile(withCells(lv, [idx], "#"))) ? 12 : 3 });
  }
  return spots;
}
const withCells = (lv, cells, ch) => {
  const g = lv.map.map(row => row.split(""));
  for (const idx of cells) g[(idx / lv.cols) | 0][idx % lv.cols] = ch;
  return { ...lv, map: g.map(row => row.join("")) };
};
// One-way tiles for a level, laid so that the solution we have still works:
// an arrow goes on a cell the beds only ever slide over in one direction, and
// points that way. So the way through is still there, but nobody can come back
// through it, and a bed that takes the lane at the wrong time is stuck behind
// it. Arrows come in short lanes (1 to 3 tiles in a row). A cell the solution
// never touches may get an arrow too: a side lane to get lost in.
function layArrows(lv, path, want) {
  const P = prepare(lv), occ = new Int8Array(P.N), flat = lv.map.join("");
  const way = new Int8Array(P.N).fill(-1), ok = new Uint8Array(P.N);   // way: -1 never touched, 0..3 one direction only, 9 mixed
  let s = startState(lv);
  occupancy(P, s, occ);
  for (let i = 0; i < P.N; i++) if (flat[i] === "." && occ[i] < 0) ok[i] = 1;      // no bed may start on one
  for (const [i, dr, dc] of path) {
    const d = DIRS.findIndex(x => x[0] === dr && x[1] === dc), from = s.pos[i];
    for (const [sr, sc] of P.shapes[i]) for (const idx of [from + sr * P.cols + sc, from + (sr + dr) * P.cols + sc + dc]) {
      way[idx] = way[idx] === -1 || way[idx] === d ? d : 9;
    }
    occupancy(P, s, occ);
    s = slide(P, s, occ, i, dr, dc);
  }
  const onPath = [], aside = [];
  for (let i = 0; i < P.N; i++) if (ok[i] && way[i] !== 9) (way[i] >= 0 ? onPath : aside).push(i);
  if (!onPath.length) return null;
  const tiles = new Map();
  for (let guard = 0; tiles.size < want && guard < 20; guard++) {
    // mostly on the solution's path; now and then a side lane
    const seed = tiles.size && aside.length && rnd() < 0.25 ? pick(aside) : pick(onPath);
    if (tiles.has(seed)) continue;
    const d = way[seed] >= 0 ? way[seed] : Math.floor(rnd() * 4), [dr, dc] = DIRS[d];
    tiles.set(seed, d);
    // grow the lane forward along its arrow while the next cell fits
    let r = (seed / P.cols) | 0, c = seed % P.cols;
    for (let more = Math.floor(rnd() * 3); more > 0 && tiles.size < want; more--) {
      r += dr; c += dc;
      const idx = r * P.cols + c;
      if (r < 0 || c < 0 || r >= P.rows || c >= P.cols || !ok[idx] || tiles.has(idx) || (way[idx] !== -1 && way[idx] !== d)) break;
      tiles.set(idx, d);
    }
  }
  let out = lv;
  for (const [idx, d] of tiles) out = withCells(out, [idx], ARROWS[d]);
  return { lv: out, count: tiles.size };
}
// Yarn balls for a level, laid so that the solution we have still works (the
// beds push them out of the way as they go). Best are cells the solution's
// beds slide over: there a ball is in the way, and pushing it the wrong way
// can lose the level. Next best are cells right beside the solution's path.
function layYarn(lv, path, want) {
  const P = prepare(lv), occ = new Int8Array(P.N), flat = lv.map.join("");
  const crossed = new Uint8Array(P.N), free = [];
  let s = startState(lv);
  occupancy(P, s, occ);
  for (let i = 0; i < P.N; i++) if (flat[i] === "." && occ[i] < 0) free.push(i);   // no bed may start on one
  for (const [i, dr, dc] of path) { s = slide(P, s, occ, i, dr, dc); occupancy(P, s, occ); for (let k = 0; k < P.N; k++) if (occ[k] >= 0) crossed[k] = 1; }
  const near = idx => DIRS.some(([dr, dc]) => { const r = ((idx / P.cols) | 0) + dr, c = idx % P.cols + dc; return r >= 0 && c >= 0 && r < P.rows && c < P.cols && crossed[r * P.cols + c]; });
  const spots = free.map(idx => ({ idx, weight: crossed[idx] ? 6 : near(idx) ? 2 : 1 }));
  if (!spots.some(x => x.weight > 1)) return null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const left = spots.slice(), cells = [];
    for (let k = want; k > 0 && left.length; k--) {
      let roll = rnd() * left.reduce((sum, x) => sum + x.weight, 0), at = 0;
      while (at < left.length - 1 && (roll -= left[at].weight) >= 0) at++;
      cells.push(left.splice(at, 1)[0].idx);
    }
    const out = withCells(lv, cells, "y");
    if (replays(out, path)) return { lv: out, count: cells.length };
  }
  return null;
}
// Try a few ways to lay traps (one-way tiles, creaky boards, yarn balls, or a
// mix) on a level. The level's own solution still works with them, so the fewest slides
// stay the same. Keeps the first way that has a real dead end (see chapterFor).
function addTraps(t, lv, path) {
  const spots0 = t.creaky && !t.arrows ? creakySpots(lv, path) : null;
  if (spots0 && !spots0.some(x => x.weight > 1)) return null;
  for (let attempt = 0; attempt < (t.arrows && t.creaky ? 6 : 12); attempt++) {
    let lv2 = lv, arrows = 0, boards = 0, balls = 0;
    if (t.arrows) {
      const laid = layArrows(lv, path, between(t.arrows));
      if (!laid) return null;
      lv2 = laid.lv; arrows = laid.count;
    }
    if (t.creaky) {
      const left = (spots0 || creakySpots(lv2, path)).slice(), cells = [];
      let onPath = false;
      for (let want = between(t.creaky); want > 0 && left.length; want--) {
        let roll = rnd() * left.reduce((sum, x) => sum + x.weight, 0), at = 0;
        while (at < left.length - 1 && (roll -= left[at].weight) >= 0) at++;
        if (left[at].weight > 1) onPath = true;
        cells.push(left.splice(at, 1)[0].idx);
      }
      if (!onPath) continue;                                       // only decoys: no trap in that
      lv2 = withCells(lv2, cells, "c"); boards = cells.length;
    }
    if (t.yarn) {
      const laid = layYarn(lv2, path, between(t.yarn));
      if (!laid) { no("  traps: no good place for yarn"); continue; }
      lv2 = laid.lv; balls = laid.count;
    }
    if (!replays(lv2, path)) { no("  traps: solution broke"); continue; }   // should not happen: a safety net
    const C = compile(lv2);
    if (!C) continue;
    // check near the solution as found and as it will be stored (tidied), since both get played
    if (silentDeadEnds(C, path) > 0 || silentDeadEnds(C, tidy(lv2, path)) > 0) { no("  traps: a dead end that does not show itself"); continue; }
    const trap = trapsOf(C), plain = plainPlayer(C);
    if (!plain) continue;
    // a real dead end: a board that can be broken early or a lane that can be taken
    // too early so the level is lost, or the player who never plans ends up stuck
    if ((trap.traps < 1 && !plain.dead) || (t.trapDepth && trap.depth > t.trapDepth)) { no("  traps: no dead end"); continue; }
    const mustFall = rnd() < t.nasty, worst = mustFall && rnd() < t.nastiest;
    if (mustFall && !plain.dead) { no("  traps: plain player gets through"); continue; }
    if (worst && trap.ruin === 0 && trap.traps < 2) { no("  traps: not nasty enough"); continue; }
    return { lv: lv2, plain, trap, boards, arrows, balls };
  }
  return null;
}
// The finished level as the game wants it, plus its solution.
// "slot": where in the chapter it goes (1 to 25), for the breather time.
function pack(lv, r, chapter, slot = 0) {
  if (!replays(lv, r.path)) throw new Error("the solution does not finish the level");
  const path = tidy(lv, r.path);
  return { path, level: { ...lv, time: timeFor(r.d, switchesOf(path), chapter, slot), best: r.d } };
}

function buildChapter(num) {
  const ch = chapterFor(num);
  setSeed(7411 * num + 97);
  const fixed = [], pool = [], pools = [];
  for (const lv of ch.handMade || []) {
    const r = solve(lv);
    if (r.d < 0) throw new Error("hand-made level can't be solved");
    fixed.push({ lv, r, hard: 0 });
  }
  ch.tiers.forEach((t, ti) => {
    const found = [], seenIds = new Set();
    const t0 = Date.now(), elapsed = () => (Date.now() - t0) / 1000;
    // The budget is counted in tries, not seconds, so a chapter comes out the
    // same on a slow and on a fast computer.
    const budget = t.tries || 600000;
    let tries = 0;
    why = {};
    // look for four times as many as needed, then pick a spread from them
    while (found.length < t.n * 4) {
      if (tries >= budget && found.length >= t.n) { process.stderr.write(`ch${num} tier ${ti + 1} (${t.name}): out of tries, going on with ${found.length} (wanted ${t.n * 4} to pick from)\n`); break; }
      if (tries >= budget * 5) break;
      tries++;
      const c = candidate(t);
      if (!c) continue;
      const id = JSON.stringify(c.lv);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      found.push(c);
      const cr = c.creaky ? ` boards=${c.creaky.boards} arrows=${c.creaky.arrows} traps=${c.creaky.trap.traps} ruin=${c.creaky.trap.ruin.toFixed(2)}${c.creaky.plain.dead ? " plain-player-dies" : ""}` : "";
      process.stderr.write(`ch${num} tier ${ti + 1} (${t.name}): ${found.length}  slides=${c.r.d} asides=${c.plain.asides} extra=${c.extra} rounds=${c.th.rounds}${c.th.tricky ? " tricky" : ""}${cr} (tries ${tries}, ${elapsed().toFixed(0)}s)\n`);
    }
    if (found.length < t.n) process.stderr.write(`!! ch${num} tier ${ti + 1} only found ${found.length} of ${t.n}\n`);
    process.stderr.write(`ch${num} tier ${ti + 1} (${t.name}): kept ${found.length} of ${tries} tries in ${elapsed().toFixed(0)}s. Thrown away: ${Object.keys(why).map(k => `${k.trim()} ${why[k]}`).join(", ")}\n`);
    if (num >= 9) for (const c of found) c.hard += tierBonus(t, num);
    found.sort((a, b) => a.hard - b.hard);
    const n = Math.min(t.n, found.length);
    if (t.intro) { fixed.push(...found.slice(0, n)); return; }      // teaching levels: the easiest ones, at the front
    if (num >= 9) { pools.push({ n, found }); return; }             // picked below, all boards together
    // Chapters 1 to 8: spread the picks from easy to hard instead of taking only the
    // extremes. From chapter 4 on they skip the easiest quarter of what was found.
    const from = Math.min(found.length - n, Math.floor(found.length * t.lean));
    for (let j = 0; j < n; j++) pool.push(found[n === 1 ? found.length - 1 : from + Math.round(j * (found.length - 1 - from) / (n - 1))]);
  });

  if (pools.length) {
    // Chapter 9 and up: the chapter has an average score to hit (see targetFor).
    // "x" slides the picking window over what was found: 0 = the easier half
    // of every board's levels, 1 = the harder half. Take the x that comes closest.
    const picksAt = x => [].concat(...pools.map(({ n, found }) => {
      if (found.length <= n) return found;
      const width = Math.max(n, Math.ceil(found.length / 2)), from = Math.round(x * (found.length - width));
      return Array.from({ length: n }, (_, j) => found[from + (n === 1 ? (width - 1) >> 1 : Math.round(j * (width - 1) / (n - 1)))]);
    }));
    const meanAt = x => { const all = fixed.concat(picksAt(x)); return all.reduce((sum, c) => sum + c.hard, 0) / all.length; };
    let x = 0.5;
    if (ch.target !== null) for (let k = 0; k <= 40; k++) if (Math.abs(meanAt(k / 40) - ch.target) < Math.abs(meanAt(x) - ch.target)) x = k / 40;
    process.stderr.write(`ch${num} score: aimed for ${ch.target === null ? "nothing" : ch.target.toFixed(1)}, got ${meanAt(x).toFixed(1)} (window at ${x}; could be anything from ${meanAt(0).toFixed(1)} to ${meanAt(1).toFixed(1)}, middle ${meanAt(0.5).toFixed(1)})\n`);
    if (ch.target !== null && Math.abs(meanAt(x) - ch.target) > 1.5) process.stderr.write(`!! ch${num} can not reach its score ${ch.target.toFixed(1)}\n`);
    pool.push(...picksAt(x));
  }
  // pacing: climb, climb, climb, peak, breather. The chapter ends on its hardest level.
  pool.sort((a, b) => a.hard - b.hard);
  let ordered = [];
  if (num < 21) {
    for (let g = 0; g < pool.length; g += 5) {
      const grp = pool.slice(g, g + 5);
      const last = g + 5 >= pool.length;
      if (grp.length === 5 && !last) ordered.push(grp[0], grp[1], grp[2], grp[4], grp[3]);
      else ordered.push(...grp);
    }
  } else {
    // From chapter 21: the breather places (5, 10, 15, 20) get levels from the
    // easiest quarter of the chapter, so the rest is felt. Every other place
    // climbs, so the level before a breather is the peak of its group of five
    // and the chapter still ends on its hardest level.
    const slots = [];
    for (let slot = fixed.length + 1; slot <= fixed.length + pool.length; slot++) slots.push(slot);
    const rests = slots.filter(isBreather), quarter = Math.max(rests.length, Math.ceil(pool.length / 4));
    const restPicks = new Set(rests.map((_, k) => rests.length === 1 ? 0 : Math.round(k * (quarter - 1) / (rests.length - 1))));
    const easy = pool.filter((_, j) => restPicks.has(j)), climb = pool.filter((_, j) => !restPicks.has(j));
    ordered = slots.map(slot => (isBreather(slot) ? easy : climb).shift());
  }
  const all = fixed.concat(ordered);
  for (const swap of SWAPS[num] || []) all[swap.slot - 1] = gentler(ch, num, swap, all[swap.slot - 1].r.d);
  const levels = [], solutions = [];
  all.forEach(({ lv, r }, i) => {
    if (new Set(lv.beds.map(b => b.color)).size !== lv.beds.length) throw new Error("two beds share a color");
    if (lv.beds.some(b => b.need !== b.cells.length)) throw new Error("a bed must need one cat per cell");
    const { level: out, path } = pack(lv, r, num, i + 1);
    if (i === 0 && ch.hint) out.hint = ch.hint;
    if (out.hint) { out.guide = runsOf(path); out.time = Math.max(out.time, 75); }
    levels.push(out); solutions.push(path);
  });
  return { levels, solutions };
}

/* ---------- swaps ----------
   A level the play-test found unfair for its place, swapped for a gentler one
   of the same kind: fewer step-asides and no more slides. buildChapter does
   the swap, so building the chapter again gives the same levels, and
   "node tools/levels.js swap 29" does it on the chapter file that is there.
    - level 706 (chapter 29, place 6) and level 908 (chapter 37, place 8):
      bridging levels nobody but the most careful players got 3 stars on. */
const SWAPS = { 29: [{ slot: 6, tier: "bridging arrows" }], 37: [{ slot: 8, tier: "bridging yarn" }] };
function gentler(ch, num, { slot, tier }, maxSlides) {
  const t0 = ch.tiers.find(t => t.name === tier);
  const t = Object.assign({}, t0, { sMin: Math.max(1, t0.sMin - 1), sMax: t0.sMin, sAim: Math.max(1, t0.sMin - 1) + 0.5, eMin: 1 });
  setSeed(31337 * num + slot);
  const found = [];
  for (let tries = 0; tries < 300000 && found.length < 6; tries++) {
    const c = candidate(t);
    if (c && c.r.d <= maxSlides) found.push(c);
  }
  if (!found.length) throw new Error(`no gentler level found for chapter ${num}, place ${slot}`);
  found.sort((a, b) => a.plain.asides - b.plain.asides || a.r.d - b.r.d || a.hard - b.hard);
  process.stderr.write(`ch${num} place ${slot}: swapped for a gentler ${tier} level (slides=${found[0].r.d} asides=${found[0].plain.asides})\n`);
  return found[0];
}

// How many chapter files are there, counting up from 1 without a gap?
function chaptersOnDisk() {
  let n = 0;
  while (fs.existsSync(path.join(__dirname, `chapter-${n + 1}.json`))) n++;
  return n;
}

if (require.main === module) {
  const arg = process.argv[2], isChapter = v => /^[1-9]\d*$/.test(v || "");
  if (arg === "merge") {
    // joins every chapter file there is (1, 2, 3, ... until one is missing)
    const levels = [], solutions = [], count = chaptersOnDisk();
    for (let n = 1; n <= count; n++) {
      const ch = JSON.parse(fs.readFileSync(path.join(__dirname, `chapter-${n}.json`), "utf8"));
      levels.push(...ch.levels); solutions.push(...ch.solutions);
      process.stderr.write(`chapter ${n}: ${ch.levels.length} levels${ch.levels.length === PER_CHAPTER ? "" : "   !! should be " + PER_CHAPTER}\n`);
    }
    fs.writeFileSync(path.join(__dirname, "..", "levels-data.js"),
      "// Made by tools/levels.js. Every level here was solved by the computer first.\nwindow.LEVELS = [\n" +
      levels.map(l => " " + JSON.stringify(l)).join(",\n") + "\n];\n");
    fs.writeFileSync(path.join(__dirname, "solutions.json"), JSON.stringify(solutions));
    process.stderr.write(`wrote ${levels.length} levels in ${count} chapters\n`);
  } else if (arg === "swap" && isChapter(process.argv[3])) {
    // do the swaps (see SWAPS) on the chapter file that is there
    const num = Number(process.argv[3]), file = path.join(__dirname, `chapter-${num}.json`);
    const ch = JSON.parse(fs.readFileSync(file, "utf8")), plan = chapterFor(num);
    for (const swap of SWAPS[num] || []) {
      const c = gentler(plan, num, swap, ch.levels[swap.slot - 1].best);
      const { level, path: sol } = pack(c.lv, c.r, num, swap.slot);
      if (swap.slot === 1 && plan.hint) { level.hint = plan.hint; level.guide = runsOf(sol); level.time = Math.max(level.time, 75); }
      ch.levels[swap.slot - 1] = level; ch.solutions[swap.slot - 1] = sol;
    }
    fs.writeFileSync(file, JSON.stringify(ch));
  } else if (arg === "topup" && isChapter(process.argv[3])) {
    // A chapter came out short: add levels (second board size) just before its finale.
    const num = Number(process.argv[3]), file = path.join(__dirname, `chapter-${num}.json`);
    const ch = JSON.parse(fs.readFileSync(file, "utf8")), t = chapterFor(num).tiers[1];
    const have = new Set(ch.levels.map(l => l.map.join("")));
    setSeed(99991 * num);
    while (ch.levels.length < PER_CHAPTER) {
      const c = candidate(t);
      if (!c || have.has(c.lv.map.join(""))) continue;
      have.add(c.lv.map.join(""));
      const { level, path: sol } = pack(c.lv, c.r, num);
      ch.levels.splice(ch.levels.length - 1, 0, level);
      ch.solutions.splice(ch.solutions.length - 1, 0, sol);
      process.stderr.write(`chapter ${num}: added a level (slides=${c.r.d} asides=${c.plain.asides} extra=${c.extra})\n`);
    }
    fs.writeFileSync(file, JSON.stringify(ch));
  } else if (isChapter(arg)) {
    // any chapter number works: the plan for chapter 9 and up is a formula
    fs.writeFileSync(path.join(__dirname, `chapter-${arg}.json`), JSON.stringify(buildChapter(Number(arg))));
    process.stderr.write(`chapter ${arg} done\n`);
  } else {
    process.stderr.write("usage: node tools/levels.js <chapter number> | topup <chapter number> | swap <chapter number> | merge\n");
  }
}
module.exports = {
  solve, thinking, prepare, startState, occupancy, slide, DIRS, SHAPES,
  compile, plainPlayer, solveFast, trapsOf, isLost, silentDeadEnds, fillOcc, moveMask, setBalls, ballsAfter: () => BALLS_AFTER, packBalls, unpackBalls, extraTurns, thinkingFast, tidy, switchesOf,
  randomLevel, candidate, reasons: () => why, timeFor, squeezeOf, chapterFor, climbOf, seasonOf, difficulty, chaptersOnDisk, PER_CHAPTER, setSeed,
};
