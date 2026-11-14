"use strict";
/* ==================================================================
   DROP THE BEAN - screens: home with the journey, the game,
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
function cushion(x, y, s) {
  ctx.fillStyle = "rgba(20, 28, 90, 0.18)"; oval(x, y + s * 0.08, s * 0.62, s * 0.3); ctx.fill();
  ctx.fillStyle = "#B9590A"; oval(x, y + s * 0.02, s * 0.62, s * 0.3); ctx.fill();
  ctx.fillStyle = "#FF8A1F"; oval(x, y, s * 0.56, s * 0.25); ctx.fill();
  ctx.fillStyle = "#FFE3B8"; oval(x, y - s * 0.01, s * 0.44, s * 0.17); ctx.fill();
}

/* ==================================================================
   HOME: your cat, Play, the daily puzzle and the journey of levels
=================================================================== */
const NODE_GAP = 66, HEAD_H = 62;
let jScroll = -1, jVel = 0, jDrag = null;
const nodeY = i => 46 + i * NODE_GAP + (Math.floor(i / CHAPTER_SIZE) + 1) * HEAD_H;
const nodeX = i => W / 2 + Math.sin(i * 0.85) * Math.min(108, W * 0.27);
function journeyBox() { const s = safeArea(); const y0 = topY + 258, y1 = H - s.b - 78; return { y0, y1, h: Math.max(60, y1 - y0) }; }
const journeyMax = () => Math.max(0, nodeY(LEVELS.length - 1) + 70 - journeyBox().h);
function centerJourney(i) { jScroll = Math.max(0, Math.min(journeyMax(), nodeY(i) - journeyBox().h / 2)); jVel = 0; }

function drawHome() {
  const s = safeArea();
  coinPill(16, topY + 2); starPill(W - 16 - 86, topY + 2);

  // your cat naps on a cushion and wakes up now and then
  const ms = 80, my = topY + 18;
  cushion(W / 2, my + ms * 0.62, ms);
  const cyc = time % 7, wake = cyc > 5.2 ? clamp01(Math.sin((cyc - 5.2) / 1.8 * Math.PI) * 2.5) : 0;
  drawCat(W / 2, my + ms * 0.44, ms, S.hero, { seed: 1, noShadow: true, hat: S.hat, wake, still: true });
  if (!wake) {
    const zt = (time * 0.5) % 1;
    ctx.globalAlpha = Math.sin(zt * Math.PI) * 0.9;
    label("z", W / 2 + ms * (0.46 + zt * 0.12), my + ms * (0.16 - zt * 0.2), Math.round(14 + zt * 8));
    ctx.globalAlpha = 1;
  }
  logo("Drop the Bean", W / 2, topY + 124, 30);

  const next = nextUnsolved();
  const pw = Math.min(260, W - 72);
  pillButton(W / 2 - pw / 2, topY + 150, pw, 48, t("play", next + 1), () => startLevel(next), true);
  const streak = dailyStreak();
  const dLabel = (dailyDone() ? t("daily_done") : t("daily")) + (streak ? ".  " + t("streak", streak) : "");
  pillButton(W / 2 - pw / 2, topY + 208, pw, 36, dLabel, () => startLevel(dailyIndex(), true), false, { text: 0.42 });

  drawJourney(next);

  const ny = H - s.b - 62, nw = (W - 32 - 16) / 3;
  pillButton(16, ny, nw, 46, t("mycat"), () => go("mycat"), false, { fill: "#FFFFFF" });
  pillButton(16 + nw + 8, ny, nw, 46, t("shop"), () => go("shop"), false, { fill: "#FFFFFF" });
  pillButton(16 + (nw + 8) * 2, ny, nw, 46, t("settings"), () => { overlay = { kind: "settings", t: 1, delay: 0 }; }, false, { fill: "#FFFFFF" });
}

