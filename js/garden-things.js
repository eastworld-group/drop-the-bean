"use strict";
/* ==================================================================
   DROP THE BEAN - the Garden's things, each drawn around its anchor
   at 0,0 in room units (standing things stand on 0 and go up).
=================================================================== */

// The string the lights hang on: from one side of the garden to the other, with a gentle sag.
const lampAt = v => [-170 + v * 340, 10 + Math.sin(v * Math.PI) * 30];
function lampString(col) {
  ctx.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = lampAt(i / 20); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  fs(null, col, 2);
}
function canopy(cx, cy, r, fill, dark) {
  for (const [dx, dy, k] of [[-0.5, 0.2, 0.62], [0.5, 0.2, 0.62], [0, -0.3, 0.75], [0, 0.25, 0.7]]) { oval(cx + dx * r, cy + dy * r, r * k, r * k * 0.9); fs(fill, dark, 2.6); }
  for (const [dx, dy, k] of [[-0.5, 0.2, 0.62], [0.5, 0.2, 0.62], [0, -0.3, 0.75], [0, 0.25, 0.7]]) { oval(cx + dx * r, cy + dy * r, r * k - 1.5, r * k * 0.9 - 1.5); fs(fill); }
}
function trunk() {
  poly([[-12, 0], [12, 0], [8, -170], [-8, -170]]); fs("#B07A48", "#6B4523", 2.8);
  line([[4, -110], [34, -142]], "#6B4523", 9); line([[4, -110], [34, -142]], "#B07A48", 5);     // a branch to sit on
}
function fence(post, rail, dark, pointed) {
  for (const y of [-44, -18]) { rr(0, y, RW, 7, 2); fs(rail, dark, 2); }
  for (let x = 6; x < RW; x += 24) {
    if (pointed) { poly([[x, 0], [x + 14, 0], [x + 14, -54], [x + 7, -62], [x, -54]]); fs(post, dark, 2.2); }
    else { rr(x, -58, 14, 58, 3); fs(post, dark, 2.2); }
  }
}
function birdPole(h) { rr(-4, -h, 8, h, 2); fs("#B07A48", "#6B4523", 2.2); }
function littleBird(x, y, col) {
  oval(x, y, 7, 5.5); fs(col, "#1F57B0", 1.6); oval(x - 5, y - 4, 4, 4); fs(col, "#1F57B0", 1.6);
  poly([[x - 9, y - 4], [x - 12, y - 3], [x - 9, y - 2]]); fs("#FFB13D");
  ctx.fillStyle = INK; oval(x - 6, y - 5, 1, 1); ctx.fill();
}

