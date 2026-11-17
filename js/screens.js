"use strict";
/* ==================================================================
   DROP THE BEAN - screens: home with the level pages, the game,
   My cat, Shop, and the pop-up cards.
=================================================================== */

/* ---------- shared pieces ---------- */
function coinPill(x, y) {
  pill(x, y, 86, 34);
  drawCoin(x + 19, y + 17, 11);
  label(String(S.coins), x + 55, y + 18, 16);
}
function starPill(x, y) {
  pill(x, y, 86, 34);
  drawStar(x + 19, y + 17, 10, true);
  label(String(totalStars()), x + 55, y + 18, 16);
}
function fitLabel(text, x, y, size, maxW, color, weight) {
  ctx.font = `${weight || 700} ${size}px ${FONT}`;
  while (size > 9 && ctx.measureText(text).width > maxW) { size--; ctx.font = `${weight || 700} ${size}px ${FONT}`; }
  label(text, x, y, size, color, weight || 700);
}
// A round cushion. "cols": its edge, top and middle colors (orange unless given).
function cushion(x, y, s, cols) {
  const [edge, top, mid] = cols || ["#B9590A", "#FF8A1F", "#FFE3B8"];
  ctx.fillStyle = "rgba(20, 28, 90, 0.18)"; oval(x, y + s * 0.08, s * 0.62, s * 0.3); ctx.fill();
  ctx.fillStyle = edge; oval(x, y + s * 0.02, s * 0.62, s * 0.3); ctx.fill();
  ctx.fillStyle = top; oval(x, y, s * 0.56, s * 0.25); ctx.fill();
  ctx.fillStyle = mid; oval(x, y - s * 0.01, s * 0.44, s * 0.17); ctx.fill();
}

/* ==================================================================
   HOME: a stage for her cat. A small logo, her cat big on a cushion in a
   soft corner of her room, the daily nap pillow, the chapter she is in,
   and one big Play button. The 25 level beds live in the Levels tab.
   A tab bar sits at the bottom of the five main screens.
=================================================================== */
let page = -1;                                   // which block of 25 levels is showing (Levels tab)
const pageOf = i => Math.floor(i / CHAPTER_SIZE);
function showLevel(i) { page = pageOf(Math.max(0, Math.min(LEVELS.length - 1, i))); }

/* ---------- the tab bar ---------- */
const TAB_H = 62;
const TABS = [["levels", "t_levels"], ["mycat", "mycat"], ["home", "t_home"], ["room", "t_room"], ["album", "album"]];
const tabTop = () => H - safeArea().b - TAB_H;          // where the tab bar starts: screens keep above it
const hasTabs = () => ["home", "levels", "room", "album"].includes(screen) || (screen === "mycat" && S.setup);
// Switch tab: a quick 150ms fade (none with calm motion).
function goTab(where) {
  if (where === "levels") showLevel(nextUnsolved());
  if (where === "album") { albumTab = "chapters"; albumPage = 0; }
  go(where);
  fade = S.calm ? 0 : 0.6;
}
function tabIcon(id, cx, cy, k, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (id === "levels") {                                   // a little bed
    rr(cx - 12 * k, cy - 2 * k, 24 * k, 11 * k, 4 * k); ctx.stroke();
    rr(cx - 9 * k, cy - 8 * k, 9 * k, 6 * k, 3 * k); ctx.fill();
  } else if (id === "mycat") {                             // a cat face
    ctx.beginPath(); ctx.moveTo(cx - 11 * k, cy + 2 * k); ctx.lineTo(cx - 10 * k, cy - 11 * k); ctx.lineTo(cx - 4 * k, cy - 6 * k);
    ctx.lineTo(cx + 4 * k, cy - 6 * k); ctx.lineTo(cx + 10 * k, cy - 11 * k); ctx.lineTo(cx + 11 * k, cy + 2 * k);
    ctx.quadraticCurveTo(cx, cy + 13 * k, cx - 11 * k, cy + 2 * k); ctx.stroke();
    oval(cx - 4 * k, cy, 1.6 * k, 1.6 * k); ctx.fill(); oval(cx + 4 * k, cy, 1.6 * k, 1.6 * k); ctx.fill();
  } else if (id === "home") {                              // a house
    ctx.beginPath(); ctx.moveTo(cx - 12 * k, cy - 1 * k); ctx.lineTo(cx, cy - 12 * k); ctx.lineTo(cx + 12 * k, cy - 1 * k); ctx.stroke();
    rr(cx - 8 * k, cy - 3 * k, 16 * k, 14 * k, 2 * k); ctx.stroke();
    rr(cx - 2.5 * k, cy + 3 * k, 5 * k, 8 * k, 1.5 * k); ctx.fill();
  } else if (id === "room") {                              // a sofa
    rr(cx - 12 * k, cy - 6 * k, 24 * k, 9 * k, 3 * k); ctx.stroke();
    rr(cx - 14 * k, cy - 1 * k, 28 * k, 9 * k, 3 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 10 * k, cy + 8 * k); ctx.lineTo(cx - 10 * k, cy + 11 * k); ctx.moveTo(cx + 10 * k, cy + 8 * k); ctx.lineTo(cx + 10 * k, cy + 11 * k); ctx.stroke();
  } else {                                                 // a photo
    rr(cx - 12 * k, cy - 9 * k, 24 * k, 19 * k, 3 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 9 * k, cy + 7 * k); ctx.lineTo(cx - 3 * k, cy); ctx.lineTo(cx + 1 * k, cy + 4 * k); ctx.lineTo(cx + 4 * k, cy + 1 * k); ctx.lineTo(cx + 9 * k, cy + 7 * k); ctx.stroke();
    oval(cx + 5 * k, cy - 4 * k, 2 * k, 2 * k); ctx.fill();
  }
}
function drawTabBar() {
  const y = tabTop(), s = safeArea(), w = W / TABS.length;
  ctx.fillStyle = "rgba(20, 28, 90, 0.10)"; ctx.fillRect(0, y - 3, W, 3);
  ctx.fillStyle = "#FFFDF8"; ctx.fillRect(0, y, W, TAB_H + s.b);
  TABS.forEach(([id, key], i) => {
    const cx = w * (i + 0.5), on = screen === id || (id === "levels" && screen === "chapters"), mid = id === "home";
    if (mid) { ctx.fillStyle = on ? "#FFE9C7" : "#F3EEE6"; oval(cx, y + 22, 24, 20); ctx.fill(); }
    tabIcon(id, cx, y + 21, mid ? 1.15 : 1, on ? INK : "#7C84B0");
    fitLabel(t(key), cx, y + 47, 13, w - 4, on ? INK : SOFT, on ? 900 : 700);
    buttons.push({ x: w * i, y, w, h: TAB_H + s.b, onTap: () => { if (screen !== id) goTab(id); } });
  });
}

/* ---------- top bar: coins (opens the Shop), stars, and a quiet gear (Settings) ---------- */
let shopFrom = "home";
function openShop(from) { shopFrom = from; go("shop"); }
function topBar() {
  coinPill(16, topY + 2);
  buttons.push({ x: 16, y: topY, w: 86, h: 40, onTap: () => openShop(screen) });
  starPill(W - 16 - 44 - 86, topY + 2);
  const gx = W - 16 - 22, gy = topY + 19;                     // the gear
  ctx.strokeStyle = SOFT; ctx.fillStyle = SOFT; ctx.lineWidth = 3.2; ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * 8, gy + Math.sin(a) * 8); ctx.lineTo(gx + Math.cos(a) * 12, gy + Math.sin(a) * 12); ctx.stroke(); }
  ctx.lineWidth = 3; oval(gx, gy, 8, 8); ctx.stroke();
  buttons.push({ x: gx - 22, y: topY, w: 44, h: 44, onTap: () => { overlay = { kind: "settings", t: 1, delay: 0 }; } });
}