function drawJourney(next) {
  const box = journeyBox(), TH = theme();
  if (jScroll < 0) centerJourney(next);
  rr(10, box.y0, W - 20, box.h, 22); ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fill();
  ctx.save();
  rr(10, box.y0, W - 20, box.h, 22); ctx.clip();
  ctx.translate(0, box.y0 - jScroll);
  const seen = y => y > jScroll - 70 && y < jScroll + box.h + 70;

  // the dotted path
  ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.setLineDash([1, 14]);
  ctx.beginPath();
  for (let i = 0; i < LEVELS.length; i++) {
    const y = nodeY(i);
    if (i === 0 || !seen(y) && !seen(nodeY(i - 1))) ctx.moveTo(nodeX(i), y); else ctx.lineTo(nodeX(i), y);
  }
  ctx.stroke(); ctx.setLineDash([]);

  for (let i = 0; i < LEVELS.length; i++) {
    const x = nodeX(i), y = nodeY(i);
    if (i % CHAPTER_SIZE === 0 && seen(y - HEAD_H)) {                  // chapter banner
      const ch = i / CHAPTER_SIZE, by = y - HEAD_H + 2, bw = Math.min(250, W - 70);
      rr(W / 2 - bw / 2, by + 3, bw, 34, 17); ctx.fillStyle = TH.trayDark; ctx.fill();
      rr(W / 2 - bw / 2, by, bw, 34, 17); ctx.fillStyle = TH.tray; ctx.fill();
      fitLabel(`${ch + 1}.  ${t(CHAPTER_KEYS[ch] || "level", ch + 1)}`, W / 2, by + 18, 15, bw - 24, "#FFFFFF", 800);
    }
    if (!seen(y)) continue;
    const stars = S.stars[i] || 0, isNext = i === next;
    const r = isNext ? 25 + Math.sin(time * 4) * 1.5 : 23;
    const sy = box.y0 - jScroll + y;                                   // where it is on screen
    const down = pressedIn(x - 26, sy - 26, 52, 52) ? 3 : 0;
    if (!down) { ctx.fillStyle = stars ? "#E0A419" : isNext ? "#D4620A" : "#8FB4E3"; oval(x, y + 4, r, r); ctx.fill(); }
    ctx.fillStyle = stars ? "#FFF0B3" : isNext ? "#FF8A1F" : "#FFFFFF"; oval(x, y + down, r, r); ctx.fill();
    label(String(i + 1), x, y + 1 + down, i >= 99 ? 15 : 17, isNext && !stars ? "#FFFFFF" : INK);
    if (stars) for (let k = 0; k < 3; k++) drawStar(x + (k - 1) * 13, y + 33, 5.5, k < stars);
    if (isNext) drawCat(x + (x > W / 2 ? -46 : 46), y - 4, 46, S.hero, { seed: 2, wake: 1, hat: S.hat });
    if (sy > box.y0 + 18 && sy < box.y1 - 18) buttons.push({ x: x - 26, y: sy - 26, w: 52, h: 52, onTap: () => startLevel(i) });
  }
  ctx.restore();
}

/* ==================================================================
   MY CAT: choose her, name her, dress her
=================================================================== */
let nameBox = null;
function pickCat(k) {
  S.hero = k; save();
  nameInput.value = S.names[k] || "";
  nameInput.placeholder = CATS[k].name;
  sfx.meow();
}
function pickHat(id) {
  if (!id || S.hats.includes(id)) { S.hat = id; save(); sfx.tap(); return; }
  const price = HATS.find(h => h.id === id).price;
  if (S.coins < price) { toast(t("need_coins", price - S.coins)); sfx.no(); return; }
  S.coins -= price; S.hats.push(id); S.hat = id; save();
  sfx.coin(); toast(t("bought", t("hat_" + id)));
}

