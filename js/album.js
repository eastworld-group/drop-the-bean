"use strict";
/* ==================================================================
   DROP THE BEAN - album: chapter chests, love notes, and the Album
   (chapter pictures, stickers, stats), reached from My cat.
=================================================================== */

Object.assign(WORDS.en, {
  open_chest: "Open me", chest_coins: "+{0} coins", chest_extra: "Every outfit is yours, so: extra coins!",
  st_levels: "Levels done", st_stars: "Stars", st_cats: "Cats tucked in", st_perfect: "Perfect levels", st_chapters: "Chapters done",
  st_streak: "Longest daily streak", st_gifts: "Gifts opened", st_time: "Time played",
  time_hm: "{0} h {1} min", time_m: "{0} min",
});

/* ---------- wrapping words into lines ---------- */
function wrapLines(text, maxW, size, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  const out = [];
  let cur = "";
  for (const word of String(text).split(/\s+/)) {
    const next = cur ? cur + " " + word : word;
    if (cur && ctx.measureText(next).width > maxW) { out.push(cur); cur = word; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/* ---------- chapter chests ----------
   When every level of a chapter has 3 stars, a chest shows on its row in the chapter list.
   Opening it (once) gives coins and a hat or neck thing she does not own yet, picked at random.
   With every outfit already hers, it gives extra coins instead. */
const CHEST_COINS = 300, CHEST_EXTRA = 500;
function chapterFull(n) {
  const end = (n + 1) * CHAPTER_SIZE;
  if (end > LEVELS.length) return false;
  for (let i = n * CHAPTER_SIZE; i < end; i++) if ((S.stars[i] || 0) < 3) return false;
  return true;
}
const chestReady = n => chapterFull(n) && !S.chests.includes(n);
function openChest(n) {
  if (!chestReady(n) || overlay) return;
  const left = HATS.filter(h => !S.hats.includes(h.id)).map(h => ["hat", h.id]).concat(NECKS.filter(q => !S.necks.includes(q.id)).map(q => ["neck", q.id]));
  const item = left.length ? left[Math.floor(Math.random() * left.length)] : null;
  const coins = CHEST_COINS + (item ? 0 : CHEST_EXTRA);
  if (item) (item[0] === "hat" ? S.hats : S.necks).push(item[1]);
  S.coins += coins;
  S.chests = chapList(S.chests.concat([n]));
  save();
  sfx.magic(); sfx.coin();
  overlay = { kind: "chest", t: 0, delay: 0, at: time, n, coins, item };
}
// A treasure chest standing on x, y (the middle of its bottom). Open shows the lid up and a glow.
function drawChest(x, y, s, open) {
  const lw = Math.max(1.5, s * 0.06);
  ctx.lineJoin = "round";
  if (open) { glow(x, y - s * 0.6, s * 0.7, "rgba(255, 228, 140, 0.7)"); rr(x - s * 0.5, y - s * 1.05, s, s * 0.3, s * 0.12); fs("#E3A04F", "#8A5A2E", lw); }
  rr(x - s * 0.5, y - s * 0.62, s, s * 0.62, s * 0.1); fs("#D98A3F", "#8A5A2E", lw);
  if (!open) { ctx.beginPath(); ctx.moveTo(x - s * 0.5, y - s * 0.6); ctx.quadraticCurveTo(x, y - s * 1.0, x + s * 0.5, y - s * 0.6); ctx.closePath(); fs("#E3A04F", "#8A5A2E", lw); }
  ctx.fillStyle = "#FFD23F"; ctx.fillRect(x - s * 0.5 + lw, y - s * 0.36, s - lw * 2, s * 0.1);
  rr(x - s * 0.1, y - s * 0.46, s * 0.2, s * 0.24, s * 0.05); fs("#FFD23F", "#8A5A2E", lw * 0.8);
}
function drawChestCard() {
  const o = overlay;
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.max(220, Math.min(310, W - 40)), ch = 320;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("chest_title"), W / 2, y + 34, 24, INK, 900);
  fitLabel(t("note_from", o.n + 1, chapterName(o.n)), W / 2, y + 58, 13, cw - 30, SOFT, 800);
  drawChest(W / 2 - 54, y + 150, 64, true);
  drawCat(W / 2 + 44, y + 128, 70, S.hero, { wake: 1, still: true, noShadow: true, seed: 5,
    hat: o.item && o.item[0] === "hat" ? o.item[1] : S.hat, neck: o.item && o.item[0] === "neck" ? o.item[1] : S.neck });
  fitLabel(t("chest_coins", o.coins), W / 2, y + 190, 18, cw - 30, "#B8730A", 800);
  const what = o.item ? t("chest_got", t((o.item[0] === "hat" ? "hat_" : "neck_") + o.item[1])) : t("chest_extra");
  fitLabel(what, W / 2, y + 216, 14, cw - 30, INK, 800);
  pillButton(x + 28, y + ch - 66, cw - 56, 48, t("done"), () => { overlay = null; }, true);
  if (time - o.at < 0.3) buttons = [];
}

/* ---------- love notes ----------
   One note per chapter, from js/notes.js. The first time she finishes a chapter it shows
   as she leaves the win card; any finished chapter's note can be read again in the Album. */
const noteText = n => (typeof NOTES !== "undefined" && NOTES[n]) || "You did it. Every cat in this chapter is asleep and happy.";
function openNote(n, then) {
  if (!S.notes.includes(n)) { S.notes = chapList(S.notes.concat([n])); save(); }
  overlay = { kind: "note", t: 0, delay: 0, at: time, n, then: then || null, prev: then ? overlay : null };
  sfx.purr();
}
function closeNote() {
  const o = overlay;
  overlay = o.prev || null;                     // back to the win card first, so "Home" or "Next" act as before
  if (o.then) o.then();
}
function drawNote() {
  const o = overlay;
  buttons = [];
  const a = S.calm ? 1 : clamp01((time - o.at) / 0.4);                   // it fades in gently
  ctx.fillStyle = `rgba(20, 26, 80, ${0.5 * a})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const cw = Math.max(220, Math.min(320, W - 40)), lines = wrapLines(noteText(o.n), cw - 48, 18, 700);
  const ch = 150 + lines.length * 26 + 96;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  ctx.fillStyle = "#FF5C8A"; drawHeart(W / 2, y + 40, 34);
  fitLabel(t("note_title"), W / 2, y + 76, 21, cw - 30, INK, 900);
  fitLabel(t("note_from", o.n + 1, chapterName(o.n)), W / 2, y + 100, 12, cw - 30, SOFT, 800);
  lines.forEach((ln, i) => label(ln, W / 2, y + 140 + i * 26, 18, INK, 700));
  fitLabel(t("note_where"), W / 2, y + ch - 82, 11, cw - 30, SOFT, 700);
  pillButton(x + 28, y + ch - 64, cw - 56, 46, t("done"), closeNote, true);
  ctx.globalAlpha = 1;
  if (time - o.at < 0.3) buttons = [];
}

/* ---------- stickers: 20 things to collect. Each is worked out from what she has done ---------- */
const levelsDone = () => Object.keys(S.stars).length;
const chaptersDone = () => { let n = 0; for (let c = 0; c * CHAPTER_SIZE < LEVELS.length; c++) if (S.stars[c * CHAPTER_SIZE + CHAPTER_SIZE - 1]) n++; return n; };
const perfectCount = () => Object.keys(S.perfect).length;
const STICKERS = [
  { id: "first", icon: "paw", col: "#FF8A1F", name: "First nap", how: "Win your first level", got: () => levelsDone() >= 1 },
  { id: "lv100", icon: "num", num: "100", col: "#3B8BEF", name: "100 levels", how: "Win 100 levels", got: () => levelsDone() >= 100 },
  { id: "lv500", icon: "num", num: "500", col: "#6431BD", name: "500 levels", how: "Win 500 levels", got: () => levelsDone() >= 500 },
  { id: "ch1", icon: "book", col: "#2B8261", name: "Chapter done", how: "Finish a chapter", got: () => chaptersDone() >= 1 },
  { id: "ch10", icon: "num", num: "10", col: "#2B8261", name: "10 chapters", how: "Finish 10 chapters", got: () => chaptersDone() >= 10 },
  { id: "stars500", icon: "star", col: "#D9920C", name: "500 stars", how: "Collect 500 stars", got: () => totalStars() >= 500 },
  { id: "cats500", icon: "cat", col: "#FF8A1F", name: "500 cats", how: "Tuck in 500 cats", got: () => S.stats.cats >= 500 },
  { id: "cats2500", icon: "cat", col: "#B4296B", name: "2500 cats", how: "Tuck in 2500 cats", got: () => S.stats.cats >= 2500 },
  { id: "perfect10", icon: "stamp", col: "#FF5C8A", name: "10 perfect", how: "10 perfect levels: 3 stars, no powerups", got: () => perfectCount() >= 10 },
  { id: "perfect50", icon: "stamp", col: "#B8234F", name: "50 perfect", how: "50 perfect levels: 3 stars, no powerups", got: () => perfectCount() >= 50 },
  { id: "streak3", icon: "moon", col: "#4450B8", name: "3 day streak", how: "Play the daily nap 3 days in a row", got: () => S.stats.best >= 3 },
  { id: "streak7", icon: "moon", col: "#2A337F", name: "7 day streak", how: "Play the daily nap 7 days in a row", got: () => S.stats.best >= 7 },
  { id: "room1", icon: "heart", col: "#FF5C8A", name: "First decor", how: "Buy your first room thing", got: () => S.room.own.length >= 1 },
  { id: "room25", icon: "heart", col: "#C2456E", name: "Cozy home", how: "Own 25 room things", got: () => S.room.own.length >= 25 },
  { id: "kitchen", icon: "fish", col: "#3B8BEF", name: "Kitchen", how: "Pass level 250 to open the Kitchen", got: () => roomOpen(1) },
  { id: "garden", icon: "leaf", col: "#37843A", name: "Garden", how: "Pass level 700 to open the Garden", got: () => roomOpen(2) },
  { id: "allcats", icon: "cat2", col: "#17AFA6", name: "Every cat", how: "Open every cat in My cat", got: () => HEROES.every(catOpen) },
  { id: "outfit", icon: "crown", col: "#D9920C", name: "Dressed up", how: "Get your first hat or neck thing", got: () => S.hats.length + S.necks.length >= 1 },
  { id: "chest", icon: "chest", col: "#B5652A", name: "Treasure", how: "Open a chapter chest: 3 stars on all 25 levels", got: () => S.chests.length >= 1 },
  { id: "giftweek", icon: "gift", col: "#FF7EB6", name: "Gift week", how: "Open all 7 gifts of a gift week", got: () => S.gift.weeks >= 1 },
];
// A round sticker. Not earned yet: a grey outline only.
function drawSticker(st, x, y, r, got) {
  const ink = got ? "#FFFFFF" : "#B5BDD3";
  if (got) { oval(x, y + 2, r, r); ctx.fillStyle = "rgba(20, 28, 90, 0.2)"; ctx.fill(); oval(x, y, r, r); ctx.fillStyle = st.col; ctx.fill(); oval(x, y, r - 3, r - 3); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.stroke(); }
  else { ctx.setLineDash([4, 4]); oval(x, y, r, r); ctx.strokeStyle = ink; ctx.lineWidth = 2.4; ctx.stroke(); ctx.setLineDash([]); }
  ctx.fillStyle = ink; ctx.strokeStyle = ink;
  const k = r / 26;
  if (st.icon === "paw" || st.icon === "stamp") paw(x, y, 22 * k);
  else if (st.icon === "num") label(st.num, x, y + 1, Math.round((st.num.length > 2 ? 17 : 21) * k), ink, 900);
  else if (st.icon === "star") { starPath(x, y, 15 * k); ctx.fill(); }
  else if (st.icon === "heart") drawHeart(x, y + 2 * k, 30 * k);
  else if (st.icon === "moon") { ctx.beginPath(); ctx.arc(x, y, 13 * k, 0.6, Math.PI * 2 - 0.6); ctx.arc(x + 6.5 * k, y, 8.5 * k, -1.049, 1.049, true); ctx.closePath(); ctx.fill(); }
  else if (st.icon === "fish") { fishShape(x - 3 * k, y, 10 * k, 1); ctx.fill(); }
  else if (st.icon === "leaf") { ctx.save(); ctx.translate(x, y); drawMotif("leaf", 12 * k); ctx.restore(); }
  else if (st.icon === "book") { rr(x - 13 * k, y - 10 * k, 12 * k, 20 * k, 2); ctx.fill(); rr(x + 1 * k, y - 10 * k, 12 * k, 20 * k, 2); ctx.fill(); }
  else if (st.icon === "crown") { if (got) drawHat("crown", x, y + 14 * k, 14 * k); else { poly([[x - 11 * k, y + 7 * k], [x - 12 * k, y - 8 * k], [x - 5 * k, y], [x, y - 11 * k], [x + 5 * k, y], [x + 12 * k, y - 8 * k], [x + 11 * k, y + 7 * k]]); ctx.fill(); } }
  else if (st.icon === "chest") { if (got) drawChest(x, y + 11 * k, 26 * k, false); else { rr(x - 13 * k, y - 8 * k, 26 * k, 18 * k, 3); ctx.stroke(); } }
  else if (st.icon === "gift") { if (got) drawPresent(x, y + 11 * k, 22 * k, false); else { rr(x - 11 * k, y - 6 * k, 22 * k, 16 * k, 3); ctx.stroke(); } }
  else if (got) drawCat(x, y + 4 * k, 34 * k, st.icon === "cat2" ? "z" : "o", { wake: 0, still: true, noShadow: true, seed: 2 });
  else { oval(x, y + 3 * k, 12 * k, 9 * k); ctx.fill(); }
}

/* ---------- the Album screen ---------- */
let albumTab = "pics", albumPage = 0;
function openAlbum() { albumTab = "pics"; albumPage = 0; go("album"); }
// One painted chapter card: her cat asleep on a cushion, in that chapter's colors.
function drawChapterCard(n, x, y, w, h, done) {
  if (!done) {
    rr(x, y, w, h, 14); ctx.fillStyle = "rgba(255, 255, 255, 0.45)"; ctx.fill();
    ctx.setLineDash([5, 5]); rr(x, y, w, h, 14); ctx.strokeStyle = "#B5BDD3"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    label(String(n + 1), x + w / 2, y + h * 0.45, Math.round(w * 0.26), "#9AA3CC", 900);
    return;
  }
  const lk = lookFor(n);
  ctx.save(); rr(x, y, w, h, 14); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, lk.bg[0]); g.addColorStop(1, lk.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [u, v, k] of [[0.2, 0.18, 0.09], [0.8, 0.26, 0.07], [0.62, 0.1, 0.05]]) { ctx.save(); ctx.translate(x + w * u, y + h * v); drawMotif(lk.motif, w * k); ctx.restore(); }
  oval(x + w / 2, y + h * 0.78, w * 0.4, h * 0.13); ctx.fillStyle = lk.trayDark; ctx.fill();         // a cushion in the chapter's colors
  oval(x + w / 2, y + h * 0.75, w * 0.36, h * 0.11); ctx.fillStyle = lk.tray; ctx.fill();
  drawCat(x + w / 2, y + h * 0.6, w * 0.6, S.hero, { wake: 0, still: true, noShadow: true, seed: n, hat: S.hat, neck: S.neck });
  ctx.restore();
  rr(x, y, w, h, 14); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 3; ctx.stroke();
  if (!S.notes.includes(n)) { ctx.fillStyle = "#FF5C8A"; drawHeart(x + w - 12, y + 14, 16); }     // a note not read yet
}
// A paged grid: works out how many fit, draws the page arrows, and calls "cellAt" for each.
function albumGrid(count, colsN, cw, chh, gap, top, bottom, cellAt) {
  const rowsN = Math.max(1, Math.floor((bottom - top - 50 + gap) / (chh + gap))), per = colsN * rowsN;
  const pages = Math.max(1, Math.ceil(count / per));
  albumPage = Math.max(0, Math.min(pages - 1, albumPage));
  const gw = colsN * cw + (colsN - 1) * gap, x0 = (W - gw) / 2;
  for (let i = 0; i < per; i++) {
    const n = albumPage * per + i;
    if (n >= count) break;
    cellAt(n, x0 + (i % colsN) * (cw + gap), top + Math.floor(i / colsN) * (chh + gap));
  }
  if (pages > 1) {
    const py = Math.min(bottom - 44, top + rowsN * (chh + gap) + 2);
    roundButton(W / 2 - 96, py, 40, "back", () => { albumPage--; }, { dim: albumPage === 0 });
    roundButton(W / 2 + 56, py, 40, "fwd", () => { albumPage++; }, { dim: albumPage >= pages - 1 });
    label(t("page_of", albumPage + 1, pages), W / 2, py + 20, 14, INK, 800);
  }
}
function drawAlbum() {
  const s = safeArea();
  roundButton(16, topY + 6, 44, "back", () => go("mycat"));
  starPill(W - 16 - 86, topY + 11);
  fitLabel(t("album"), W / 2, topY + 28, 26, W - 2 * 108, INK, 900);
  const tabs = ["pics", "notes", "stickers", "stats"], tw = Math.max(60, Math.min(96, (W - 32 - 24) / 4));
  tabs.forEach((id, i) => pillButton(W / 2 + (i - 1.5) * (tw + 8) - tw / 2, topY + 56, tw, 30, t("tab_" + id), () => { if (albumTab !== id) { albumTab = id; albumPage = 0; } },
    albumTab === id, { fill: "#FFFFFF", text: 0.44 }));
  const top = topY + 100, bottom = H - s.b - 16;
  if (albumTab === "pics") {
    const colsN = W >= 400 ? 4 : 3, gap = 10, cw = Math.max(56, Math.min(100, (W - 32 - gap * (colsN - 1)) / colsN)), chh = cw * 1.05 + 18;
    const count = Math.min(MAX_CHAPTERS, Math.ceil(LEVELS.length / CHAPTER_SIZE));
    albumGrid(count, colsN, cw, chh, gap, top, bottom, (n, x, y) => {
      const done = !!S.stars[n * CHAPTER_SIZE + CHAPTER_SIZE - 1], h = cw * 1.05;
      drawChapterCard(n, x, y, cw, h, done);
      fitLabel(t("chapter_n", n + 1), x + cw / 2, y + h + 10, 11, cw, done ? INK : SOFT, 800);
      buttons.push({ x, y, w: cw, h: chh, onTap: () => { if (done) openNote(n); else { toast(t("pic_locked", n + 1)); sfx.no(); } } });
    });
  } else if (albumTab === "notes") {
    // every love note she has unlocked, newest chapter last; tap one to read it in full
    const count = Math.min(MAX_CHAPTERS, Math.ceil(LEVELS.length / CHAPTER_SIZE));
    const open = []; for (let n = 0; n < count; n++) if (S.stars[n * CHAPTER_SIZE + CHAPTER_SIZE - 1]) open.push(n);
    fitLabel(open.length ? t("notes_count", open.length, count) : t("notes_none"), W / 2, top + 8, 13, W - 40, SOFT, 800);
    const rw = Math.max(220, Math.min(360, W - 32)), rx = (W - rw) / 2, rh = 64;
    albumGrid(open.length, 1, rw, rh, 8, top + 26, bottom, (i, x, y) => {
      const n = open[i], unread = !S.notes.includes(n);
      rr(x, y + 3, rw, rh, 16); ctx.fillStyle = "#8FB4E3"; ctx.fill();
      rr(x, y, rw, rh, 16); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      ctx.fillStyle = unread ? "#FF5C8A" : "#F7B6C8"; drawHeart(x + 26, y + rh / 2 + 2, 22);
      leftLabel(t("note_from", n + 1, chapterName(n)), x + 48, y + 20, 12, rw - 64, SOFT);
      leftLabel(wrapLines(noteText(n), rw - 64, 15, 700)[0] + (wrapLines(noteText(n), rw - 64, 15, 700).length > 1 ? "..." : ""), x + 48, y + 43, 15, rw - 64, INK);
      buttons.push({ x, y, w: rw, h: rh, onTap: () => openNote(n) });
    });
  } else if (albumTab === "stickers") {
    const colsN = W >= 400 ? 5 : 4, gap = 8, cw = Math.max(60, Math.min(84, (W - 24 - gap * (colsN - 1)) / colsN)), chh = cw * 0.72 + 22;
    albumGrid(STICKERS.length, colsN, cw, chh, gap, top, bottom, (n, x, y) => {
      const st = STICKERS[n], got = st.got(), r = cw * 0.3;
      drawSticker(st, x + cw / 2, y + r + 4, r, got);
      fitLabel(st.name, x + cw / 2, y + r * 2 + 16, 11, cw - 2, got ? INK : SOFT, 800);
      buttons.push({ x, y, w: cw, h: chh, onTap: () => toast(st.name + ": " + st.how) });
    });
  } else {
    const secs = Math.floor(S.stats.time), hrs = Math.floor(secs / 3600), mins = Math.floor((secs % 3600) / 60);
    const rows = [["st_levels", levelsDone()], ["st_stars", totalStars()], ["st_cats", S.stats.cats], ["st_perfect", perfectCount()],
      ["st_chapters", chaptersDone()], ["st_streak", S.stats.best], ["st_gifts", S.stats.gifts], ["st_time", hrs ? t("time_hm", hrs, mins) : t("time_m", mins)]];
    const rw = Math.max(200, Math.min(360, W - 32)), rx = (W - rw) / 2, rh = Math.max(28, Math.min(48, (bottom - top - 10) / rows.length));
    rr(rx, top + 4, rw, rows.length * rh + 12, 20); ctx.fillStyle = "#8FB4E3"; ctx.fill();
    rr(rx, top, rw, rows.length * rh + 12, 20); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    rows.forEach(([key, val], i) => {
      const y = top + 6 + i * rh + rh / 2;
      if (i) { ctx.fillStyle = "#EEF3FF"; ctx.fillRect(rx + 14, y - rh / 2, rw - 28, 1.5); }
      leftLabel(t(key), rx + 18, y, Math.min(15, Math.round(rh * 0.36)), rw * 0.62, INK);
      label(String(val), rx + rw - 18, y, Math.min(17, Math.round(rh * 0.4)), "#9C3A00", 900, "right");
    });
  }
}
