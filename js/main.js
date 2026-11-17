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
}
window.addEventListener("resize", resize);
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- touch ---------- */
// Only one finger plays at a time. The finger that went down first owns the press (and any
// drag) until it lifts; other fingers are ignored meanwhile. A phone marks the first finger
// of a touch as "primary", so if a new primary finger arrives the old one must be gone
// (its lift was missed), and the new one takes over instead of the game locking up.
let lastInput = 0;
const ours = e => !!press && e.pointerId === press.id;
function wakeSound() {
  if (S.sound || S.music) audio();
  recordedMusic(true);
}
cv.addEventListener("pointerdown", e => {
  if (press && e.pointerId !== press.id && !e.isPrimary) return;      // a second finger: not now
  wakeSound();
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();   // tapping the game closes the keyboard
  lastInput = time;
  drag = null;
  press = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  if (overlay) return;
  if (screen === "chapters") { chapDrag = { y0: e.clientY, s0: chapScroll, y: e.clientY, t: time }; chapVel = 0; }
  if (screen === "game" && !aim) {                    // while she is aiming a powerup, a touch picks its target instead of sliding a bed
    const b = bedAtPoint(e.clientX, e.clientY);
    if (b) {
      drag = { bed: b, offX: e.clientX - (gx + b.c * cell), offY: e.clientY - (gy + b.r * cell), snap: snapshot(), saved: false };
      timerOn = true; touched = true;
      b.popT = time; sfx.pick();                      // the bed lifts with a little pop
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine without it */ }
    }
  }
});
cv.addEventListener("pointermove", e => {
  if (!ours(e)) return;
  lastInput = time;
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.moved = true;
  if (drag && !overlay) dragTo(e.clientX, e.clientY);
  if (chapDrag && press.moved) {                      // dragging the chapter list
    const dt = Math.max(1 / 120, time - chapDrag.t);
    chapVel = lerp(chapVel, -(e.clientY - chapDrag.y) / dt, 0.5);
    chapDrag.y = e.clientY; chapDrag.t = time;
    chapScroll = Math.max(0, Math.min(chapMax(), chapDrag.s0 - (e.clientY - chapDrag.y0)));
  }
});
function release() {
  wakeSound();                                        // an iPhone only lets sound start as a finger lifts
  if (drag && beds.includes(drag.bed)) { drag.bed.dropT = time; sfx.drop(); }   // put down: a little squish and a soft thud
  drag = null;
  if (chapDrag) { if (!press || !press.moved || time - chapDrag.t > 0.12) chapVel = 0; chapDrag = null; }
  if (press && !press.moved) {
    const wasAim = aim;
    let hit = null;
    for (let i = buttons.length - 1; i >= 0 && !hit; i--) {            // the last one drawn is on top
      const b = buttons[i];
      if (press.x >= b.x && press.x <= b.x + b.w && press.y >= b.y && press.y <= b.y + b.h) hit = b;
    }
    press = null;
    if (hit) { sfx.tap(); hit.onTap(); }
    // Aiming a Treat, a Hint or a Hammer: a tap anywhere but on a target backs out, and nothing is used up.
    if (wasAim && aim === wasAim) cancelAim();
    return;
  }
  press = null;
}
cv.addEventListener("pointerup", e => { if (ours(e)) release(); });
cv.addEventListener("pointercancel", e => { if (ours(e)) { drag = null; press = null; chapDrag = null; } });

// The cat's name is typed into a real text box, so the phone keyboard works.
nameInput.addEventListener("input", () => {
  const v = nameInput.value.trim().slice(0, 12);
  if (v) S.names[S.hero] = v; else delete S.names[S.hero];
  save();
});
nameInput.addEventListener("keydown", e => { if (e.key === "Enter") nameInput.blur(); });
playerInput.addEventListener("input", () => { S.player = playerInput.value.trim().slice(0, 16); save(); codeBox.value = makeCode(); });
playerInput.addEventListener("keydown", e => { if (e.key === "Enter") playerInput.blur(); });

