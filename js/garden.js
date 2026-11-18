"use strict";
/* ==================================================================
   DROP THE BEAN - the Garden: the third room, open after level 700.
   Same room units as the Bedroom (360 wide, 440 tall). Its spots are
   GARDEN_SPOTS in core.js; the things are drawn in js/garden-things.js.
=================================================================== */

Object.assign(WORDS.en, {
  rs_gsky: "Sky", rs_gground: "Ground", rs_gfence: "Fence", rs_glamp: "Lights", rs_gtree: "Tree", rs_gbird: "Bird house",
  rs_gflower: "Flower bed", rs_gbench: "Bench", rs_gpond: "Pond", rs_ghammock: "Hammock", rs_gpot: "Plant pot", rs_gtoy: "Toy",
  ri_gs_day: "Sunny sky", ri_gs_sunset: "Sunset", ri_gs_night: "Starry night", ri_gs_rainbow: "Rainbow",
  ri_gg_grass: "Grass", ri_gg_clover: "Clover", ri_gg_stone: "Stone path", ri_gg_flowers: "Wild flowers",
  ri_gf_white: "White fence", ri_gf_wood: "Wood fence", ri_gf_hedge: "Hedge", ri_gf_bamboo: "Bamboo fence",
  ri_gl_bulbs: "Little lights", ri_gl_paper: "Paper lanterns", ri_gl_star: "Star lanterns",
  ri_gt_round: "Leafy tree", ri_gt_mango: "Mango tree", ri_gt_cherry: "Pink blossom tree", ri_gt_house: "Tree house",
  ri_gh_box: "Bird box", ri_gh_house: "Bird house", ri_gh_bath: "Bird bath",
  ri_gb_daisy: "Daisies", ri_gb_tulip: "Tulips", ri_gb_sun: "Sunflowers", ri_gb_rose: "Roses",
  ri_gn_wood: "Wood bench", ri_gn_iron: "Garden bench", ri_gn_swing: "Swing seat",
  ri_gp_small: "Little pond", ri_gp_lily: "Lily pond", ri_gp_koi: "Fish pond",
  ri_gm_rope: "Rope hammock", ri_gm_stripe: "Striped hammock", ri_gm_rainbow: "Rainbow hammock",
  ri_gpt_fern: "Fern", ri_gpt_cactus: "Cactus", ri_gpt_bamboo: "Bamboo",
  ri_gy_ball: "Ball", ri_gy_tunnel: "Cat tunnel", ri_gy_butterfly: "Butterfly toy",
});

const GROUND_Y = 250, GWALL_Y = 262;
// The fence along the far edge, lights strung across the top, the tree on the left, a back row
// (bench, flower bed, bird house), the pond in the middle, and the hammock, a toy and a plant pot
// at the front. The front right corner stays free for her cat while she decorates.
Object.assign(SPOT_AT, {
  gsky:     { x: 0, y: 0, box: [0, 0, RW, GROUND_Y], layer: 0 },
  gground:  { x: 0, y: GROUND_Y, box: [0, 0, RW, RH - GROUND_Y], layer: 0 },
  gfence:   { x: 0, y: 262, box: [0, -64, RW, 68], layer: 1, lab: [222, -34] },
  glamp:    { x: 180, y: 0, box: [-170, 0, 340, 64], layer: 1, lab: [0, 58] },
  gtree:    { x: 62, y: 336, box: [-64, -300, 128, 304], layer: 2, depth: 336, lab: [0, -100] },
  gbench:   { x: 156, y: 330, box: [-54, -60, 108, 64], layer: 2, depth: 330, lab: [-34, 12] },
  gflower:  { x: 266, y: 298, box: [-64, -44, 128, 48], layer: 2, depth: 298 },
  gbird:    { x: 334, y: 302, box: [-28, -150, 56, 154], layer: 2, depth: 302, lab: [0, -64] },
  gpond:    { x: 214, y: 362, box: [-74, -28, 148, 56], layer: 2, depth: 0, lab: [0, 0] },
  ghammock: { x: 94, y: 430, box: [-76, -62, 152, 66], layer: 2, depth: 430, lab: [0, -24] },
  gtoy:     { x: 200, y: 436, box: [-28, -30, 56, 34], layer: 2, depth: 436, lab: [0, -40] },
  gpot:     { x: 258, y: 436, box: [-28, -66, 56, 70], layer: 2, depth: 436, lab: [0, -30] },
});
Object.assign(SWATCH, { gsky: 1, gground: 1 });

