"use strict";
/* ==================================================================
   DROP THE BEAN - the Kitchen: the second room, open after level 250.
   Same room units as the Bedroom (360 wide, 440 tall). Its spots are
   KITCHEN_SPOTS in core.js; the things are drawn in js/kitchen-things.js.
=================================================================== */

Object.assign(WORDS.en, {
  rs_kwall: "Wall", rs_kfloor: "Floor", rs_kview: "Window view", rs_kshelf: "Shelf", rs_kpans: "Hanging rail",
  rs_kclock: "Clock", rs_kfridge: "Fridge", rs_kcounter: "Counter", rs_kstove: "Stove", rs_ktable: "Table",
  rs_krug: "Rug", rs_kbowl: "Cat bowls",
  ri_kw_cream: "Cream tiles", ri_kw_mint: "Mint tiles", ri_kw_lemon: "Lemons", ri_kw_check: "Picnic check", ri_kw_brick: "Warm brick",
  ri_kf_tile: "Gray tiles", ri_kf_wood: "Wood", ri_kf_check: "Checkers", ri_kf_terra: "Clay tiles",
  ri_kv_day: "Sunny day", ri_kv_rain: "Rainy day", ri_kv_sunset: "Sunset", ri_kv_snow: "Snow",
  ri_ksh_jars: "Jars", ri_ksh_plates: "Plates", ri_ksh_herbs: "Herb pots", ri_ksh_teapots: "Teapot and cups",
  ri_kp_pans: "Pans", ri_kp_garlic: "Garlic and chili", ri_kp_copper: "Copper pots",
  ri_kk_round: "Round clock", ri_kk_fish: "Fish clock", ri_kk_cat: "Cat clock",
  ri_kr_white: "White fridge", ri_kr_mint: "Mint fridge", ri_kr_retro: "Retro fridge",
  ri_kc_wood: "Wood counter", ri_kc_blue: "Blue counter", ri_kc_marble: "Marble counter",
  ri_ks_white: "White stove", ri_ks_red: "Red stove", ri_ks_copper: "Copper stove",
  ri_kt_round: "Round table", ri_kt_square: "Wood table", ri_kt_picnic: "Picnic table",
  ri_kru_stripe: "Striped mat", ri_kru_fish: "Fish mat", ri_kru_lemon: "Lemon mat",
  ri_kb_fish: "Fish bowl", ri_kb_twin: "Two bowls", ri_kb_stand: "Bowl stand", ri_kb_fountain: "Water fountain",
});

const KWALL_Y = 280;
Object.assign(SPOT_AT, {
  kwall:    { x: 0, y: 0, box: [0, 0, RW, KWALL_Y], layer: 0 },
  kfloor:   { x: 0, y: KWALL_Y, box: [0, 0, RW, RH - KWALL_Y], layer: 0 },
  kview:    { x: 196, y: 108, box: [-56, -50, 112, 100], layer: 0 },
  kclock:   { x: 112, y: 56, box: [-24, -24, 48, 48], layer: 1 },
  kshelf:   { x: 312, y: 92, box: [-46, -44, 92, 50], layer: 1 },
  kpans:    { x: 312, y: 122, box: [-44, -4, 88, 66], layer: 1 },
  kfridge:  { x: 52, y: 300, box: [-40, -192, 80, 196], layer: 2, depth: 300 },
  kcounter: { x: 196, y: 300, box: [-72, -92, 144, 96], layer: 2, depth: 300 },
  kstove:   { x: 312, y: 300, box: [-42, -92, 84, 96], layer: 2, depth: 300 },
  ktable:   { x: 140, y: 404, box: [-64, -66, 128, 70], layer: 2, depth: 404 },
  krug:     { x: 196, y: 400, box: [-104, -26, 208, 52], layer: 2, depth: 0 },
  kbowl:    { x: 306, y: 432, box: [-32, -26, 64, 30], layer: 2, depth: 432 },
});
Object.assign(SWATCH, { kwall: 1, kfloor: 1, kview: 1 });
WINDOW_SPOTS.kview = 1;