/* ---------- the stage ---------- */
// Her cat on the home stage: breathes, blinks, flicks her tail now and then; a tap makes her purr.
const homeCat = { blinkAt: 2, swishAt: 5, squishT: -9, fx: [], box: null };
function homeUpdate(dt) {
  const h = homeCat;
  if (time - h.blinkAt > 0.18) h.blinkAt = time + 6 + Math.random() * 4;
  if (time - h.swishAt > 1.2) h.swishAt = time + 7 + Math.random() * 7;
  for (const f of h.fx) { f.life -= dt; f.y += f.vy * dt; f.x += f.vx * dt; }
  h.fx = h.fx.filter(f => f.life > 0);
}
const homeBusy = () => homeCat.fx.length > 0 || time - homeCat.squishT < 0.3;
function purrHome() {
  const h = homeCat, b = h.box;
  h.squishT = time; sfx.purr();
  const n = S.calm ? 1 : 3;
  for (let i = 0; i < n; i++) h.fx.push({ x: b.cx + (i - (n - 1) / 2) * 26, y: b.top + 10, vx: (i - (n - 1) / 2) * 12, vy: S.calm ? 0 : -40 - i * 8, life: 1.1, max: 1.1 });
}
// A soft corner of her bedroom behind the stage: its wallpaper and floor, washed pale.
function stageBackdrop(x, y, w, h) {
  ctx.save(); rr(x, y, w, h, 26); ctx.clip();
  const k = Math.max(0.8, w / RW * 1.25), floorAt = h * 0.68;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  (PATTERNS[roomPut("wall")] || PATTERNS.w_plain)(0, 0, w / k, floorAt / k);
  (PATTERNS[roomPut("floor")] || PATTERNS.f_wood)(0, floorAt / k, w / k, (h - floorAt) / k + 2);
  ctx.restore();
  ctx.fillStyle = "rgba(255, 249, 238, 0.62)"; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
function drawHome() {
  const s = safeArea(), next = nextUnsolved(), small = H < 600, bottom = tabTop();
  topBar();
  logo("Drop the Bean", W / 2, topY + (small ? 56 : 64), small ? 17 : 21);
  // from the bottom up: Play, then the chapter line, then the stage takes the rest
  const playH = small ? 52 : 64, playY = bottom - (small ? 14 : 30) - playH;
  const lineY = playY - (small ? 44 : 56), stageTop = topY + (small ? 74 : 86), stageH = Math.max(120, lineY - 10 - stageTop);
  stageBackdrop(16, stageTop, W - 32, stageH);
  // her cat, big, on a soft cushion, with a warm glow behind
  const cs = Math.max(80, Math.min(W * 0.66, stageH * 0.66, 260)), cx = W / 2;
  const cushY = stageTop + stageH - cs * 0.22 - (small ? 24 : 34), catY = cushY - cs * 0.4;
  const g = ctx.createRadialGradient(cx, catY, cs * 0.1, cx, catY, cs * 0.75);
  g.addColorStop(0, "rgba(255, 214, 140, 0.55)"); g.addColorStop(1, "rgba(255, 214, 140, 0)");
  ctx.fillStyle = g; oval(cx, catY, cs * 0.75, cs * 0.75); ctx.fill();
  cushion(cx, cushY, cs * 0.8, ["#C9667F", "#F6A9C0", "#FFE1EA"]);
  const h = homeCat, bt = time - h.blinkAt, st = time - h.swishAt, sq = time - h.squishT;
  const squish = !S.calm && sq < 0.2 ? 1 - Math.sin(sq / 0.2 * Math.PI) * 0.04 : 1;
  drawCat(cx, catY, cs, S.hero, { wake: 1, hat: S.hat, neck: S.neck, noShadow: true, still: true, seed: 3, breath: S.calm ? 0 : 1,
    blink: bt >= 0 && bt < 0.18 ? Math.sin(bt / 0.18 * Math.PI) : 0, scale: squish,
    wag: S.calm || st < 0 || st > 1.2 ? 0 : Math.sin(st * 7) * 0.14 * Math.sin(st / 1.2 * Math.PI) });
  h.box = { cx, top: catY - cs * 0.5 };
  // today's gift: after she wins the Daily nap, her cat holds a present at her paws (day 7: a golden one)
  const gift = giftReady(), gs = Math.max(26, cs * 0.3), gpx = cx + cs * 0.24, gpy = cushY + cs * 0.02;
  if (gift) {
    const gl = ctx.createRadialGradient(gpx, gpy - gs * 0.5, gs * 0.2, gpx, gpy - gs * 0.5, gs * 1.1);
    gl.addColorStop(0, "rgba(255, 220, 130, 0.5)"); gl.addColorStop(1, "rgba(255, 220, 130, 0)");
    ctx.fillStyle = gl; oval(gpx, gpy - gs * 0.5, gs * 1.1, gs * 1.1); ctx.fill();
    drawPresent(gpx, gpy, gs, S.gift.day === 7);
  }
  for (const f of h.fx) { ctx.globalAlpha = clamp01(f.life / f.max); ctx.fillStyle = "#FF5C8A"; drawHeart(f.x, f.y, 16); ctx.globalAlpha = 1; }
  fitLabel(gift ? t("open_gift") : catName(S.hero), cx, stageTop + stageH - (small ? 11 : 15), 15, W - 200, gift ? "#9C3A00" : INK, 800);
  buttons.push({ x: cx - cs * 0.36, y: catY - cs * 0.55, w: cs * 0.72, h: cs * 0.95, onTap: gift ? openGift : purrHome });
  if (gift) buttons.push({ x: gpx - gs * 0.8, y: gpy - gs * 1.25, w: gs * 1.6, h: gs * 1.45, onTap: openGift });
  // the daily nap: a small pillow at the bottom left of the stage, glowing softly when it is ready
  const ready = !dailyDone(), px = 16 + 46, py = stageTop + stageH - 46, ps = small ? 44 : 56;
  if (ready) {
    const gl = ctx.createRadialGradient(px, py, ps * 0.2, px, py, ps * 0.9), ga = S.calm ? 0.5 : 0.4 + 0.15 * Math.sin(time * 2);
    gl.addColorStop(0, `rgba(255, 220, 130, ${ga})`); gl.addColorStop(1, "rgba(255, 220, 130, 0)");
    ctx.fillStyle = gl; oval(px, py, ps * 0.9, ps * 0.9); ctx.fill();
  }
  rr(px - ps / 2, py - ps * 0.3 + 3, ps, ps * 0.6, ps * 0.24); ctx.fillStyle = "rgba(20, 28, 90, 0.16)"; ctx.fill();
  rr(px - ps / 2, py - ps * 0.3, ps, ps * 0.6, ps * 0.24); ctx.fillStyle = ready ? "#FFF3D6" : "#F3F0EA"; ctx.fill();
  ctx.strokeStyle = ready ? "#E0B866" : "#CFC6B8"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = ready ? "#E0A23A" : "#B9B2A6";                        // a little moon on it
  ctx.beginPath(); ctx.arc(px, py, ps * 0.14, 0.6, Math.PI * 2 - 0.6); ctx.arc(px + ps * 0.07, py, ps * 0.09, -1.05, 1.05, true); ctx.closePath(); ctx.fill();
  const streak = dailyStreak();
  fitLabel(ready ? t("daily") : t("daily_done"), px, py + ps * 0.3 + 12, 13, 96, INK, 800);
  if (streak && !small) fitLabel(t("streak", streak), px, py + ps * 0.3 + 28, 13, 96, SOFT, 700);
  buttons.push({ x: px - 44, y: py - ps * 0.5, w: 88, h: ps + 30, onTap: () => startLevel(dailyIndex(), true) });

  // the chapter she is in, with a thin bar: tapping it opens the Levels tab
  const ch = pageOf(next), from = ch * CHAPTER_SIZE, done = LEVELS.slice(from, from + CHAPTER_SIZE).filter((_, i) => S.stars[from + i]).length;
  fitLabel(t("chapter_line", ch + 1, chapterName(ch), done, Math.min(CHAPTER_SIZE, LEVELS.length - from)), W / 2, lineY + 10, 15, W - 40, INK, 800);
  const bw = Math.min(200, W - 80);
  rr(W / 2 - bw / 2, lineY + 24, bw, 6, 3); ctx.fillStyle = "rgba(20, 28, 90, 0.12)"; ctx.fill();
  rr(W / 2 - bw / 2, lineY + 24, Math.max(6, bw * done / CHAPTER_SIZE), 6, 3); ctx.fillStyle = "#5C9E6E"; ctx.fill();
  buttons.push({ x: W / 2 - bw / 2 - 20, y: lineY - 6, w: bw + 40, h: 44, onTap: () => goTab("levels") });
  // the one big button
  pillButton(W / 2 - 130, playY, 260, playH, t("play", next + 1), () => startLevel(next), true, { text: 0.36 });
}

/* ---------- the Levels tab: the chapter banner and its 25 beds ---------- */
function drawLevelsTab() {
  topBar();
  drawLevels(nextUnsolved(), topY + 52, tabTop() - 10);
}

// Each level is a little cat bed. Finished levels have a cat asleep in them;
// your own cat sits awake in the next one.
function levelBed(x, y, s, n, stars, isNext, pressed) {
  const TH = look(), gold = isGolden(n);                     // empty beds take the chapter's colors; a season finale is golden
  const rim = gold ? "#B8860B" : stars ? "#D9920C" : isNext ? "#B9590A" : TH.wall;
  const cushionCol = gold ? "#FFD23F" : stars ? "#FFD86B" : isNext ? "#FF8A1F" : TH.soft;
  const inner = gold ? "#FFF6D0" : stars ? "#FFF4CC" : isNext ? "#FFE3B8" : "#FFFFFF";
  if (!pressed) { rr(x, y + 4, s, s, s * 0.3); ctx.fillStyle = "rgba(20, 28, 90, 0.25)"; ctx.fill(); }
  rr(x, y, s, s, s * 0.3); ctx.fillStyle = rim; ctx.fill();
  rr(x + 3, y + 3, s - 6, s - 6, s * 0.26); ctx.fillStyle = cushionCol; ctx.fill();
  rr(x + s * 0.15, y + s * 0.15, s * 0.7, s * 0.7, s * 0.2); ctx.fillStyle = inner; ctx.fill();
  if (gold) {                                               // a small crown on top, standing still
    const cx = x + s / 2, cy = y + 1, k = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - k, cy + k * 0.35); ctx.lineTo(cx - k * 1.05, cy - k * 0.55); ctx.lineTo(cx - k * 0.5, cy - k * 0.1);
    ctx.lineTo(cx, cy - k * 0.8); ctx.lineTo(cx + k * 0.5, cy - k * 0.1); ctx.lineTo(cx + k * 1.05, cy - k * 0.55); ctx.lineTo(cx + k, cy + k * 0.35);
    ctx.closePath(); ctx.fillStyle = "#FFD23F"; ctx.fill(); ctx.strokeStyle = "#B8860B"; ctx.lineWidth = Math.max(1.2, s * 0.03); ctx.lineJoin = "round"; ctx.stroke();
  }
  const text = String(n + 1);
  if (!stars && !isNext) {                                  // an empty bed, waiting
    ctx.globalAlpha = 0.5; ctx.fillStyle = cushionCol; paw(x + s / 2, y + s * 0.3, s * 0.14); ctx.globalAlpha = 1;
    label(text, x + s / 2, y + s * 0.6, Math.round(s * (text.length > 2 ? 0.27 : 0.32)), INK);
    return;
  }
  if (isNext && !stars) drawCat(x + s / 2, y + s * 0.5, s * 0.66, S.hero, { seed: 2, wake: 1, hat: S.hat, neck: S.neck, noShadow: true });
  else drawCat(x + s / 2, y + s * 0.44, s * 0.64, skin(CAST[(n * 3 + 1) % CAST.length]), { seed: n, noShadow: true });
  // number tag
  const tw = s * (text.length > 2 ? 0.5 : text.length > 1 ? 0.42 : 0.34), th = s * 0.3;
  rr(x - 2, y - 2, tw, th, th / 2); ctx.fillStyle = rim; ctx.fill();
  rr(x, y, tw - 4, th - 4, th / 2); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  label(text, x + tw / 2 - 2, y + th / 2 - 1.5, Math.round(s * 0.2), INK);
  if (stars) for (let k = 0; k < 3; k++) drawStar(x + s / 2 + (k - 1) * s * 0.22, y + s * 0.86, s * 0.095, k < stars);
  if (stars && S.perfect[n]) {                               // 3 stars with no powerups: a paw stamp
    const pr = s * 0.15, px = x + s - pr * 0.8, py = y + pr * 0.8;
    ctx.fillStyle = "#B8234F"; oval(px, py + 1, pr + 1.5, pr + 1.5); ctx.fill();
    ctx.fillStyle = "#FF5C8A"; oval(px, py, pr, pr); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; paw(px, py - pr * 0.05, pr * 0.95);
  }
}

