// One-command test:  node tools/check.js
// Replays every level's stored solution with the rule engine and checks the rules of the collection.
"use strict";
const fs = require("fs");
const path = require("path");
const { prepare, startState, occupancy, slide, chaptersOnDisk } = require("./levels.js");
global.window = {};
require(path.join(__dirname, "..", "levels-data.js"));
const levels = window.LEVELS, solutions = require("./solutions.json");
// However many chapter files there are (chapter-1.json, chapter-2.json, ... without a gap),
// the game must hold exactly 25 levels for each of them.
const CHAPTERS = chaptersOnDisk(), PER_CHAPTER = 25, TOTAL = CHAPTERS * PER_CHAPTER;
const FIRST_CREAKY = 21;                                                 // creaky boards ("c") start in this chapter
const FIRST_ONEWAY = 29;                                                 // one-way tiles ("^v<>") start in this chapter
const FIRST_YARN = 37;                                                   // yarn balls ("y") start in this chapter
const FIRST_FAMILY = 33;                                                 // family beds (6 cells) start in this chapter
const ARROWS = "^v<>";
let bad = 0;
const fail = (i, why) => { bad++; console.log(`level ${i + 1}: ${why}`); };
const problem = why => { bad++; console.log(why); };

/* ---------- the collection as a whole ---------- */
if (!CHAPTERS) problem("there are no chapter files in tools/");
if (levels.length !== TOTAL) problem(`there are ${levels.length} levels, there should be ${TOTAL} (${CHAPTERS} chapters of ${PER_CHAPTER})`);
if (solutions.length !== levels.length) problem(`there are ${solutions.length} stored solutions for ${levels.length} levels`);
// every chapter file must hold exactly 25 levels, and the game file must be those chapters in order
let at = 0;
for (let n = 1; n <= CHAPTERS; n++) {
  const file = path.join(__dirname, `chapter-${n}.json`);
  if (!fs.existsSync(file)) { problem(`chapter ${n}: the file tools/chapter-${n}.json is missing`); at += PER_CHAPTER; continue; }
  const ch = JSON.parse(fs.readFileSync(file, "utf8"));
  if (ch.levels.length !== PER_CHAPTER) problem(`chapter ${n} has ${ch.levels.length} levels, it should have ${PER_CHAPTER}`);
  ch.levels.forEach((lv, j) => {
    if (JSON.stringify(lv) !== JSON.stringify(levels[at + j])) problem(`chapter ${n}, level ${j + 1} is not the same as level ${at + j + 1} in levels-data.js (run merge again)`);
  });
  at += ch.levels.length;
}
// a chapter file after a gap would be left out of the game without anyone noticing
for (const name of fs.readdirSync(__dirname)) {
  const m = /^chapter-(\d+)\.json$/.exec(name);
  if (m && Number(m[1]) > CHAPTERS) problem(`${name} is there, but chapter ${CHAPTERS + 1} is missing, so it is not in the game`);
}
if (CHAPTERS >= FIRST_CREAKY) {
  const intro = levels[(FIRST_CREAKY - 1) * PER_CHAPTER];
  if (intro && (intro.hint !== "h_creaky" || !intro.map.join("").includes("c"))) problem(`the first level of chapter ${FIRST_CREAKY} must teach creaky boards (hint "h_creaky" and a creaky board on the map)`);
}
if (CHAPTERS >= FIRST_ONEWAY) {
  const intro = levels[(FIRST_ONEWAY - 1) * PER_CHAPTER];
  if (intro && (intro.hint !== "h_oneway" || !/[\^v<>]/.test(intro.map.join("")))) problem(`the first level of chapter ${FIRST_ONEWAY} must teach one-way tiles (hint "h_oneway" and an arrow on the map)`);
}
if (CHAPTERS >= FIRST_YARN) {
  const intro = levels[(FIRST_YARN - 1) * PER_CHAPTER];
  if (intro && (intro.hint !== "h_yarn" || !intro.map.join("").includes("y"))) problem(`the first level of chapter ${FIRST_YARN} must teach yarn balls (hint "h_yarn" and a ball on the map)`);
}
// creaky boards and one-way tiles are never in every level of a chapter
for (let n = 1; n <= CHAPTERS; n++) {
  const ls = levels.slice((n - 1) * PER_CHAPTER, n * PER_CHAPTER);
  if (ls.length && ls.every(lv => lv.map.join("").includes("c"))) problem(`chapter ${n}: every level has creaky boards`);
  if (ls.length && ls.every(lv => /[\^v<>]/.test(lv.map.join("")))) problem(`chapter ${n}: every level has one-way tiles`);
}
const seenBoards = new Map();

