"use strict";
/* ==================================================================
   DROP THE BEAN - main: touch input, the frame loop, start-up.
=================================================================== */

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout();
  if (jScroll >= 0) jScroll = Math.min(jScroll, journeyMax());
}
window.addEventListener("resize", resize);
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- touch ---------- */
let lastInput = 0;
cv.addEventListener("pointerdown", e => {
  if (S.sound || S.music) audio();
  if (document.activeElement === nameInput) nameInput.blur();
  lastInput = time;
  press = { x: e.clientX, y: e.clientY, moved: false };
  if (overlay) return;
  if (screen === "game") {
    const b = bedAtPoint(e.clientX, e.clientY);
    if (b) {
      drag = { bed: b, offX: e.clientX - (gx + b.c * cell), offY: e.clientY - (gy + b.r * cell), snap: snapshot(), saved: false };
      timerOn = true; touched = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine without it */ }
    }
  } else if (screen === "home") {
    const box = journeyBox();
    if (e.clientY > box.y0 && e.clientY < box.y1) jDrag = { y: e.clientY, from: jScroll, vy: 0, lastY: e.clientY, lastT: performance.now() };
  }
});
cv.addEventListener("pointermove", e => {
  lastInput = time;
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.moved = true;
  if (drag && !overlay) dragTo(e.clientX, e.clientY);
  if (jDrag) {
    jScroll = Math.max(0, Math.min(journeyMax(), jDrag.from - (e.clientY - jDrag.y)));
    const now = performance.now(), dtm = (now - jDrag.lastT) / 1000;
    if (dtm > 0.005) { jDrag.vy = lerp(jDrag.vy, -(e.clientY - jDrag.lastY) / dtm, 0.6); jDrag.lastY = e.clientY; jDrag.lastT = now; }
  }
});
function release() {
  drag = null;
  if (jDrag) { jVel = press && press.moved ? jDrag.vy : 0; jDrag = null; }
  if (press && !press.moved) {
    for (let i = buttons.length - 1; i >= 0; i--) {                    // the last one drawn is on top
      const b = buttons[i];
      if (press.x >= b.x && press.x <= b.x + b.w && press.y >= b.y && press.y <= b.y + b.h) {
        press = null; sfx.tap(); b.onTap(); return;
      }
    }
  }
  press = null;
}
cv.addEventListener("pointerup", release);
cv.addEventListener("pointercancel", () => { drag = null; jDrag = null; press = null; });

// The cat's name is typed into a real text box, so the phone keyboard works.
nameInput.addEventListener("input", () => {
  const v = nameInput.value.trim().slice(0, 12);
  if (v) S.names[S.hero] = v; else delete S.names[S.hero];
  save();
});
nameInput.addEventListener("keydown", e => { if (e.key === "Enter") nameInput.blur(); });

/* ---------- one step of time ---------- */
function update(dt) {
  if (fade > 0) fade = Math.max(0, fade - dt * 4);
  if (toastMsg) { toastMsg.t += dt; if (toastMsg.t > 2) toastMsg = null; }
  if (!jDrag && Math.abs(jVel) > 2) {                                   // the journey keeps gliding after a flick
    jScroll = Math.max(0, Math.min(journeyMax(), jScroll + jVel * dt));
    jVel *= Math.pow(0.04, dt);
  } else if (!jDrag) jVel = 0;
  if (screen !== "game") return;

  introT += dt;
  while (guideIdx < guideRuns.length) {                                 // move the finger demo on as the player follows it
    const g = guideRuns[guideIdx], gb = beds.find(b => b.id === g.bed);
    if (!gb || (gb.r === g.end[0] && gb.c === g.end[1])) guideIdx++; else break;
  }
  if (hinting && guideIdx >= guideRuns.length) hinting = false;

  if (timerOn && !overlay && !paused && S.timer) {
    timeLeft -= dt;
    if (timeLeft <= 10 && Math.ceil(timeLeft) !== lastTick) { lastTick = Math.ceil(timeLeft); if (timeLeft > 0) sfx.tick(); }
    if (timeLeft <= 0) { timeLeft = 0; finish("lose", 0.2); }
  }
  const ease = Math.min(1, dt * 26);
  for (const b of beds.concat(leaving)) {
    b.x += (b.c - b.x) * ease; b.y += (b.r - b.y) * ease;
    b.nx *= Math.max(0, 1 - dt * 14); b.ny *= Math.max(0, 1 - dt * 14);
    b.squash = Math.max(0, b.squash - dt * 5);
    for (const f of b.fills) f.t = Math.min(9, f.t + dt * 4);
  }
  for (const b of leaving) b.leaveT += dt;
  leaving = leaving.filter(b => b.leaveT < LEAVE);
  for (const row of floorCats) for (const cat of row) if (cat && cat.peek < 1) cat.peek = Math.min(1, cat.peek + dt * 4);
  for (const f of effects) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; f.rot += dt * 5; }
  effects = effects.filter(f => f.life > 0);
  if (overlay) {
    if (overlay.delay > 0) overlay.delay -= dt;
    else {
      if (!overlay.rang && (overlay.kind === "win" || overlay.kind === "lose")) {
        overlay.rang = true;
        if (overlay.kind === "win") { sfx.win(); throwConfetti(); if (overlay.coins) sfx.coin(); } else sfx.lose();
      }
      overlay.t += dt;
    }
  }
  for (const c of confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt; }
  confetti = confetti.filter(c => c.y < H + 30);
}

/* ---------- one picture ---------- */
let nameStyle = "";
function render() {
  buttons = [];
  drawBackground();
  if (screen === "home") drawHome();
  else if (screen === "game") drawGame();
  else if (screen === "mycat") drawMyCat();
  else drawShop();
  if (overlay && overlay.delay <= 0) drawOverlay();
  drawToast();
  if (fade > 0) { ctx.globalAlpha = fade * fade; ctx.fillStyle = theme().bg[0]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

  const show = screen === "mycat" && !overlay && nameBox;
  const style = show ? `display:block;left:${nameBox.x}px;top:${nameBox.y}px;width:${nameBox.w}px;height:${nameBox.h}px` : "display:none";
  if (style !== nameStyle) { nameStyle = style; nameInput.style.cssText = style; }
}

let last = performance.now(), frameNo = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt; frameNo++;
  update(dt);
  musicTick();
  // When nothing is moving and nobody is touching, draw less often to save battery.
  const busy = drag || jDrag || fade > 0 || effects.length || leaving.length || confetti.length || toastMsg ||
    Math.abs(jVel) > 2 || (overlay && overlay.t < 2) || (screen === "game" && introT < 2) || time - lastInput < 2.5;
  if (busy || frameNo % 3 === 0) render();
  requestAnimationFrame(frame);
}

/* ---------- start ---------- */
nameInput.value = S.names[S.hero] || "";
nameInput.placeholder = CATS[S.hero].name;
resize();
screen = S.setup ? "home" : "mycat";      // first visit: pick and name your cat
layout();
requestAnimationFrame(frame);

// On a real https address, keep a copy on the phone so it opens with no internet.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* still playable online */ });
}