function drawLevels(next, y0, y1) {
  const pages = Math.ceil(LEVELS.length / CHAPTER_SIZE);
  if (page < 0 || page >= pages) page = pageOf(next);
  const TH = look();                                        // the page being shown sets the colors of the whole screen

  // which chapter, with arrows to turn the page
  roundButton(18, y0 + 2, 40, "back", () => { page--; }, { dim: page === 0 });
  roundButton(W - 18 - 40, y0 + 2, 40, "fwd", () => { page++; }, { dim: page === pages - 1 });
  // the banner: tapping it opens the list of every chapter
  const bw = Math.max(60, W - 2 * (18 + 40 + 10)), bx = W / 2 - bw / 2, down = pressedIn(bx, y0 + 2, bw, 40) ? 3 : 0;
  if (!down) { rr(bx, y0 + 5, bw, 40, 20); ctx.fillStyle = TH.trayDark; ctx.fill(); }
  rr(bx, y0 + 2 + down, bw, 40, 20); ctx.fillStyle = TH.tray; ctx.fill();
  fitLabel(chapterName(page), W / 2 - 8, y0 + 16 + down, 15, bw - 44, "#FFFFFF", 800);
  const from = page * CHAPTER_SIZE + 1, to = Math.min(LEVELS.length, (page + 1) * CHAPTER_SIZE);
  label(`${from} - ${to}`, W / 2 - 8, y0 + 32 + down, 11, "#FFFFFF", 700);
  ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round";   // a small "list" sign
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx + bw - 30, y0 + 15 + k * 6 + down); ctx.lineTo(bx + bw - 16, y0 + 15 + k * 6 + down); ctx.stroke(); }
  buttons.push({ x: bx, y: y0 + 2, w: bw, h: 44, onTap: openChapters });

  // 25 level buttons
  const colsN = 5, gap = 10, top = y0 + 54;
  // never smaller than a fingertip, even on a very short screen
  const bs = Math.max(24, Math.floor(Math.min(62, (W - 40 - gap * (colsN - 1)) / colsN, (y1 - top - gap * 4) / 5)));
  const gw = colsN * bs + (colsN - 1) * gap, x0 = (W - gw) / 2;
  for (let i = 0; i < CHAPTER_SIZE; i++) {
    const n = page * CHAPTER_SIZE + i;
    if (n >= LEVELS.length) break;
    const bx = x0 + (i % colsN) * (bs + gap), by = top + Math.floor(i / colsN) * (bs + gap);
    const down = pressedIn(bx, by, bs, bs) ? 4 : 0;
    const bob = n === next && !down && !S.calm ? Math.sin(time * 2.6) * 2.5 - 1 : 0;   // the next level gently bobs
    levelBed(bx, by + down + bob, bs, n, S.stars[n] || 0, n === next, !!down);
    buttons.push({ x: bx, y: by, w: bs, h: bs + 4, onTap: () => startLevel(n) });
  }
}

/* ==================================================================
   MY CAT: choose her, name her, dress her.
   Three tabs share the space under the big cat: Cats, Hats, Neck.
=================================================================== */
let nameBox = null, catTab = "cats";
// A hat or neck thing she does not own yet: the first tap tries it on the big cat, the second asks to buy it.
let tryOn = null;
function pickCat(k) {
  if (!catOpen(k)) { toast(t("cat_locked", CATS[k].name, CAT_STARS[k])); sfx.no(); return; }     // not enough stars yet
  S.hero = k; save();
  nameInput.value = S.names[k] || "";
  nameInput.placeholder = CATS[k].name;
  sfx.meow(0, VOICE[k]);
}
// Put on something she owns, take it off (id ""), or ask whether to buy it.
function pickWear(slot, id) {
  const hat = slot === "hat", owned = hat ? S.hats : S.necks;
  const wear = () => { if (hat) S.hat = id; else S.neck = id; save(); };
  if (!id || owned.includes(id)) { tryOn = null; wear(); return; }
  if (!tryOn || tryOn.slot !== slot || tryOn.id !== id) { tryOn = { slot, id }; sfx.peek(); return; }   // the line under the grid says: tap again to buy
  const name = t((hat ? "hat_" : "neck_") + id), price = (hat ? HATS : NECKS).find(q => q.id === id).price;
  askBuy({ name, price, pic: [slot, id] }, () => { owned.push(id); tryOn = null; wear(); });
}
const pickHat = id => pickWear("hat", id);

function drawMyCat() {
  const s = safeArea(), setup = !S.setup;
  if (!setup) { coinPill(16, topY + 11); buttons.push({ x: 16, y: topY + 9, w: 86, h: 40, onTap: () => openShop("mycat") }); }
  label(setup ? t("pick_cat") : t("mycat"), W / 2, topY + 28, 26, INK, 900);
  if (catTab === "cats") tryOn = null;

  // Everything sits between the title and the Done button. The big cat takes
  // whatever room is left, and no size can drop below its smallest value.
  const top = topY + 56 + (H >= 700 ? 26 : 8), bottom = setup ? H - s.b - 76 : tabTop() - 10, room = bottom - top;   // headroom for a tall hat
  const roomy = room >= 380;                                 // short screens drop the two lines of small text
  const fixed = 58 + (roomy ? 42 : 0) + 46 + 50;
  const ps = Math.max(56, Math.min(210, W * 0.56, room - fixed - 2 * 78));      // her cat, big: a live preview
  const cellH = Math.max(40, Math.min(72, (room - fixed - ps) / 2 - 6));
  let y = top + Math.max(0, Math.min(26, (room - fixed - ps - 2 * (cellH + 6)) / 2));

  cushion(W / 2, y + ps * 0.68, ps, ["#C9667F", "#F6A9C0", "#FFE1EA"]);
  const tryHat = tryOn && tryOn.slot === "hat" ? tryOn.id : S.hat, tryNeck = tryOn && tryOn.slot === "neck" ? tryOn.id : S.neck;
  drawCat(W / 2, y + ps * 0.48, ps, S.hero, { wake: 1, hat: tryHat, neck: tryNeck, noShadow: true, seed: 3, still: true, breath: S.calm ? 0 : 1 });
  y += ps + 8;

  // the name is a real text box placed over the canvas (see main.js)
  nameBox = { x: W / 2 - 105, y, w: 210, h: 42 };
  y += 50;
  if (roomy) {
    label(t("name_cat"), W / 2, y + 8, 12, INK, 700);
    fitLabel(t("b_" + S.hero), W / 2, y + 28, 14, W - 40, INK, 700);
    y += 42;
  }

  // tabs
  y += 6;
  const tabs = ["cats", "hats", "neck"], tw = Math.max(40, Math.min(104, (W - 32 - 16) / 3));
  tabs.forEach((id, i) => {
    const x = W / 2 + (i - 1) * (tw + 8) - tw / 2;
    pillButton(x, y, tw, 40, t("tab_" + id), () => { catTab = id; }, catTab === id, { fill: "#FFFFFF", text: 0.38 });
  });
  y += 52;

  // the grid for this tab: five across
  const items = catTab === "cats" ? HEROES.map(id => ({ id })) : [{ id: "" }].concat(catTab === "hats" ? HATS : NECKS);
  const cw = Math.max(36, Math.min(68, (W - 20) / 5)), have = totalStars();
  items.forEach((it, i) => {
    const row = Math.floor(i / 5), inRow = Math.min(5, items.length - row * 5);
    const x = W / 2 + (i % 5 - (inRow - 1) / 2) * cw, yy = y + row * (cellH + 6);
    let on, tap, text, locked = false, price = 0;
    if (catTab === "cats") {
      on = it.id === S.hero; locked = !catOpen(it.id);
      text = CATS[it.id].name; tap = () => pickCat(it.id);
    } else {
      const hat = catTab === "hats", owned = !it.id || (hat ? S.hats : S.necks).includes(it.id);
      on = (hat ? S.hat : S.neck) === it.id;
      text = it.id ? t((hat ? "hat_" : "neck_") + it.id) : t("no_hat");
      if (!owned) price = it.price;
      tap = () => pickWear(hat ? "hat" : "neck", it.id);
    }
    const trying = !!tryOn && catTab !== "cats" && tryOn.id === it.id && tryOn.slot === (catTab === "hats" ? "hat" : "neck");
    rr(x - cw / 2 + 3, yy, cw - 6, cellH, 14);
    ctx.fillStyle = on || trying ? "#FFF0B3" : locked ? "rgba(255, 255, 255, 0.5)" : "#FFFFFF"; ctx.fill();
    if (on || trying) { ctx.strokeStyle = trying ? "#E0A23A" : "#FF8A1F"; ctx.lineWidth = 3; ctx.setLineDash(trying ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]); }
    const cs = Math.min(cw * 0.62, cellH * 0.54), ly = yy + cellH - 9;
    if (catTab === "cats") {
      ctx.globalAlpha = locked ? 0.5 : 1;
      drawCat(x, yy + cellH * 0.42, cs * 1.1, it.id, { seed: i * 1.7, wake: on ? 1 : 0, still: true, noShadow: true });
      ctx.globalAlpha = 1;
    } else {
      drawCat(x, yy + cellH * 0.55, cs, S.hero, { wake: 1, still: true, noShadow: true, seed: 5,
        hat: catTab === "hats" ? it.id : "", neck: catTab === "neck" ? it.id : "" });
    }
    if (locked || price) {                                    // what it takes: stars for a cat, coins for an outfit
      const num = String(locked ? CAT_STARS[it.id] : price);
      ctx.font = `800 11px ${FONT}`;
      const left = x - (ctx.measureText(num).width + 16) / 2;
      if (locked) drawStar(left + 6, ly - 1, 6, true); else drawCoin(left + 6, ly - 1, 6);
      label(num, left + 16, ly, 11, INK, 800, "left");
    } else fitLabel(text, x, ly, 10, cw - 8, INK, 700);
    buttons.push({ x: x - cw / 2, y: yy, w: cw, h: cellH + 4, onTap: tap });
  });
  y += 2 * (cellH + 6) + 4;

  // under the grid: how far the next cat is, or a short tip
  if (catTab === "cats") {
    const next = nextCat();
    if (!next) label(t("all_cats"), W / 2, y + 12, 14, INK, 800);
    else {
      const need = CAT_STARS[next], bw = Math.max(60, Math.min(240, W - 80)), bx = W / 2 - bw / 2;
      fitLabel(t("next_cat", CATS[next].name, need), W / 2, y + 8, 14, W - 32, INK, 800);
      rr(bx, y + 20, bw, 12, 6); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      rr(bx, y + 20, Math.max(12, bw * clamp01(have / need)), 12, 6); ctx.fillStyle = "#FFD23F"; ctx.fill();
      rr(bx, y + 20, bw, 12, 6); ctx.strokeStyle = "#D9920C"; ctx.lineWidth = 1.5; ctx.stroke();
      label(t("stars_of", have, need), W / 2, y + 43, 11, INK, 700);
    }
  } else label(t("wear_tip"), W / 2, y + 12, 13, INK, 700);

  // the first visit has a Start button; after that the tab bar takes you anywhere
  if (setup) pillButton(W / 2 - 120, H - s.b - 66, 240, 50, t("start"), () => { S.setup = true; save(); go("home"); }, true);
}