/* ---------- every level on its own ---------- */
levels.forEach((lv, i) => {
  if (lv.rows > 8 || lv.cols > 6) fail(i, `the board is ${lv.rows}x${lv.cols}, bigger than 8x6`);
  if (lv.map.length !== lv.rows || lv.map.some(row => row.length !== lv.cols)) fail(i, "the map does not match rows and cols");
  if (lv.beds.length > 7) fail(i, "more than 7 beds");
  if (new Set(lv.beds.map(b => b.color)).size !== lv.beds.length) fail(i, "two beds share a color");
  if (!lv.beds.some(b => b.color === "k")) fail(i, "the player's cat is missing");
  const cats = {};
  for (const ch of lv.map.join("")) {
    if (!(".#cy" + ARROWS + "kgobwpm").includes(ch)) fail(i, `the map has a "${ch}" in it, which is nothing the game knows`);
    if (!(".#cy" + ARROWS).includes(ch)) cats[ch] = (cats[ch] || 0) + 1;
  }
  // yarn balls ("y"): on plain floor, no bed starts on one, none before the chapter that teaches them
  if (lv.map.join("").includes("y")) {
    if (i < (FIRST_YARN - 1) * PER_CHAPTER) fail(i, `a yarn ball before chapter ${FIRST_YARN}`);
    for (const b of lv.beds) for (const [dr, dc] of b.cells) if (lv.map[b.r + dr][b.c + dc] === "y") fail(i, `bed ${b.color} starts on a yarn ball`);
  }
  // family beds (6 cells): from chapter 33, only on 7x6 or 8x6 boards, at most one per level
  const family = lv.beds.filter(b => b.cells.length === 6).length;
  if (family && (i < (FIRST_FAMILY - 1) * PER_CHAPTER || lv.rows < 7 || family > 1)) fail(i, "a family bed where none may be (only from chapter 33, on 7x6 or 8x6, one per level)");
  if (lv.beds.some(b => b.cells.length === 5 || b.cells.length > 6)) fail(i, "a bed of a size the game does not have");
  // one-way tiles ("^v<>"): empty floor, no bed starts on one, and none before the chapter that teaches them
  if (/[\^v<>]/.test(lv.map.join(""))) {
    if (i < (FIRST_ONEWAY - 1) * PER_CHAPTER) fail(i, `a one-way tile before chapter ${FIRST_ONEWAY}`);
    for (const b of lv.beds) for (const [dr, dc] of b.cells) if (ARROWS.includes(lv.map[b.r + dr][b.c + dc])) fail(i, `bed ${b.color} starts on a one-way tile`);
  }
  // creaky boards ("c"): empty floor, no bed starts on one, and none before the chapter that teaches them
  if (lv.map.join("").includes("c")) {
    if (i < (FIRST_CREAKY - 1) * PER_CHAPTER) fail(i, `a creaky board before chapter ${FIRST_CREAKY}`);
    for (const b of lv.beds) for (const [dr, dc] of b.cells) if (lv.map[b.r + dr][b.c + dc] === "c") fail(i, `bed ${b.color} starts on a creaky board`);
  }
  for (const b of lv.beds) {
    // a bed holds exactly one cat per cell: a 3-square bed takes 3 cats
    if (b.need !== b.cells.length) fail(i, `bed ${b.color} has ${b.cells.length} cells but needs ${b.need} cats`);
    if (cats[b.color] !== b.need) fail(i, `bed ${b.color} needs ${b.need} cats but the board has ${cats[b.color] || 0}`);
  }
  for (const color of Object.keys(cats)) if (!lv.beds.some(b => b.color === color)) fail(i, `cat ${color} has no bed`);
  if (!(lv.time >= 30)) fail(i, `the timer is ${lv.time} seconds, under 30`);
  if (lv.hint && !(lv.time >= 75)) fail(i, `a level with a hint needs at least 75 seconds, this one has ${lv.time}`);
  if (lv.hint && !lv.guide) fail(i, "a level with a hint needs a guide");
  if (lv.best !== solutions[i].length) fail(i, `"best" is ${lv.best} but the stored solution has ${solutions[i].length} slides`);
  const id = JSON.stringify([lv.map, lv.beds]);
  if (seenBoards.has(id)) fail(i, `same board as level ${seenBoards.get(id) + 1}`);
  seenBoards.set(id, i);

  // replay the stored solution, one slide at a time
  const P = prepare(lv), occ = new Int8Array(P.N);
  let s = startState(lv);
  for (const [bed, dr, dc] of solutions[i]) {
    occupancy(P, s, occ);
    s = slide(P, s, occ, bed, dr, dc);
    if (!s) return fail(i, "stored solution makes an illegal move");
  }
  if (!s.pos.every(p => p < 0)) fail(i, "stored solution does not finish the level");
});
const has = re => levels.filter(lv => re.test(lv.map.join(""))).length;
const families = levels.filter(lv => lv.beds.some(b => b.cells.length === 6)).length;
console.log(bad ? `${bad} problems` : `all ${levels.length} levels pass (${CHAPTERS} chapters of ${PER_CHAPTER}, every bed needs one cat per cell, ${has(/c/)} levels have creaky boards, ${has(/[\^v<>]/)} one-way tiles, ${has(/y/)} yarn balls, ${families} a family bed)`);
process.exit(bad ? 1 : 0);