function drawMyCat() {
  const s = safeArea(), setup = !S.setup;
  if (!setup) { roundButton(16, topY + 6, 44, "back", () => go("home")); coinPill(W - 16 - 86, topY + 11); }
  label(setup ? t("pick_cat") : t("mycat"), W / 2, topY + 28, 26, INK, 900);

  const short = H - s.t - s.b < 720;
  const ps = short ? 104 : 140, py = topY + 62;
  cushion(W / 2, py + ps * 0.68, ps);
  drawCat(W / 2, py + ps * 0.48, ps, S.hero, { wake: 1, hat: S.hat, noShadow: true, seed: 3 });

  // the name is a real text box placed over the canvas (see main.js)
  let y = py + ps + 8;
  nameBox = { x: W / 2 - 105, y, w: 210, h: 42 };
  y += 58;
  label(t("name_cat"), W / 2, y, 12, SOFT, 700);
  y += 20;
  fitLabel(t("b_" + S.hero), W / 2, y, 14, W - 40, INK, 700);
  y += 22;

  // choose from the seven cats
  const step = Math.min(50, (W - 20) / CAST.length), x0 = W / 2 - step * (CAST.length - 1) / 2;
  CAST.forEach((k, i) => {
    const x = x0 + i * step, on = k === S.hero;
    if (on) { rr(x - step / 2 + 2, y, step - 4, 66, 14); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 3; ctx.stroke(); }
    drawCat(x, y + 26, 42, k, { seed: i * 1.7, wake: on ? 1 : 0, still: true });
    label(CATS[k].name, x, y + 56, 10, INK, 700);
    buttons.push({ x: x - step / 2, y, w: step, h: 66, onTap: () => pickCat(k) });
  });
  y += 80;

  // hats
  label(t("hats"), W / 2, y, 15, INK, 800);
  y += 14;
  const items = [{ id: "" }].concat(HATS), hw = Math.min(56, (W - 24) / items.length), hx0 = W / 2 - hw * (items.length - 1) / 2;
  items.forEach((it, i) => {
    const x = hx0 + i * hw, own = !it.id || S.hats.includes(it.id), on = S.hat === it.id;
    rr(x - hw / 2 + 3, y, hw - 6, 74, 14); ctx.fillStyle = on ? "#FFF0B3" : "#FFFFFF"; ctx.fill();
    if (on) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 3; ctx.stroke(); }
    drawCat(x, y + 36, 38, S.hero, { wake: 1, still: true, noShadow: true, hat: it.id, seed: 5 });
    if (own) label(it.id ? t("hat_" + it.id) : t("no_hat"), x, y + 64, 9, INK, 700);
    else { drawCoin(x - 12, y + 63, 6); label(String(it.price), x + 7, y + 64, 11, INK, 800); }
    buttons.push({ x: x - hw / 2, y, w: hw, h: 74, onTap: () => pickHat(it.id) });
  });

  pillButton(W / 2 - 120, H - s.b - 66, 240, 50, setup ? t("start") : t("done"), () => { S.setup = true; save(); go("home"); }, true);
}

/* ==================================================================
   SHOP: powerups for coins, boards for stars
=================================================================== */
const PU_ICON = { hint: ["bulb", "#F2A900"], snooze: ["clock", "#3B8BEF"], treat: ["fish", "#FF5C8A"] };
function buyPowerup(id) {
  const price = POWERUPS.find(q => q.id === id).price;
  if (S.coins < price) { toast(t("need_coins", price - S.coins)); sfx.no(); return; }
  S.coins -= price; S.pu[id]++; save();
  sfx.coin(); toast(t("bought", t("pu_" + id)));
}

function drawShop() {
  roundButton(16, topY + 6, 44, "back", () => go("home"));
  coinPill(W - 16 - 86, topY + 11);
  label(t("shop"), W / 2, topY + 28, 26, INK, 900);

  let y = topY + 78;
  label(t("powerups"), W / 2, y, 16, INK, 800);
  y += 20;
  const rw = Math.min(360, W - 32), rx = (W - rw) / 2;
  POWERUPS.forEach(p => {
    rr(rx, y + 4, rw, 70, 20); ctx.fillStyle = "#8FB4E3"; ctx.fill();
    rr(rx, y, rw, 70, 20); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.fillStyle = "#EEF3FF"; oval(rx + 38, y + 35, 24, 24); ctx.fill();
    drawIcon(PU_ICON[p.id][0], rx + 38, y + 35, 1.1, PU_ICON[p.id][1]);
    label(t("pu_" + p.id), rx + 74, y + 22, 17, INK, 800, "left");
    ctx.font = `700 12px ${FONT}`;
    label(t("pu_" + p.id + "_d"), rx + 74, y + 41, 12, SOFT, 700, "left");
    label(t("have", S.pu[p.id]), rx + 74, y + 57, 11, SOFT, 700, "left");
    const bw = 78;
    pillButton(rx + rw - bw - 12, y + 15, bw, 36, "    " + p.price, () => buyPowerup(p.id), true, { text: 0.44 });
    drawCoin(rx + rw - bw + 8, y + 33 + (pressedIn(rx + rw - bw - 12, y + 15, bw, 36) ? 4 : 0), 9);
    y += 82;
  });

  y += 14;
  label(t("boards"), W / 2, y, 16, INK, 800);
  y += 20;
  const gap = 8, tw = (rw - gap * 3) / 4, have = totalStars(), cur = theme();
  THEMES.forEach((th, i) => {
    const x = rx + i * (tw + gap), locked = have < th.stars, on = cur === th;
    const g = ctx.createLinearGradient(0, y, 0, y + 78);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    rr(x, y, tw, 78, 16); ctx.fillStyle = g; ctx.fill();
    rr(x + tw * 0.2, y + 14, tw * 0.6, 30, 8); ctx.fillStyle = th.tray; ctx.fill();
    rr(x + tw * 0.2 + 5, y + 19, tw * 0.6 - 10, 20, 5); ctx.fillStyle = th.tiles[0]; ctx.fill();
    if (on) { rr(x, y, tw, 78, 16); ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 4; ctx.stroke(); }
    if (locked) {
      rr(x, y, tw, 78, 16); ctx.fillStyle = "rgba(20, 26, 80, 0.45)"; ctx.fill();
      drawStar(x + tw / 2 - 16, y + 62, 7, true);
      label(String(th.stars), x + tw / 2 + 8, y + 63, 13, "#FFFFFF", 800);
    } else {
      label(t("th_" + th.id), x + tw / 2, y + 62, 12, INK, 800);
      buttons.push({ x, y, w: tw, h: 78, onTap: () => { S.theme = th.id; save(); sfx.tap(); } });
    }
  });
}

