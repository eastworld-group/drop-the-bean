"use strict";
/* ==================================================================
   DROP THE BEAN - the Kitchen's things, each drawn around its anchor
   at 0,0 in room units (standing things stand on 0 and go up).
=================================================================== */

// A jar standing on 0,0: glass, its contents, a lid.
function jar(x, w, h, inside, lid) {
  rr(x - w / 2, -h, w, h, 5); fs("rgba(214, 238, 255, 0.85)", "#7FA6C9", 2.2);
  rr(x - w / 2 + 3, -h * 0.62, w - 6, h * 0.62 - 3, 3); fs(inside);
  rr(x - w / 2 - 2, -h - 6, w + 4, 7, 3); fs(lid, "#8A5A2E", 2);
}
function fridge(body, dark, retro) {
  const r = retro ? 22 : 8;
  rr(-36, -188, 72, 188, r); fs(body, dark, 3);
  line([[-34, -120], [34, -120]], dark, 2.6);
  for (const [y0, y1] of [[-176, -132], [-108, -40]]) { rr(22, y0, 6, y1 - y0, 3); fs("#FFFFFF", dark, 2); }
  rr(-30, -14, 60, 10, 4); fs(dark);                                                // the kick plate
  ctx.fillStyle = "#FF5C8A"; heartPath(-14, -150, 12); ctx.fill();                  // magnets
  ctx.fillStyle = "#FFD23F"; starPath(4, -94, 6); ctx.fill();
  rr(-24, -88, 20, 26, 2); fs("#FFFFFF", "#9AA7C9", 1.6);                           // a little drawing on paper
  ctx.fillStyle = "#FF8A1F"; paw(-14, -74, 9);
}

