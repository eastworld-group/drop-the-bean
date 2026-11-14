"use strict";
/* ==================================================================
   DROP THE BEAN - art: everything that gets drawn.
=================================================================== */

/* ---------- small shapes ---------- */
function addRR(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function rr(x, y, w, h, r) { ctx.beginPath(); addRR(x, y, w, h, r); }
function oval(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); }

function paw(x, y, s) {
  oval(x, y + s * 0.25, s * 0.42, s * 0.34); ctx.fill();
  [[-0.42, -0.2], [-0.15, -0.45], [0.15, -0.45], [0.42, -0.2]].forEach(([a, b]) => {
    oval(x + a * s, y + b * s, s * 0.14, s * 0.18); ctx.fill();
  });
}

function drawStar(cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.46 : r;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? "#FFD23F" : "#DCE4F5";
  ctx.strokeStyle = filled ? "#D9920C" : "#BCC8E4";
  ctx.lineWidth = Math.max(1.2, r * 0.12); ctx.lineJoin = "round";
  ctx.fill(); ctx.stroke();
}

function drawHeart(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.2, x - s * 0.25, y - s * 0.65, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.25, y - s * 0.65, x + s * 0.6, y - s * 0.2, x, y + s * 0.3);
  ctx.fill();
}

function drawCoin(x, y, r) {
  ctx.fillStyle = "#B8860B"; oval(x, y + r * 0.12, r, r); ctx.fill();
  ctx.fillStyle = "#FFD23F"; oval(x, y, r, r); ctx.fill();
  ctx.fillStyle = "#FFE98A"; oval(x, y, r * 0.74, r * 0.74); ctx.fill();
  ctx.fillStyle = "#D9920C"; paw(x, y - r * 0.04, r * 0.62);
}

// One simple shape per color, so color is never the only clue.
function drawShape(key, x, y, r) {
  ctx.beginPath();
  if (key === "k") ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (key === "g") { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1); } ctx.closePath(); }
  else if (key === "o") { ctx.moveTo(x, y - r * 1.1); ctx.lineTo(x + r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.05, y + r * 0.8); ctx.closePath(); }
  else if (key === "b") ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else if (key === "w") { ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 0.9, y); ctx.lineTo(x, y + r * 1.15); ctx.lineTo(x - r * 0.9, y); ctx.closePath(); }
  else if (key === "p") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.5 : r * 1.15; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); }
  else { ctx.rect(x - r * 0.35, y - r, r * 0.7, r * 2); ctx.rect(x - r, y - r * 0.35, r * 2, r * 0.7); }
  ctx.fill();
}

/* ---------- icons and buttons ---------- */
function drawIcon(icon, cx, cy, k, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3 * Math.max(0.8, k); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (icon === "pause") { rr(cx - 8 * k, cy - 9 * k, 6 * k, 18 * k, 2 * k); ctx.fill(); rr(cx + 2 * k, cy - 9 * k, 6 * k, 18 * k, 2 * k); ctx.fill(); }
  else if (icon === "restart") {
    ctx.beginPath(); ctx.arc(cx, cy, 10 * k, -0.3 * Math.PI, 1.35 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6 * k, cy - 13 * k); ctx.lineTo(cx + 9 * k, cy - 7 * k); ctx.lineTo(cx + 3 * k, cy - 5 * k); ctx.stroke();
  } else if (icon === "undo") {
    ctx.beginPath(); ctx.moveTo(cx - 9 * k, cy - 3 * k); ctx.lineTo(cx + 3 * k, cy - 3 * k);
    ctx.arc(cx + 3 * k, cy + 3 * k, 6 * k, -0.5 * Math.PI, 0.5 * Math.PI); ctx.lineTo(cx - 4 * k, cy + 9 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4 * k, cy - 8 * k); ctx.lineTo(cx - 9 * k, cy - 3 * k); ctx.lineTo(cx - 4 * k, cy + 2 * k); ctx.stroke();
  } else if (icon === "back") {
    ctx.beginPath(); ctx.moveTo(cx + 4 * k, cy - 9 * k); ctx.lineTo(cx - 5 * k, cy); ctx.lineTo(cx + 4 * k, cy + 9 * k); ctx.stroke();
  } else if (icon === "bulb") {
    oval(cx, cy - 3 * k, 8.5 * k, 8.5 * k); ctx.fill();
    rr(cx - 4.5 * k, cy + 5 * k, 9 * k, 6 * k, 2 * k); ctx.fill();
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2 * k;
    ctx.beginPath(); ctx.arc(cx, cy - 3 * k, 5 * k, 1.1 * Math.PI, 1.5 * Math.PI); ctx.stroke();
  } else if (icon === "clock") {
    ctx.lineWidth = 2.8 * k; oval(cx, cy + 1 * k, 9.5 * k, 9.5 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - 4.5 * k); ctx.lineTo(cx, cy + 1 * k); ctx.lineTo(cx + 4 * k, cy + 3 * k); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 9 * k, cy - 9 * k); ctx.lineTo(cx - 5 * k, cy - 12 * k); ctx.moveTo(cx + 9 * k, cy - 9 * k); ctx.lineTo(cx + 5 * k, cy - 12 * k); ctx.stroke();
  } else if (icon === "fish") {
    oval(cx - 2 * k, cy, 9 * k, 5.5 * k); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 5 * k, cy); ctx.lineTo(cx + 12 * k, cy - 6 * k); ctx.lineTo(cx + 12 * k, cy + 6 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; oval(cx - 6 * k, cy - 1.5 * k, 1.6 * k, 1.6 * k); ctx.fill();
  }
}