/* ---------- skies and grounds: drawn into a rectangle ---------- */
const skyFill = (x, y, w, h, a, b) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); };
const puffCloud = (cx, cy, k) => { ctx.fillStyle = "#FFFFFF"; for (const [dx, dy, r] of [[-12, 2, 9], [0, -4, 12], [13, 2, 9]]) { oval(cx + dx * k, cy + dy * k, r * k, r * k * 0.8); ctx.fill(); } };
Object.assign(PATTERNS, {
  gs_day: (x, y, w, h) => {
    skyFill(x, y, w, h, "#8FD3FF", "#E3F5FF");
    oval(x + w * 0.8, y + h * 0.2, w * 0.06, w * 0.06); fs("#FFD84D", "#F2A900", 2.5);
    puffCloud(x + w * 0.3 + wob(0.15) * 6, y + h * 0.22, w / 300);
    puffCloud(x + w * 0.6 - wob(0.12, 2) * 5, y + h * 0.42, w / 420);
  },
  gs_sunset: (x, y, w, h) => {
    skyFill(x, y, w, h, "#FF9A7A", "#FFE0A6");
    oval(x + w * 0.62, y + h * 0.78, w * 0.08, w * 0.08); fs("#FF6F59");
    for (const [u, v] of [[0.25, 0.3], [0.34, 0.24]]) line([[x + w * u - 4, y + h * v], [x + w * u, y + h * v + 4], [x + w * u + 4, y + h * v]], "#8A3A3A", 2);
  },
  gs_night: (x, y, w, h) => {
    skyFill(x, y, w, h, "#1F2560", "#45539C");
    ctx.beginPath(); ctx.arc(x + w * 0.76, y + h * 0.24, w * 0.05, 0.6, Math.PI * 2 - 0.6); ctx.arc(x + w * 0.76 + w * 0.025, y + h * 0.24, w * 0.033, -1.049, 1.049, true); ctx.closePath(); fs("#FFF1A8");
    for (let i = 0; i < 14; i++) {
      ctx.globalAlpha = 0.6 + 0.4 * (S.calm ? 1 : Math.abs(Math.sin(time * 0.8 + i * 1.7)));
      ctx.fillStyle = "#FFFFFF"; twinkle(x + (i * 41.7 + 9) % w, y + (i * 23.3 + 7) % (h * 0.8), i % 3 ? 1.6 : 2.6);
    }
    ctx.globalAlpha = 1;
  },
  gs_rainbow: (x, y, w, h) => {
    skyFill(x, y, w, h, "#A9E0FF", "#EAF8FF");
    ["#FF6B6B", "#FFA24D", "#FFD84D", "#7ED36B", "#5AA9FF", "#9C7BF4"].forEach((col, i) => {
      ctx.strokeStyle = col; ctx.lineWidth = w * 0.022; ctx.beginPath(); ctx.arc(x + w * 0.5, y + h * 1.05, w * (0.42 - i * 0.022), Math.PI, 0); ctx.stroke();
    });
    puffCloud(x + w * 0.12, y + h * 0.9, w / 300); puffCloud(x + w * 0.88, y + h * 0.9, w / 300);
  },
  gg_grass: (x, y, w, h) => {
    ctx.fillStyle = "#9BD77A"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#7FC060"; ctx.lineWidth = 2;
    for (let i = 0; i < w * h / 500; i++) { const gx = x + (i * 37.3) % w, gy = y + 8 + (i * 61.7) % (h - 8); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 6); ctx.moveTo(gx, gy); ctx.lineTo(gx + 2, gy - 6); ctx.stroke(); }
  },
  gg_clover: (x, y, w, h) => {
    ctx.fillStyle = "#8FD07A"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#6FB85A";
    for (let i = 0; i < w * h / 700; i++) { const cx = x + (i * 41.3) % w, cy = y + (i * 53.9) % h; for (let k = 0; k < 3; k++) { oval(cx + Math.cos(k * 2.1) * 3, cy + Math.sin(k * 2.1) * 3, 2.6, 2.6); ctx.fill(); } }
  },
  gg_stone: (x, y, w, h) => {
    PATTERNS.gg_grass(x, y, w, h);
    for (let i = 0; i < 9; i++) {                                // a winding stone path toward the front
      const v = i / 8, sx = x + w * (0.55 + Math.sin(v * 3) * 0.18), sy = y + h * (0.08 + v * 0.88);
      oval(sx, sy, w * (0.045 + v * 0.03), h * (0.03 + v * 0.02)); fs("#E3DED4", "#B9AE9C", 2);
    }
  },
  gg_flowers: (x, y, w, h) => {
    PATTERNS.gg_grass(x, y, w, h);
    const cols = ["#FFFFFF", "#FFD84D", "#FF8FB3", "#B8A2FF"];
    for (let i = 0; i < w * h / 900; i++) { ctx.fillStyle = cols[i % 4]; oval(x + (i * 47.1) % w, y + 6 + (i * 29.7) % (h - 6), 2.6, 2.6); ctx.fill(); }
  },
});