/* ==================================================================
   NAME AND SAVING: her name, and her progress saved as a small file.
   "Save my progress" opens the phone's share sheet with a file, so she
   can keep it in Files or Notes or send it to herself. "Load a saved file"
   reads one back. The old code still works for anyone who prefers it.
   The text boxes are real ones placed over the canvas (see main.js).
=================================================================== */
let playerBox = null, codeBoxAt = null, restoreBoxAt = null, restoreArmed = 0, showCode = false;
function openBackup() {
  go("backup");
  playerInput.value = S.player || "";
  codeBox.value = makeCode();
  restoreBox.value = "";
  restoreArmed = 0; showCode = false;
}
// "today", "yesterday", "3 days ago"
function agoText(ms) {
  const days = Math.floor((new Date(todayKey()) - new Date(todayKey(new Date(ms)))) / 86400000);
  return days <= 0 ? t("today") : days === 1 ? t("yesterday") : t("days_ago", days);
}
function markSaved() { S.saved.at = Date.now(); S.saved.levels = Object.keys(S.stars).length; save(); }

// Save: a small text file holding the backup code. On an iPhone the share sheet
// offers "Save to Files", Notes, Telegram and so on. Elsewhere the file downloads.
function saveToFile() {
  const code = makeCode(), day = todayKey();
  const text = "Drop the Bean save, " + day + (S.player ? ", " + S.player : "") + "\n\n" + code + "\n\nTo load it: Settings, then Name and saving, then Load a saved file.\n";
  const name = "drop-the-bean-save-" + day + ".txt";
  const done = () => { markSaved(); toast(t("saved_ok")); sfx.coin(); };
  let file = null;
  try { file = new File([text], name, { type: "text/plain" }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: "Drop the Bean save" }).then(done, err => {
      if (err && err.name === "AbortError") return;          // she closed the share sheet: nothing saved, no fuss
      downloadFile(text, name, done);
    });
    return;
  }
  downloadFile(text, name, done);
}
function downloadFile(text, name, done) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    done();
  } catch (e) {                                              // last resort: copy the code itself
    copyCode(); markSaved();
  }
}
// Load: she picks the saved file; if it holds a good save, a card asks before replacing anything.
function loadFromFile() { fileInput.value = ""; fileInput.click(); }
function gotFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const got = readCode(String(reader.result || ""));
    if (!got) { toast(t("bad_file")); sfx.no(); return; }
    overlay = { kind: "loadsave", t: 0, delay: 0, at: time, got };
  };
  reader.onerror = () => { toast(t("bad_file")); sfx.no(); };
  reader.readAsText(file);
}
function useSave(got) {
  S = got; markSaved();                                      // a save she just loaded is, by definition, saved
  nameInput.value = S.names[S.hero] || ""; nameInput.placeholder = CATS[S.hero].name;
  page = -1; restoreArmed = 0; overlay = null;
  go("home");
  toast(t("restored")); sfx.magic();
}
function drawLoadCard() {
  const o = overlay;
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.max(220, Math.min(320, W - 40)), lines = wrapLines(t("load_sure", starSum(o.got)), cw - 48, 17, 700);
  const ch = 96 + lines.length * 24 + 120, x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  drawCat(W / 2, y + 44, 56, o.got.hero, { wake: 1, still: true, noShadow: true, hat: o.got.hat, neck: o.got.neck });
  lines.forEach((ln, i) => label(ln, W / 2, y + 96 + i * 24, 17, INK, 700));
  const by = y + 96 + lines.length * 24 + 8;
  pillButton(x + 28, by, cw - 56, 46, t("load_yes"), () => useSave(o.got), true);
  pillButton(x + 28, by + 56, cw - 56, 40, t("load_no"), () => { overlay = null; }, false);
  if (time - o.at < 0.3) buttons = [];                       // no accidental double tap
}

function copyCode() {
  const code = makeCode();
  codeBox.value = code;
  const done = () => { markSaved(); toast(t("saved_copy")); };
  const oldWay = () => { codeBox.focus(); codeBox.select(); try { document.execCommand("copy"); } catch (e) { /* she can still long-press to copy */ } codeBox.blur(); done(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, oldWay); else oldWay();
}
function restoreFromCode() {
  const got = readCode(restoreBox.value);
  if (!got) { toast(t("bad_code")); sfx.no(); restoreArmed = 0; return; }
  overlay = { kind: "loadsave", t: 0, delay: 0, at: time, got };
}

function drawBackup() {
  const s = safeArea();
  roundButton(16, topY + 6, 44, "back", () => go("home"));
  fitLabel(t("backup"), W / 2, topY + 28, 24, W - 2 * 76, INK, 900);
  const bw = Math.min(320, W - 40), x = (W - bw) / 2;
  let y = topY + 74;
  label(t("your_name"), W / 2, y, 14, INK, 800);
  playerBox = { x, y: y + 12, w: bw, h: 42 };
  y += 80;
  // the two big buttons: save, load
  pillButton(x, y, bw, 52, t("save_now"), saveToFile, true);
  y += 66;
  fitLabel(S.saved.at ? t("last_saved", agoText(S.saved.at)) : t("never_saved"), W / 2, y, 14, bw, S.saved.at ? INK : "#B8234F", 800);
  fitLabel(t("save_file_note"), W / 2, y + 20, 12, bw, SOFT, 700);
  y += 44;
  pillButton(x, y, bw, 46, t("load_file"), loadFromFile, false, { fill: "#FFFFFF" });
  y += 64;
  // the old way, for anyone who prefers a code: hidden until asked for
  if (!showCode) {
    pillButton(x + bw * 0.2, y, bw * 0.6, 36, t("or_code"), () => { showCode = true; codeBox.value = makeCode(); }, false, { fill: "#E6EEFF", text: 0.42 });
    codeBoxAt = null; restoreBoxAt = null;
    return;
  }
  const room = H - s.b - y;
  const boxH = room > 300 ? 64 : 48;
  label(t("your_code"), W / 2, y, 13, INK, 800);
  codeBoxAt = { x, y: y + 10, w: bw, h: boxH };
  y += boxH + 18;
  pillButton(x, y, bw, 38, t("copy"), copyCode, false, { fill: "#FFFFFF", text: 0.42 });
  y += 54;
  label(t("have_code"), W / 2, y, 13, INK, 800);
  restoreBoxAt = { x, y: y + 10, w: bw, h: boxH };
  y += boxH + 18;
  pillButton(x, y, bw, 38, t("restore"), restoreFromCode, false, { fill: "#FFFFFF", text: 0.42 });
}

/* ==================================================================
   SHOP: powerups for coins
=================================================================== */
const PU_ICON = { hint: ["bulb", "#F2A900"], snooze: ["clock", "#3B8BEF"], treat: ["fish", "#FF5C8A"], hammer: ["hammer", "#B5652A"] };
function buyPowerup(id) {
  const name = t("pu_" + id), price = POWERUPS.find(q => q.id === id).price;
  askBuy({ name, price, pic: ["pu", id] }, () => { S.pu[id]++; });
}

function drawShop() {
  roundButton(16, topY + 6, 44, "back", () => go(shopFrom || "home"));     // back to where it was opened (coins, or My room)
  coinPill(W - 16 - 86, topY + 11);
  label(t("shop"), W / 2, topY + 28, 26, INK, 900);

  let y = topY + 78;
  label(t("powerups"), W / 2, y, 16, INK, 800);
  y += 20;
  const rw = Math.max(200, Math.min(360, W - 32)), rx = (W - rw) / 2;
  const list = POWERUPS.filter(p => puOpen(p.id));          // the Hammer only once she has met it
  // four rows still fit a short screen: each row gets a little shorter (a very short one drops the description)
  const step = Math.max(64, Math.min(82, (H - safeArea().b - y - 64) / list.length)), rh = step - 12, roomy = rh >= 62;
  list.forEach(p => {
    const mid = y + rh / 2;
    rr(rx, y + 4, rw, rh, 20); ctx.fillStyle = "#8FB4E3"; ctx.fill();
    rr(rx, y, rw, rh, 20); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.fillStyle = "#EEF3FF"; oval(rx + 38, mid, 24, 24); ctx.fill();
    drawIcon(PU_ICON[p.id][0], rx + 38, mid, 1.1, PU_ICON[p.id][1]);
    const bw = 78, textW = rw - 74 - bw - 20;
    label(t("pu_" + p.id), rx + 74, mid - (roomy ? 13 : 8), 17, INK, 800, "left");
    if (roomy) {
      let size = 12;                                         // the one-line description shrinks to fit a narrow phone
      ctx.font = `700 ${size}px ${FONT}`;
      while (size > 9 && ctx.measureText(t("pu_" + p.id + "_d")).width > textW) { size--; ctx.font = `700 ${size}px ${FONT}`; }
      label(t("pu_" + p.id + "_d"), rx + 74, mid + 6, size, SOFT, 700, "left");
    }
    label(t("have", S.pu[p.id]), rx + 74, mid + (roomy ? 22 : 11), 11, SOFT, 700, "left");
    pillButton(rx + rw - bw - 12, mid - 20, bw, 36, "    " + p.price, () => buyPowerup(p.id), true, { text: 0.44 });
    drawCoin(rx + rw - bw + 8, mid - 2 + (pressedIn(rx + rw - bw - 12, mid - 20, bw, 36) ? 4 : 0), 9);
    y += step;
  });

  // hats and neckwear live with the cat
  y += 10;
  pillButton(rx, y, rw, 44, t("shop_outfits"), () => { catTab = "hats"; go("mycat"); }, false, { fill: "#FFFFFF", text: 0.36 });
}

/* ==================================================================
   CHAPTERS: one row per chapter, scrolled by dragging. Tapping a row
   opens that chapter's page on the home screen.
=================================================================== */
let chapScroll = 0, chapVel = 0, chapDrag = null;
const CHAP_ROW = 68;
function chapterStars(n) {
  let got = 0;
  const end = Math.min(LEVELS.length, (n + 1) * CHAPTER_SIZE);
  for (let i = n * CHAPTER_SIZE; i < end; i++) got += S.stars[i] || 0;
  return [got, (end - n * CHAPTER_SIZE) * 3];
}
function chapListBox() { const s = safeArea(); const top = topY + 62, bottom = Math.max(top + CHAP_ROW, H - s.b - 76); return { top, bottom, h: bottom - top }; }
const chapCount = () => Math.max(1, Math.ceil(LEVELS.length / CHAPTER_SIZE));
const chapMax = () => Math.max(0, chapCount() * CHAP_ROW - chapListBox().h + 8);
function openChapters() {
  go("chapters");
  const box = chapListBox(), here = pageOf(nextUnsolved());
  chapScroll = Math.max(0, Math.min(chapMax(), here * CHAP_ROW - box.h / 2 + CHAP_ROW / 2));     // her chapter in the middle
  chapVel = 0; chapDrag = null;
}
function chaptersUpdate(dt) {
  if (chapDrag || !chapVel) return;
  chapScroll += chapVel * dt;
  chapVel *= Math.exp(-dt * 4);
  if (Math.abs(chapVel) < 8) chapVel = 0;
  if (chapScroll < 0 || chapScroll > chapMax()) { chapScroll = Math.max(0, Math.min(chapMax(), chapScroll)); chapVel = 0; }
}
function chapterSwatch(n, x, y, s) {
  const lk = lookFor(n);
  const g = ctx.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, lk.bg[0]); g.addColorStop(1, lk.bg[1]);
  rr(x, y, s, s, 12); ctx.fillStyle = g; ctx.fill();
  rr(x + s * 0.18, y + s * 0.42, s * 0.64, s * 0.42, 7); ctx.fillStyle = lk.tray; ctx.fill();
  rr(x + s * 0.26, y + s * 0.5, s * 0.2, s * 0.26, 4); ctx.fillStyle = lk.tiles[0]; ctx.fill();
  rr(x + s * 0.54, y + s * 0.5, s * 0.2, s * 0.26, 4); ctx.fillStyle = lk.wall; ctx.fill();
  ctx.save(); ctx.translate(x + s * 0.5, y + s * 0.22); ctx.fillStyle = ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineCap = "round"; ctx.lineJoin = "round"; drawMotif(lk.motif, s * 0.13); ctx.restore();
  rr(x, y, s, s, 12); ctx.strokeStyle = "rgba(20, 28, 90, 0.18)"; ctx.lineWidth = 1.5; ctx.stroke();
}
// Left-aligned text that shrinks to fit "maxW".
function leftLabel(text, x, y, size, maxW, color) {
  ctx.font = `800 ${size}px ${FONT}`;
  while (size > 9 && ctx.measureText(text).width > maxW) { size--; ctx.font = `800 ${size}px ${FONT}`; }
  label(text, x, y, size, color, 800, "left");
}
function drawChapters() {
  const s = safeArea(), box = chapListBox(), here = pageOf(nextUnsolved());
  roundButton(16, topY + 6, 44, "back", () => go("levels"));
  starPill(W - 16 - 86, topY + 11);
  fitLabel(t("chapters"), W / 2, topY + 28, 26, W - 2 * 108, INK, 900);
  chapScroll = Math.max(0, Math.min(chapMax(), chapScroll));
  const rw = Math.max(200, Math.min(380, W - 24)), rx = (W - rw) / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, box.top, W, box.h); ctx.clip();
  const first = Math.max(0, Math.floor(chapScroll / CHAP_ROW)), last = Math.min(chapCount() - 1, Math.ceil((chapScroll + box.h) / CHAP_ROW));
  for (let n = first; n <= last; n++) {
    const y = box.top + 4 + n * CHAP_ROW - chapScroll, h = CHAP_ROW - 10, mine = n === here;
    const down = !chapDrag && pressedIn(rx, y, rw, h) ? 3 : 0;
    if (!down) { rr(rx, y + 4, rw, h, 18); ctx.fillStyle = mine ? "#D4620A" : "#8FB4E3"; ctx.fill(); }
    rr(rx, y + down, rw, h, 18); ctx.fillStyle = mine ? "#FFF0B3" : "#FFFFFF"; ctx.fill();
    if (mine) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 3; ctx.stroke(); }
    chapterSwatch(n, rx + 8, y + 7 + down, h - 14);
    const [got, max] = chapterStars(n), tx = rx + h + 6, starsW = 84;
    const room = rw - h - starsW - 14;
    leftLabel(mine ? t("chapter_n", n + 1) + ".  " + t("you_here") : t("chapter_n", n + 1), tx, y + 18 + down, 12, room, mine ? "#9C3A00" : SOFT);
    leftLabel(chapterName(n), tx, y + 38 + down, 16, room, INK);
    const top = Math.max(y, box.top), bottom = Math.min(y + h + 4, box.bottom);
    if (bottom > top) buttons.push({ x: rx, y: top, w: rw, h: bottom - top, onTap: () => { page = n; go("levels"); } });
    if (chestReady(n)) {                                    // 3 stars on all 25: a treasure chest waits here
      const cx = rx + rw - starsW / 2, cy = y + h / 2 + down;
      drawChest(cx, cy + 4, 34, false);
      label(t("open_chest"), cx, cy + 24, 10, "#9C3A00", 800);
      if (bottom > top) buttons.push({ x: rx + rw - starsW, y: top, w: starsW, h: bottom - top, onTap: () => openChest(n) });
    } else {
      drawStar(rx + rw - starsW + 6, y + h / 2 + down, 9, got > 0);
      label(`${got} / ${max}`, rx + rw - starsW + 20, y + h / 2 + 1 + down, 14, INK, 800, "left");
    }
  }
  ctx.restore();
  // a soft edge where the list scrolls under the title and the button
  for (const [y0, dir] of [[box.top, 1], [box.bottom, -1]]) {
    const g = ctx.createLinearGradient(0, y0, 0, y0 + dir * 14); g.addColorStop(0, "rgba(20, 28, 90, 0.12)"); g.addColorStop(1, "rgba(20, 28, 90, 0)");
    ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y0 + dir * 14), W, 14);
  }
  const pw = Math.min(260, W - 72);
  pillButton(W / 2 - pw / 2, H - s.b - 64, pw, 48, t("where"), () => { page = here; go("levels"); }, true);
}

