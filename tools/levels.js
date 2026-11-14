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
//
// Levels are not just "solvable". Each candidate is scored for how much
// thinking it needs (how many beds must wait for another bed first), and
// only the interesting ones are kept. Chapters are ordered in waves:
// harder, harder, peak, then a breather.
//
// Run:  node tools/levels.js 1      (makes chapter 1; same for 2 to 20)
//       node tools/levels.js merge  (joins the chapters into levels-data.js)

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
};
const SMALL = ["dot", "i2h", "i2v", "i2h", "i2v", "i3h", "i3v", "l3a", "l3b", "l3c", "l3d"];
const ALL = Object.keys(SHAPES).concat(["i2h", "i2v", "i3h", "i3v"]);
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
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
  let eat = null;
  for (const [sr, sc] of P.shapes[i]) {
    const r = br + sr, c = bc + sc;
    if (r < 0 || c < 0 || r >= P.rows || c >= P.cols) return null;
    const idx = r * P.cols + c;
    if (occ[idx] !== -1 && occ[idx] !== i) return null;
    if (P.gate[idx] >= 0 && s.pos[P.gate[idx]] >= 0) return null;       // gate still closed
    const ch = s.cats[idx];
    if (ch === "#") return null;
    if (ch !== ".") {
      if (ch !== P.colors[i]) return null;
      (eat || (eat = [])).push(idx);
    }
  }
  if (eat && eat.length > s.need[i]) return null;
  const pos = s.pos.slice();
  pos[i] = br * P.cols + bc;
  let cats = s.cats, need = s.need;
  if (eat) {
    const a = cats.split("");
    for (const e of eat) a[e] = ".";
    cats = a.join("");
    need = need.slice();
    need[i] -= eat.length;
    if (need[i] === 0) pos[i] = -1;
  }
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

