// Level maker + checker for Drop the Bean.
//
// Rules (same as the game):
//  - A bed is a block of cells with a color and a number of cats it still needs.
//  - A bed slides one cell at a time: up, down, left or right.
//  - It can't leave the board, enter a wall, overlap another bed,
//    or move onto a cat of a different color.
//  - Moving onto cats of its own color tucks them in. When it needs
//    no more cats, the bed leaves the board.
//  - Rail beds ("axis") only slide side to side ("h") or up and down ("v").
//  - A locked bed ("lock": id of its key bed) can't move until the key bed is full.
//  - The level is solved when every cat is tucked in.
//  - Each color has exactly one bed per level.
//
// Every level written by this file has been solved by the computer first.
//
// Run:  node tools/levels.js 1     (makes chapter 1; same for 2, 3, 4)
//       node tools/levels.js merge (joins the four chapters into levels-data.js)

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
const COLOR_ORDER = ["k", "o", "b", "w", "p", "m"];   // k is Bean, the star: in every level

/* ---------- solver: fewest single-cell slides ---------- */
function solve(level, cap = 150000) {
  const { rows, cols } = level, N = rows * cols;
  const shapes = level.beds.map(b => b.cells), colors = level.beds.map(b => b.color);
  const axis = level.beds.map(b => b.axis || ""), lock = level.beds.map(b => b.lock === undefined ? -1 : b.lock);
  const start = {
    pos: level.beds.map(b => b.r * cols + b.c),
    need: level.beds.map(b => b.need),
    cats: level.map.join(""),
  };
  const keyOf = s => s.pos.join(",") + "/" + s.need.join("") + "/" + s.cats;
  const states = [start], parent = [-1], mv = [null];
  const seen = new Set([keyOf(start)]);
  const occ = new Int8Array(N);

  for (let head = 0; head < states.length; head++) {
    const s = states[head];
    occ.fill(-1);
    for (let i = 0; i < s.pos.length; i++) if (s.pos[i] >= 0) {
      const br = (s.pos[i] / cols) | 0, bc = s.pos[i] % cols;
      for (const [dr, dc] of shapes[i]) occ[(br + dr) * cols + bc + dc] = i;
    }
    for (let i = 0; i < s.pos.length; i++) {
      if (s.pos[i] < 0) continue;
      if (lock[i] >= 0 && s.pos[lock[i]] >= 0) continue;        // still locked
      for (const [dr, dc] of DIRS) {
        if (axis[i] === "h" && dr !== 0) continue;
        if (axis[i] === "v" && dc !== 0) continue;
        const br = ((s.pos[i] / cols) | 0) + dr, bc = (s.pos[i] % cols) + dc;
        let ok = true, eat = null;
        for (const [sr, sc] of shapes[i]) {
          const r = br + sr, c = bc + sc;
          if (r < 0 || c < 0 || r >= rows || c >= cols) { ok = false; break; }
          const idx = r * cols + c;
          if (occ[idx] !== -1 && occ[idx] !== i) { ok = false; break; }
          const ch = s.cats[idx];
          if (ch === "#") { ok = false; break; }
          if (ch !== ".") {
            if (ch !== colors[i]) { ok = false; break; }
            (eat || (eat = [])).push(idx);
          }
        }
        if (!ok) continue;
        if (eat && eat.length > s.need[i]) continue;
        let cats = s.cats, need = s.need;
        const pos = s.pos.slice();
        pos[i] = br * cols + bc;
        if (eat) {
          const a = cats.split("");
          for (const e of eat) a[e] = ".";
          cats = a.join("");
          need = need.slice();
          need[i] -= eat.length;
          if (need[i] === 0) pos[i] = -1;
        }
        const ns = { pos, need, cats };
        const k = keyOf(ns);
        if (seen.has(k)) continue;
        seen.add(k);
        states.push(ns); parent.push(head); mv.push([i, dr, dc]);
        if (eat && pos.every(p => p < 0)) {
          const pathOut = [];
          for (let j = states.length - 1; j > 0; j = parent[j]) pathOut.push(mv[j]);
          pathOut.reverse();
          let switches = 0;
          for (let j = 1; j < pathOut.length; j++) if (pathOut[j][0] !== pathOut[j - 1][0]) switches++;
          return { d: pathOut.length, switches, path: pathOut, states: states.length };
        }
        if (states.length > cap) return { d: -2 };
      }
    }
  }
  return { d: -1 };
}