/* ==================================================================
   GAME
=================================================================== */
function drawGuide() {
  if (drag || aim || overlay || leaving.length || guideIdx >= guideRuns.length) return;
  const g = guideRuns[guideIdx], bed = beds.find(b => b.id === g.bed);
  if (!bed || bed.r !== g.start[0] || bed.c !== g.start[1]) return;      // the player went their own way
  const [bcx, bcy] = bedCenter(bed, gx + bed.c * cell, gy + bed.r * cell);
  const pts = [[bcx, bcy]];
  for (const [dr, dc] of g.path) { const q = pts[pts.length - 1]; pts.push([q[0] + dc * cell, q[1] + dr * cell]); }
  const ph = (time % 2.4) / 2.4;
  const travel = clamp01((ph - 0.18) / 0.6), along = travel * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(along)), f = along - i;
  const x = lerp(pts[i][0], pts[i + 1][0], f), y = lerp(pts[i][1], pts[i + 1][1], f);
  const a = ph < 0.1 ? ph / 0.1 : ph > 0.88 ? (1 - ph) / 0.12 : 1;
  ctx.save(); ctx.globalAlpha = a * 0.95;
  ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.setLineDash([2, 10]);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k <= i; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  if (ph > 0.1 && ph < 0.86) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3;
    oval(x, y, 20 + Math.sin(time * 6) * 2, 20 + Math.sin(time * 6) * 2); ctx.stroke();
  }
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.translate(x + 6, y + 8); ctx.rotate(-0.35);
  rr(-8, -14, 16, 34, 8); ctx.fill(); ctx.stroke();
  rr(-14, 8, 30, 24, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-6.5, 6, 13, 8);
  ctx.restore();
}

// While a Treat or a Hint is being aimed, this bar says what to tap. It takes the
// place of the undo / timer / restart row, so nothing there can be hit by mistake.
function drawAimBar() {
  const x = 16, w = Math.max(120, W - 32), y = topY + 62, h = 44;
  rr(x, y + 4, w, h, 22); ctx.fillStyle = "rgba(10, 16, 60, 0.25)"; ctx.fill();
  rr(x, y, w, h, 22); ctx.fillStyle = INK; ctx.fill();
  ctx.fillStyle = "#FFFFFF"; oval(x + 24, y + 22, 15, 15); ctx.fill();
  drawIcon(PU_ICON[aim][0], x + 24, y + 22, 0.62, PU_ICON[aim][1]);
  const mid = x + 44 + (w - 58) / 2;
  fitLabel(t("aim_" + aim), mid, y + 15, 15, w - 62, "#FFFFFF", 800);
  fitLabel(t("aim_cancel"), mid, y + 32, 11, w - 62, "rgba(255, 255, 255, 0.82)", 700);
}

// One pill in the middle of the top row: the clock and the stars she would win right now
// (in relaxed mode, just the stars). The pill turns warmer as stars slip away, the stars
// give one small hop when one is lost (not with calm motion), and it turns red near the end.
function drawClockPill(py) {
  const now = starsNow();
  if (now < meterStars) meterJump = time;
  meterStars = now;
  const low = S.timer && timeLeft <= 10 && timerOn;
  const ph = 38, pw = S.timer ? Math.max(120, Math.min(196, W - 36 - 80 - 24)) : 120, px = W / 2 - pw / 2;
  rr(px, py + 3, pw, ph, ph / 2); ctx.fillStyle = low ? "#C22B3F" : now === 3 ? "#8FB4E3" : now === 2 ? "#D9A441" : "#D9788A"; ctx.fill();
  rr(px, py, pw, ph, ph / 2); ctx.fillStyle = low ? "#FF5C72" : now === 3 ? "#FFFFFF" : now === 2 ? "#FFEDB8" : "#FFD9DE"; ctx.fill();
  let sx = W / 2;                                     // where the three stars sit
  if (S.timer) {
    const tc = low ? "#FFFFFF" : INK, cx = px + 20, cy = py + ph / 2;
    ctx.strokeStyle = tc; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    oval(cx, cy, 8.5, 8.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 4.5); ctx.lineTo(cx, cy); ctx.lineTo(cx + 3.5, cy + 2); ctx.stroke();
    label(clock(timeLeft), px + 34, cy + 1, 18, tc, 800, "left");
    sx = px + pw - 46;
  }
  const jump = S.calm ? 0 : Math.max(0, 1 - (time - meterJump) / 0.5);
  ctx.save();
  if (jump > 0) { const k = 1 + Math.sin(jump * Math.PI) * 0.12; ctx.translate(sx, py + ph / 2); ctx.scale(k, k); ctx.translate(-sx, -py - ph / 2); }
  for (let k = 0; k < 3; k++) drawStar(sx + (k - 1) * 22, py + ph / 2, 8.5, k < now);
  ctx.restore();
}