// A button is "pressed" while a finger rests on it, so it can dip down.
function pressedIn(x, y, w, h) {
  return !!press && !press.moved && press.x >= x && press.x <= x + w && press.y >= y && press.y <= y + h;
}

function roundButton(x, y, size, icon, onTap, o) {
  o = o || {};
  const down = !o.dim && pressedIn(x, y, size, size) ? 3 : 0;
  const cx = x + size / 2, cy = y + size / 2 + down;
  ctx.globalAlpha = o.dim ? 0.45 : 1;
  if (!down) { ctx.fillStyle = "#8FB4E3"; oval(cx, cy + 4, size / 2, size / 2); ctx.fill(); }
  ctx.fillStyle = "#FFFFFF"; oval(cx, cy, size / 2, size / 2); ctx.fill();
  drawIcon(icon, cx, cy, size / 44, o.color || INK);
  ctx.globalAlpha = 1;
  if (o.badge !== undefined) {
    const bx = x + size - 6, by = y + 6 + down, plus = o.badge === "+";
    ctx.fillStyle = plus ? "#2F9E5B" : INK; oval(bx, by, 11, 11); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.font = `800 13px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(o.badge), bx, by + 1);
  }
  if (!o.dim) buttons.push({ x: x - 4, y: y - 4, w: size + 8, h: size + 12, onTap });
}

function pillButton(x, y, w, h, label, onTap, primary, o) {
  o = o || {};
  const down = !o.dim && pressedIn(x, y, w, h) ? 4 : 0;
  ctx.globalAlpha = o.dim ? 0.5 : 1;
  if (!down) { rr(x, y + 5, w, h, h / 2); ctx.fillStyle = primary ? "#D4620A" : "#8FB4E3"; ctx.fill(); }
  rr(x, y + down, w, h, h / 2); ctx.fillStyle = primary ? "#FF8A1F" : (o.fill || "#E6EEFF"); ctx.fill();
  if (primary) { rr(x + 6, y + 4 + down, w - 12, h * 0.4, h * 0.2); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill(); }
  ctx.fillStyle = primary ? "#FFFFFF" : INK;
  let size = Math.round(h * (o.text || 0.38));
  ctx.font = `800 ${size}px ${FONT}`;
  while (size > 10 && ctx.measureText(label).width > w - 20) { size--; ctx.font = `800 ${size}px ${FONT}`; }   // long words shrink to fit
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1 + down);
  ctx.globalAlpha = 1;
  if (!o.dim) buttons.push({ x, y, w, h: h + 5, onTap });
}

function pill(x, y, w, h, fill) {
  rr(x, y + 3, w, h, h / 2); ctx.fillStyle = "#8FB4E3"; ctx.fill();
  rr(x, y, w, h, h / 2); ctx.fillStyle = fill || "#FFFFFF"; ctx.fill();
}

function card(x, y, w, h) {
  rr(x, y + 8, w, h, 28); ctx.fillStyle = "rgba(10,16,60,0.25)"; ctx.fill();
  rr(x, y, w, h, 28); ctx.fillStyle = "#FFFFFF"; ctx.fill();
}

function label(text, x, y, size, color, weight, align) {
  ctx.fillStyle = color || INK; ctx.font = `${weight || 800} ${size}px ${FONT}`;
  ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function logo(text, x, y, size) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1F57B0"; ctx.lineWidth = size * 0.3; ctx.strokeText(text, x, y + size * 0.09);
  ctx.strokeStyle = INK; ctx.lineWidth = size * 0.2; ctx.strokeText(text, x, y);
  ctx.fillStyle = "#FFFFFF"; ctx.fillText(text, x, y);
}

function drawBackground() {
  const TH = theme();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, TH.bg[0]); g.addColorStop(1, TH.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  for (let i = 0; i < 10; i++) {
    const x = ((i * 137 + 20) % 100) / 100 * W;
    const y = (((i * 71 + 30) % 100) / 100 * H + time * (4 + i % 3)) % (H + 60) - 30;
    oval(x, y, 16 + (i % 3) * 7, 10 + (i % 3) * 4, 0.6 + i); ctx.fill();
  }
}

/* ---------- hats ---------- */
function drawHat(id, hx, hy, hr) {
  const lw = Math.max(1.4, hr * 0.16);
  ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (id === "bow") {
    const bx = hx - hr * 0.6, by = hy - hr * 0.98;
    ctx.fillStyle = "#FF5C8A"; ctx.strokeStyle = "#B8234F";
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + d * hr * 0.55, by - hr * 0.34); ctx.lineTo(bx + d * hr * 0.55, by + hr * 0.34); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    oval(bx, by, hr * 0.16, hr * 0.16); ctx.fill(); ctx.stroke();
  } else if (id === "cap") {
    ctx.fillStyle = "#6C8CFF"; ctx.strokeStyle = "#2B3FA8";
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.72, hy - hr * 0.62);
    ctx.quadraticCurveTo(hx - hr * 0.2, hy - hr * 1.95, hx + hr * 0.55, hy - hr * 1.45);
    ctx.quadraticCurveTo(hx + hr * 1.0, hy - hr * 1.3, hx + hr * 1.05, hy - hr * 0.95);
    ctx.quadraticCurveTo(hx + hr * 0.6, hy - hr * 1.15, hx + hr * 0.72, hy - hr * 0.62);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; rr(hx - hr * 0.82, hy - hr * 0.82, hr * 1.64, hr * 0.32, hr * 0.16); ctx.fill(); ctx.stroke();
    oval(hx + hr * 1.08, hy - hr * 0.86, hr * 0.2, hr * 0.2); ctx.fill(); ctx.stroke();
  } else if (id === "flower") {
    const fx = hx + hr * 0.62, fy = hy - hr * 0.9;
    ctx.fillStyle = "#FF8FB3"; ctx.strokeStyle = "#C2416E";
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; oval(fx + Math.cos(a) * hr * 0.24, fy + Math.sin(a) * hr * 0.24, hr * 0.2, hr * 0.2); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "#FFD23F"; oval(fx, fy, hr * 0.17, hr * 0.17); ctx.fill();
  } else if (id === "party") {
    ctx.fillStyle = "#FF6FA5"; ctx.strokeStyle = "#B02567";
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.44, hy - hr * 0.76); ctx.lineTo(hx + hr * 0.04, hy - hr * 1.98); ctx.lineTo(hx + hr * 0.52, hy - hr * 0.72); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#FFE35A"; ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.2, hy - hr * 1.2); ctx.lineTo(hx + hr * 0.3, hy - hr * 1.1);
    ctx.moveTo(hx - hr * 0.06, hy - hr * 1.6); ctx.lineTo(hx + hr * 0.18, hy - hr * 1.55); ctx.stroke();
    ctx.fillStyle = "#FFE35A"; ctx.strokeStyle = "#B8860B"; ctx.lineWidth = lw * 0.8;
    oval(hx + hr * 0.04, hy - hr * 2.0, hr * 0.16, hr * 0.16); ctx.fill(); ctx.stroke();
  } else if (id === "crown") {
    ctx.fillStyle = "#FFD23F"; ctx.strokeStyle = "#B8860B";
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.56, hy - hr * 0.72); ctx.lineTo(hx - hr * 0.64, hy - hr * 1.42); ctx.lineTo(hx - hr * 0.28, hy - hr * 1.05);
    ctx.lineTo(hx, hy - hr * 1.58); ctx.lineTo(hx + hr * 0.28, hy - hr * 1.05); ctx.lineTo(hx + hr * 0.64, hy - hr * 1.42);
    ctx.lineTo(hx + hr * 0.56, hy - hr * 0.72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FF5C8A"; oval(hx, hy - hr * 0.98, hr * 0.11, hr * 0.11); ctx.fill();
    ctx.fillStyle = "#5AA9FF"; oval(hx - hr * 0.36, hy - hr * 0.92, hr * 0.08, hr * 0.08); ctx.fill(); oval(hx + hr * 0.36, hy - hr * 0.92, hr * 0.08, hr * 0.08); ctx.fill();
  }
}

/* ------------------------------------------------------------------
   A cat. wake = 0: asleep, curled up like a bean.
          wake = 1: awake, sitting up, tail wagging, little hops.
   Values in between blend the two poses, so cats visibly wake up.
------------------------------------------------------------------- */
function drawCat(cx, cy, s, key, o) {
  o = o || {};
  const C = CATS[key], mk = C.mark;
  const tt = time + (o.seed || 0);
  const w = clamp01(o.wake || 0);
  const lw = Math.max(1.6, s * 0.042);
  const hop = w > 0.9 && !o.still ? Math.abs(Math.sin(tt * 8)) * s * 0.07 : 0;
  const whiteParts = mk === "tux" || mk === "tabbytux";
  ctx.save();
  ctx.translate(cx, cy);
  if (o.scale !== undefined || o.sx) ctx.scale((o.scale === undefined ? 1 : o.scale) * (o.sx || 1), (o.scale === undefined ? 1 : o.scale) * (o.sy || 1));
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  if (!o.noShadow) { ctx.fillStyle = "rgba(30, 40, 100, 0.16)"; oval(s * 0.02, s * 0.37, s * 0.34, s * 0.075); ctx.fill(); }
  ctx.translate(0, -hop);

  const breathe = 1 + Math.sin(tt * 2.2) * 0.022 * (1 - w);
  const bx = lerp(0.06, 0, w) * s, by = lerp(0.1, 0.17, w) * s;
  const brx = lerp(0.34, 0.26, w) * s, bry = lerp(0.27, 0.22, w) * s;
  const hx = lerp(-0.09, 0, w) * s, hy = lerp(-0.09, -0.13, w) * s, hr = lerp(0.245, 0.27, w) * s;

  const tail = () => {
    const wag = Math.sin(tt * 9) * 0.06 * w;
    const p = (a, b) => lerp(a, b, w) * s;
    const ex = p(-0.2, 0.38) + wag * s, ey = p(0.29, -0.12);
    ctx.beginPath();
    ctx.moveTo(p(0.36, 0.2), p(0.06, 0.3));
    ctx.bezierCurveTo(p(0.44, 0.42), p(0.38, 0.3), p(0.0, 0.5), p(0.44, 0.02), ex, ey);
    ctx.strokeStyle = C.dark; ctx.lineWidth = s * 0.15; ctx.stroke();
    ctx.strokeStyle = C.tail || C.fur; ctx.lineWidth = s * 0.15 - lw * 2; ctx.stroke();
    if (C.tip) { ctx.fillStyle = C.tip; oval(ex, ey, (s * 0.15 - lw * 2) / 2, (s * 0.15 - lw * 2) / 2); ctx.fill(); }
  };

  const body = () => {
    ctx.save();
    ctx.translate(bx, by); ctx.scale(breathe, breathe);
    oval(0, 0, brx, bry); ctx.fillStyle = C.fur; ctx.fill();
    ctx.save(); ctx.clip();
    if (mk === "tabby" || mk === "tabbytux") {
      ctx.strokeStyle = C.stripe || C.dark; ctx.lineWidth = s * 0.05;
      [-1.05, -0.6, -0.15, 0.3].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * brx, Math.sin(a) * bry);
        ctx.lineTo(Math.cos(a) * brx * 0.58, Math.sin(a) * bry * 0.58);
        ctx.stroke();
      });
    }
    if (mk === "belly") { ctx.fillStyle = C.light; oval(0, bry * 0.45, brx * 0.62, bry * 0.55); ctx.fill(); }
    if (mk === "patch") { ctx.fillStyle = "#FFCB7A"; oval(brx * 0.5, -bry * 0.35, brx * 0.42, bry * 0.45, 0.5); ctx.fill(); }
    if (mk === "points") { ctx.fillStyle = C.light; oval(0, bry * 0.1, brx * 0.62, bry * 0.66); ctx.fill(); }
    if (whiteParts) { ctx.fillStyle = C.light; oval(lerp(-0.35, 0, w) * brx, bry * 0.4, brx * 0.5, bry * 0.62); ctx.fill(); }
    ctx.restore();
    oval(0, 0, brx, bry); ctx.strokeStyle = C.dark; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
  };

  if (w < 0.5) { body(); tail(); } else { tail(); body(); }

  // front paws show once the cat sits up
  if (w > 0.5) {
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * (w - 0.5) * 2;
    for (const d of [-1, 1]) {
      oval(d * s * 0.1, by + bry * 0.86, s * 0.075, s * 0.05);
      ctx.fillStyle = whiteParts ? C.light : C.fur; ctx.fill();
      ctx.strokeStyle = C.dark; ctx.lineWidth = lw; ctx.stroke();
    }
    ctx.globalAlpha = a0;
  }

  // ears (they perk up when awake)
  for (const d of [-1, 1]) {
    const tipY = hy - hr * (1.36 + 0.1 * w);
    ctx.beginPath();
    ctx.moveTo(hx + d * hr * 0.98, hy - hr * 0.2);
    ctx.lineTo(hx + d * hr * 0.8, tipY);
    ctx.lineTo(hx + d * hr * 0.08, hy - hr * 0.84);
    ctx.closePath();
    ctx.fillStyle = C.ear || C.fur; ctx.fill();
    ctx.strokeStyle = C.dark; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + d * hr * 0.8, hy - hr * 0.5);
    ctx.lineTo(hx + d * hr * 0.74, tipY + hr * 0.3);
    ctx.lineTo(hx + d * hr * 0.36, hy - hr * 0.78);
    ctx.closePath();
    ctx.fillStyle = "#FF9DB5"; ctx.fill();
  }
  if (C.sprout) {
    ctx.strokeStyle = C.dark; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(hx, hy - hr * 0.9); ctx.lineTo(hx, hy - hr * 1.3); ctx.stroke();
    for (const d of [-1, 1]) {
      oval(hx + d * hr * 0.2, hy - hr * 1.38, hr * 0.22, hr * 0.12, d * -0.5);
      ctx.fillStyle = "#A6F07F"; ctx.fill(); ctx.stroke();
    }
  }
  // head
  oval(hx, hy, hr * 1.08, hr * 0.94); ctx.fillStyle = C.fur; ctx.fill();
  ctx.save(); ctx.clip();
  if (mk === "tabby" || mk === "tabbytux") {
    ctx.strokeStyle = C.stripe || C.dark; ctx.lineWidth = s * 0.04;
    [-0.32, 0, 0.32].forEach(k => {
      ctx.beginPath(); ctx.moveTo(hx + k * hr, hy - hr); ctx.lineTo(hx + k * hr * 0.8, hy - hr * 0.52); ctx.stroke();
    });
  }
  if (mk === "patch") { ctx.fillStyle = "#FFCB7A"; oval(hx + hr * 0.62, hy - hr * 0.42, hr * 0.5, hr * 0.5); ctx.fill(); }
  if (mk === "points") { ctx.fillStyle = C.light; oval(hx, hy + hr * 0.45, hr * 0.62, hr * 0.48); ctx.fill(); }
  if (mk === "belly") { ctx.fillStyle = C.light; oval(hx, hy + hr * 0.52, hr * 0.5, hr * 0.36); ctx.fill(); }
  if (whiteParts) {                          // white muzzle; Bean also has a white blaze up the nose
    ctx.fillStyle = C.light;
    oval(hx, hy + hr * 0.6, hr * 0.66, hr * 0.5); ctx.fill();
    if (mk === "tux") { oval(hx, hy - hr * 0.12, hr * 0.17, hr * 0.62); ctx.fill(); }
  }
  ctx.fillStyle = "rgba(255,255,255,0.32)"; oval(hx - hr * 0.42, hy - hr * 0.5, hr * 0.3, hr * 0.14, -0.5); ctx.fill();
  ctx.restore();
  oval(hx, hy, hr * 1.08, hr * 0.94); ctx.strokeStyle = C.dark; ctx.lineWidth = lw; ctx.stroke();

  // blush
  ctx.fillStyle = "rgba(255, 105, 140, 0.42)";
  for (const d of [-1, 1]) { oval(hx + d * hr * 0.66, hy + hr * 0.4, hr * 0.2, hr * 0.12); ctx.fill(); }

  // eyes: closed curves asleep, big and shiny awake
  ctx.lineWidth = lw * 1.1;
  const open = clamp01((w - 0.4) / 0.4);
  for (const d of [-1, 1]) {
    const ex = hx + d * hr * 0.42, ey = hy + hr * 0.1;
    if (open <= 0) {
      ctx.strokeStyle = C.lid || C.face;
      ctx.beginPath(); ctx.arc(ex, ey - hr * 0.1, hr * 0.2, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
    } else {
      oval(ex, ey, hr * 0.17, hr * 0.21 * Math.max(0.15, open)); ctx.fillStyle = C.eye || C.face; ctx.fill();
      if (C.eye) { oval(ex, ey, hr * 0.085, hr * 0.17 * Math.max(0.15, open)); ctx.fillStyle = C.dark; ctx.fill(); }
      if (open > 0.6) {
        ctx.fillStyle = "#FFFFFF";
        oval(ex + hr * 0.05, ey - hr * 0.08, hr * 0.07, hr * 0.07); ctx.fill();
        oval(ex - hr * 0.06, ey + hr * 0.07, hr * 0.035, hr * 0.035); ctx.fill();
      }
    }
  }
  // nose and mouth
  ctx.fillStyle = "#FF6F8E";
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.1, hy + hr * 0.34); ctx.lineTo(hx + hr * 0.1, hy + hr * 0.34); ctx.lineTo(hx, hy + hr * 0.47);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.face; ctx.lineWidth = lw * 0.8;
  if (open > 0.6) {
    ctx.beginPath(); ctx.arc(hx, hy + hr * 0.52, hr * 0.16, 0, Math.PI); ctx.closePath();
    ctx.fillStyle = "#D1345B"; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(hx - hr * 0.1, hy + hr * 0.5, hr * 0.1, 0, Math.PI * 0.9);
    ctx.moveTo(hx + hr * 0.2, hy + hr * 0.5);
    ctx.arc(hx + hr * 0.1, hy + hr * 0.5, hr * 0.1, 0, Math.PI * 0.9);
    ctx.stroke();
  }
  if (o.hat) drawHat(o.hat, hx, hy, hr);
  ctx.restore();
}
const hatFor = key => (key === S.hero ? S.hat : "");

/* ---------- a cat hiding under a blanket ---------- */
function drawBlanket(cx, cy, s, seed) {
  const br = 1 + Math.sin((time + seed) * 2.2) * 0.02;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(30, 40, 100, 0.16)"; oval(0, s * 0.36, s * 0.38, s * 0.08); ctx.fill();
  ctx.scale(br, br);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.32);
    ctx.quadraticCurveTo(-s * 0.44, -s * 0.2, -s * 0.2, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.15, -s * 0.42, -s * 0.06, -s * 0.24);
    ctx.quadraticCurveTo(s * 0.03, -s * 0.42, s * 0.1, -s * 0.22);
    ctx.quadraticCurveTo(s * 0.46, -s * 0.18, s * 0.4, s * 0.32);
    ctx.closePath();
  };
  shape(); ctx.fillStyle = "#C2B0F2"; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = "#DCD0FB"; ctx.lineWidth = s * 0.035;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * s * 0.16 - s * 0.3, -s * 0.5); ctx.lineTo(i * s * 0.16 + s * 0.3, s * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * s * 0.16 + s * 0.3, -s * 0.5); ctx.lineTo(i * s * 0.16 - s * 0.3, s * 0.5); ctx.stroke();
  }
  ctx.fillStyle = "#EDE6FF"; ctx.fillRect(-s * 0.5, s * 0.2, s, s * 0.2);
  ctx.restore();
  shape(); ctx.strokeStyle = "#6A55B0"; ctx.lineWidth = Math.max(1.6, s * 0.042); ctx.lineJoin = "round"; ctx.stroke();
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "#6A55B0"; ctx.lineWidth = s * 0.05;
  ctx.font = `900 ${Math.round(s * 0.32)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.strokeText("?", s * 0.02, s * 0.02); ctx.fillText("?", s * 0.02, s * 0.02);
  ctx.restore();
}

/* ---------- a gate around a cat: opens when the bed of its color is full ---------- */
function drawGate(cx, cy, s, key) {
  const C = CATS[key];
  const x = cx - s * 0.46, y = cy - s * 0.46, wd = s * 0.92;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [col, lwBar, lwFrame] of [[C.dark, s * 0.085, s * 0.11], [C.bed, s * 0.045, s * 0.06]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lwBar;
    for (const dx of [-0.17, 0.17]) { ctx.beginPath(); ctx.moveTo(cx + dx * s, y + 2); ctx.lineTo(cx + dx * s, y + wd - 2); ctx.stroke(); }
    ctx.lineWidth = lwFrame;
    rr(x, y, wd, wd, s * 0.2); ctx.stroke();
  }
  const r = Math.max(8, s * 0.15);
  ctx.fillStyle = C.dark; oval(cx, y + 1.5, r + 2, r + 2); ctx.fill();
  ctx.fillStyle = C.bed; oval(cx, y, r, r); ctx.fill();
  ctx.fillStyle = key === "w" ? INK : "#FFFFFF";
  if (S.shapes) drawShape(key, cx, y, r * 0.55); else paw(cx, y, r * 0.75);
}

/* ---------- beds ---------- */
function bedPath(ox, oy, cells, inset, radius) {
  const s = cell, has = (r, c) => cells.some(([a, b]) => a === r && b === c);
  ctx.beginPath();
  for (const [r, c] of cells) {
    const x = ox + c * s, y = oy + r * s;
    addRR(x + inset, y + inset, s - inset * 2, s - inset * 2, radius);
    const right = has(r, c + 1), down = has(r + 1, c);
    if (right) ctx.rect(x + s / 2, y + inset, s, s - inset * 2);
    if (down) ctx.rect(x + inset, y + s / 2, s - inset * 2, s);
    if (right && down && has(r + 1, c + 1)) ctx.rect(x + s / 2, y + s / 2, s, s);
  }
}
function bedCenter(bed, ox, oy) {
  const [mr, mc] = bed.cells.reduce((m, [r, c]) => [Math.max(m[0], r), Math.max(m[1], c)], [0, 0]);
  return [ox + (mc + 1) * cell / 2, oy + (mr + 1) * cell / 2];
}

function drawBed(bed, lifted, intro) {
  const key = skin(bed.color), C = CATS[key], s = cell;
  const going = bed.need === 0;
  const lt = going ? bed.leaveT : 0;
  const wake = going ? clamp01(lt / 0.3) : 0;
  const fade = going ? clamp01((lt - 0.65) / 0.3) : 0;
  let ox = gx + (bed.x + bed.nx) * s, oy = gy + (bed.y + bed.ny) * s - fade * s * 0.3;
  ctx.save();
  let grow = intro === undefined ? 1 : intro;
  if (going) grow *= 1 + Math.sin(clamp01(lt / 0.3) * Math.PI) * 0.1;
  grow *= 1 + bed.squash * 0.06;
  if (grow !== 1) {
    const [cx, cy] = bedCenter(bed, ox, oy);
    ctx.translate(cx, cy); ctx.scale(grow, grow); ctx.translate(-cx, -cy);
  }
  const alpha = 1 - fade;
  ctx.globalAlpha = alpha;
  const pad = s * 0.05, rim = Math.max(2.5, s * 0.06);
  ctx.fillStyle = "rgba(20, 28, 90, 0.3)";
  bedPath(ox, oy + (lifted ? 9 : 4), bed.cells, pad, s * 0.26); ctx.fill();
  if (lifted) oy -= 3;
  ctx.fillStyle = C.dark; bedPath(ox, oy, bed.cells, pad, s * 0.26); ctx.fill();
  ctx.fillStyle = C.bed; bedPath(ox, oy, bed.cells, pad + rim, s * 0.21); ctx.fill();
  ctx.fillStyle = C.bedIn || C.light; bedPath(ox, oy, bed.cells, pad + rim + s * 0.1, s * 0.15); ctx.fill();

  // one spot per cat this bed holds
  const done = bed.total - bed.need;
  bed.cells.forEach(([r, c], j) => {
    if (j >= bed.total) return;
    const cx = ox + (c + 0.5) * s, cy = oy + (r + 0.5) * s;
    const f = j < done ? bed.fills[j] : null;
    if (f && f.t >= 1) {
      const land = f.t < 1.3 ? Math.sin((f.t - 1) / 0.3 * Math.PI) * 0.14 : 0;        // squash as it lands
      drawCat(cx, cy + land * s * 0.2, s * 0.84, key, { seed: bed.id * 3 + j, wake, noShadow: true, sx: 1 + land, sy: 1 - land, hat: hatFor(key) });
    } else {
      ctx.globalAlpha = alpha * (S.shapes ? 0.75 : 0.45); ctx.fillStyle = C.bed;
      if (S.shapes) drawShape(key, cx, cy, s * 0.15); else paw(cx, cy, s * 0.24);
      ctx.globalAlpha = alpha;
      if (f) flying.push({ key, f, tx: cx, ty: cy, seed: bed.id * 3 + j });         // still hopping over: drawn above all beds
    }
  });

  if (!going) {
    const [r0, c0] = bed.cells[0];
    const rad = Math.max(10, s * 0.185);
    if (bed.axis) {                        // rails: arrows show the only way this bed slides
      const q = Math.max(5.5, s * 0.105);
      ctx.save();
      ctx.translate(ox + c0 * s + s * 0.3, oy + r0 * s + s * 0.24);
      if (bed.axis === "v") ctx.rotate(Math.PI / 2);
      rr(-q * 2.2, -q * 1.15, q * 4.4, q * 2.3, q * 1.15);
      ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = C.dark; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = key === "w" ? INK : C.dark;
      for (const d of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(d * q * 1.6, 0); ctx.lineTo(d * q * 0.45, -q * 0.7); ctx.lineTo(d * q * 0.45, q * 0.7); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    const bx2 = ox + (c0 + 1) * s - s * 0.25, by2 = oy + r0 * s + s * 0.25;
    const locked = isLocked(bed), child = beds.find(b => b.lock === bed.id);
    if (locked || child) {
      const [pc, pd] = pairOf(locked ? bed.id : child.id);
      if (locked) { ctx.fillStyle = "rgba(24, 30, 90, 0.38)"; bedPath(ox, oy, bed.cells, pad, s * 0.26); ctx.fill(); }
      ctx.fillStyle = pd; oval(bx2, by2 + 1.5, rad + 2, rad + 2); ctx.fill();
      ctx.fillStyle = pc; oval(bx2, by2, rad, rad); ctx.fill();
      ctx.strokeStyle = "#FFFFFF"; ctx.fillStyle = "#FFFFFF"; ctx.lineWidth = rad * 0.22; ctx.lineCap = "round";
      if (locked) {                        // padlock
        ctx.beginPath(); ctx.arc(bx2, by2 - rad * 0.15, rad * 0.3, Math.PI, 0); ctx.stroke();
        rr(bx2 - rad * 0.48, by2 - rad * 0.15, rad * 0.96, rad * 0.68, rad * 0.16); ctx.fill();
      } else {                             // key
        oval(bx2 - rad * 0.3, by2, rad * 0.24, rad * 0.24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx2 - rad * 0.05, by2); ctx.lineTo(bx2 + rad * 0.6, by2);
        ctx.moveTo(bx2 + rad * 0.3, by2); ctx.lineTo(bx2 + rad * 0.3, by2 + rad * 0.3);
        ctx.moveTo(bx2 + rad * 0.55, by2); ctx.lineTo(bx2 + rad * 0.55, by2 + rad * 0.3); ctx.stroke();
      }
    }
  }

  if (bed.need > 0) {                      // tag: how many cats it still needs
    const [tr, tc] = bed.cells[bed.cells.length - 1];
    const tx = ox + (tc + 1) * s - s * 0.2, ty = oy + (tr + 1) * s - s * 0.2, rad = Math.max(10, s * 0.19);
    ctx.fillStyle = C.dark; oval(tx, ty + 1.5, rad + 2.5, rad + 2.5); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; oval(tx, ty, rad, rad); ctx.fill();
    label(String(bed.need), tx, ty + 1, Math.round(rad * 1.4), key === "w" ? INK : C.dark);
  }
  ctx.restore();
}