Object.assign(THINGS, {
  gf_white: () => fence("#FFFFFF", "#F1F1F6", "#9AA7C9", true),
  gf_wood: () => fence("#D9A86C", "#C08A50", "#8A5A2E", false),
  gf_hedge: () => {
    rr(0, -58, RW, 60, 24); fs("#5FB85A", "#2F7D32", 2.6);
    ctx.fillStyle = "#79CC6A"; for (let x = 10; x < RW; x += 26) { oval(x, -46 + (x % 3) * 6, 9, 7); ctx.fill(); }
    ctx.fillStyle = "#FFFFFF"; for (let x = 30; x < RW; x += 70) { oval(x, -38, 3, 3); ctx.fill(); }
  },
  gf_bamboo: () => {
    for (let x = 4; x < RW; x += 12) { rr(x, -60, 10, 60, 4); fs("#D9C46A", "#8A7A2A", 1.8); line([[x + 1, -40], [x + 9, -40]], "#8A7A2A", 1.6); line([[x + 1, -18], [x + 9, -18]], "#8A7A2A", 1.6); }
    rr(0, -46, RW, 5, 2); fs("#8A5A2E");
  },
  gl_bulbs: () => {
    lampString("#4A4A63");
    const cols = ["#FFD84D", "#FF8FB3", "#8CC4FF", "#9BE38A"];
    for (let i = 1; i < 14; i++) {
      const [x, y] = lampAt(i / 14);
      glow(x, y + 6, 10, "rgba(255, 230, 150, 0.45)");
      oval(x, y + 6, 4, 5); fs(cols[i % 4], "#4A4A63", 1.4);
    }
  },
  gl_paper: () => {
    lampString("#8A6A4A");
    const cols = [["#FF9D8A", "#C2513D"], ["#FFE08A", "#C9A227"], ["#FFB7C5", "#C2456E"]];
    for (let i = 1; i < 7; i++) {
      const [x, y] = lampAt(i / 7), sw = wob(0.8, i) * 0.06, [f, d] = cols[i % 3];
      ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
      line([[0, 0], [0, 6]], d, 1.6); oval(0, 16, 9, 11); fs(f, d, 2); line([[-9, 16], [9, 16]], d, 1.2);
      ctx.restore();
    }
  },
  gl_star: () => {
    lampString("#8A6A4A");
    for (let i = 1; i < 5; i++) {                                // star lanterns, each with two little tails
      const [x, y] = lampAt(i / 5), col = ["#F4877A", "#FFD45E", "#7FB2E5", "#8FD47E"][i - 1];
      line([[x, y], [x, y + 6]], "#8A6A4A", 1.6);
      glow(x, y + 20, 18, "rgba(255, 230, 150, 0.4)");
      starPath(x, y + 20, 13, 0.5); fs(col, "#8A3A3A", 2);
      line([[x - 4, y + 30], [x - 6, y + 42]], col, 2); line([[x + 4, y + 30], [x + 6, y + 42]], col, 2);
    }
  },
  gt_round: () => { trunk(); canopy(0, -210, 62, "#6CC35E", "#2F7D32"); },
  gt_mango: () => {
    trunk(); canopy(0, -210, 64, "#4FA35B", "#22663A");
    for (const [x, y] of [[-30, -190], [10, -176], [34, -206], [-8, -228], [-44, -214]]) { ctx.beginPath(); ctx.ellipse(x, y, 5, 7, 0.3, 0, Math.PI * 2); fs("#FFC23D", "#C97E1A", 1.6); }
  },
  gt_cherry: () => {
    trunk(); canopy(0, -210, 62, "#FFC2D6", "#D46A8E");
    ctx.fillStyle = "#FF8FB3"; for (let i = 0; i < 14; i++) { oval(-50 + (i * 37) % 100, -250 + (i * 23) % 80, 3, 3); ctx.fill(); }
  },
  gt_house: () => {
    trunk(); canopy(0, -230, 64, "#6CC35E", "#2F7D32");
    rr(-6, -172, 76, 8, 2); fs("#C08A50", "#8A5A2E", 2.2);                  // the platform and a little house
    rr(30, -206, 36, 34, 3); fs("#FF9D8A", "#B5574A", 2.2);
    poly([[26, -206], [48, -226], [70, -206]]); fs("#C26A5E", "#8A3A32", 2.2);
    rr(42, -196, 12, 24, 5); fs("#5C3A1B");
    for (let y = -160; y < -6; y += 14) line([[-14, y], [-24, y + 4]], "#8A5A2E", 2.4);      // a ladder up the trunk
    line([[-26, -164], [-26, -2]], "#8A5A2E", 2.4);
  },
  gh_box: () => { birdPole(96); rr(-18, -128, 36, 34, 4); fs("#8CC4FF", "#2F6AB0", 2.4); oval(0, -112, 5, 5); fs("#1F2E4A"); rr(-20, -132, 40, 6, 2); fs("#2F6AB0"); },
  gh_house: () => {
    birdPole(90); rr(-20, -118, 40, 30, 3); fs("#FFE08A", "#C9A227", 2.4);
    poly([[-26, -118], [0, -138], [26, -118]]); fs("#F4A08E", "#B5574A", 2.4);
    oval(0, -104, 5, 5); fs("#5C3A1B"); littleBird(14, -142, "#8CC4FF");
  },
  gh_bath: () => {
    rr(-6, -44, 12, 44, 3); fs("#E3DED4", "#9A9080", 2.2); rr(-14, -6, 28, 6, 2); fs("#E3DED4", "#9A9080", 2);
    oval(0, -46, 26, 7); fs("#E3DED4", "#9A9080", 2.4); oval(0, -47, 20, 4.5); fs("#8CC4FF");
    littleBird(12 + wob(0.7) * 2, -56, "#FFB3C6");
  },
});