// One cat on the floor: asleep, under a blanket, or behind a gate.
function drawFloorCat(r, c, cat, sc) {
  const cx = gx + (c + 0.5) * cell, cy = gy + (r + 0.5) * cell, key = skin(cat.color);
  if (cat.hidden) { ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); drawBlanket(0, 0, cell * 0.95, cat.seed); ctx.restore(); }
  else {
    if (drag && drag.bed.color === cat.color) {                      // the held bed can take this one: soft glow
      ctx.fillStyle = CATS[key].bed; ctx.globalAlpha = 0.28 + Math.sin(time * 7) * 0.1;
      rr(cx - cell / 2 + 3, cy - cell / 2 + 3, cell - 6, cell - 6, cell * 0.16); ctx.fill(); ctx.globalAlpha = 1;
    }
    const peek = cat.peek < 1 ? 0.6 + 0.4 * easeOutBack(cat.peek) : 1;
    drawCat(cx, cy, cell * 0.95, key, { seed: cat.seed, still: true, scale: sc * peek, hat: hatFor(key), neck: neckFor(key),
      wake: overlay && overlay.kind === "lose" ? clamp01(overlay.t * 3) : 0 });
    if (S.shapes) {
      const sx = cx + cell * 0.3, sy = cy + cell * 0.3, sr = cell * 0.15;
      ctx.fillStyle = CATS[key].dark; oval(sx, sy, sr + 1.5, sr + 1.5); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; oval(sx, sy, sr, sr); ctx.fill();
      ctx.fillStyle = key === "w" ? INK : CATS[key].bed; drawShape(key, sx, sy, sr * 0.58);
    }
  }
  if (gateShut(cat)) drawGate(cx, cy, cell * sc, skin(cat.gate));
}

// The small "x3" bubble over a bed. It floats up and fades; with calm motion it stays still and only fades.
function drawPopups() {
  for (const p of popups) {
    const k = clamp01(p.t / p.life), a = k < 0.12 ? k / 0.12 : k > 0.6 ? (1 - k) / 0.4 : 1;
    const y = p.y - (S.calm ? 0 : k * cell * 0.7);
    ctx.globalAlpha = clamp01(a);
    const fs = Math.round(Math.max(13, Math.min(20, cell * 0.28))), bw = fs * 2.3, bh = fs * 1.5;
    rr(p.x - bw / 2, y - bh / 2, bw, bh, bh / 2); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.strokeStyle = "#F7B6C8"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; oval(p.x - bw * 0.22, y + bh * 0.62, fs * 0.16, fs * 0.16); ctx.fill(); ctx.stroke();   // a tiny bubble under it
    label(p.text, p.x, y + 1, fs, "#C2456E", 900);
    ctx.globalAlpha = 1;
  }
}