/* ---------- random level ---------- */
let seed = 7411;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const between = v => Array.isArray(v) ? v[0] + Math.floor(rnd() * (v[1] - v[0] + 1)) : (v || 0);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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
  const beds = [];
  for (const color of bedColors) {
    let placed = false;
    for (let tries = 0; tries < 40 && !placed; tries++) {
      const cells = SHAPES[pick(t.shapes)];
      const r = Math.floor(rnd() * rows), c = Math.floor(rnd() * cols);
      if (!cells.every(([dr, dc]) => r + dr < rows && c + dc < cols && !taken[r + dr][c + dc])) continue;
      cells.forEach(([dr, dc]) => { taken[r + dr][c + dc] = true; });
      const max = Math.min(cells.length, 4);
      const need = cells.length === 1 ? 1 : Math.min(max, 1 + Math.floor(rnd() * max + rnd() * 0.6));
      beds.push({ color, need, r, c, cells });
      placed = true;
    }
    if (!placed) return null;
  }
  if (t.rail) {
    for (const b of beds) if (rnd() < t.rail) b.axis = rnd() < 0.5 ? "h" : "v";
    if (!beds.some(b => b.axis)) pick(beds).axis = rnd() < 0.5 ? "h" : "v";
  }
  if (t.locks) {
    const ids = shuffle(beds.map((_, i) => i));
    const n = Math.min(between(t.locks), Math.floor(ids.length / 2));
    for (let j = 0; j < n; j++) beds[ids[j * 2]].lock = ids[j * 2 + 1];
  }
  const catCells = [];
  for (const b of beds) {
    for (let n = 0; n < b.need; n++) {
      let free = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!taken[r][c]) free.push([r, c]);
      if (b.axis) {
        // a rail bed can only ever reach cats in its own lane
        const lanes = new Set(b.cells.map(([dr, dc]) => b.axis === "h" ? b.r + dr : b.c + dc));
        free = free.filter(([r, c]) => lanes.has(b.axis === "h" ? r : c));
      }
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

/* ---------- eight chapters, 25 levels each ---------- */
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

const T = (n, rows, cols, beds, o) => Object.assign({ n, rows, cols, beds, shapes: beds <= 3 ? SMALL : ALL }, o);
// board sizes for the early chapters (A) and the late chapters (B)
const SIZES_A = [
  T(5, 5, 5, 3, { walls: [0, 2], dMin: 7,  dMax: 28, minRounds: 2, budget: 30 }),
  T(6, 6, 5, 4, { walls: [0, 2], dMin: 11, dMax: 38, minRounds: 2, budget: 45 }),
  T(7, 6, 6, 5, { walls: [0, 4], dMin: 15, dMax: 50, minRounds: 3, budget: 70 }),
  T(7, 7, 6, 6, { walls: [2, 4], dMin: 19, dMax: 62, minRounds: 3, budget: 100 }),
];
const SIZES_B = [
  T(4, 6, 5, 4, { walls: [0, 2], dMin: 12, dMax: 40, minRounds: 2, budget: 40 }),
  T(7, 6, 6, 5, { walls: [0, 4], dMin: 16, dMax: 52, minRounds: 3, budget: 70 }),
  T(8, 7, 6, 6, { walls: [2, 4], dMin: 20, dMax: 64, minRounds: 3, budget: 110 }),
  T(6, 8, 6, 6, { walls: [2, 6], dMin: 24, dMax: 76, minRounds: 4, budget: 140 }),
];
// the biggest boards, for the last chapters
const SIZES_C = [
  T(4,  6, 6, 5, { walls: [0, 4], dMin: 18, dMax: 56, minRounds: 3, budget: 60 }),
  T(7,  7, 6, 6, { walls: [2, 4], dMin: 22, dMax: 68, minRounds: 3, budget: 100 }),
  T(10, 8, 6, 6, { walls: [2, 6], dMin: 26, dMax: 80, minRounds: 4, budget: 150 }),
  T(4,  8, 6, 7, { walls: [2, 6], dMin: 26, dMax: 90, minRounds: 4, budget: 150 }),
];
// like C, but with more walls on the biggest boards so they stay tight puzzles
const SIZES_D = [
  T(5,  6, 6, 5, { walls: [0, 4], dMin: 18, dMax: 56, minRounds: 3, budget: 60 }),
  T(10, 7, 6, 6, { walls: [2, 6], dMin: 20, dMax: 68, minRounds: 3, budget: 120 }),
  T(8,  8, 6, 6, { walls: [6, 10], dMin: 22, dMax: 80, minRounds: 3, budget: 150 }),
  T(2,  8, 6, 7, { walls: [4, 8], dMin: 24, dMax: 90, minRounds: 3, budget: 90 }),
];
const withExtra = (sizes, extra) => sizes.map(t => Object.assign({}, t, extra, t.beds <= 3 && extra.locks ? { locks: 1 } : {}));

const CHAPTERS = {
  1: { handMade: HAND_MADE, tiers: [
    T(3, 4, 4, 2, { walls: 0,      dMin: 4,  dMax: 14, minRounds: 1, budget: 15 }),
    T(6, 5, 5, 3, { walls: [0, 2], dMin: 8,  dMax: 26, minRounds: 2, budget: 30 }),
    T(7, 6, 5, 4, { walls: [0, 2], dMin: 12, dMax: 34, minRounds: 2, budget: 45 }),
    T(7, 6, 6, 5, { walls: [0, 4], dMin: 16, dMax: 46, minRounds: 3, budget: 70 }),
  ] },
  2: { hint: "h_rail",    tiers: withExtra(SIZES_A, { rail: 0.5 }) },
  3: { hint: "h_lock",    tiers: withExtra(SIZES_A, { locks: [1, 2] }) },
  4: { hint: "h_blanket", tiers: withExtra(SIZES_A, { blankets: 0.6 }) },
  5: { hint: "h_gate",    tiers: withExtra(SIZES_A, { gates: [1, 2] }) },
  6: { hint: "h_mix",     tiers: withExtra(SIZES_B, { rail: 0.35, locks: [1, 2] }) },
  7: { hint: "h_mix2",    tiers: withExtra(SIZES_B, { gates: [1, 2], locks: 1, blankets: 0.4 }) },
  8: { hint: "h_all",     tiers: withExtra(SIZES_B, { rail: 0.25, locks: 1, gates: [1, 2], blankets: 0.4 }) },
  // chapters 9 to 20 remix the same twists on bigger and bigger boards
  9:  { tiers: withExtra(SIZES_B, { rail: 0.4, blankets: 0.5 }) },
  10: { tiers: withExtra(SIZES_B, { locks: [1, 2], gates: [1, 2] }) },
  11: { tiers: withExtra(SIZES_B, { rail: 0.35, gates: [1, 2] }) },
  12: { tiers: withExtra(SIZES_B, { blankets: 0.6, locks: [1, 2] }) },
  13: { tiers: withExtra(SIZES_B, { rail: 0.3, locks: 1, blankets: 0.5 }) },
  14: { tiers: withExtra(SIZES_B, { rail: 0.3, gates: [1, 2], blankets: 0.5 }) },
  15: { tiers: withExtra(SIZES_D, {}) },
  16: { tiers: withExtra(SIZES_C, { rail: 0.5 }) },
  17: { tiers: withExtra(SIZES_C, { locks: [2, 3], gates: [1, 2] }) },
  18: { tiers: withExtra(SIZES_D, { blankets: 0.8, gates: [1, 2] }) },
  19: { tiers: withExtra(SIZES_C, { rail: 0.25, locks: [1, 2], gates: [1, 2], blankets: 0.5 }) },
  20: { tiers: withExtra(SIZES_C, { rail: 0.3, locks: [1, 2], gates: [2, 3], blankets: 0.6 }) },
};
const CHAPTER_COUNT = Object.keys(CHAPTERS).length;

function timeFor(d, switches) {
  return Math.max(30, Math.min(180, Math.ceil((22 + d * 1.9 + switches * 3) / 5) * 5));
}
function runsOf(solution) {
  const runs = [];
  for (const [bed, dr, dc] of solution) {
    const last = runs[runs.length - 1];
    if (last && last.bed === bed) last.path.push([dr, dc]); else runs.push({ bed, path: [[dr, dc]] });
  }
  return runs;
}

function buildChapter(num) {
  const ch = CHAPTERS[num];
  seed = 7411 * num + 97;
  const fixed = [], pool = [];
  for (const lv of ch.handMade || []) {
    const r = solve(lv);
    if (r.d < 0) throw new Error("hand-made level can't be solved");
    fixed.push({ lv, r, hard: 0 });
  }
  ch.tiers.forEach((t, ti) => {
    const found = [], seenIds = new Set();
    const t0 = Date.now(), elapsed = () => (Date.now() - t0) / 1000;
    let tries = 0;
    while (found.length < t.n * 4) {
      if (elapsed() > t.budget && found.length >= t.n) break;
      if (elapsed() > t.budget * 4) break;
      tries++;
      const lv = randomLevel(t);
      if (!lv) continue;
      const id = JSON.stringify(lv);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const r = solve(lv);
      if (r.d < t.dMin || r.d > t.dMax) continue;
      const th = thinking(lv);
      if (th.rounds < t.minRounds && !th.tricky) continue;        // too plain: every bed can just walk to its cats
      const hard = r.d + r.switches * 3 + th.rounds * 8 + (th.tricky ? 12 : 0) + t.rows * t.cols * 0.3;
      found.push({ lv, r, hard, th });
      process.stderr.write(`ch${num} tier ${ti + 1}: ${found.length}  slides=${r.d} rounds=${th.rounds}${th.tricky ? " tricky" : ""} (tries ${tries}, ${elapsed().toFixed(0)}s)\n`);
    }
    if (found.length < t.n) process.stderr.write(`!! ch${num} tier ${ti + 1} only found ${found.length} of ${t.n}\n`);
    // spread the picks from easy to hard instead of taking only the extremes
    found.sort((a, b) => a.hard - b.hard);
    const n = Math.min(t.n, found.length);
    for (let j = 0; j < n; j++) pool.push(found[n === 1 ? 0 : Math.round(j * (found.length - 1) / (n - 1))]);
  });

  // pacing: climb, climb, climb, peak, breather. The chapter ends on its hardest level.
  pool.sort((a, b) => a.hard - b.hard);
  const ordered = [];
  for (let g = 0; g < pool.length; g += 5) {
    const grp = pool.slice(g, g + 5);
    const last = g + 5 >= pool.length;
    if (grp.length === 5 && !last) ordered.push(grp[0], grp[1], grp[2], grp[4], grp[3]);
    else ordered.push(...grp);
  }
  const all = fixed.concat(ordered);
  const levels = [], solutions = [];
  all.forEach(({ lv, r }, i) => {
    if (new Set(lv.beds.map(b => b.color)).size !== lv.beds.length) throw new Error("two beds share a color");
    const out = { ...lv, time: lv.hint ? 60 : timeFor(r.d, r.switches), best: r.d };
    if (i === 0 && ch.hint) out.hint = ch.hint;
    if (out.hint) { out.guide = runsOf(r.path); out.time = Math.max(out.time, 75); }
    levels.push(out); solutions.push(r.path);
  });
  return { levels, solutions };
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === "merge") {
    const levels = [], solutions = [];
    for (let n = 1; n <= CHAPTER_COUNT; n++) {
      const ch = JSON.parse(fs.readFileSync(path.join(__dirname, `chapter-${n}.json`), "utf8"));
      levels.push(...ch.levels); solutions.push(...ch.solutions);
      process.stderr.write(`chapter ${n}: ${ch.levels.length} levels\n`);
    }
    fs.writeFileSync(path.join(__dirname, "..", "levels-data.js"),
      "// Made by tools/levels.js. Every level here was solved by the computer first.\nwindow.LEVELS = [\n" +
      levels.map(l => " " + JSON.stringify(l)).join(",\n") + "\n];\n");
    fs.writeFileSync(path.join(__dirname, "solutions.json"), JSON.stringify(solutions));
    process.stderr.write(`wrote ${levels.length} levels\n`);
  } else if (arg === "topup" && CHAPTERS[process.argv[3]]) {
    // A chapter came out short: add levels (second board size) just before its finale.
    const num = Number(process.argv[3]), file = path.join(__dirname, `chapter-${num}.json`);
    const ch = JSON.parse(fs.readFileSync(file, "utf8")), t = CHAPTERS[num].tiers[1];
    seed = 99991 * num;
    while (ch.levels.length < 25) {
      const lv = randomLevel(t);
      if (!lv) continue;
      const r = solve(lv);
      if (r.d < t.dMin || r.d > t.dMax) continue;
      const th = thinking(lv);
      if (th.rounds < t.minRounds && !th.tricky) continue;
      ch.levels.splice(ch.levels.length - 1, 0, { ...lv, time: timeFor(r.d, r.switches), best: r.d });
      ch.solutions.splice(ch.solutions.length - 1, 0, r.path);
      process.stderr.write(`chapter ${num}: added a level (slides=${r.d})\n`);
    }
    fs.writeFileSync(file, JSON.stringify(ch));
  } else if (CHAPTERS[arg]) {
    fs.writeFileSync(path.join(__dirname, `chapter-${arg}.json`), JSON.stringify(buildChapter(Number(arg))));
    process.stderr.write(`chapter ${arg} done\n`);
  } else {
    process.stderr.write("usage: node tools/levels.js 1..20 | merge\n");
  }
}
module.exports = { solve, prepare, startState, occupancy, slide, DIRS, SHAPES };