Object.assign(THINGS, {
  /* shelf: things standing on the board (0 is the board's top) */
  ksh_jars: () => { jar(-26, 20, 28, "#FFB066", "#E07A5F"); jar(0, 22, 36, "#C9A27A", "#D9A86C"); jar(26, 18, 24, "#8FD67A", "#5AA9FF"); },
  ksh_plates: () => {
    for (const [x, r, f, d] of [[-24, 18, "#FFFFFF", "#9AA7C9"], [-6, 20, "#BFE6FF", "#3B8BEF"], [14, 18, "#FFD3E0", "#D46A8E"]]) {
      oval(x, -r, r * 0.42, r); fs(f, d, 2.2); oval(x, -r, r * 0.22, r * 0.6); fs(null, d, 1.4);
    }
    rr(26, -22, 16, 22, 3); fs("#FFF1A8", "#C9A227", 2.2);                       // a cup
  },
  ksh_herbs: () => {
    for (const [x, col] of [[-28, "#E07A5F"], [0, "#5AA9FF"], [28, "#F2C14E"]]) {
      for (let i = 0; i < 5; i++) leaf(x + (i - 2) * 3, -14, 12 + (i % 2) * 4, 4, -Math.PI / 2 + (i - 2) * 0.4 + wob(0.6, x + i) * 0.04, "#6FCF5A", "#2F7D32");
      ctx.save(); ctx.translate(x, 0); pot(18, 14, col, "#7A4A1E"); ctx.restore();
    }
  },
  ksh_teapots: () => {
    oval(-12, -16, 18, 15); fs("#9FD8F0", "#2F7FA8", 2.4);                         // the teapot
    ctx.beginPath(); ctx.moveTo(4, -20); ctx.quadraticCurveTo(16, -26, 20, -34); fs(null, "#2F7FA8", 4);
    ctx.beginPath(); ctx.arc(-32, -16, 7, Math.PI / 2, Math.PI * 1.5); fs(null, "#2F7FA8", 3);
    oval(-12, -32, 8, 3); fs("#FFFFFF", "#2F7FA8", 2); oval(-12, -36, 3, 3); fs("#FFD23F", "#2F7FA8", 1.6);
    ctx.fillStyle = "#FFFFFF"; heartPath(-12, -15, 12); ctx.fill();
    for (const x of [24, 38]) { rr(x - 6, -12, 12, 12, 3); fs("#FFFFFF", "#9AA7C9", 2); }
  },
  /* hanging rail: the rail is part of each thing */
  kp_pans: () => {
    line([[-42, 0], [42, 0]], "#8A6A4A", 4);
    for (const [x, r, col] of [[-26, 13, "#4A4A63"], [2, 16, "#5A6A8A"], [30, 11, "#4A4A63"]]) {
      const sw = wob(0.9, x) * 0.05;
      ctx.save(); ctx.translate(x, 0); ctx.rotate(sw);
      line([[0, 0], [0, 14]], "#8A6A4A", 2); rr(-2.5, 12, 5, 16, 2); fs("#2B2B3A");
      oval(0, 28 + r, r, r); fs(col, "#1B1B28", 2.4); oval(0, 28 + r, r * 0.65, r * 0.65); fs(null, "rgba(255,255,255,0.3)", 2);
      ctx.restore();
    }
  },
  kp_garlic: () => {
    line([[-42, 0], [42, 0]], "#8A6A4A", 4);
    for (let i = 0; i < 4; i++) { oval(-24 + (i % 2) * 6, 12 + i * 10, 7, 6); fs("#FFF6E6", "#C9B8A6", 1.8); }     // a garlic braid
    for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(18 + (i % 2) * 6, 10 + i * 8); ctx.rotate(0.4 - (i % 2) * 0.8);
      ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 7, 0, 0, Math.PI * 2); fs("#E23D3D", "#9E1F2E", 1.6); ctx.restore(); }  // dried chilies
    line([[-21, 0], [-21, 8]], "#C9A27A", 2); line([[21, 0], [21, 6]], "#C9A27A", 2);
  },
  kp_copper: () => {
    line([[-42, 0], [42, 0]], "#8A6A4A", 4);
    for (const [x, w, h] of [[-26, 22, 18], [4, 28, 22], [32, 16, 14]]) {
      line([[x, 0], [x, 10]], "#8A6A4A", 2);
      rr(x - w / 2, 12, w, h, 5); fs("#E39B5F", "#9C5A2A", 2.4);
      rr(x - w / 2 - 3, 10, w + 6, 5, 2); fs("#C97E48", "#9C5A2A", 1.6);
      ctx.fillStyle = "#FFFFFF"; ctx.globalAlpha = 0.5; rr(x - w / 2 + 3, 15, 4, h - 6, 2); ctx.fill(); ctx.globalAlpha = 1;
    }
  },
  /* clocks: hands show the real time */
  kk_round: () => {
    oval(0, 0, 20, 20); fs("#FFFFFF", "#3B8BEF", 3.4);
    clockHands(0, 0, 14, "#252A5C");
  },
  kk_fish: () => {
    fishShape(-2, 0, 18, 1); fs("#FFB066", "#C25E12", 2.8);
    oval(-4, 0, 11, 9); fs("#FFFFFF", "#C25E12", 2);
    clockHands(-4, 0, 8, "#252A5C");
  },
  kk_cat: () => {
    const sw = wob(2) * 0.35;                                                      // the tail ticks side to side
    ctx.save(); ctx.translate(0, 18); ctx.rotate(sw); line([[0, 0], [0, 18]], "#2C2C3A", 5); oval(0, 20, 3.5, 3.5); fs("#FFFFFF"); ctx.restore();
    for (const d of [-1, 1]) { poly([[d * 18, -10], [d * 16, -26], [d * 4, -16]]); fs("#2C2C3A", "#0B0B12", 2); }
    oval(0, 0, 20, 19); fs("#2C2C3A", "#0B0B12", 2.6);
    oval(0, 2, 13, 12); fs("#FFFFFF");
    clockHands(0, 2, 9, "#252A5C");
  },
  /* fridges */
  kr_white: () => fridge("#F4F7FF", "#8F9AC4", false),
  kr_mint: () => fridge("#BFEBDD", "#3E9C82", false),
  kr_retro: () => fridge("#FFB3B8", "#B23A48", true),
});
function clockHands(x, y, r, col) {
  const d = new Date(), m = d.getMinutes(), hr = (d.getHours() % 12) + m / 60;
  for (const [a, len, lw] of [[hr / 12, r * 0.55, 3], [m / 60, r * 0.85, 2.2]]) {
    const ang = a * Math.PI * 2 - Math.PI / 2;
    line([[x, y], [x + Math.cos(ang) * len, y + Math.sin(ang) * len]], col, lw);
  }
  oval(x, y, 2, 2); fs(col);
}