/* ---------- kitchen walls, floors and window views ---------- */
function tileGrid(x, y, w, h, size, fill, lineCol) {
  ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = lineCol; ctx.lineWidth = 2;
  for (let r = 0; r <= h; r += size) { ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x + w, y + r); ctx.stroke(); }
  for (let c = 0; c <= w; c += size) { ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + h); ctx.stroke(); }
}
Object.assign(PATTERNS, {
  kw_cream: (x, y, w, h) => {
    ctx.fillStyle = "#FFF4DF"; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + h * 0.62, w, h * 0.38); ctx.clip();       // tiles behind the counter
    tileGrid(x, y + h * 0.62, w, h * 0.38, 22, "#FFFFFF", "#EADFC8"); ctx.restore();
  },
  kw_mint: (x, y, w, h) => tileGrid(x, y, w, h, 26, "#DDF5EC", "#FFFFFF"),
  kw_lemon: (x, y, w, h) => {
    ctx.fillStyle = "#FFF9D8"; ctx.fillRect(x, y, w, h);
    for (let r = 18, j = 0; r < h + 40; r += 40, j++) for (let c = 18 + (j % 2) * 20; c < w + 40; c += 40) {
      ctx.fillStyle = "#FFE066"; oval(x + c, y + r, 7, 5, 0.4); ctx.fill();
      ctx.fillStyle = "#8FD67A"; oval(x + c + 6, y + r - 5, 3, 1.6, -0.6); ctx.fill();
    }
  },
  kw_check: (x, y, w, h) => {
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255, 120, 120, 0.28)";
    for (let c = 0; c < w; c += 28) ctx.fillRect(x + c, y, 14, h);
    for (let r = 0; r < h; r += 28) ctx.fillRect(x, y + r, w, 14);
  },
  kw_brick: (x, y, w, h) => {
    ctx.fillStyle = "#F1C9A8"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#E4AE88";
    for (let r = 0, j = 0; r < h; r += 18, j++) for (let c = (j % 2) * -20; c < w; c += 40) { rr(x + c + 2, y + r + 2, 36, 14, 3); ctx.fill(); }
  },
  kf_tile: (x, y, w, h) => tileGrid(x, y, w, h, 40, "#E9ECF2", "#D2D7E2"),
  kf_wood: (x, y, w, h) => PATTERNS.f_wood(x, y, w, h),
  kf_check: (x, y, w, h) => {
    ctx.fillStyle = "#FFF8EC"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#3E4A7A";
    for (let r = 0, j = 0; r < h; r += 32, j++) for (let c = (j % 2) * 32; c < w; c += 64) ctx.fillRect(x + c, y + r, 32, 32);
  },
  kf_terra: (x, y, w, h) => {
    ctx.fillStyle = "#E8A27A"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#C97E58"; ctx.lineWidth = 2.4;
    for (let r = 0, j = 0; r < h; r += 30, j++) for (let c = (j % 2) * 18; c < w; c += 36) { rr(x + c + 2, y + r + 2, 32, 26, 6); ctx.stroke(); }
  },
  kv_day: (x, y, w, h) => PATTERNS.v_day(x, y, w, h),
  kv_rain: (x, y, w, h) => PATTERNS.v_rain(x, y, w, h),
  kv_sunset: (x, y, w, h) => PATTERNS.v_sunset(x, y, w, h),
  kv_snow: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#AFC4E6"); g.addColorStop(1, "#E6EEFA");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    oval(x + w * 0.5, y + h * 1.08, w * 0.8, h * 0.3); fs("#FFFFFF");
    ctx.fillStyle = "#FFFFFF";
    for (let i = 0; i < 16; i++) {                       // snowflakes drift down slowly (calm motion: they stay still)
      const fall = S.calm ? 0 : time * 9;
      oval(x + (i * 27.3) % w, y + ((i * 37.1 + fall) % h), i % 3 ? 1.8 : 2.6, i % 3 ? 1.8 : 2.6); ctx.fill();
    }
  },
});

/* ---------- the fixed parts: wall, floor, window with a little curtain, sill, shelf board ---------- */
function drawKitchenBase() {
  PATTERNS[roomPut("kwall")](0, 0, RW, KWALL_Y);
  PATTERNS[roomPut("kfloor")](0, KWALL_Y, RW, RH - KWALL_Y);
  const g = ctx.createLinearGradient(0, KWALL_Y, 0, KWALL_Y + 26);
  g.addColorStop(0, "rgba(60, 40, 30, 0.22)"); g.addColorStop(1, "rgba(60, 40, 30, 0)");
  ctx.fillStyle = g; ctx.fillRect(0, KWALL_Y, RW, 26);
  rr(-4, KWALL_Y - 10, RW + 8, 12, 3); fs("#FFFFFF", "#C9B8A6", 2.4);
  const v = SPOT_AT.kview;
  drawWindow(roomPut("kview"), v.x - 46, v.y - 40, 92, 80);
  line([[v.x - 58, v.y - 50], [v.x + 58, v.y - 50]], "#8A5A2E", 4);                    // a rod with a short curtain
  ctx.beginPath(); ctx.moveTo(v.x - 56, v.y - 50);
  for (let i = 0; i <= 8; i++) ctx.quadraticCurveTo(v.x - 56 + i * 14 - 7, v.y - 26, v.x - 56 + i * 14, v.y - 32);
  ctx.lineTo(v.x + 56, v.y - 50); ctx.closePath(); fs("#FFE3A3", "#D9A441", 2.2);
  rr(v.x - 60, v.y + 44, 120, 9, 3); fs("#FFFFFF", "#B9A48E", 2.2);
  const sh = SPOT_AT.kshelf;                                                           // the shelf board
  for (const d of [-1, 1]) { poly([[sh.x + d * 32, sh.y + 8], [sh.x + d * 32, sh.y + 22], [sh.x + d * 20, sh.y + 8]]); fs("#B98349", "#8A5A2E", 2); }
  rr(sh.x - 46, sh.y, 92, 9, 3); fs("#C98E58", "#8A5A2E", 2.4);
}

// Its Style is the wall, floor and window view together (see ROOMS in js/room.js).
ROOMS.push({ id: "kitchen", spots: KITCHEN_SPOTS, wallY: KWALL_Y, base: drawKitchenBase,
  pieces: ["kwall", "kfloor", "kview"],
  styles: [
    { id: "k_sunny", put: ["kw_cream", "kf_tile", "kv_day"] },       // free
    { id: "k_mint", put: ["kw_mint", "kf_wood", "kv_rain"] },        // 300 + 400 + 500 = 1200
    { id: "k_picnic", put: ["kw_check", "kf_wood", "kv_day"] },      // 1800 + 400 = 2200
    { id: "k_lemon", put: ["kw_lemon", "kf_check", "kv_sunset"] },   // 900 + 1100 + 1200 = 3200
    { id: "k_brick", put: ["kw_brick", "kf_terra", "kv_snow"] },     // 3200 + 2400 + 3000 = 8600
  ],
  decor: ["kclock", "kshelf", "kpans", "kfridge", "kcounter", "kstove", "ktable", "krug", "kbowl"] });