function bedSoil() { rr(-60, -14, 120, 16, 7); fs("#8A5A2E", "#5C3A1B", 2.2); }
function stems(n, each) { for (let i = 0; i < n; i++) { const x = -50 + i * (100 / (n - 1)), h = 22 + (i % 3) * 6; line([[x, -10], [x + wob(0.6, i) * 1.5, -10 - h]], "#2F7D32", 2.4); each(x + wob(0.6, i) * 1.5, -10 - h, i); } }
function hammock(fabric, dark, stripes) {
  for (const d of [-1, 1]) { line([[d * 66, 0], [d * 58, -58]], "#8A5A2E", 5); line([[d * 66, 0], [d * 58, -58]], "#C08A50", 2.4); }
  line([[-70, 0], [70, 0]], "#8A5A2E", 5);
  const sway = wob(0.5) * 2;
  ctx.beginPath(); ctx.moveTo(-58, -52); ctx.quadraticCurveTo(0 + sway, -6, 58, -52); ctx.quadraticCurveTo(0 + sway, -22, -58, -52); ctx.closePath();
  if (stripes) {
    ctx.save(); ctx.clip();
    stripes.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(-60, -56 + i * (50 / stripes.length), 120, 50 / stripes.length + 1); });
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-58, -52); ctx.quadraticCurveTo(0 + sway, -6, 58, -52); ctx.quadraticCurveTo(0 + sway, -22, -58, -52); ctx.closePath(); fs(null, dark, 2.4);
  } else fs(fabric, dark, 2.4);
}
function pond(lily, koi) {
  oval(0, 0, 70, 24); fs("#B9AE9C", "#8A7E6C", 2.4);
  oval(0, 0, 62, 19); fs("#7FC6E8", "#2F7FA8", 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 1.6;
  const rip = S.calm ? 0.5 : (time * 0.3) % 1;                          // one slow ripple (calm: still)
  ctx.globalAlpha = 1 - rip; oval(-18, -2, 6 + rip * 14, 2 + rip * 5); ctx.stroke(); ctx.globalAlpha = 1;
  if (lily) for (const [x, y, r] of [[22, -4, 9], [-30, 5, 7], [6, 8, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0.4, Math.PI * 2); ctx.lineTo(x, y); ctx.closePath(); fs("#6CC35E", "#2F7D32", 1.6); }
  if (lily) { oval(22, -6, 3.5, 3.5); fs("#FFB3C6", "#D46A8E", 1.2); }
  if (koi) for (const [k, col] of [[0, "#FF8A3D"], [2.5, "#FFFFFF"]]) {
    const a = S.calm ? k : time * 0.5 + k, fx = Math.cos(a) * 36, fy = Math.sin(a) * 9;
    fishShape(fx, fy, 6, Math.sin(a) > 0 ? -1 : 1); fs(col, "#C25E12", 1.4);
  }
}
Object.assign(THINGS, {
  gb_daisy: () => { bedSoil(); stems(6, (x, y) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; oval(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 3); fs("#FFFFFF", "#C9C2DE", 1); } oval(x, y, 2.6, 2.6); fs("#FFD23F"); }); },
  gb_tulip: () => { bedSoil(); stems(6, (x, y, i) => { ctx.beginPath(); ctx.moveTo(x - 5, y + 2); ctx.lineTo(x - 5, y - 6); ctx.lineTo(x - 2, y - 3); ctx.lineTo(x, y - 8); ctx.lineTo(x + 2, y - 3); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x + 5, y + 2); ctx.closePath(); fs(["#FF6B6B", "#FFD23F", "#FF8FB3"][i % 3], "#9E1F2E", 1.4); }); },
  gb_sun: () => { bedSoil(); stems(4, (x, y) => { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; oval(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 3.2, 3.2); fs("#FFD23F", "#D9920C", 1); } oval(x, y, 4.5, 4.5); fs("#8A5A2E"); }); },
  gb_rose: () => {
    bedSoil();
    for (let i = 0; i < 7; i++) { oval(-48 + i * 16, -20 - (i % 2) * 6, 10, 8); fs("#4FA35B", "#22663A", 1.6); }
    for (let i = 0; i < 6; i++) { oval(-42 + i * 17, -26 - (i % 2) * 7, 4.5, 4.5); fs(i % 2 ? "#FF5C8A" : "#FF8A8A", "#B8234F", 1.4); }
  },
  gn_wood: () => {
    for (const x of [-44, 38]) { rr(x, -26, 6, 26, 2); fs("#8A5A2E"); }
    rr(-50, -30, 100, 8, 3); fs("#D9A86C", "#8A5A2E", 2.2);
    for (const y of [-52, -42]) { rr(-48, y, 96, 7, 3); fs("#D9A86C", "#8A5A2E", 2); }
    for (const x of [-44, 38]) { rr(x, -54, 6, 26, 2); fs("#8A5A2E"); }
  },
  gn_iron: () => {
    ctx.strokeStyle = "#3E4A7A"; ctx.lineWidth = 3;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 46, 0); ctx.quadraticCurveTo(d * 40, -16, d * 46, -28); ctx.stroke(); ctx.beginPath(); ctx.arc(d * 44, -50, 6, 0, Math.PI * 2); ctx.stroke(); }
    for (let x = -42; x < 46; x += 12) { rr(x, -32, 9, 6, 2); fs("#FFFFFF", "#3E4A7A", 1.6); rr(x, -56, 9, 22, 3); fs("#FFFFFF", "#3E4A7A", 1.6); }
  },
  gn_swing: () => {
    for (const d of [-1, 1]) { line([[d * 50, 0], [d * 44, -56]], "#8A5A2E", 5); }
    line([[-48, -56], [48, -56]], "#8A5A2E", 5);
    const sw = wob(0.6) * 0.04;
    ctx.save(); ctx.translate(0, -56); ctx.rotate(sw);
    for (const x of [-34, 34]) line([[x, 0], [x, 30]], "#C9A27A", 1.6);
    rr(-38, 26, 76, 8, 3); fs("#FFB7C5", "#C2456E", 2.2); rr(-38, 10, 76, 16, 4); fs("#FFE3EE", "#C2456E", 2);
    ctx.restore();
  },
  gp_small: () => pond(false, false),
  gp_lily: () => pond(true, false),
  gp_koi: () => pond(true, true),
  gm_rope: () => hammock("#F4E3C4", "#A68A64", null),
  gm_stripe: () => hammock("", "#2F6AB0", ["#FFFFFF", "#8CC4FF", "#FFFFFF", "#8CC4FF", "#FFFFFF"]),
  gm_rainbow: () => hammock("", "#8A3A6A", ["#FF8A8A", "#FFB066", "#FFE08A", "#9BE38A", "#8CC4FF", "#C2A5FF"]),
  gpt_fern: () => { for (let i = 0; i < 6; i++) leaf(0, -24, 26 - Math.abs(i - 2.5) * 3, 6, -Math.PI / 2 + (i - 2.5) * 0.42 + wob(0.6, i) * 0.03, "#5DBB63", "#2F7D32"); pot(30, 24, "#E07A5F", "#A6452D"); },
  gpt_cactus: () => { rr(-8, -56, 16, 36, 8); fs("#7BC86C", "#2F7D32", 2.4); rr(-18, -44, 8, 16, 4); fs("#7BC86C", "#2F7D32", 2); rr(10, -48, 8, 14, 4); fs("#7BC86C", "#2F7D32", 2); oval(0, -58, 4, 4); fs("#FF7EB6", "#B02567", 1.6); pot(30, 22, "#F2C14E", "#A8730A"); },
  gpt_bamboo: () => { for (const [x, h] of [[-8, 56], [0, 64], [8, 50]]) { rr(x - 3, -h, 6, h - 20, 2); fs("#9BCB5A", "#4F7A2A", 1.6); leaf(x, -h + 4, 12, 4, -0.6 + x * 0.05, "#7ED36B", "#2F7D32"); } pot(32, 22, "#FFFFFF", "#9AA7C9"); },
  gy_ball: () => { oval(0, -10, 10, 10); fs("#F4877A", "#B04A40", 2.2); ctx.save(); oval(0, -10, 10, 10); ctx.clip(); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-10, -12, 20, 4); ctx.restore(); },
  gy_tunnel: () => { rr(-26, -20, 52, 20, 10); fs("#C7A8EE", "#7A5BB0", 2.4); for (let x = -18; x < 26; x += 9) line([[x, -19], [x, -1]], "#A98AD8", 1.6); oval(-26, -10, 6, 10); fs("#4A3878", "#7A5BB0", 2); },
  gy_butterfly: () => {
    line([[-14, 0], [-14, -22]], "#8A5A2E", 2.2); line([[-14, -22], [6, -30]], "#8A5A2E", 1.4);       // a wand with a butterfly on a string
    const flap = S.calm ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(time * 4));
    ctx.save(); ctx.translate(8, -22 + wob(1.2) * 2);
    for (const d of [-1, 1]) { ctx.save(); ctx.scale(d * flap, 1); oval(5, -3, 6, 5); fs("#FFB066", "#C25E12", 1.4); oval(4, 4, 4, 3.5); fs("#FFD23F", "#C25E12", 1.2); ctx.restore(); }
    oval(0, 0, 1.6, 5); fs("#4A2A12"); ctx.restore();
  },
});
Object.assign(PREVIEW_BOX, { gf_white: [0, -64, 120, 68], gf_wood: [0, -64, 120, 68], gf_hedge: [0, -64, 120, 68], gf_bamboo: [0, -64, 120, 68],
  gl_bulbs: [-90, 0, 120, 64], gl_paper: [-90, 0, 120, 64], gl_star: [-110, 0, 130, 64],
  gp_small: [-74, -40, 148, 80], gp_lily: [-74, -40, 148, 80], gp_koi: [-74, -40, 148, 80], gy_ball: [-18, -26, 36, 30] });