function counter(top, body, dark) {
  rr(-70, -80, 140, 80, 4); fs(body, dark, 2.8);
  for (const x of [-66, -22, 22]) { rr(x + 3, -70, 38, 60, 4); fs(null, dark, 2); oval(x + 34, -40, 2.5, 2.5); fs(dark); }
  rr(-74, -90, 148, 12, 4); fs(top, dark, 2.6);
  rr(-48, -92, 40, 5, 2); fs("#C9D3E6", "#7F8AA8", 1.6);                          // the sink
  ctx.beginPath(); ctx.moveTo(-28, -92); ctx.lineTo(-28, -108); ctx.quadraticCurveTo(-28, -114, -20, -112); fs(null, "#7F8AA8", 3);
  oval(36, -100, 12, 7); fs("#FFFFFF", "#9AA7C9", 2); oval(32, -104, 5, 4); fs("#FF6B6B"); oval(40, -105, 5, 4); fs("#FFD23F");   // a fruit bowl
}
function stove(body, dark, accent) {
  rr(-40, -80, 80, 80, 6); fs(body, dark, 2.8);
  rr(-30, -54, 60, 44, 5); fs("#3B3F5C", dark, 2.4);                              // the oven door
  rr(-24, -48, 48, 18, 3); fs("rgba(255, 190, 120, 0.35)");
  line([[-18, -58], [18, -58]], dark, 3);
  for (const x of [-24, -8, 8, 24]) { oval(x, -70, 3.4, 3.4); fs(accent, dark, 1.4); }    // knobs
  rr(-42, -90, 84, 10, 3); fs("#3B3F5C", dark, 2.2);
  for (const x of [-20, 20]) { oval(x, -92, 13, 3.5); fs("#2B2B3A"); }                     // burners
  oval(20, -102, 12, 8); fs("#FF8A8A", "#B23A48", 2.2); rr(4, -104, 6, 3, 1); fs("#B23A48");   // a little pot
}
function table(top, dark, cloth) {
  for (const x of [-48, 44]) { rr(x, -56, 6, 56, 2); fs(dark); }
  rr(-60, -64, 120, 12, 5); fs(top, dark, 2.6);
  if (cloth) {
    ctx.save(); rr(-62, -66, 124, 26, 6); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-62, -66, 124, 26);
    ctx.fillStyle = cloth; for (let x = -62; x < 62; x += 12) ctx.fillRect(x, -66, 6, 26); for (let y = -66; y < -40; y += 12) ctx.fillRect(-62, y, 124, 6);
    ctx.restore(); rr(-62, -66, 124, 26, 6); fs(null, dark, 2);
  }
}
function mat(fill, dark) { rr(-96, -20, 192, 40, 18); fs(fill, dark, 3); }