function drawGame() {
  const s = safeArea(), TH = look();
  // top row
  roundButton(16, topY + 6, 44, "pause", () => {
    if (overlay) return;                                // the level is over and its card is on the way: nothing to pause
    paused = true; overlay = { kind: "pause", t: 0, delay: 0 };
  });
  coinPill(W - 16 - 86, topY + 11);
  label(isDaily ? t("daily") : t("level", levelIndex + 1), W / 2, topY + 28, 24, INK, 900);

  // second row: undo, the clock with its stars, restart (or what to tap, while a powerup is being aimed).
  // Each bed shows how many cats it still needs, so there is no "cats left" count.
  if (aim) drawAimBar();
  else {
    const py = topY + 66;
    if (stuck && !S.calm) { ctx.fillStyle = "#FFD86B"; ctx.globalAlpha = 0.45 + 0.3 * Math.sin(time * 5); oval(38, py + 19, 27, 27); ctx.fill(); ctx.globalAlpha = 1; }
    roundButton(18, py - 1, 40, "undo", undo, { dim: !undoStack.length || !!overlay });
    roundButton(W - 18 - 40, py - 1, 40, "restart", () => startLevel(levelIndex, isDaily));
    drawClockPill(py);
  }

  // board, in this chapter's colors
  const bw = cols * cell, bh = rows * cell, m = 12;
  rr(gx - m, gy - m + 8, bw + m * 2, bh + m * 2, 24); ctx.fillStyle = TH.trayDark; ctx.fill();
  rr(gx - m, gy - m, bw + m * 2, bh + m * 2, 24); ctx.fillStyle = TH.tray; ctx.fill();
  rr(gx - m + 4, gy - m + 4, bw + m * 2 - 8, 10, 6); ctx.fillStyle = "rgba(255,255,255,0.16)"; ctx.fill();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = gx + c * cell, y = gy + r * cell;
    if (walls[r][c]) {
      rr(x + 3, y + 5, cell - 6, cell - 6, cell * 0.2); ctx.fillStyle = TH.wallDark; ctx.fill();
      rr(x + 3, y + 1, cell - 6, cell - 6, cell * 0.2); ctx.fillStyle = TH.wall; ctx.fill();
      rr(x + 8, y + 5, cell - 16, (cell - 6) * 0.3, cell * 0.12); ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
    } else if (oneway[r] && oneway[r][c] >= 0) {
      const k = r * cols + c, ft = arrowT[k] === undefined ? 9 : time - arrowT[k];
      drawArrowTile(x, y, cell, oneway[r][c], TH, S.calm ? (ft < 0.6 ? 0.5 : 0) : clamp01(1 - ft / 0.6), r, c);
    } else if (creaky[r] && creaky[r][c] === 1) {
      const ft = fixT[r * cols + c] === undefined ? 9 : time - fixT[r * cols + c];
      if (ft < 0.35 && !S.calm) {                                      // just fixed with a Hammer: it pops into place
        const k = Math.max(0.05, easeOutBack(clamp01(ft / 0.35)));
        ctx.save(); ctx.translate(x + cell / 2, y + cell / 2); ctx.scale(k, k); ctx.translate(-x - cell / 2, -y - cell / 2);
        drawPlank(x, y, cell); ctx.restore();
      } else drawPlank(x, y, cell);
    }
    else if (creaky[r] && creaky[r][c] === 2) {
      rr(x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.16); ctx.fillStyle = TH.tiles[(r + c) % 2]; ctx.fill();
      drawHole(x, y, cell, S.calm ? 1 : clamp01((time - (holeT[r * cols + c] === undefined ? -9 : holeT[r * cols + c])) / 0.25));
    } else {
      rr(x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.16);
      ctx.fillStyle = TH.tiles[(r + c) % 2]; ctx.fill();
    }
  }

  // Sleeping cats pop in one by one when the level starts.
  const popIn = n => S.calm || introT > 1.6 ? 1 : Math.max(0, easeOutBack(clamp01((introT - n * 0.03) / 0.3)));
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cat = floorCats[r][c];
    if (!cat) continue;
    const sc = popIn(n++);
    if (sc > 0) drawFloorCat(r, c, cat, sc);
  }
  // yarn balls sit on the floor, under the beds (a bed never covers one)
  balls.forEach((b, i) => { const sc = popIn(n + i); if (sc > 0) drawYarn(gx + (b.x + 0.5) * cell, gy + (b.y + 0.5) * cell, cell * sc, b.rot); });

  // Aiming: the board dims and the things she can tap stay bright.
  const dimBoard = () => { rr(gx - m, gy - m, bw + m * 2, bh + m * 2, 24); ctx.fillStyle = "rgba(20, 26, 80, 0.45)"; ctx.fill(); };
  const beat = 0.5 + 0.5 * Math.sin(time * 6);
  if (aim === "hint") dimBoard();

  flying = [];
  const bedIn = i => S.calm || introT > 1.6 ? undefined : Math.max(0.01, easeOutBack(clamp01((introT - 0.15 - i * 0.05) / 0.3)));
  for (const b of leaving) drawBed(b, false);                          // under the others, so nothing hides a live bed
  for (const b of beds) if (!drag || drag.bed !== b) drawBed(b, false, bedIn(b.id));
  if (drag) drawBed(drag.bed, true);
  for (const fl of flying) {                                           // cats hopping into bed
    const p = clamp01(fl.f.t), e = p * p * (3 - 2 * p);
    const x = lerp(gx + (fl.f.fc + 0.5) * cell, fl.tx, e);
    const y = lerp(gy + (fl.f.fr + 0.5) * cell, fl.ty, e) - Math.sin(p * Math.PI) * cell * 0.55;
    drawCat(x, y, cell * lerp(0.95, 0.84, e), fl.key, { seed: fl.seed, noShadow: true, hat: hatFor(fl.key), neck: neckFor(fl.key), sx: 1 - Math.sin(p * Math.PI) * 0.08, sy: 1 + Math.sin(p * Math.PI) * 0.1 });
  }

  // an arrow under a bed still shows, small, on top of it: it says which way that bed may go
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!(oneway[r] && oneway[r][c] >= 0) || !bedAtCell(r, c, null)) continue;
    const k = r * cols + c, ft = arrowT[k] === undefined ? 9 : time - arrowT[k], fl = ft < 0.6 ? 1 - ft / 0.6 : 0;
    const held = drag && bedAtCell(r, c, null) === drag.bed ? -3 : 0;
    ctx.globalAlpha = 0.92;
    chevron(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell + held, cell * 0.17 * (1 + fl * 0.3), oneway[r][c], fl > 0 ? "#C22B3F" : "#FFFFFF", fl > 0 ? "#FFFFFF" : "rgba(20, 28, 90, 0.75)");
    ctx.globalAlpha = 1;
  }

  if (aim === "hint") {                                                // every bed glows and can be tapped
    for (const b of beds) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + 0.2 * beat})`;
      bedPath(gx + b.x * cell, gy + b.y * cell, b.cells, cell * 0.05, cell * 0.26); ctx.fill();
      for (const [dr, dc] of b.cells) buttons.push({ x: gx + (b.c + dc) * cell, y: gy + (b.r + dr) * cell, w: cell, h: cell, onTap: () => hintBed(b) });
    }
  }
  if (aim === "treat") {                                               // every cat on the floor gets a bright tile and a ring
    dimBoard();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cat = floorCats[r][c];
      if (!cat) continue;
      const x = gx + c * cell, y = gy + r * cell;
      rr(x + 2, y + 2, cell - 4, cell - 4, cell * 0.18); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      ctx.strokeStyle = PU_ICON.treat[1]; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.45 * beat; ctx.stroke(); ctx.globalAlpha = 1;
      drawFloorCat(r, c, cat, 1);
      buttons.push({ x, y, w: cell, h: cell, onTap: () => treatCat(r, c) });
    }
  }

  if (aim === "hammer") {                                              // every hole gets a bright tile and a ring
    dimBoard();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!creaky[r] || creaky[r][c] !== 2) continue;
      const x = gx + c * cell, y = gy + r * cell;
      rr(x + 2, y + 2, cell - 4, cell - 4, cell * 0.18); ctx.fillStyle = "#FFFFFF"; ctx.fill();
      ctx.strokeStyle = PU_ICON.hammer[1]; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.45 * beat; ctx.stroke(); ctx.globalAlpha = 1;
      drawHole(x, y, cell, 1);
      buttons.push({ x, y, w: cell, h: cell, onTap: () => fixHole(r, c) });
    }
  }

  for (const f of effects) {
    const a = Math.max(0, f.life / f.max);
    ctx.globalAlpha = a;
    if (f.type === "heart") { ctx.fillStyle = f.color; drawHeart(f.x, f.y, cell * 0.26); }
    else if (f.type === "puff") { ctx.fillStyle = f.color; oval(f.x, f.y, 4 + (1 - a) * 9, 4 + (1 - a) * 9); ctx.fill(); }
    else if (f.type === "glint") { ctx.fillStyle = f.color; twinkle(f.x, f.y, Math.max(1, cell * 0.11 * (0.5 + a))); }
    else if (f.type === "splinter") {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot * 2);
      ctx.fillStyle = f.color; ctx.fillRect(-cell * 0.07, -cell * 0.025, cell * 0.14, cell * 0.05); ctx.restore();
    }
    else {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = f.color; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rad = i % 2 ? 2.5 : 7 * a + 2; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawPopups();
  drawGuide();

  // powerups: Hint and Treat, and the Hammer only where there are creaky boards to fix.
  // (Snooze waits on the Time's up card, where it is needed.)
  const by = H - s.b - 92;
  const creakyHere = L.map.some(row => row.includes("c"));
  const pus = POWERUPS.filter(p => p.id === "hint" || p.id === "treat" || (p.id === "hammer" && puOpen("hammer") && creakyHere));
  const use = { hint: useHint, treat: useTreat, hammer: useHammer };
  const step = Math.min(92, (W - 32 - 54) / Math.max(1, pus.length - 1));      // three still fit a narrow phone
  pus.forEach((p, i) => {
    const x = W / 2 + (i - (pus.length - 1) / 2) * step - 27, count = S.pu[p.id];
    const think = p.id === "hint" && !!thinking;
    if (aim === p.id || think) {                                       // the one being aimed (or thinking) wears a ring
      ctx.fillStyle = PU_ICON[p.id][1]; ctx.globalAlpha = 0.3 + 0.25 * beat; oval(x + 27, by + 29, 35, 35); ctx.fill(); ctx.globalAlpha = 1;
    }
    roundButton(x, by, 54, PU_ICON[p.id][0], use[p.id],
      { color: PU_ICON[p.id][1], badge: think ? undefined : count > 0 ? count : "+", dim: !!overlay });
    if (think) {                                                       // thinking: three dots take the place of the count
      const bx = x + 54 - 6, bdy = by + 6;
      rr(bx - 16, bdy - 9, 32, 18, 9); ctx.fillStyle = INK; ctx.fill();
      for (let k = 0; k < 3; k++) {
        const hop = S.calm ? 0 : Math.max(0, Math.sin(time * 9 - k * 0.9)) * 3;
        ctx.fillStyle = "#FFFFFF"; oval(bx - 8 + k * 8, bdy - hop, 2.6, 2.6); ctx.fill();
      }
    }
    label(think ? t("thinking") : t("pu_" + p.id), x + 27, by + 70, 11, INK, 700);
  });

  // trapped: a broken board left no bed a way to its cats
  if (stuck && !overlay) {
    const sw = Math.min(W - 24, 340), sy = by - 64;
    rr(W / 2 - sw / 2, sy, sw, 52, 18); ctx.fillStyle = "rgba(37, 42, 92, 0.94)"; ctx.fill();
    fitLabel(t("stuck"), W / 2, sy + 17, 14, sw - 24, "#FFFFFF", 700);
    fitLabel(t("stuck2"), W / 2, sy + 36, 15, sw - 24, "#FFD86B", 800);
  } else if (hintWordsShown() && !overlay) {                           // words for the first two teaching levels
    const lines = t(L.hint), hy = by - 52;
    if (Array.isArray(lines)) lines.forEach((line, i) => fitLabel(line, W / 2, hy + i * 22, 15, W - 28, INK, 700));
  }
}

/* ---------- twist cards ---------- */
// A small picture of a twist on a floor tile, centred on cx, cy, s wide.
function drawTwistPic(kind, cx, cy, s) {
  const TH = look(), x = cx - s / 2, y = cy - s / 2;
  rr(x + 1.5, y + 1.5, s - 3, s - 3, s * 0.16); ctx.fillStyle = TH.tiles[0]; ctx.fill();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (kind === "creaky") drawPlank(x, y, s);
  else if (kind === "oneway") drawArrowTile(x, y, s, 3, TH, 0, 0, 0);
  else if (kind === "yarn") drawYarn(cx, cy - s * 0.04, s, 0.5);
  else if (kind === "blanket") drawBlanket(cx, cy, s * 0.95, 1);
  else if (kind === "gate") { drawCat(cx, cy, s * 0.9, "o", { still: true, noShadow: true, seed: 1 }); drawGate(cx, cy, s, "b"); }
  else {                                                    // a little bed: rails (arrows) or a padlock with its key
    const C = CATS[kind === "rail" ? "o" : "b"], m = s * 0.1;
    rr(x + m, y + m, s - 2 * m, s - 2 * m, s * 0.24); ctx.fillStyle = C.dark; ctx.fill();
    rr(x + m * 1.6, y + m * 1.6, s - 3.2 * m, s - 3.2 * m, s * 0.2); ctx.fillStyle = C.bed; ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    if (kind === "rail") {
      rr(cx - s * 0.3, cy - s * 0.12, s * 0.6, s * 0.24, s * 0.12); ctx.fill();
      ctx.fillStyle = C.dark;
      for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + d * s * 0.24, cy); ctx.lineTo(cx + d * s * 0.08, cy - s * 0.09); ctx.lineTo(cx + d * s * 0.08, cy + s * 0.09); ctx.closePath(); ctx.fill(); }
    } else {
      const [pc, pd] = PAIR[0], r = s * 0.2;
      ctx.fillStyle = pd; oval(cx, cy + 1.5, r + 2, r + 2); ctx.fill(); ctx.fillStyle = pc; oval(cx, cy, r, r); ctx.fill();
      ctx.strokeStyle = "#FFFFFF"; ctx.fillStyle = "#FFFFFF"; ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.3, Math.PI, 0); ctx.stroke();
      rr(cx - r * 0.48, cy - r * 0.15, r * 0.96, r * 0.68, r * 0.16); ctx.fill();
    }
  }
}
// The card: a picture of the twist and its words, with an OK button.
function drawTwistCard() {
  const o = overlay, tw = TWISTS[o.tw];
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.min(320, W - 40), x = (W - cw) / 2, words = t(tw[0]);
  const lines = wrapLines(words[0], cw - 40, 17, 800).concat(wrapLines(words[1], cw - 40, 14, 700));
  const ch = 214 + lines.length * 22 + 66, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("twist_new"), W / 2, y + 36, 22, INK, 900);
  drawTwistPic(tw[1], W / 2, y + 120, 96);
  const first = wrapLines(words[0], cw - 40, 17, 800).length;
  lines.forEach((line, i) => fitLabel(line, W / 2, y + 196 + i * 22, i < first ? 17 : 14, cw - 30, i < first ? INK : SOFT, i < first ? 800 : 700));
  pillButton(x + 28, y + ch - 66, cw - 56, 48, t("ok"), closeTwist, true);
  if (time - o.at < 0.3) buttons = [];                                  // the tap that opened it can't also close it
}

/* ==================================================================
   POP-UP CARDS: win, lose, pause, settings
=================================================================== */
const goHome = () => { showLevel(levelIndex + (overlay && overlay.kind === "win" && !isDaily ? 1 : 0)); go("home"); };

const STAR_AT = [0.3, 0.6, 0.9];                                        // when each win star lands, in seconds
// The news lines under the coins on a win card, the biggest first, two at most: something new
// to choose (a cat, a room), then a gift or a treasure chest, then on a roll, then the daily
// streak, then perfect. (A chapter's love note shows itself as she leaves the card.)
function winNews(o) {
  const news = [];
  if (o.unlocked) news.push(t("new_cat", CATS[o.unlocked].name));
  if (o.room) news.push(t("new_room", t("room_" + o.room)));
  if (o.gift) news.push(t("gift", t("pu_" + o.gift)));
  if (o.chest) news.push(t("chest_ready"));
  if (o.roll) news.push(t("on_roll"));                                  // three or more perfect levels in a row
  if (o.daily) news.push(t("streak_days", dailyStreak()));
  if (o.perfect) news.push(t("perfect"));
  return news.slice(0, 2);
}
function drawOverlay() {
  const o = overlay;
  if (o.kind === "roompick") return drawRoomPick();
  if (o.kind === "choose") return drawChoose();
  if (o.kind === "settings") return drawSettings();
  if (o.kind === "pause") return drawPause();
  if (o.kind === "buy") return drawBuy();
  if (o.kind === "note") return drawNote();
  if (o.kind === "loadsave") return drawLoadCard();
  if (o.kind === "chest") return drawChestCard();
  if (o.kind === "gift") return drawGiftCard();
  if (o.kind === "calendar") return drawCalendar();
  if (o.kind === "twist") return drawTwistCard();
  buttons = buttons.filter(b => false);                                 // nothing behind the card can be tapped
  const a = Math.min(1, o.t * 4), win = o.kind === "win";
  ctx.fillStyle = `rgba(20, 26, 80, ${0.5 * a})`; ctx.fillRect(0, 0, W, H);
  for (const c of confetti) {
    if (c.soft) {                                                     // an ordinary win: soft sparkles drifting up
      ctx.globalAlpha = a * Math.sin(Math.PI * clamp01(c.life / c.max)) * 0.85;
      ctx.fillStyle = c.color; twinkle(c.x, c.y, c.r); ctx.globalAlpha = a;
      continue;
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
  }
  // the news on a win card: two lines at most, the biggest first (see winNews)
  const news = win ? winNews(o) : [], more = Math.max(0, news.length - 1) * 22;
  const cw = Math.min(320, W - 40), ch = (o.relax && !win ? 376 : 372) + more;
  const x = (W - cw) / 2, y = Math.max(topY + 50, (H - ch) / 2 + 20) + (1 - a) * 40;
  ctx.globalAlpha = a;

  // the level's cats sit on top of the card: awake after a win
  const kinds = [...new Set(L.beds.map(b => skin(b.color)))].slice(0, 5);
  const step = Math.min(62, (cw - 40) / kinds.length);
  kinds.forEach((k, i) => drawCat(W / 2 + (i - (kinds.length - 1) / 2) * step, y - 22, 64, k,
    { seed: i * 0.7, wake: win ? clamp01(o.t * 3 - i * 0.2) : 0, noShadow: true, hat: hatFor(k), neck: neckFor(k) }));
  card(x, y, cw, ch);
  label(win ? t("win") : t("lose"), W / 2, y + 44, 29, INK, 900);

  const bw = cw - 56;
  if (win) {
    for (let i = 0; i < 3; i++) {                                    // the stars land one by one (sounds: main.js)
      const pop = S.calm ? 1 : clamp01((o.t - STAR_AT[i]) * 4);
      const k = S.calm ? 1 : 0.6 + 0.4 * easeOutBack(pop);
      drawStar(W / 2 + (i - 1) * 64, y + 106 - (i === 1 ? 10 : 0) - (1 - pop) * 14, 26 * k, i < o.stars && pop > 0);
    }
    // time left, and how stars are won
    const head = S.timer ? t("time_left", clock(o.left)) : t("relaxed_done");
    fitLabel(head, W / 2, y + 148, 15, cw - 30, INK, 800);
    fitLabel(S.timer ? (snoozed ? t("star_snooze") : t("star_rule")) : t("star_relaxed"), W / 2, y + 167, 12, cw - 30, SOFT, 700);
    // rewards
    const cy = y + 191, text = t("coins_won", o.coins);
    ctx.font = `800 18px ${FONT}`;
    const tw = ctx.measureText(text).width;
    drawCoin(W / 2 - tw / 2 - 12, cy, 11);
    label(text, W / 2 + 12, cy + 1, 18, "#B8730A", 800);
    news.forEach((line, i) => fitLabel(line, W / 2, y + 214 + i * 22, 14, cw - 30, "#D4620A", 800));
    // The first time a chapter is finished, its love note shows before she moves on.
    const leave = fn => () => {
      if (o.note >= 0 && !o.noteShown) { o.noteShown = true; openNote(o.note, fn); } else fn();
    };
    const hasNext = levelIndex + 1 < LEVELS.length;
    const b1 = y + 236 + more, b2 = y + 306 + more;
    if (isDaily || !hasNext) pillButton(x + 28, b1, bw, 54, t("home"), leave(goHome), true);
    else pillButton(x + 28, b1, bw, 54, t("next"), leave(() => startLevel(levelIndex + 1)), true);
    if (!isDaily && hasNext) pillButton(x + 28, b2, bw, 44, t("home"), leave(goHome), false);
    else pillButton(x + 28, b2, bw, 44, t("again"), leave(() => startLevel(levelIndex, isDaily)), false);
  } else {
    fitLabel(catsLeft === 1 ? t("need_bed1") : t("need_bed", catsLeft), W / 2, y + 96, 16, cw - 30, SOFT, 700);
    // a Snooze buys 30 more seconds and drops you back into the level
    const have = S.pu.snooze > 0 || S.coins >= POWERUPS[1].price;
    pillButton(x + 28, y + 130, bw, 50, t("use_snooze"), useSnooze, have, { dim: !have, text: 0.34 });
    pillButton(x + 28, y + 198, bw, 50, t("retry"), () => startLevel(levelIndex, isDaily), !have);
    pillButton(x + 28, y + 266, bw, 44, t("home"), goHome, false);
    // the first time time runs out: one tap turns the clock off (Settings, Timer) and tries again
    if (o.relax) pillButton(x + 28, y + 318, bw, 44, t("relax_q"), () => { S.timer = false; save(); startLevel(levelIndex, isDaily); }, false, { fill: "#FFF4CC" });
  }
  ctx.globalAlpha = 1;
}

function drawPause() {
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.min(320, W - 40), rowH = 56, ch = 72 + 5 * rowH + 10;
  const x = (W - cw) / 2, y = Math.max(topY + 8, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("paused"), W / 2, y + 40, 26, INK, 900);
  const row = (i, text, fn, primary) => pillButton(x + 24, y + 72 + i * rowH, cw - 48, 44, text, fn, primary);
  row(0, t("resume"), () => { overlay = null; paused = false; }, true);
  row(1, t("restart"), () => startLevel(levelIndex, isDaily));
  row(2, t("home"), goHome);
  row(3, t("s_sound", S.sound ? t("on") : t("off")), () => { S.sound = !S.sound; save(); });
  row(4, t("s_music", S.music ? t("on") : t("off")), toggleMusic);   // a quick on/off here; tracks are chosen in Settings
}

// "Buy this?": every purchase stops here first. Nothing is spent until she taps Buy.
function drawBuy() {
  const o = overlay, it = o.item, kind = it.pic[0], id = it.pic[1];
  buttons = [];                                                         // nothing behind the card can be tapped
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.max(200, Math.min(300, W - 40)), ch = 294;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  fitLabel(t("buy_q", it.name), W / 2, y + 38, 22, cw - 36, INK, 900);
  // what it is: the powerup's sign, or her cat wearing it
  const py = y + 106;
  ctx.fillStyle = "#EEF3FF"; oval(W / 2, py, 46, 46); ctx.fill();
  if (kind === "pu") drawIcon(PU_ICON[id][0], W / 2, py, 2, PU_ICON[id][1]);
  else if (kind === "room") drawThingPreview(roomItem(id).spot, id, W / 2, py, 72);
  else drawCat(W / 2, py + 12, 58, S.hero, { wake: 1, still: true, noShadow: true, seed: 5,
    hat: kind === "hat" ? id : S.hat, neck: kind === "neck" ? id : S.neck });
  // the price, and the coins she has
  const text = String(it.price);
  ctx.font = `800 22px ${FONT}`;
  const tw = ctx.measureText(text).width;
  drawCoin(W / 2 - tw / 2 - 8, y + 176, 12);
  label(text, W / 2 + 12, y + 177, 22, INK, 800);
  fitLabel(t("buy_have", S.coins), W / 2, y + 202, 14, cw - 36, SOFT, 700);
  const bw = (cw - 48 - 10) / 2;
  pillButton(x + 24, y + 222, bw, 46, t("buy_no"), buyNo, false);
  pillButton(x + 24 + bw + 10, y + 222, bw, 46, t("buy_yes"), buyYes, true);
  if (time - o.at < 0.3) buttons = [];                                  // a stray double tap can never buy by accident
}

// A list card to choose one music track (or Off), or one meow sound. Choosing plays it,
// so she can hear each one; Done goes back to Settings.
function drawChoose() {
  const o = overlay, music = o.what === "music";
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const opts = music ? [-1].concat(TRACK_FILES.map((_, i) => i)) : MEOW_FILES.map((_, i) => i);
  const colsN = music ? 2 : 1, rowsN = Math.ceil(opts.length / colsN);
  const cw = Math.max(220, Math.min(340, W - 32));
  const rowH = Math.max(30, Math.min(48, (H - topY - 12 - 60 - 76) / rowsN));
  const ch = 60 + rowsN * rowH + 76;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(music ? t("pick_music") : t("pick_meow"), W / 2, y + 34, 22, INK, 900);
  const bw = (cw - 40 - (colsN - 1) * 8) / colsN;
  opts.forEach((id, i) => {
    const bx = x + 20 + (i % colsN) * (bw + 8), by = y + 58 + Math.floor(i / colsN) * rowH;
    const on = music ? (id < 0 ? !S.music : S.music && S.track === id) : (S.meow || 0) === id;
    const text = music ? (id < 0 ? t("off") : t("m_" + id)) : t("w_" + id);
    pillButton(bx, by, bw, rowH - 8, text, () => {
      if (music) chooseTrack(id); else { S.meow = id; save(); meow(0, 1); }
    }, on, { fill: "#FFFFFF", text: 0.42 });
  });
  pillButton(x + 24, y + ch - 64, cw - 48, 48, t("done"), () => { overlay = o.prev || null; }, true);
  if (time - o.at < 0.25) buttons = [];                                 // the tap that opened it can't also choose
}

function drawSettings() {
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.min(330, W - 32), rowH = Math.max(26, Math.min(52, (H - topY - 190) / 7));
  const ch = 62 + 7 * rowH + 92;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("settings"), W / 2, y + 36, 26, INK, 900);
  const onOff = v => (v ? t("on") : t("off"));
  const row = (i, text, fn) => pillButton(x + 24, y + 62 + i * rowH, cw - 48, rowH - 10, text, fn, false);
  const flip = key => () => { S[key] = !S[key]; save(); };
  row(0, t("s_sound", onOff(S.sound)), flip("sound"));
  row(1, musicLabel(), () => { overlay = { kind: "choose", what: "music", t: 1, delay: 0, at: time, prev: overlay }; });
  row(2, S.timer ? t("s_timer") : t("s_timer_off"), flip("timer"));
  row(3, t("s_shapes", onOff(S.shapes)), flip("shapes"));
  row(4, t("s_calm", onOff(S.calm)), flip("calm"));
  row(5, t("s_meow", t("w_" + (S.meow || 0))), () => { overlay = { kind: "choose", what: "meow", t: 1, delay: 0, at: time, prev: overlay }; });
  row(6, t("backup"), openBackup);
  const next = nextCat();                                               // stars open up new cats
  fitLabel(next ? t("next_cat", CATS[next].name, CAT_STARS[next]) : t("all_cats"), W / 2, y + 62 + 7 * rowH + 8, 13, cw - 30, SOFT, 700);
  pillButton(x + 24, y + 62 + 7 * rowH + 28, cw - 48, 48, t("done"), () => { overlay = null; }, true);
}

function drawToast() {
  if (!toastMsg) return;
  const a = toastMsg.t < 0.15 ? toastMsg.t / 0.15 : toastMsg.t > 1.6 ? Math.max(0, (2 - toastMsg.t) / 0.4) : 1;
  ctx.globalAlpha = a;
  ctx.font = `800 15px ${FONT}`;
  const w = Math.min(W - 40, ctx.measureText(toastMsg.text).width + 40), s = safeArea();
  const y = H - s.b - 168;
  rr((W - w) / 2, y, w, 40, 20); ctx.fillStyle = "rgba(37, 42, 92, 0.94)"; ctx.fill();
  fitLabel(toastMsg.text, W / 2, y + 21, 15, w - 24, "#FFFFFF", 800);
  ctx.globalAlpha = 1;
}