/* ---------- random level ---------- */
let seed = 7411;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const between = v => Array.isArray(v) ? v[0] + Math.floor(rnd() * (v[1] - v[0] + 1)) : v;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function randomLevel(t) {
  const rows = t.rows, cols = t.cols;
  const g = Array.from({ length: rows }, () => new Array(cols).fill("."));
  const taken = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let i = between(t.walls || 0); i > 0; i--) {
    const r = Math.floor(rnd() * rows), c = Math.floor(rnd() * cols);
    g[r][c] = "#"; taken[r][c] = true;
  }
  // one bed per color: every color in a level has exactly one bed
  const nBeds = Math.min(between(t.beds), COLOR_ORDER.length);
  const bedColors = shuffle(COLOR_ORDER.slice(0, nBeds));
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
  // rails: some beds only slide one way
  if (t.rail) {
    for (const b of beds) if (rnd() < t.rail) b.axis = rnd() < 0.5 ? "h" : "v";
    if (!beds.some(b => b.axis)) pick(beds).axis = rnd() < 0.5 ? "h" : "v";
  }
  // locks: a bed that waits for another bed (its key) to be filled
  if (t.locks) {
    const ids = shuffle(beds.map((_, i) => i));
    const n = Math.min(between(t.locks), Math.floor(ids.length / 2));
    for (let j = 0; j < n; j++) beds[ids[j * 2]].lock = ids[j * 2 + 1];
  }
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
    }
  }
  return { rows, cols, map: g.map(r => r.join("")), beds };
}

/* ---------- the four chapters, 25 levels each ---------- */
const HAND_MADE = [
  {
    rows: 4, cols: 4,
    hint: ["Drag the bed over the sleeping cats.", "It takes cats of its own color."],
    map: ["....", "....", "....", ".kk."],
    beds: [{ color: "k", need: 2, r: 0, c: 1, cells: SHAPES.i2h }],
    guide: [{ bed: 0, path: [[1, 0], [1, 0], [1, 0]] }],
  },
  {
    rows: 4, cols: 4,
    hint: ["A cat of another color blocks the way.", "Tuck in the orange cat first."],
    map: ["#k##", "#o##", "....", "...."],
    beds: [
      { color: "k", need: 1, r: 3, c: 0, cells: SHAPES.dot },
      { color: "o", need: 1, r: 3, c: 3, cells: SHAPES.dot },
    ],
    guide: [
      { bed: 1, path: [[0, -1], [0, -1], [-1, 0], [-1, 0]] },
      { bed: 0, path: [[-1, 0], [0, 1], [-1, 0], [-1, 0]] },
    ],
  },
];

const T = (n, rows, cols, beds, colors, shapes, dMin, dMax, swMin, budget, extra) =>
  Object.assign({ n, rows, cols, beds, colors, shapes, dMin, dMax, swMin, budget }, extra || {});

const CHAPTERS = {
  1: {
    handMade: HAND_MADE,
    tiers: [
      T(3, 4, 4, 2, 2,      SMALL, 5, 14, 1, 15),
      T(6, 5, 5, 3, [2, 3], SMALL, 8, 24, 2, 30, { walls: [0, 1] }),
      T(7, 6, 5, 4, 3,      ALL,  12, 32, 3, 45, { walls: [0, 2] }),
      T(7, 6, 6, 5, [3, 4], ALL,  16, 44, 4, 70, { walls: [1, 3] }),
    ],
  },
  2: {
    hint: ["New: beds with arrows are on rails.", "They only slide the way the arrows point."],
    tiers: [
      T(5, 5, 5, 3, [2, 3], SMALL, 7, 26, 2, 30,  { walls: [0, 1], rail: 0.5 }),
      T(7, 6, 5, 4, 3,      ALL,  12, 36, 3, 50,  { walls: [0, 2], rail: 0.5 }),
      T(7, 6, 6, 5, [3, 4], ALL,  16, 48, 4, 70,  { walls: [1, 3], rail: 0.45 }),
      T(6, 7, 6, 6, [4, 5], ALL,  20, 60, 6, 100, { walls: [1, 4], rail: 0.4 }),
    ],
  },
  3: {
    hint: ["New: a locked bed can't move.", "Fill the bed with the matching key to open it."],
    tiers: [
      T(5, 5, 5, 3, [2, 3], SMALL, 7, 26, 2, 30,  { walls: [0, 1], locks: 1 }),
      T(6, 6, 5, 4, 3,      ALL,  12, 36, 3, 50,  { walls: [0, 2], locks: 1 }),
      T(7, 6, 6, 5, [3, 4], ALL,  16, 48, 4, 70,  { walls: [1, 3], locks: [1, 2] }),
      T(7, 7, 6, 6, [4, 5], ALL,  20, 60, 6, 100, { walls: [1, 4], locks: [1, 2] }),
    ],
  },
  4: {
    hint: ["Rails and locks together.", "Plan the order before you slide."],
    tiers: [
      T(4, 6, 5, 4, 3,           ALL, 12, 38, 3, 40,  { walls: [0, 2], rail: 0.35, locks: 1 }),
      T(7, 6, 6, 5, [3, 4],      ALL, 16, 50, 4, 70,  { walls: [1, 3], rail: 0.35, locks: [1, 2] }),
      T(8, 7, 6, 6, [4, 5],      ALL, 20, 62, 6, 110, { walls: [1, 4], rail: 0.3,  locks: [1, 2] }),
      T(6, 8, 6, 6,      [5, 6], ALL, 24, 75, 7, 150, { walls: [3, 6], rail: 0.3,  locks: [1, 2] }),
    ],
  },
};