Object.assign(THINGS, {
  kc_wood: () => counter("#E8C99A", "#D9A86C", "#8A5A2E"),
  kc_blue: () => counter("#FFFFFF", "#8CC4FF", "#2F6AB0"),
  kc_marble: () => { counter("#F6F4F0", "#B5C9B5", "#5E7A5E"); line([[-60, -86], [-40, -82], [-20, -86]], "#CFCAC0", 1.4); },
  ks_white: () => stove("#F4F7FF", "#8F9AC4", "#FFFFFF"),
  ks_red: () => stove("#FF8A8A", "#B23A48", "#FFE08A"),
  ks_copper: () => stove("#E8B07A", "#9C5A2A", "#FFF1A8"),
  kt_round: () => {
    rr(-4, -56, 8, 56, 2); fs("#8A5A2E"); oval(0, -2, 22, 5); fs("#8A5A2E");
    oval(0, -60, 54, 12); fs("#FFE3EE", "#D46A8E", 2.6);
    rr(-10, -78, 20, 16, 4); fs("#FFFFFF", "#9AA7C9", 2); ctx.fillStyle = "#FF8FB3"; heartPath(0, -70, 8); ctx.fill();   // a mug
  },
  kt_square: () => { table("#D9A86C", "#8A5A2E", ""); oval(-20, -70, 12, 4); fs("#FFFFFF", "#9AA7C9", 2); oval(-20, -72, 6, 2.5); fs("#FFB066"); },
  kt_picnic: () => { table("#D9A86C", "#8A5A2E", "rgba(255, 92, 114, 0.45)");
    oval(16, -72, 14, 6); fs("#FFFFFF", "#9AA7C9", 2); oval(12, -76, 5, 4); fs("#FF6B6B"); oval(20, -76, 5, 4); fs("#82DD5C"); },
  kru_stripe: () => {
    mat("#BFD7FF", "#5F86C9");
    ctx.save(); rr(-96, -20, 192, 40, 18); ctx.clip(); ctx.fillStyle = "#FFFFFF"; for (let x = -84; x < 96; x += 28) ctx.fillRect(x, -20, 12, 40); ctx.restore();
    rr(-96, -20, 192, 40, 18); fs(null, "#5F86C9", 3);
  },
  kru_fish: () => { mat("#FFE0C2", "#E07A4F"); for (const x of [-50, 0, 50]) { fishShape(x, 0, 11, x > 0 ? -1 : 1); fs("#FFB385", "#E07A4F", 2); } },
  kru_lemon: () => { mat("#FFF3B0", "#D9A441"); for (const x of [-54, -18, 18, 54]) { oval(x, 0, 10, 7, 0.3); fs("#FFE066", "#D9A441", 2); } },
  kb_fish: () => {
    fishShape(-2, -8, 20, 1); fs("#5AA9FF", "#1F57B0", 2.6);
    for (const [x, y] of [[-8, -12], [0, -14], [8, -12]]) { oval(x, y, 3.2, 2.4); fs("#B9783D", "#7A4A1E", 1.2); }
  },
  kb_twin: () => THINGS.d_double(),
  kb_stand: () => {
    rr(-30, -14, 60, 8, 3); fs("#D9A86C", "#8A5A2E", 2.2);
    for (const x of [-24, 20]) { rr(x, -8, 4, 8, 1); fs("#8A5A2E"); }
    for (const [x, f, d] of [[-14, "#FF8A8A", "#B23A48"], [14, "#8CC4FF", "#2F6AB0"]]) { poly([[x - 12, -26], [x + 12, -26], [x + 9, -14], [x - 9, -14]]); fs(f, d, 2.2); }
  },
  kb_fountain: () => {
    poly([[-24, -14], [24, -14], [18, 0], [-18, 0]]); fs("#BFEBDD", "#3E9C82", 2.6);
    oval(0, -14, 24, 5); fs("#8CC4FF", "#3E9C82", 2);
    rr(-4, -30, 8, 16, 3); fs("#FFFFFF", "#3E9C82", 2);
    ctx.fillStyle = "#8CC4FF";
    for (let i = 0; i < 3; i++) {                                                  // a little water bubbling up (calm: still)
      const p = S.calm ? 0.4 : (time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = 1 - p; oval(0 + (i - 1) * 3, -32 - p * 8, 2.4, 2.4); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
});
// Some kitchen things are much smaller than their spot: a closer frame in the picker.
Object.assign(PREVIEW_BOX, { kru_stripe: [-100, -50, 200, 100], kru_fish: [-100, -50, 200, 100], kru_lemon: [-100, -50, 200, 100],
  kb_fish: [-30, -30, 60, 34], kb_twin: [-36, -30, 72, 34], ksh_teapots: [-46, -46, 92, 50] });