/* ---------- one step of time ---------- */
function update(dt) {
  if (fade > 0) fade = Math.max(0, fade - dt * 4);
  if (toastMsg) { toastMsg.t += dt; if (toastMsg.t > 2) toastMsg = null; }
  if (screen === "room") roomUpdate(dt);
  if (screen === "chapters") chaptersUpdate(dt);
  if (screen !== "game") return;

  introT += dt;
  searchTick();                                                         // a few milliseconds of hint or trapped-check searching
  while (guideIdx < guideRuns.length) {                                 // move the finger demo on as the player follows it
    const g = guideRuns[guideIdx], gb = beds.find(b => b.id === g.bed);
    if (!gb || (gb.r === g.end[0] && gb.c === g.end[1])) guideIdx++; else break;
  }
  if (hinting && guideIdx >= guideRuns.length) hinting = false;

  if (!overlay && !paused && !document.hidden) S.stats.time += dt;     // time played (saved with the next save)
  if (timerOn && !overlay && !paused && !aim && !thinking && S.timer) {  // the clock waits while she picks a target, or while a hint thinks
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
        if (overlay.kind === "win") { sfx.win(); if (overlay.party) throwConfetti(); else softSparkle(); if (overlay.coins) sfx.coin(); } else sfx.lose();
      }
      overlay.t += dt;
      if (overlay.kind === "win") {                   // each star makes a small sound as it lands
        overlay.starsRung = overlay.starsRung || 0;
        while (overlay.starsRung < overlay.stars && overlay.t >= STAR_AT[overlay.starsRung] + 0.18) sfx.star(overlay.starsRung++);
      }
    }
  }
  for (const c of confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.spin * dt; if (c.soft) c.life -= dt; }
  confetti = confetti.filter(c => c.y < H + 30 && (!c.soft || c.life > 0));
}

/* ---------- one picture ---------- */
// Real text boxes sit on top of the canvas. Show each one only on its own screen.
function placeBox(el, box) {
  const style = box ? `display:block;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px` : "display:none";
  if (el.dataset.at !== style) { el.dataset.at = style; el.style.cssText = style; }
}
function render() {
  buttons = [];
  drawBackground();
  if (screen === "home") drawHome();
  else if (screen === "game") drawGame();
  else if (screen === "mycat") drawMyCat();
  else if (screen === "backup") drawBackup();
  else if (screen === "room") drawRoomScreen();
  else if (screen === "chapters") drawChapters();
  else if (screen === "album") drawAlbum();
  else drawShop();
  if (overlay && overlay.delay <= 0) drawOverlay();
  drawToast();
  if (fade > 0) { ctx.globalAlpha = fade * fade; ctx.fillStyle = look().bg[0]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

  placeBox(nameInput, screen === "mycat" && !overlay && nameBox);
  placeBox(playerInput, screen === "backup" && !overlay && playerBox);
  placeBox(codeBox, screen === "backup" && !overlay && codeBoxAt);
  placeBox(restoreBox, screen === "backup" && !overlay && restoreBoxAt);
}

let last = performance.now(), frameNo = 0, frameError = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt; frameNo++;
  // One bad frame must never freeze the game: note it once and carry on.
  try { update(dt); } catch (e) { if (!frameError) { frameError = true; console.error(e); } }
  musicTick();
  // When nothing is moving and nobody is touching, draw less often to save battery.
  const busy = drag || aim || thinking || stuckJob || fade > 0 || effects.length || leaving.length || confetti.length || toastMsg ||
    (overlay && overlay.t < 2) || (screen === "game" && introT < 2) || time - lastInput < 2.5 ||
    (screen === "room" && roomBusy()) || (screen === "chapters" && chapVel);
  if (busy || frameNo % 3 === 0) {
    try { render(); } catch (e) { resize(); if (!frameError) { frameError = true; console.error(e); } }   // resize() also resets the drawing state
  }
  requestAnimationFrame(frame);
}

/* ---------- start ---------- */
// Game sounds should behave like sound effects on an iPhone: quiet when the silent switch
// is on, and never stopping music she is playing in another app.
try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) { /* older phones: nothing to set */ }
nameInput.value = S.names[S.hero] || "";
nameInput.placeholder = CATS[S.hero].name;
resize();
screen = S.setup ? "home" : "mycat";      // first visit: pick and name your cat
layout();
requestAnimationFrame(frame);
document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });   // keeps the time played
fileInput.addEventListener("change", () => gotFile(fileInput.files && fileInput.files[0]));

// Ask the phone to keep this game's saved data even when space runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { /* fine either way */ });

// A gentle nudge, at most once a day on the home screen, when she has played a fair
// amount since her last save (25 levels or more, or a week with any new levels).
function maybeRemindSave() {
  const done = Object.keys(S.stars).length, since = done - (S.saved.levels || 0);
  if (!S.setup || S.saved.reminded === todayKey() || since < 1) return;
  const week = !S.saved.at || Date.now() - S.saved.at > 7 * 86400000;
  if (since >= 25 || (week && since >= 5)) { S.saved.reminded = todayKey(); save(); toast(t("save_remind")); }
}
setTimeout(maybeRemindSave, 1500);

// On a real https address, keep a copy on the phone so it opens with no internet.
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => { /* still playable online */ });
}