/* ==================================================================
   GAME
=================================================================== */
function drawGuide() {
  if (drag || overlay || leaving.length || guideIdx >= guideRuns.length) return;
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

function drawGame() {
  const s = safeArea(), TH = theme();
  // top row
  roundButton(16, topY + 6, 44, "pause", () => { paused = true; overlay = { kind: "pause", t: 0, delay: 0 }; });
  coinPill(W - 16 - 86, topY + 11);
  label(isDaily ? t("daily") : t("level", levelIndex + 1), W / 2, topY + 28, 24, INK, 900);

  // second row: undo, timer, cats left, restart
  const low = S.timer && timeLeft <= 10 && timerOn;
  const ph = 38, py = topY + 66, gap = 8;
  const pw = Math.min(108, (W - 36 - 80 - gap * 3) / 2);
  roundButton(18, py - 1, 40, "undo", undo, { dim: !undoStack.length || !!overlay });
  roundButton(W - 18 - 40, py - 1, 40, "restart", () => startLevel(levelIndex, isDaily));
  let px = W / 2 - pw - gap / 2;
  const pulse = low ? 1 + Math.sin(time * 12) * 0.04 : 1;
  ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(pulse, pulse); ctx.translate(-px - pw / 2, -py - ph / 2);
  rr(px, py + 3, pw, ph, ph / 2); ctx.fillStyle = low ? "#C22B3F" : "#8FB4E3"; ctx.fill();
  rr(px, py, pw, ph, ph / 2); ctx.fillStyle = low ? "#FF5C72" : "#FFFFFF"; ctx.fill();
  const tc = low ? "#FFFFFF" : INK;
  if (S.timer) {
    ctx.strokeStyle = tc; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    oval(px + 22, py + ph / 2, 9, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 22, py + ph / 2 - 5); ctx.lineTo(px + 22, py + ph / 2); ctx.lineTo(px + 26, py + ph / 2 + 2); ctx.stroke();
    label(clock(timeLeft), px + pw / 2 + 13, py + ph / 2 + 1, 18, tc);
  } else {
    fitLabel(slides === 1 ? t("slide1") : t("slides", slides), px + pw / 2, py + ph / 2 + 1, 16, pw - 14, tc, 800);   // relaxed: count slides
  }
  ctx.restore();
  px = W / 2 + gap / 2;
  pill(px, py, pw, ph);
  ctx.fillStyle = "#FF8A1F"; paw(px + 23, py + ph / 2 - 1, 15);
  fitLabel(t("left", catsLeft), px + pw / 2 + 13, py + ph / 2 + 1, 18, pw - 44, INK, 800);

  // board
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
    const cx = gx + (c + 0.5) * cell, cy = gy + (r + 0.5) * cell, key = skin(cat.color);
    const sc = popIn(n++);
    if (sc <= 0) continue;
    if (cat.hidden) { ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); drawBlanket(0, 0, cell * 0.95, cat.seed); ctx.restore(); }
    else {
      if (drag && drag.bed.color === cat.color) {                      // the held bed can take this one: soft glow
        ctx.fillStyle = CATS[key].bed; ctx.globalAlpha = 0.28 + Math.sin(time * 7) * 0.1;
        rr(cx - cell / 2 + 3, cy - cell / 2 + 3, cell - 6, cell - 6, cell * 0.16); ctx.fill(); ctx.globalAlpha = 1;
      }
      const peek = cat.peek < 1 ? 0.6 + 0.4 * easeOutBack(cat.peek) : 1;
      drawCat(cx, cy, cell * 0.95, key, { seed: cat.seed, still: true, scale: sc * peek, hat: hatFor(key),
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

  flying = [];
  const bedIn = i => S.calm || introT > 1.6 ? undefined : Math.max(0.01, easeOutBack(clamp01((introT - 0.15 - i * 0.05) / 0.3)));
  for (const b of leaving) drawBed(b, false);                          // under the others, so nothing hides a live bed
  for (const b of beds) if (!drag || drag.bed !== b) drawBed(b, false, bedIn(b.id));
  if (drag) drawBed(drag.bed, true);
  for (const fl of flying) {                                           // cats hopping into bed
    const p = clamp01(fl.f.t), e = p * p * (3 - 2 * p);
    const x = lerp(gx + (fl.f.fc + 0.5) * cell, fl.tx, e);
    const y = lerp(gy + (fl.f.fr + 0.5) * cell, fl.ty, e) - Math.sin(p * Math.PI) * cell * 0.55;
    drawCat(x, y, cell * lerp(0.95, 0.84, e), fl.key, { seed: fl.seed, noShadow: true, hat: hatFor(fl.key), sx: 1 - Math.sin(p * Math.PI) * 0.08, sy: 1 + Math.sin(p * Math.PI) * 0.1 });
  }

  for (const f of effects) {
    const a = Math.max(0, f.life / f.max);
    ctx.globalAlpha = a;
    if (f.type === "heart") { ctx.fillStyle = f.color; drawHeart(f.x, f.y, cell * 0.26); }
    else if (f.type === "puff") { ctx.fillStyle = f.color; oval(f.x, f.y, 4 + (1 - a) * 9, 4 + (1 - a) * 9); ctx.fill(); }
    else {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = f.color; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rad = i % 2 ? 2.5 : 7 * a + 2; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawGuide();

  // powerups
  const by = H - s.b - 92;
  POWERUPS.forEach((p, i) => {
    const x = W / 2 + (i - 1) * 92 - 27, count = S.pu[p.id];
    const off = p.id === "snooze" && !S.timer;
    roundButton(x, by, 54, PU_ICON[p.id][0], p.id === "hint" ? useHint : p.id === "snooze" ? useSnooze : useTreat,
      { color: PU_ICON[p.id][1], badge: count > 0 ? count : "+", dim: off || (!!overlay && !(p.id === "snooze" && overlay.kind === "lose")) });
    label(t("pu_" + p.id), x + 27, by + 70, 11, INK, 700);
  });

  // words for the teaching levels
  if (L.hint && !overlay) {
    const lines = t(L.hint), hy = by - 52;
    if (Array.isArray(lines)) lines.forEach((line, i) => fitLabel(line, W / 2, hy + i * 22, 15, W - 28, INK, 700));
  }
}

/* ==================================================================
   POP-UP CARDS: win, lose, pause, settings
=================================================================== */
const goHome = () => { centerJourney(Math.min(LEVELS.length - 1, levelIndex + (overlay && overlay.kind === "win" ? 1 : 0))); go("home"); };

function drawOverlay() {
  const o = overlay;
  if (o.kind === "settings") return drawSettings();
  if (o.kind === "pause") return drawPause();
  buttons = buttons.filter(b => false);                                 // nothing behind the card can be tapped
  const a = Math.min(1, o.t * 4), win = o.kind === "win";
  ctx.fillStyle = `rgba(20, 26, 80, ${0.5 * a})`; ctx.fillRect(0, 0, W, H);
  for (const c of confetti) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
  }
  const cw = Math.min(320, W - 40), ch = 372;
  const x = (W - cw) / 2, y = (H - ch) / 2 + 20 + (1 - a) * 40;
  ctx.globalAlpha = a;

  // the level's cats sit on top of the card: awake after a win
  const kinds = [...new Set(L.beds.map(b => skin(b.color)))].slice(0, 5);
  const step = Math.min(62, (cw - 40) / kinds.length);
  kinds.forEach((k, i) => drawCat(W / 2 + (i - (kinds.length - 1) / 2) * step, y - 22, 64, k,
    { seed: i * 0.7, wake: win ? clamp01(o.t * 3 - i * 0.2) : 0, noShadow: true, hat: hatFor(k) }));
  card(x, y, cw, ch);
  label(win ? t("win") : t("lose"), W / 2, y + 44, 29, INK, 900);

  const bw = cw - 56;
  if (win) {
    for (let i = 0; i < 3; i++) {
      const pop = Math.min(1, Math.max(0, (o.t - 0.2 - i * 0.18) * 5));
      drawStar(W / 2 + (i - 1) * 64, y + 106 - (i === 1 ? 10 : 0), 26 * (0.6 + 0.4 * pop), i < o.stars && pop > 0);
    }
    fitLabel(S.timer ? t("time_left", clock(o.left)) : t("slides_line", slides, L.best), W / 2, y + 154, 15, cw - 30, SOFT, 700);
    // rewards
    const cy = y + 184, text = t("coins_won", o.coins);
    ctx.font = `800 18px ${FONT}`;
    const tw = ctx.measureText(text).width;
    drawCoin(W / 2 - tw / 2 - 12, cy, 11);
    label(text, W / 2 + 12, cy + 1, 18, "#B8730A", 800);
    const extra = o.gift ? t("gift", t("pu_" + o.gift)) : o.unlocked ? t("new_board", t("th_" + o.unlocked.id)) : o.daily ? t("streak_days", dailyStreak()) : "";
    if (extra) fitLabel(extra, W / 2, y + 210, 14, cw - 30, "#D4620A", 800);
    const hasNext = levelIndex + 1 < LEVELS.length;
    if (isDaily || !hasNext) pillButton(x + 28, y + 236, bw, 54, t("home"), goHome, true);
    else pillButton(x + 28, y + 236, bw, 54, t("next"), () => startLevel(levelIndex + 1), true);
    if (!isDaily && hasNext) pillButton(x + 28, y + 306, bw, 44, t("home"), goHome, false);
    else pillButton(x + 28, y + 306, bw, 44, t("again"), () => startLevel(levelIndex, isDaily), false);
  } else {
    fitLabel(catsLeft === 1 ? t("need_bed1") : t("need_bed", catsLeft), W / 2, y + 96, 16, cw - 30, SOFT, 700);
    // a Snooze buys 30 more seconds and drops you back into the level
    const have = S.pu.snooze > 0 || S.coins >= POWERUPS[1].price;
    pillButton(x + 28, y + 130, bw, 50, t("use_snooze"), useSnooze, have, { dim: !have, text: 0.34 });
    pillButton(x + 28, y + 198, bw, 50, t("retry"), () => startLevel(levelIndex, isDaily), !have);
    pillButton(x + 28, y + 266, bw, 44, t("home"), goHome, false);
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
  row(4, musicLabel(), cycleMusic);
}

function drawSettings() {
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.min(330, W - 32), rowH = Math.min(54, (H - topY - 190) / 6);
  const ch = 62 + 6 * rowH + 92;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("settings"), W / 2, y + 36, 26, INK, 900);
  const onOff = v => (v ? t("on") : t("off"));
  const row = (i, text, fn) => pillButton(x + 24, y + 62 + i * rowH, cw - 48, rowH - 10, text, fn, false);
  const flip = key => () => { S[key] = !S[key]; save(); };
  row(0, t("s_sound", onOff(S.sound)), flip("sound"));
  row(1, musicLabel(), cycleMusic);
  row(2, S.timer ? t("s_timer") : t("s_timer_off"), flip("timer"));
  row(3, t("s_shapes", onOff(S.shapes)), flip("shapes"));
  row(4, t("s_calm", onOff(S.calm)), flip("calm"));
  row(5, t("s_board", t("th_" + theme().id)), () => {
    const ok = THEMES.filter(th => totalStars() >= th.stars);
    S.theme = ok[(ok.indexOf(theme()) + 1) % ok.length].id; save();
  });
  const nextT = THEMES.find(th => totalStars() < th.stars);
  fitLabel(nextT ? t("next_board", t("th_" + nextT.id), nextT.stars) : t("all_boards"), W / 2, y + 62 + 6 * rowH + 8, 13, cw - 30, SOFT, 700);
  pillButton(x + 24, y + 62 + 6 * rowH + 28, cw - 48, 48, t("done"), () => { overlay = null; }, true);
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