/* ---------- the fixed parts: sky, far hills, ground ---------- */
function drawGardenBase() {
  PATTERNS[roomShow("gsky")](0, 0, RW, GROUND_Y + 10);
  oval(70, GROUND_Y + 10, 140, 40); fs("#B7E3A0");                 // soft hills far away
  oval(300, GROUND_Y + 14, 160, 46); fs("#A8DB90");
  PATTERNS[roomShow("gground")](0, GROUND_Y, RW, RH - GROUND_Y);
}

// Its Style is the sky and the ground together (see ROOMS in js/room.js).
ROOMS.push({ id: "garden", spots: GARDEN_SPOTS, wallY: GWALL_Y, base: drawGardenBase,
  pieces: ["gsky", "gground"],
  styles: [
    { id: "g_sunny", put: ["gs_day", "gg_grass"] },          // free
    { id: "g_clover", put: ["gs_day", "gg_clover"] },        // 500
    { id: "g_sunset", put: ["gs_sunset", "gg_stone"] },      // 800 + 1400 = 2200
    { id: "g_night", put: ["gs_night", "gg_clover"] },       // 2200 + 500 = 2700
    { id: "g_rainbow", put: ["gs_rainbow", "gg_flowers"] },  // 4000 + 2600 = 6600
  ],
  decor: ["gtree", "gbench", "ghammock", "gpond", "gflower", "gpot", "gbird", "glamp", "gfence", "gtoy"] });

// The faint shapes of the empty spots while decorating (see GHOSTS in js/room.js).
Object.assign(GHOSTS, {
  gfence: () => { for (const y of [-44, -18]) { rr(0, y, RW, 7, 2); gfs(); } for (let x = 6; x < RW; x += 48) { rr(x, -58, 14, 58, 3); gfs(); } },
  glamp: () => {
    ctx.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = lampAt(i / 20); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    gfs(false);
    for (let i = 1; i < 8; i++) { const [x, y] = lampAt(i / 8); oval(x, y + 8, 5, 6); gfs(); }
  },
  gtree: () => {
    poly([[-12, 0], [12, 0], [8, -170], [-8, -170]]); gfs();
    ctx.beginPath(); ctx.ellipse(0, -214, 64, 58, 0, 0, Math.PI * 2); gfs();
  },
  gbird: () => { rr(-4, -96, 8, 96, 2); gfs(); rr(-18, -126, 36, 30, 4); gfs(); poly([[-24, -126], [0, -144], [24, -126]]); gfs(); oval(0, -110, 5, 5); gfs(false); },
  gflower: () => {
    rr(-60, -14, 120, 16, 7); gfs();
    for (let i = 0; i < 5; i++) {
      const x = -44 + i * 22, top = [-30, -40, -26, -38, -32][i];
      gline([[x, -12], [x, top]]); gleaf(x, -18, 10, 4, i % 2 ? -0.6 : Math.PI + 0.6);
      oval(x, top - 6, 7, 7); gfs(); oval(x, top - 6, 2.5, 2.5); gfs(false);
    }
  },
  gbench: () => {
    for (const x of [-44, 38]) { rr(x, -54, 6, 54, 2); gfs(); }
    rr(-50, -30, 100, 8, 3); gfs(); rr(-48, -52, 96, 17, 3); gfs();
  },
  gpond: () => { oval(0, 0, 70, 24); gfs(); oval(0, 0, 50, 15); gfs(false); },
  ghammock: () => {
    for (const d of [-1, 1]) gline([[d * 66, 0], [d * 58, -58]]);
    gline([[-70, 0], [70, 0]]);
    ctx.beginPath(); ctx.moveTo(-58, -52); ctx.quadraticCurveTo(0, -6, 58, -52); ctx.quadraticCurveTo(0, -22, -58, -52); ctx.closePath(); gfs();
  },
  gpot: () => { for (const a of [-2.1, -1.8, -1.57, -1.34, -1.05]) gleaf(0, -24, 28, 6, a); gpot(30, 24); },
  gtoy: () => { oval(0, -10, 10, 10); gfs(); },
});
