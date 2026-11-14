// One-command test:  node tools/check.js
// Replays every level's stored solution with the rule engine and checks the rules of the collection.
"use strict";
const path = require("path");
const { prepare, startState, occupancy, slide } = require("./levels.js");
global.window = {};
require(path.join(__dirname, "..", "levels-data.js"));
const levels = window.LEVELS, solutions = require("./solutions.json");
let bad = 0;
const fail = (i, why) => { bad++; console.log(`level ${i + 1}: ${why}`); };
levels.forEach((lv, i) => {
  const P = prepare(lv), occ = new Int8Array(P.N);
  let s = startState(lv);
  for (const [bed, dr, dc] of solutions[i]) {
    occupancy(P, s, occ);
    s = slide(P, s, occ, bed, dr, dc);
    if (!s) return fail(i, "stored solution makes an illegal move");
  }
  if (!s.pos.every(p => p < 0)) fail(i, "stored solution does not finish the level");
  if (new Set(lv.beds.map(b => b.color)).size !== lv.beds.length) fail(i, "two beds share a color");
  const cats = {};
  for (const ch of lv.map.join("")) if (ch !== "." && ch !== "#") cats[ch] = (cats[ch] || 0) + 1;
  for (const b of lv.beds) if (cats[b.color] !== b.need) fail(i, `bed ${b.color} needs ${b.need} cats but the board has ${cats[b.color] || 0}`);
  if (!lv.beds.some(b => b.color === "k")) fail(i, "the player's cat is missing");
});
console.log(bad ? `${bad} problems` : `all ${levels.length} levels pass`);
process.exit(bad ? 1 : 0);