function timeFor(d, switches) {
  return Math.max(30, Math.min(180, Math.ceil((22 + d * 1.9 + switches * 3) / 5) * 5));
}

function buildChapter(num) {
  const ch = CHAPTERS[num];
  seed = 7411 * num + 13;
  const levels = [], solutions = [];
  for (const lv of ch.handMade || []) {
    const r = solve(lv);
    if (r.d < 0) throw new Error("hand-made level can't be solved");
    levels.push({ ...lv, time: 60, best: r.d });
    solutions.push(r.path);
  }
  ch.tiers.forEach((t, ti) => {
    const found = [], seenIds = new Set();
    const t0 = Date.now();
    let tries = 0;
    const elapsed = () => (Date.now() - t0) / 1000;
    // look for up to twice as many as needed, then keep the most interesting
    while (found.length < t.n * 2) {
      if (elapsed() > t.budget && found.length >= t.n) break;
      if (elapsed() > t.budget * 4) break;
      tries++;
      const lv = randomLevel(t);
      if (!lv) continue;
      const id = JSON.stringify(lv);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const r = solve(lv);
      if (r.d < t.dMin || r.d > t.dMax || r.switches < t.swMin) continue;
      found.push({ lv, r });
      process.stderr.write(`ch${num} tier ${ti + 1}: ${found.length}/${t.n}  slides=${r.d} switches=${r.switches} (tries ${tries}, ${elapsed().toFixed(0)}s)\n`);
    }
    if (found.length < t.n) process.stderr.write(`!! ch${num} tier ${ti + 1} only found ${found.length} of ${t.n}\n`);
    const score = f => f.r.switches * 3 + f.r.d;
    found.sort((a, b) => score(b) - score(a));
    const keep = found.slice(0, t.n).sort((a, b) => score(a) - score(b));
    for (const { lv, r } of keep) {
      if (new Set(lv.beds.map(b => b.color)).size !== lv.beds.length) throw new Error("two beds share a color");
      levels.push({ ...lv, time: timeFor(r.d, r.switches), best: r.d });
      solutions.push(r.path);
    }
  });
  if (ch.hint && !levels[0].hint) levels[0].hint = ch.hint;
  return { levels, solutions };
}

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === "merge") {
    const levels = [], solutions = [];
    for (const n of [1, 2, 3, 4]) {
      const ch = JSON.parse(fs.readFileSync(path.join(__dirname, `chapter-${n}.json`), "utf8"));
      // teaching levels get a finger demo: the solution, one drag at a time
      ch.levels.forEach((lv, i) => {
        if (!lv.hint || lv.guide) return;
        lv.guide = [];
        for (const [bed, dr, dc] of ch.solutions[i]) {
          const lastRun = lv.guide[lv.guide.length - 1];
          if (lastRun && lastRun.bed === bed) lastRun.path.push([dr, dc]); else lv.guide.push({ bed, path: [[dr, dc]] });
        }
      });
      levels.push(...ch.levels); solutions.push(...ch.solutions);
      process.stderr.write(`chapter ${n}: ${ch.levels.length} levels\n`);
    }
    fs.writeFileSync(path.join(__dirname, "..", "levels-data.js"),
      "// Made by tools/levels.js. Every level here was solved by the computer first.\nwindow.LEVELS = [\n" +
      levels.map(l => " " + JSON.stringify(l)).join(",\n") + "\n];\n");
    fs.writeFileSync(path.join(__dirname, "solutions.json"), JSON.stringify(solutions));
    process.stderr.write(`wrote ${levels.length} levels\n`);
  } else if (CHAPTERS[arg]) {
    fs.writeFileSync(path.join(__dirname, `chapter-${arg}.json`), JSON.stringify(buildChapter(Number(arg))));
    process.stderr.write(`chapter ${arg} done\n`);
  } else {
    process.stderr.write("usage: node tools/levels.js 1|2|3|4|merge\n");
  }
}
module.exports = { solve, SHAPES };
