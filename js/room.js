"use strict";
/* ==================================================================
   DROP THE BEAN - room: her cats' own room, decorated with coins.
   One cozy room with 16 spots (the list is ROOM_SPOTS in core.js).
   The room opens clean. The Decorate button turns on decorate mode: her
   cat steps aside to a free corner and sits small, each empty spot shows
   a faint dashed shape of what goes there (with its name), and each
   filled spot gets a soft outline. A row of names at the bottom opens
   each spot's picker, and so does tapping a spot. The picker is a small
   sheet at the bottom, so the room stays in view: tapping something new
   shows it in the room first, a second tap asks "Buy?". Things she owns
   go in at once. The wallpaper, floor and window view are chosen together
   as one Style (each room's "styles" list).
   Her own cat lives here, big, in front: she sits, naps, blinks and purrs.
   Everything is drawn in "room units": the room is 360 wide and 440
   tall, and the whole picture is scaled to fit the screen.
=================================================================== */

Object.assign(WORDS.en, {
  rs_wall: "Wallpaper", rs_floor: "Floor", rs_view: "Window view", rs_pic: "Picture", rs_shelf: "Shelf",
  rs_hang: "Hanging", rs_sill: "Window sill", rs_lamp: "Lamp", rs_plant: "Plant", rs_tree: "Cat tree",
  rs_rug: "Rug", rs_post: "Scratch post", rs_bed: "Cat bed", rs_cush: "Cushion", rs_toy: "Toy", rs_bowl: "Food bowl",
  ri_w_plain: "Cream", ri_w_stripe: "Stripes", ri_w_dots: "Polka dots", ri_w_flower: "Flowers", ri_w_fish: "Little fish",
  ri_f_wood: "Wood", ri_f_tile: "Tiles", ri_f_check: "Checkers", ri_f_carpet: "Soft carpet", ri_f_bamboo: "Bamboo",
  ri_v_day: "Sunny day", ri_v_rain: "Rainy day", ri_v_sunset: "Sunset", ri_v_stars: "Starry night", ri_v_rainbow: "Rainbow",
  ri_p_fish: "Fish picture", ri_p_heart: "Heart picture", ri_p_hills: "Green hills", ri_p_cat: "Cat portrait",
  ri_s_books: "Books", ri_s_jar: "Treat jar", ri_s_vine: "Trailing plant", ri_s_trophy: "Gold trophy",
  ri_h_lantern: "Paper lantern", ri_h_plant: "Hanging plant", ri_h_mobile: "Star mobile",
  ri_l_cactus: "Little cactus", ri_l_flower: "Sunflower", ri_l_fishbowl: "Fish bowl",
  ri_m_round: "Round lamp", ri_m_tall: "Tall lamp", ri_m_mush: "Mushroom lamp",
  ri_t_fern: "Fern", ri_t_snake: "Snake plant", ri_t_leaf: "Big leaf plant", ri_t_banana: "Banana plant",
  ri_r_small: "Small cat tree", ri_r_tall: "Tall cat tree", ri_r_castle: "Cat castle",
  ri_u_round: "Round rug", ri_u_stripe: "Striped rug", ri_u_paw: "Paw rug", ri_u_rainbow: "Rainbow rug",
  ri_o_rope: "Rope post", ri_o_fish: "Fish post", ri_o_cactus: "Cactus post",
  ri_b_box: "Cardboard box", ri_b_basket: "Basket", ri_b_round: "Round bed", ri_b_cave: "Cozy cave", ri_b_cloud: "Cloud bed",
  ri_c_round: "Round cushion", ri_c_heart: "Heart cushion", ri_c_star: "Star cushion", ri_c_bean: "Bean bag",
  ri_y_yarn: "Yarn ball", ri_y_mouse: "Toy mouse", ri_y_track: "Ball track",
  ri_d_basic: "Blue bowl", ri_d_double: "Two bowls", ri_d_gold: "Golden bowl",
  room_0: "Bedroom", room_1: "Kitchen", room_2: "Garden", room_locked: "The {0} opens after level {1}",
  gift_week: "Gift week", gift_from: "A gift from {0}!", gift_day: "Day {0} of 7", gift_big: "Day 7: a big gift!",
  gift_coins: "+{0} coins", gift_pu: "1 {0}", gift_item: "For your room: {0}", gift_item_tip: "Tap Decorate in the {0} to put it out.",
  cal_title: "Gift week", cal_day: "Day {0}", cal_today: "Today", cal_next: "Tomorrow",
  cal_tip: "Win the Daily nap and your cat brings a gift.", cal_tip2: "Missed a day? Your week waits. Day 7 is a big one.",
  open_gift: "Tap the gift",
  decorate: "Decorate", style: "Style", style_of: "{0} style", style_mix: "Now: your own mix",
  try_tip: "Tap one to see it in your room", try_buy: "Like it? Tap it again to buy",
  st_b_cozy: "Cozy", st_b_rain: "Rainy day", st_b_sunset: "Pink sunset", st_b_night: "Starry night", st_b_spring: "Spring",
  st_k_sunny: "Sunny", st_k_mint: "Mint", st_k_picnic: "Picnic", st_k_lemon: "Lemon", st_k_brick: "Warm brick",
  st_g_sunny: "Sunny", st_g_clover: "Clover", st_g_sunset: "Sunset", st_g_night: "Starry night", st_g_rainbow: "Rainbow",
});

const RW = 360, RH = 440, WALL_Y = 290;
/* Where each spot is. (x, y) is the spot's anchor: the top-left of the wall and floor, the
   middle of the window glass and picture, the ceiling point a hanger hangs from, the board a
   shelf or sill thing stands on, and the floor point a standing thing stands on. box = [dx, dy,
   w, h] from the anchor: the part a finger can tap, also used to fit the thing into a picker
   tile. "depth" sorts floor things and cats so the nearer ones are drawn on top. "lab": where
   the spot's name sits in decorate mode (from the anchor), when not just under the box.
   The floor has three rows: tall things along the wall, the rug in the middle, small things
   at the front. One front corner stays free for her cat while she decorates. */
const SPOT_AT = {
  wall:  { x: 0, y: 0, box: [0, 0, RW, WALL_Y], layer: 0 },
  floor: { x: 0, y: WALL_Y, box: [0, 0, RW, RH - WALL_Y], layer: 0 },
  view:  { x: 262, y: 107, box: [-58, -62, 116, 124], layer: 0 },
  pic:   { x: 84, y: 64, box: [-42, -34, 84, 68], layer: 1 },
  shelf: { x: 90, y: 160, box: [-56, -48, 112, 60], layer: 1 },
  hang:  { x: 156, y: 0, box: [-30, 0, 60, 92], layer: 1 },
  sill:  { x: 262, y: 170, box: [-30, -46, 60, 48], layer: 1 },
  plant: { x: 34, y: 324, box: [-32, -116, 64, 120], layer: 2, depth: 324 },
  post:  { x: 100, y: 326, box: [-26, -100, 52, 104], layer: 2, depth: 326, lab: [0, -44] },
  lamp:  { x: 166, y: 322, box: [-30, -128, 60, 132], layer: 2, depth: 322 },
  bed:   { x: 234, y: 330, box: [-48, -68, 96, 72], layer: 2, depth: 330 },
  tree:  { x: 318, y: 320, box: [-42, -234, 84, 238], layer: 2, depth: 320, gbox: [-38, -140, 76, 144], lab: [0, -48] },
  rug:   { x: 166, y: 384, box: [-108, -28, 216, 56], layer: 2, depth: 0, lab: [0, 0] },
  cush:  { x: 52, y: 430, box: [-38, -28, 76, 32], layer: 2, depth: 430, lab: [0, -40] },
  toy:   { x: 136, y: 434, box: [-26, -28, 52, 32], layer: 2, depth: 434, lab: [0, -40] },
  bowl:  { x: 216, y: 434, box: [-30, -28, 60, 32], layer: 2, depth: 434, lab: [0, -40] },
};
// The spots that fill the whole wall, floor, sky and window get a square swatch in the picker.
const SWATCH = { wall: 1, floor: 1, view: 1 };
const WINDOW_SPOTS = { view: 1 };                    // swatches drawn as a little window
/* ---------- the rooms ----------
   Each room: its spots, where its wall meets its floor (cats above it are "up high"), how to
   draw its fixed parts, and where cats can be. The Kitchen and the Garden add themselves in
   js/kitchen.js and js/garden.js. */
const ROOMS = [];
const curRoom = () => ROOMS[roomOpen(S.roomView) && ROOMS[S.roomView] ? S.roomView : 0];
const roomOfSpot = spot => Math.max(0, ROOMS.findIndex(R => R.spots.includes(spot)));
const roomPut = spot => S.room.put[spot] || ROOM_FREE[spot] || "";
const roomOwns = id => { const it = roomItem(id); return !!it && (it.price === 0 || S.room.own.includes(id)); };
// Trying something before buying it: { spot, id } for one thing, or { style } for a Style. It shows in
// the room while the picker (or its "Buy?" card) is open, and is never saved.
let roomTry = null;
let roomFocus = null;                            // the picker group whose spot glows ("style" or a spot id)
function roomShow(spot) {
  const tr = roomTry;
  if (tr && overlay && (overlay.kind === "roompick" || overlay.kind === "buy")) {
    if (tr.spot === spot) return tr.id;
    if (tr.style) { const st = styleById(tr.style), i = st ? styleRoom(st).pieces.indexOf(spot) : -1; if (i >= 0) return st.put[i]; }
  }
  return roomPut(spot);
}

/* ---------- drawing helpers, in room units ---------- */
function fs(fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
}
function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
function line(pts, stroke, lw) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); fs(null, stroke, lw); }
function heartPath(x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.6, y - s * 0.2, x - s * 0.25, y - s * 0.65, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.25, y - s * 0.65, x + s * 0.6, y - s * 0.2, x, y + s * 0.3);
  ctx.closePath();
}
function starPath(x, y, r, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (inner || 0.48) : r; ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  ctx.closePath();
}
function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(255, 230, 150, 0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
const wob = (speed, seed) => (S.calm ? 0 : Math.sin(time * speed + (seed || 0)));
function fishShape(x, y, s, dir) {           // a little fish, facing left (dir 1) or right (dir -1)
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.58, 0, 0, Math.PI * 2);
  ctx.moveTo(x + dir * s * 0.8, y); ctx.lineTo(x + dir * s * 1.5, y - s * 0.6); ctx.lineTo(x + dir * s * 1.5, y + s * 0.6); ctx.closePath();
}
function pot(w, h, fill, dark) {             // a flower pot standing on 0,0
  poly([[-w / 2, -h], [w / 2, -h], [w * 0.38, 0], [-w * 0.38, 0]]); fs(fill, dark);
  rr(-w / 2 - 3, -h - 2, w + 6, 9, 4); fs(fill, dark);
}
function leaf(x, y, len, wid, ang, fill, dark) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.closePath();
  fs(fill, dark, 2.2);
  line([[2, 0], [len * 0.85, 0]], dark, 1.4);
  ctx.restore();
}

/* ---------- wall, floor and window patterns: drawn into a rectangle ---------- */
const PATTERNS = {
  w_plain: (x, y, w, h) => {
    ctx.fillStyle = "#FFF1DE"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#FBE4C8"; for (let i = 0; i < w; i += 45) ctx.fillRect(x + i, y, 2, h);
  },
  w_stripe: (x, y, w, h) => {
    ctx.fillStyle = "#E6F0FF"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#CFE0FA"; for (let i = 0; i < w; i += 34) ctx.fillRect(x + i, y, 15, h);
  },
  w_dots: (x, y, w, h) => {
    ctx.fillStyle = "#FFE8EE"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#FFC4D3";
    for (let r = 0, j = 0; r < h + 30; r += 30, j++) for (let c = (j % 2) * 15; c < w + 30; c += 30) { oval(x + c, y + r, 5, 5); ctx.fill(); }
  },
  w_flower: (x, y, w, h) => {
    ctx.fillStyle = "#E9F6E3"; ctx.fillRect(x, y, w, h);
    for (let r = 12, j = 0; r < h + 46; r += 46, j++) for (let c = 12 + (j % 2) * 23; c < w + 46; c += 46) {
      ctx.fillStyle = "#FFFFFF";
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; oval(x + c + Math.cos(a) * 5, y + r + Math.sin(a) * 5, 4, 4); ctx.fill(); }
      ctx.fillStyle = "#FFD23F"; oval(x + c, y + r, 3, 3); ctx.fill();
    }
  },
  w_fish: (x, y, w, h) => {
    ctx.fillStyle = "#E2F2FA"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#BCDDEE";
    for (let r = 16, j = 0; r < h + 48; r += 48, j++) for (let c = 16 + (j % 2) * 24; c < w + 48; c += 48) { fishShape(x + c, y + r, 7, j % 2 ? -1 : 1); ctx.fill(); }
  },
  f_wood: (x, y, w, h) => {
    ctx.fillStyle = "#DDA66A"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#C08A50"; ctx.lineWidth = 2;
    for (let r = 0, j = 0; r < h; r += 25, j++) {
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x + w, y + r); ctx.stroke();
      for (let c = (j * 67) % 120; c < w; c += 120) { ctx.beginPath(); ctx.moveTo(x + c, y + r); ctx.lineTo(x + c, y + r + 25); ctx.stroke(); }
    }
  },
  f_tile: (x, y, w, h) => {
    ctx.fillStyle = "#F4EFE8"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#DCD2C4"; ctx.lineWidth = 2;
    for (let r = 0; r <= h; r += 36) { ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x + w, y + r); ctx.stroke(); }
    for (let c = 0; c <= w; c += 36) { ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + h); ctx.stroke(); }
  },
  f_check: (x, y, w, h) => {
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#F9CFD9";
    for (let r = 0, j = 0; r < h; r += 30, j++) for (let c = (j % 2) * 30; c < w; c += 60) ctx.fillRect(x + c, y + r, 30, 30);
  },
  f_carpet: (x, y, w, h) => {
    ctx.fillStyle = "#BFCDF2"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#AABBE8";
    for (let i = 0; i < w * h / 160; i++) { oval(x + (i * 37.3) % w, y + (i * 61.7 + (i % 7) * 3) % h, 1.6, 1.6); ctx.fill(); }
  },
  f_bamboo: (x, y, w, h) => {
    ctx.fillStyle = "#EAD69C"; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#CDB574"; ctx.lineWidth = 2;
    for (let c = 0, j = 0; c < w; c += 14, j++) {
      ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + c, y + h); ctx.stroke();
      for (let r = (j * 23) % 40; r < h; r += 40) { ctx.beginPath(); ctx.moveTo(x + c + 3, y + r); ctx.lineTo(x + c + 11, y + r); ctx.stroke(); }
    }
  },
  // window views: x, y, w, h is the glass
  v_day: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#8FD3FF"); g.addColorStop(1, "#DDF3FF");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    oval(x + w * 0.74, y + h * 0.24, 11, 11); fs("#FFD84D", "#F2A900", 2.5);
    const cx = x + w * 0.32 + wob(0.3) * 4;
    ctx.fillStyle = "#FFFFFF"; for (const [dx, dy, r] of [[-10, 2, 8], [0, -3, 10], [11, 2, 8]]) { oval(cx + dx, y + h * 0.34 + dy, r, r * 0.8); ctx.fill(); }
    oval(x + w * 0.3, y + h * 1.02, w * 0.6, h * 0.3); fs("#8FD67A");
    oval(x + w * 0.85, y + h * 1.06, w * 0.45, h * 0.28); fs("#7CC86A");
  },
  v_rain: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#8FA3BF"); g.addColorStop(1, "#C3CFDF");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#E3E8F0"; for (const [dx, dy, r] of [[-14, 2, 10], [0, -4, 13], [15, 2, 10]]) { oval(x + w * 0.5 + dx, y + h * 0.2 + dy, r, r * 0.8); ctx.fill(); }
    oval(x + w * 0.5, y + h * 1.05, w * 0.7, h * 0.24); fs("#7FAF7A");
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)"; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const fall = S.calm ? 0 : time * 70;
      const rx = x + (i * 23.7) % w, ry = y + h * 0.3 + ((i * 41.3 + fall) % (h * 0.7));
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 8); ctx.stroke();
    }
  },
  v_sunset: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#FF8F70"); g.addColorStop(1, "#FFD49A");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    oval(x + w * 0.5, y + h * 0.82, 20, 20); fs("#FF6F59");
    line([[x + w * 0.22, y + h * 0.28], [x + w * 0.26, y + h * 0.33], [x + w * 0.3, y + h * 0.28]], "#8A3A3A", 2);
    line([[x + w * 0.36, y + h * 0.2], [x + w * 0.39, y + h * 0.24], [x + w * 0.42, y + h * 0.2]], "#8A3A3A", 2);
    oval(x + w * 0.2, y + h * 1.05, w * 0.5, h * 0.25); fs("#9A7BC0");
    oval(x + w * 0.85, y + h * 1.08, w * 0.5, h * 0.26); fs("#86669F");
  },
  v_stars: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#1F2560"); g.addColorStop(1, "#3D4B92");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.28, 13, 0.6, Math.PI * 2 - 0.6); ctx.arc(x + w * 0.7 + 6.5, y + h * 0.28, 8.5, -1.049, 1.049, true); ctx.closePath();
    fs("#FFF1A8");
    for (let i = 0; i < 11; i++) {
      ctx.globalAlpha = 0.55 + 0.45 * (S.calm ? 1 : Math.abs(Math.sin(time * 1.3 + i * 1.7)));
      ctx.fillStyle = "#FFFFFF"; twinkle(x + (i * 31.7 + 9) % w, y + (i * 19.3 + 7) % (h * 0.8), i % 3 ? 2 : 3.2);
    }
    ctx.globalAlpha = 1;
    oval(x + w * 0.4, y + h * 1.06, w * 0.7, h * 0.22); fs("#28306E");
  },
  v_rainbow: (x, y, w, h) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#A9E0FF"); g.addColorStop(1, "#E8F7FF");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ["#FF6B6B", "#FFA24D", "#FFD84D", "#7ED36B", "#5AA9FF", "#9C7BF4"].forEach((col, i) => {
      ctx.strokeStyle = col; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.95, 64 - i * 6, Math.PI, 0); ctx.stroke();
    });
    ctx.fillStyle = "#FFFFFF";
    for (const cx of [x + w * 0.12, x + w * 0.88]) for (const [dx, dy, r] of [[-8, 0, 8], [3, -4, 10], [12, 1, 7]]) { oval(cx + dx, y + h * 0.86 + dy, r, r * 0.8); ctx.fill(); }
  },
};

/* ---------- the things: each drawn around its anchor at 0,0 ---------- */
function picFrame(fill, dark, inner) {
  rr(-38, -30, 76, 60, 7); fs(fill, dark);
  rr(-30, -22, 60, 44, 4); fs(inner, dark, 2);
}
const THINGS = {
  p_fish: () => { picFrame("#D9A86C", "#8A5A2E", "#CDEBFA"); fishShape(-3, 0, 12, 1); fs("#FF9E4A", "#C25E12", 2.4); ctx.fillStyle = "#2E2E44"; oval(-9, -2, 1.8, 1.8); ctx.fill(); oval(18, -10, 3, 3); fs(null, "#8CC3E0", 1.6); oval(14, -16, 2, 2); fs(null, "#8CC3E0", 1.6); },
  p_heart: () => { picFrame("#F7B8C8", "#C26A86", "#FFF1F4"); heartPath(0, 3, 34); fs("#F08AA6", "#C26A86", 2.4); },
  p_hills: () => {
    picFrame("#FFFFFF", "#9AA7C9", "#BFE6FF");
    ctx.save(); rr(-30, -22, 60, 44, 4); ctx.clip();
    oval(16, -9, 6, 6); fs("#FFD84D");
    oval(-14, 26, 30, 20); fs("#7CC86A"); oval(18, 30, 30, 22); fs("#8FD67A");
    ctx.restore(); rr(-30, -22, 60, 44, 4); fs(null, "#9AA7C9", 2);
  },
  p_cat: () => {
    picFrame("#FFD23F", "#B8860B", "#FFF6DA");
    ctx.save(); rr(-30, -22, 60, 44, 4); ctx.clip();
    drawCat(0, 6, 40, S.hero, { wake: 1, still: true, noShadow: true, hat: S.hat, neck: S.neck, seed: 4 });
    ctx.restore(); rr(-30, -22, 60, 44, 4); fs(null, "#B8860B", 2);
  },
  s_books: () => {
    for (const [x, w, h, f, d] of [[-46, 10, 34, "#8DB8E8", "#4A72A8"], [-35, 8, 28, "#F4A08E", "#B5574A"], [-26, 12, 38, "#A8D49A", "#4E8A45"]]) {
      rr(x, -h, w, h, 2); fs(f, d, 2.4); line([[x + 2, -h + 6], [x + w - 2, -h + 6]], d, 1.6);
    }
    ctx.save(); ctx.translate(-8, 0); ctx.rotate(0.35); rr(-1, -32, 10, 32, 2); fs("#F2CF6B", "#A8862A", 2.4); ctx.restore();
    rr(22, -18, 18, 18, 4); fs("#FFFFFF", "#9AA7C9", 2.4);                      // a mug
    ctx.beginPath(); ctx.arc(41, -10, 5, -Math.PI / 2, Math.PI / 2); fs(null, "#9AA7C9", 2.4);
    ctx.fillStyle = "#F4A6BE"; heartPath(31, -9, 9); ctx.fill();
  },
  s_jar: () => {
    rr(-14, -36, 28, 36, 7); fs("rgba(214, 238, 255, 0.8)", "#7FA6C9", 2.6);
    ctx.save(); rr(-14, -36, 28, 36, 7); ctx.clip();
    for (const [x, y, d] of [[-6, -6, 1], [5, -9, -1], [-2, -15, -1], [7, -20, 1], [-6, -24, 1]]) { fishShape(x, y, 4, d); fs("#FFA24D", "#C25E12", 1.2); }
    ctx.restore();
    rr(-16, -43, 32, 9, 4); fs("#F2A35E", "#B5672A", 2.4);
    for (const [x, h, f, d] of [[-46, 22, "#C7A8EE", "#7A5BB0"], [-46, 12, "#8FD9C4", "#3E8C78"]]) { rr(x, -h - (h === 12 ? 22 : 0), 26, h === 12 ? 10 : 22, 2); fs(f, d, 2.2); }
  },
  s_vine: () => {
    for (let i = 0; i < 6; i++) leaf(-4 + i * 2, -14, 14, 6, -2.2 + i * 0.4, "#6FCF5A", "#2F7D32");
    pot(26, 20, "#E07A5F", "#A6452D");
    ctx.strokeStyle = "#2F7D32"; ctx.lineWidth = 2;
    for (const [sx, ex, ey] of [[-10, -30, 44], [10, 26, 38]]) {
      const sway = wob(0.9, sx) * 2;
      ctx.beginPath(); ctx.moveTo(sx, -12); ctx.quadraticCurveTo(sx * 2.4, 6, ex + sway, ey); ctx.stroke();
      for (let k = 0.3; k <= 1; k += 0.23) {
        const px = lerp(sx, ex + sway, k), py = lerp(-12, ey, k);
        leaf(px, py, 10, 5, sx < 0 ? 2.6 : 0.5, "#82DD5C", "#2F7D32");
      }
    }
  },
  s_trophy: () => {
    rr(-16, -6, 32, 6, 2); fs("#B8860B", "#7A5A08", 2);
    rr(-5, -16, 10, 10, 2); fs("#FFD23F", "#B8860B", 2.4);
    ctx.beginPath(); ctx.moveTo(-17, -46); ctx.lineTo(17, -46); ctx.quadraticCurveTo(16, -16, 0, -16); ctx.quadraticCurveTo(-16, -16, -17, -46); ctx.closePath();
    fs("#FFD23F", "#B8860B", 2.6);
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 18, -38, 6, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); fs(null, "#B8860B", 3); }
    ctx.fillStyle = "#D9920C"; paw(0, -32, 9);
    ctx.fillStyle = "#FFFFFF"; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(wob(2)); twinkle(24, -50, 4); ctx.globalAlpha = 1;
  },
  h_lantern: () => {
    line([[0, 0], [0, 32]], "#8A6A4A", 2);
    glow(0, 58, 46, "rgba(255, 200, 150, 0.45)");
    const sw = wob(1.1) * 0.05;
    ctx.save(); ctx.translate(0, 32); ctx.rotate(sw);
    oval(0, 26, 22, 24); fs("#FF9D8A", "#C2513D", 2.6);
    for (const k of [-0.55, 0, 0.55]) { oval(0, 26, Math.abs(k) * 22 + 0.5, 23.5); fs(null, "#E0705C", 1.6); }
    rr(-9, -1, 18, 6, 2); fs("#C2513D"); rr(-8, 48, 16, 6, 2); fs("#C2513D");
    line([[0, 54], [0, 66]], "#C2513D", 2.4);
    ctx.restore();
  },
  h_plant: () => {
    for (const x of [-16, 0, 16]) line([[0, 0], [x, 50]], "#C9A27A", 1.6);
    for (let i = 0; i < 7; i++) {
      const sway = wob(0.8, i) * 0.08;
      leaf(-14 + i * 4.6, 60, 22 + (i % 3) * 6, 6, Math.PI / 2 + (i - 3) * 0.22 + sway, "#6FCF5A", "#2F7D32");
    }
    ctx.beginPath(); ctx.moveTo(-19, 48); ctx.lineTo(19, 48); ctx.quadraticCurveTo(18, 68, 0, 68); ctx.quadraticCurveTo(-18, 68, -19, 48); ctx.closePath();
    fs("#FFFFFF", "#9AA7C9", 2.6);
    line([[-15, 56], [15, 56]], "#FF9DB5", 2.4);
  },
  h_mobile: () => {
    line([[0, 0], [0, 26]], "#8A6A4A", 2);
    const tilt = wob(0.7) * 0.06;
    ctx.save(); ctx.translate(0, 28); ctx.rotate(tilt);
    rr(-28, -2, 56, 5, 2); fs("#D9A86C", "#8A5A2E", 2);
    for (const [x, y, kind] of [[-24, 34, "star"], [0, 50, "moon"], [24, 32, "fish"]]) {
      const sw = wob(1.3, x) * 0.15;
      ctx.save(); ctx.translate(x, 2); ctx.rotate(sw);
      line([[0, 0], [0, y - 10]], "#8A6A4A", 1.4);
      if (kind === "star") { starPath(0, y, 10); fs("#FFD23F", "#D9920C", 2.2); }
      else if (kind === "moon") { ctx.beginPath(); ctx.arc(0, y, 10, 0.6, Math.PI * 2 - 0.6); ctx.arc(5, y, 6.5, -1.049, 1.049, true); ctx.closePath(); fs("#FFF1A8", "#C9A227", 2.2); }
      else { fishShape(0, y, 8, 1); fs("#8DB8E8", "#4A72A8", 2.2); }
      ctx.restore();
    }
    ctx.restore();
  },
  l_cactus: () => {
    rr(-6, -40, 12, 28, 6); fs("#7BC86C", "#2F7D32", 2.4);
    ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(-12, -24); ctx.lineTo(-12, -32); fs(null, "#2F7D32", 5); ctx.beginPath(); ctx.moveTo(-6, -24); ctx.lineTo(-12, -24); ctx.lineTo(-12, -32); fs(null, "#7BC86C", 2);
    ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(12, -28); ctx.lineTo(12, -36); fs(null, "#2F7D32", 5); ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(12, -28); ctx.lineTo(12, -36); fs(null, "#7BC86C", 2);
    oval(0, -41, 3.5, 3.5); fs("#FF7EB6", "#B02567", 1.6);
    pot(22, 14, "#E07A5F", "#A6452D");
  },
  l_flower: () => {
    line([[0, -14], [0, -30]], "#2F7D32", 3);
    leaf(0, -20, 12, 5, -0.5, "#7BC86C", "#2F7D32"); leaf(0, -24, 12, 5, Math.PI + 0.5, "#7BC86C", "#2F7D32");
    const tilt = wob(0.6) * 0.08;
    ctx.save(); ctx.translate(0, -34); ctx.rotate(tilt);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; oval(Math.cos(a) * 8, Math.sin(a) * 8, 4.5, 4.5); fs("#FFD23F", "#D9920C", 1.4); }
    oval(0, 0, 6, 6); fs("#8A5A2E", "#5C3A1B", 1.6);
    ctx.restore();
    pot(22, 15, "#8DB8E8", "#4A72A8");
  },
  l_fishbowl: () => {
    oval(0, -19, 19, 18); fs("rgba(190, 230, 255, 0.8)", "#6FA3CF", 2.6);
    ctx.save(); oval(0, -19, 17, 16); ctx.clip();
    ctx.fillStyle = "#E8D49A"; ctx.fillRect(-20, -8, 40, 10);
    const fx = wob(1.2) * 6, dir = Math.cos(time * 1.2) > 0 || S.calm ? -1 : 1;
    fishShape(fx, -20, 5, dir); fs("#FF9E4A", "#C25E12", 1.6);
    ctx.restore();
    oval(0, -35, 10, 3); fs("#E2F2FA", "#6FA3CF", 2);
  },
  m_round: () => {
    glow(0, -96, 58, "rgba(255, 228, 140, 0.5)");
    oval(0, -3, 18, 5); fs("#9AA6D6", "#4A5596", 2.6);
    line([[0, -4], [0, -86]], "#4A5596", 5); line([[0, -4], [0, -86]], "#9AA6D6", 2.4);
    rr(-24, -114, 48, 30, 14); fs("#FFE08A", "#C9A227", 2.8);
  },
  m_tall: () => {
    glow(0, -108, 58, "rgba(255, 228, 140, 0.5)");
    for (const x of [-16, 16]) line([[x, 0], [0, -64]], "#8A5A2E", 5);
    for (const x of [-16, 16]) line([[x, 0], [0, -64]], "#D9A86C", 2.2);
    line([[0, -60], [0, -96]], "#8A5A2E", 4);
    poly([[-13, -124], [13, -124], [26, -94], [-26, -94]]); fs("#FFFFFF", "#9AA7C9", 2.8);
    line([[-20, -102], [20, -102]], "#FF9DB5", 2.4);
  },
  m_mush: () => {
    glow(0, -48, 52, "rgba(255, 200, 140, 0.5)");
    rr(-10, -52, 20, 52, 9); fs("#FFF3D6", "#C9A27A", 2.6);
    ctx.beginPath(); ctx.ellipse(0, -50, 34, 30, 0, Math.PI, 0); ctx.closePath(); fs("#F08A7E", "#B5574F", 2.8);
    for (const [x, y, r] of [[-18, -60, 5], [2, -70, 6], [19, -58, 4.5], [-4, -55, 3.5]]) { oval(x, y, r, r); fs("#FFFFFF"); }
  },
  t_fern: () => {
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.42 + wob(0.7, i) * 0.03, len = 44 - Math.abs(i - 3) * 4;
      ctx.save(); ctx.translate(0, -28); ctx.rotate(a);
      line([[0, 0], [len, 0]], "#2F7D32", 2);
      for (let k = 8; k < len; k += 7) { leaf(k, 0, 9, 3.5, -0.9, "#5DBB63", "#2F7D32"); leaf(k, 0, 9, 3.5, 0.9, "#5DBB63", "#2F7D32"); }
      ctx.restore();
    }
    pot(36, 30, "#E07A5F", "#A6452D");
  },
  t_snake: () => {
    for (const [x, h, a] of [[-12, 70, -0.15], [-4, 92, -0.05], [5, 84, 0.06], [13, 66, 0.16], [0, 58, 0]]) {
      ctx.save(); ctx.translate(x, -30); ctx.rotate(a + wob(0.5, x) * 0.02);
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-7, -h * 0.6, 0, -h); ctx.quadraticCurveTo(7, -h * 0.6, 6, 0); ctx.closePath();
      fs("#4FA35B", "#2F6B3A", 2.4);
      line([[-2, -h * 0.25], [2, -h * 0.3]], "#C9D96A", 1.6); line([[-2, -h * 0.5], [2, -h * 0.55]], "#C9D96A", 1.6);
      ctx.restore();
    }
    pot(34, 30, "#FFFFFF", "#9AA7C9");
    line([[-14, -18], [14, -18]], "#8DB8E8", 2.6);
  },
  t_leaf: () => {
    for (const [x, y, r, a] of [[-14, -66, 17, -0.5], [14, -78, 19, 0.4], [-2, -100, 16, 0], [18, -48, 13, 0.8], [-20, -44, 12, -0.9]]) {
      line([[0, -30], [x, y]], "#2F7D32", 2.4);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + wob(0.6, x) * 0.04);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); fs("#3FAE6A", "#1E6B3E", 2.4);
      line([[0, r * 0.82], [0, -r * 0.6]], "#1E6B3E", 1.6);
      for (const d of [-1, 1]) line([[d * r, -2], [d * r * 0.45, 0]], "#1E6B3E", 2);
      ctx.restore();
    }
    pot(36, 30, "#F2C14E", "#A8730A");
  },
  t_banana: () => {
    rr(-5, -84, 10, 56, 4); fs("#9BC46A", "#4F7A2A", 2.4);
    for (const [a, len] of [[-2.5, 50], [-1.9, 56], [-1.25, 56], [-0.65, 50], [-1.55, 44]]) {
      ctx.save(); ctx.translate(0, -84); ctx.rotate(a + wob(0.5, a) * 0.04);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -14, len, 4); ctx.quadraticCurveTo(len * 0.5, 10, 0, 0); ctx.closePath();
      fs("#7ED36B", "#2F7D32", 2.4);
      line([[2, 0], [len * 0.9, 3]], "#2F7D32", 1.6);
      ctx.restore();
    }
    for (const [x, y] of [[8, -60], [12, -55], [6, -52]]) { ctx.beginPath(); ctx.ellipse(x, y, 7, 2.6, 0.6, 0, Math.PI * 2); fs("#FFD84D", "#B8860B", 1.6); }
    pot(40, 30, "#A992D6", "#6A55A0");
  },
  r_small: () => {
    rr(-34, -10, 68, 10, 4); fs("#B59AD6", "#6E55A6", 2.6);
    rr(-7, -92, 14, 84, 3); fs("#E8C99A", "#A6834F", 2.6);
    for (let y = -86; y < -12; y += 7) line([[-6, y], [6, y + 3]], "#A6834F", 1.6);
    rr(-32, -100, 64, 11, 5); fs("#B59AD6", "#6E55A6", 2.6);
    const sw = wob(1.4) * 3;
    line([[26, -90], [26 + sw, -64]], "#6E55A6", 1.6); oval(26 + sw, -60, 5, 5); fs("#FF7EB6", "#B02567", 2);
  },
  r_tall: () => {
    rr(-40, -10, 80, 10, 4); fs("#7FC6E8", "#2F7FA8", 2.6);
    for (const [x, top, bottom] of [[-20, -104, -8], [14, -192, -8]]) {
      rr(x - 7, top, 14, bottom - top, 3); fs("#E8C99A", "#A6834F", 2.6);
      for (let y = top + 6; y < bottom - 4; y += 7) line([[x - 6, y], [x + 6, y + 3]], "#A6834F", 1.6);
    }
    rr(-42, -112, 50, 11, 5); fs("#7FC6E8", "#2F7FA8", 2.6);
    rr(-14, -200, 54, 11, 5); fs("#7FC6E8", "#2F7FA8", 2.6);
    rr(12, -150, 28, 30, 6); fs("#7FC6E8", "#2F7FA8", 2.6);                         // a little box to hide in
    oval(26, -134, 8, 9); fs("#2F5F7E");
    const sw = wob(1.2) * 3;
    line([[-38, -102], [-38 + sw, -78]], "#2F7FA8", 1.6); oval(-38 + sw, -74, 5, 5); fs("#FFD23F", "#B8860B", 2);
  },
  r_castle: () => {
    rr(-36, -186, 72, 186, 6); fs("#F2E2C8", "#A68A64", 2.8);
    ctx.strokeStyle = "#D8C3A0"; ctx.lineWidth = 1.6;
    for (let y = -170, j = 0; y < -6; y += 18, j++) {
      ctx.beginPath(); ctx.moveTo(-33, y); ctx.lineTo(33, y); ctx.stroke();
      for (let x = -33 + (j % 2) * 12; x < 33; x += 24) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 18); ctx.stroke(); }
    }
    for (const x of [-36, -14, 8, 26]) { rr(x, -198, 12, 14, 2); fs("#F2E2C8", "#A68A64", 2.6); }
    line([[0, -198], [0, -232]], "#8A5A2E", 2.4);
    const flap = wob(3) * 3;
    poly([[0, -232], [22, -226 + flap], [0, -219]]); fs("#FF7EB6", "#B02567", 2);
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14, -34); ctx.arc(0, -34, 14, Math.PI, 0); ctx.lineTo(14, 0); ctx.closePath(); fs("#5C3A1B", "#3B2614", 2.4);
    ctx.beginPath(); ctx.moveTo(-8, -150); ctx.lineTo(-8, -160); ctx.arc(0, -160, 8, Math.PI, 0); ctx.lineTo(8, -150); ctx.closePath(); fs("#2F3B6E", "#A68A64", 2.4);
    rr(-44, -120, 88, 11, 5); fs("#FF9DB5", "#C2456E", 2.6);                        // a balcony to sit on
  },
  u_round: () => { oval(0, 0, 96, 24); fs("#FFB385", "#E07A4F", 3); oval(0, 0, 72, 17); fs("#FFD3B5"); oval(0, 0, 40, 9); fs("#FFB385"); },
  u_stripe: () => {
    rr(-100, -22, 200, 44, 20); fs("#BFD7FF", "#5F86C9", 3);
    ctx.save(); rr(-100, -22, 200, 44, 20); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; for (let x = -88; x < 100; x += 32) ctx.fillRect(x, -22, 14, 44);
    ctx.restore(); rr(-100, -22, 200, 44, 20); fs(null, "#5F86C9", 3);
    for (const d of [-1, 1]) for (let y = -16; y <= 16; y += 6) line([[d * 100, y], [d * 108, y]], "#5F86C9", 1.6);
  },
  u_paw: () => {
    oval(0, 0, 96, 25); fs("#FFC6D9", "#D46A8E", 3);
    ctx.save(); ctx.scale(1, 0.42); ctx.fillStyle = "#FF8FB3"; paw(0, 6, 46); ctx.restore();
  },
  u_rainbow: () => {
    ["#FF8A8A", "#FFB066", "#FFE08A", "#9BE38A", "#8CC4FF", "#C2A5FF"].forEach((col, i) => { oval(0, 0, 100 - i * 13, 26 - i * 3.4); fs(col, i ? null : "#B85C8A", 3); });
  },
  o_rope: () => {
    rr(-22, -9, 44, 9, 3); fs("#B59AD6", "#6E55A6", 2.6);
    rr(-8, -82, 16, 74, 3); fs("#E8C99A", "#A6834F", 2.6);
    for (let y = -76; y < -10; y += 6) line([[-7, y], [7, y + 3]], "#A6834F", 1.6);
    rr(-13, -90, 26, 9, 4); fs("#B59AD6", "#6E55A6", 2.6);
    const sw = wob(1.5) * 3;
    line([[10, -86], [14 + sw, -58]], "#6E55A6", 1.6); oval(14 + sw, -54, 5, 5); fs("#FFD23F", "#B8860B", 2);
  },
  o_fish: () => {
    rr(-22, -9, 44, 9, 3); fs("#7FC6E8", "#2F7FA8", 2.6);
    rr(-8, -78, 16, 70, 3); fs("#E8C99A", "#A6834F", 2.6);
    for (let y = -72; y < -10; y += 6) line([[-7, y], [7, y + 3]], "#A6834F", 1.6);
    fishShape(-4, -88, 18, 1); fs("#8DB8E8", "#4A72A8", 2.8);
    ctx.fillStyle = "#FFFFFF"; oval(-12, -91, 3.5, 3.5); ctx.fill(); ctx.fillStyle = INK; oval(-12, -91, 1.8, 1.8); ctx.fill();
  },
  o_cactus: () => {
    rr(-12, -92, 24, 84, 12); fs("#7BC86C", "#2F7D32", 2.8);
    for (let y = -84; y < -14; y += 7) line([[-10, y], [10, y + 2]], "#5DA84F", 1.4);
    ctx.beginPath(); ctx.moveTo(-12, -46); ctx.lineTo(-22, -46); ctx.lineTo(-22, -64); fs(null, "#2F7D32", 12); ctx.beginPath(); ctx.moveTo(-12, -46); ctx.lineTo(-22, -46); ctx.lineTo(-22, -64); fs(null, "#7BC86C", 7);
    ctx.beginPath(); ctx.moveTo(12, -58); ctx.lineTo(22, -58); ctx.lineTo(22, -74); fs(null, "#2F7D32", 12); ctx.beginPath(); ctx.moveTo(12, -58); ctx.lineTo(22, -58); ctx.lineTo(22, -74); fs(null, "#7BC86C", 7);
    oval(0, -94, 5, 5); fs("#FF7EB6", "#B02567", 2);
    rr(-18, -10, 36, 10, 3); fs("#E07A5F", "#A6452D", 2.6);
  },
  b_box: () => {
    poly([[-34, -36], [-46, -50], [-24, -54], [-14, -36]]); fs("#C8935A", "#8A5A2E", 2.6);
    poly([[34, -36], [46, -50], [24, -54], [14, -36]]); fs("#C8935A", "#8A5A2E", 2.6);
    rr(-34, -36, 68, 36, 3); fs("#D9A86C", "#8A5A2E", 2.8);
    line([[-34, -30], [34, -30]], "#B98349", 2);
    rr(-10, -24, 20, 9, 2); fs("#F4E3C4", "#B98349", 1.6);
  },
  b_basket: () => {
    rr(-40, -30, 80, 30, 14); fs("#E3B26B", "#9A6B30", 2.8);
    ctx.save(); rr(-40, -30, 80, 30, 14); ctx.clip();
    ctx.strokeStyle = "#C28E46"; ctx.lineWidth = 1.6;
    for (let x = -44; x < 44; x += 8) { ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x + 8, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 8, -30); ctx.lineTo(x, 0); ctx.stroke(); }
    ctx.restore();
    oval(0, -29, 38, 7); fs("#C28E46", "#9A6B30", 2.6);
    oval(0, -30, 31, 5); fs("#FFE3EE", "#D46A8E", 2);
  },
  b_round: () => {
    oval(0, -14, 42, 16); fs("#94BFEA", "#4A72B0", 2.8);
    oval(0, -17, 28, 9); fs("#E3EEFA", "#4A72B0", 2);
    oval(-20, -22, 9, 3); fs("rgba(255,255,255,0.45)");
  },
  b_cave: () => {
    for (const d of [-1, 1]) { poly([[d * 10, -50], [d * 26, -66], [d * 28, -40]]); fs("#C2B0F2", "#6A55B0", 2.6); }
    ctx.beginPath(); ctx.ellipse(0, 0, 40, 56, 0, Math.PI, 0); ctx.closePath(); fs("#C2B0F2", "#6A55B0", 2.8);
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 36, 0, Math.PI, 0); ctx.closePath(); fs("#4B3C7E", "#6A55B0", 2.4);
    oval(0, -2, 22, 5); fs("#EDE6FF", "#6A55B0", 2);
  },
  b_cloud: () => {
    const puff = () => { ctx.beginPath(); addRR(-42, -24, 84, 24, 12); for (const [x, y, r] of [[-26, -24, 16], [0, -32, 21], [25, -25, 16]]) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); } };
    puff(); fs(null, "#9AB3E0", 6); puff(); fs("#FFFFFF");
    oval(0, -22, 26, 7); fs("#EAF2FF", "#B9CBEA", 2);
    ctx.fillStyle = "#FFD23F";
    for (const [x, y, i] of [[-36, -44, 0], [38, -42, 1]]) { ctx.globalAlpha = 0.5 + 0.5 * Math.abs(wob(1.6, i * 2)); twinkle(x, y, 4); }
    ctx.globalAlpha = 1;
  },
  c_round: () => { oval(0, -8, 33, 11); fs("#FFB37A", "#C27236", 2.8); oval(0, -10, 26, 7); fs("#FFD0A6"); oval(0, -10, 3, 2); fs("#C27236"); },
  c_heart: () => { ctx.save(); ctx.translate(0, -10); ctx.scale(1, 0.5); heartPath(0, 6, 64); fs("#F7A3C0", "#C25A82", 4); ctx.restore(); },
  c_star: () => { ctx.save(); ctx.translate(0, -10); ctx.scale(1, 0.5); starPath(0, 0, 36, 0.55); fs("#FFDB7A", "#C9A23A", 4.5); ctx.restore(); },
  c_bean: () => {
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.bezierCurveTo(-42, -30, -18, -40, 0, -34); ctx.bezierCurveTo(20, -42, 42, -30, 36, 0); ctx.closePath();
    fs("#8FD4B4", "#3E8C6C", 2.8);
    ctx.beginPath(); ctx.moveTo(-16, -18); ctx.quadraticCurveTo(0, -10, 18, -20); fs(null, "#3E8C6C", 2);
    oval(-18, -26, 8, 3); fs("rgba(255,255,255,0.4)");
  },
  y_yarn: () => {
    oval(0, -11, 11, 11); fs("#F7A3C0", "#C25A82", 2.6);
    ctx.save(); oval(0, -11, 11, 11); ctx.clip();
    for (const k of [-6, 0, 6]) { ctx.beginPath(); ctx.ellipse(k, -11, 4, 12, 0.5, 0, Math.PI * 2); fs(null, "#C25A82", 1.4); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.quadraticCurveTo(18, 2, 24, -3); fs(null, "#C25A82", 2);
  },
  y_mouse: () => {
    ctx.beginPath(); ctx.moveTo(12, -6); ctx.quadraticCurveTo(24, -2, 22, -12); fs(null, "#6B7089", 2);
    ctx.beginPath(); ctx.ellipse(0, -8, 14, 8, 0, 0, Math.PI * 2); fs("#B8BCCB", "#6B7089", 2.6);
    oval(-8, -15, 4.5, 4.5); fs("#FFB3C6", "#6B7089", 2);
    ctx.fillStyle = INK; oval(-11, -9, 1.6, 1.6); ctx.fill();
    ctx.fillStyle = "#FF6F8E"; oval(-14.5, -7, 2, 2); ctx.fill();
  },
  y_track: () => {
    oval(0, -9, 24, 9); fs(null, "#2B5FA8", 8); oval(0, -9, 24, 9); fs(null, "#5AA9FF", 4.5);
    const a = S.calm ? 1 : time * 2.4;
    oval(Math.cos(a) * 24, -9 + Math.sin(a) * 9, 4.5, 4.5); fs("#FFD23F", "#B8860B", 1.8);
    line([[0, -9], [0, -26]], "#8A5A2E", 2.4);
    for (const d of [-1, 1]) leaf(0, -26, 10, 3.5, -Math.PI / 2 + d * 0.5 + wob(2) * 0.1, "#FF9DB5", "#C2456E");
  },
  d_basic: () => {
    for (const [x, y] of [[-8, -17], [0, -19], [8, -17], [-3, -15], [5, -15]]) { oval(x, y, 3.5, 2.6); fs("#B9783D", "#7A4A1E", 1.2); }
    poly([[-21, -16], [21, -16], [15, 0], [-15, 0]]); fs("#8DB8E8", "#4A72A8", 2.6);
    ctx.fillStyle = "#FFFFFF"; paw(0, -8, 6);
  },
  d_double: () => {
    rr(-34, -4, 68, 8, 4); fs("#FFD3E0", "#D46A8E", 2.4);
    for (const [x, y] of [[-21, -15], [-14, -16], [-9, -14], [-17, -13]]) { oval(x, y, 3, 2.3); fs("#B9783D", "#7A4A1E", 1.2); }
    poly([[-29, -14], [-3, -14], [-6, -1], [-26, -1]]); fs("#F4A08E", "#B5574A", 2.4);
    oval(16, -14, 11, 2.6); fs("#8CC4FF");
    poly([[3, -14], [29, -14], [26, -1], [6, -1]]); fs("#A8D49A", "#4E8A45", 2.4);
  },
  d_gold: () => {
    fishShape(2, -22, 10, -1); fs("#C3CBE0", "#6B7089", 2);
    ctx.fillStyle = INK; oval(10, -23, 1.6, 1.6); ctx.fill();
    poly([[-24, -17], [24, -17], [17, 0], [-17, 0]]); fs("#FFD23F", "#B8860B", 2.8);
    ctx.fillStyle = "#D9920C"; paw(0, -9, 7);
    ctx.fillStyle = "#FFFFFF"; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(wob(2.2)); twinkle(-20, -26, 4); twinkle(22, -6, 3); ctx.globalAlpha = 1;
  },
};

/* ---------- the faint shapes of empty spots (decorate mode) ----------
   Each is drawn around the spot's anchor, the same way and at the same size as the things
   that go there: a soft white fill, a pale edge, then soft blue dashes, so it shows on a light
   wall and on a night sky alike. */
function gfs(fill) {
  if (fill !== false) { ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.fill(); }
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.setLineDash([]); ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"; ctx.lineWidth = 4.4; ctx.stroke();
  ctx.setLineDash([7, 5]); ctx.strokeStyle = "rgba(70, 82, 156, 0.8)"; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.setLineDash([]);
}
function gline(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); gfs(false); }
function gpot(w, h) { poly([[-w / 2, -h], [w / 2, -h], [w * 0.38, 0], [-w * 0.38, 0]]); gfs(); }
function gleaf(x, y, len, wid, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.closePath();
  gfs(); ctx.restore();
}
function gbowl(w) { poly([[-w, -16], [w, -16], [w * 0.72, 0], [-w * 0.72, 0]]); gfs(); }
const GHOSTS = {
  pic: () => { rr(-38, -30, 76, 60, 7); gfs(); rr(-28, -20, 56, 40, 4); gfs(false); gline([[-24, 14], [-8, -2], [4, 9], [14, 1], [24, 12]]); },
  shelf: () => {
    for (const [x, w, h] of [[-44, 10, 34], [-32, 9, 28], [-20, 12, 38]]) { rr(x, -h, w, h, 2); gfs(); }
    rr(10, -30, 26, 30, 7); gfs(); rr(8, -37, 30, 8, 3); gfs();
  },
  hang: () => { gline([[0, 0], [0, 32]]); oval(0, 58, 22, 24); gfs(); rr(-9, 30, 18, 6, 2); gfs(false); gline([[0, 82], [0, 90]]); },
  sill: () => { for (const a of [-1.9, -1.57, -1.24]) gleaf(0, -14, 24, 6, a); gpot(24, 14); },
  lamp: () => { oval(0, -3, 18, 5); gfs(); gline([[0, -8], [0, -84]]); rr(-24, -114, 48, 30, 14); gfs(); },
  plant: () => { for (let i = 0; i < 5; i++) gleaf(0, -30, 46 + (2 - Math.abs(i - 2)) * 14, 13, -Math.PI / 2 + (i - 2) * 0.42); gpot(36, 30); },
  tree: () => {
    rr(-38, -10, 76, 10, 4); gfs();
    rr(-24, -100, 14, 90, 3); gfs(); rr(-36, -110, 52, 11, 5); gfs();
    rr(10, -130, 14, 120, 3); gfs(); rr(-8, -140, 46, 11, 5); gfs();
  },
  rug: () => { oval(0, 0, 96, 24); gfs(); oval(0, 0, 62, 14); gfs(false); },
  post: () => { rr(-22, -9, 44, 9, 3); gfs(); rr(-8, -82, 16, 74, 3); gfs(); rr(-13, -90, 26, 9, 4); gfs(); },
  bed: () => { oval(0, -16, 44, 17); gfs(); oval(0, -19, 29, 9); gfs(false); },
  cush: () => { oval(0, -9, 33, 11); gfs(); },
  toy: () => { oval(0, -11, 11, 11); gfs(); ctx.beginPath(); ctx.moveTo(9, -4); ctx.quadraticCurveTo(18, 2, 24, -3); gfs(false); },
  bowl: () => gbowl(21),
};

// The fixed parts of the room: wall, floor, window frame and curtains, the shelf board, the sill.
function drawWindow(view, x, y, w, h) {
  rr(x - 6, y - 6, w + 12, h + 12, 9); fs("#FFFFFF", "#B9A48E", 3);
  ctx.save(); rr(x, y, w, h, 4); ctx.clip();
  (PATTERNS[view] || PATTERNS.v_day)(x, y, w, h);
  ctx.restore();
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillRect(x, y + h / 2 - 3, w, 6);
  rr(x, y, w, h, 4); fs(null, "#B9A48E", 2);
}
function drawRoomBase() {
  PATTERNS[roomShow("wall")](0, 0, RW, WALL_Y);
  PATTERNS[roomShow("floor")](0, WALL_Y, RW, RH - WALL_Y);
  const g = ctx.createLinearGradient(0, WALL_Y, 0, WALL_Y + 26);                // a soft shadow where floor meets wall
  g.addColorStop(0, "rgba(60, 40, 30, 0.22)"); g.addColorStop(1, "rgba(60, 40, 30, 0)");
  ctx.fillStyle = g; ctx.fillRect(0, WALL_Y, RW, 26);
  rr(-4, WALL_Y - 10, RW + 8, 12, 3); fs("#FFFFFF", "#C9B8A6", 2.4);           // skirting board
  // window, curtains and sill
  const v = SPOT_AT.view;
  drawWindow(roomShow("view"), v.x - 52, v.y - 58, 104, 112);
  line([[v.x - 76, v.y - 72], [v.x + 76, v.y - 72]], "#8A5A2E", 5); line([[v.x - 76, v.y - 72], [v.x + 76, v.y - 72]], "#C98E58", 2.4);
  for (const d of [-1, 1]) {                                                     // curtains, tied back
    const outer = v.x + d * 80, inner = v.x + d * 46, tie = v.x + d * 64, top = v.y - 72, tieY = v.y + 8, bottom = v.y + 58;
    const sway = wob(0.5, d) * 1.5;
    ctx.beginPath();
    ctx.moveTo(outer, top); ctx.lineTo(inner, top);
    ctx.quadraticCurveTo(inner, tieY - 30, tie, tieY);
    ctx.quadraticCurveTo(inner + d * 4 + sway, bottom - 18, inner + d * 8 + sway, bottom);
    ctx.lineTo(outer + sway, bottom);
    ctx.closePath(); fs("#FFB7C5", "#E07A93", 2.6);
    line([[tie - d * 3, tieY - 4], [outer, tieY - 2]], "#E07A93", 3);
  }
  rr(v.x - 70, SPOT_AT.sill.y, 140, 11, 3); fs("#FFFFFF", "#B9A48E", 2.4);
  // shelf board and its brackets
  const sh = SPOT_AT.shelf;
  for (const d of [-1, 1]) { poly([[sh.x + d * 36, sh.y + 8], [sh.x + d * 36, sh.y + 24], [sh.x + d * 24, sh.y + 8]]); fs("#B98349", "#8A5A2E", 2); }
  rr(sh.x - 56, sh.y, 112, 10, 3); fs("#C98E58", "#8A5A2E", 2.6);
}

// One placed thing, drawn at its spot (with a pop when it was just placed).
let roomPop = null;
function drawThing(spot, id) {
  const at = SPOT_AT[spot], fn = THINGS[id];
  if (!fn) return;
  ctx.save(); ctx.translate(at.x, at.y);
  if (roomPop && roomPop.spot === spot && !S.calm) {
    const p = clamp01((time - roomPop.t) / 0.35);
    if (p < 1) { const k = Math.max(0.05, easeOutBack(p)); const [bx, by, bw, bh] = at.box; ctx.translate(bx + bw / 2, by + bh); ctx.scale(k, k); ctx.translate(-bx - bw / 2, -by - bh); }
  }
  fn();
  ctx.restore();
}
// Some things are much smaller than their spot: they get a closer frame in the picker.
const PREVIEW_BOX = { r_small: [-40, -108, 80, 112], r_tall: [-44, -210, 88, 214], s_books: [-48, -42, 96, 46], s_jar: [-48, -46, 96, 50],
  s_trophy: [-30, -54, 60, 58], u_round: [-100, -50, 200, 100], u_stripe: [-110, -50, 220, 100], u_paw: [-100, -50, 200, 100], u_rainbow: [-104, -52, 208, 104] };
// A small picture of a thing, fitted into a square of "size" pixels around cx, cy (screen units).
function drawThingPreview(spot, id, cx, cy, size) {
  ctx.save();
  if (SWATCH[spot]) {
    const k = size / 100;
    ctx.translate(cx, cy); ctx.scale(k, k);
    if (WINDOW_SPOTS[spot]) drawWindow(id, -40, -40, 80, 80);
    else { rr(-46, -46, 92, 92, 14); ctx.save(); ctx.clip(); PATTERNS[id](-46, -46, 92, 92); ctx.restore(); rr(-46, -46, 92, 92, 14); fs(null, "#C9B8A6", 2.4); }
  } else {
    const [bx, by, bw, bh] = PREVIEW_BOX[id] || SPOT_AT[spot].box, k = size / Math.max(bw, bh);
    ctx.beginPath(); ctx.rect(cx - size * 0.78, cy - size * 0.72, size * 1.56, size * 1.3); ctx.clip();   // wide things stay in their tile
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    THINGS[id]();
  }
  ctx.restore();
}

/* Each room also lists:
   pieces: the spots that make its Style (wall, floor and window view; sky and ground in the Garden).
   styles: 5 matching sets, cheapest first. "put" names one existing thing for each piece, in the
     same order, so things she already owns or has placed keep working. A style is hers when she owns
     every piece (free pieces need no owning); buying it buys the pieces she does not have yet.
   decor: the other spots, in the order the names show in the row under the room in decorate mode
     (the big things first). Each spot has its own picker. */
ROOMS.push({ id: "bedroom", spots: ROOM_SPOTS, wallY: WALL_Y, base: drawRoomBase,
  pieces: ["wall", "floor", "view"],
  styles: [
    { id: "b_cozy", put: ["w_plain", "f_wood", "v_day"] },           // free
    { id: "b_rain", put: ["w_stripe", "f_tile", "v_rain"] },         // 300 + 250 + 400 = 950
    { id: "b_sunset", put: ["w_dots", "f_check", "v_sunset"] },      // 650 + 700 + 1000 = 2350
    { id: "b_night", put: ["w_fish", "f_carpet", "v_stars"] },       // 2400 + 1200 + 2200 = 5800
    { id: "b_spring", put: ["w_flower", "f_bamboo", "v_rainbow"] },  // 1300 + 2000 + 4000 = 7300
  ],
  decor: ["bed", "cush", "rug", "lamp", "plant", "tree", "post", "pic", "shelf", "sill", "hang", "toy", "bowl"] });

/* ---------- styles and decor spots: helpers for every room ---------- */
const styleById = id => { for (const R of ROOMS) { const st = R.styles.find(q => q.id === id); if (st) return st; } return null; };
const styleRoom = st => ROOMS.find(R => R.styles.includes(st)) || ROOMS[0];
const isPiece = spot => ROOMS.some(R => R.pieces.includes(spot));
// The style the room shows now, or null when its pieces are her own mix from before.
const styleNow = R => R.styles.find(st => R.pieces.every((sp, i) => roomPut(sp) === st.put[i])) || null;
const styleOwned = st => st.put.every(roomOwns);
const styleCost = st => st.put.reduce((sum, id) => sum + (roomOwns(id) ? 0 : roomItem(id).price), 0);   // only the pieces she lacks
// The picker groups of a room: first its Style, then each spot.
function decorList(R) {
  if (!R._decor) R._decor = [{ key: "style", style: true, spots: R.pieces }].concat(R.decor.map(d => ({ key: [].concat(d).join("_"), spots: [].concat(d) })));
  return R._decor;
}
const decorOf = spot => { const R = ROOMS[roomOfSpot(spot)]; return decorList(R).find(d => d.spots.includes(spot)) || decorList(R)[0]; };
// A small picture of a style: its wall above, its floor below, a little window with its view.
function drawStyleSwatch(st, cx, cy, size) {
  const R = styleRoom(st), k = size / 100, [wall, floor, view] = st.put;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  rr(-46, -46, 92, 92, 14); ctx.save(); ctx.clip();
  PATTERNS[wall](-46, -46, 92, 64);
  if (R.id === "garden") { oval(-30, 18, 40, 12); fs("#B7E3A0"); oval(26, 20, 44, 13); fs("#A8DB90"); }   // the far hills
  PATTERNS[floor](-46, 18, 92, 28);
  ctx.restore();
  if (view) drawWindow(view, -2, -36, 40, 40);
  rr(-46, -46, 92, 92, 14); fs(null, "#C9B8A6", 2.4);
  ctx.restore();
}

/* ---------- her cat: big, the star of the room ----------
   Only her own cat lives in the room. She is drawn big, in front of the furniture, like the
   home screen of a pet game. Mostly she sits and looks cute: slow breaths, blinks, and now and
   then a swish of her tail. Sometimes she curls up for a nap and wakes again, or strolls over to
   another of her three floor spots. Tapping her wakes her: she meows in her own voice and purrs,
   with a few hearts. Stroking her with a finger makes her purr and squint happily.
   Calm motion: she sits still in her spot and only blinks. The same in all three rooms.
   While she decorates, her cat walks to a free front corner of the floor and sits there at about
   half her size, so no spot is hidden behind her (calm motion: she is just there). On Done she
   walks back to the middle. */
const PET_S = 236;                         // her size in room units: sitting, about half the room wide
const PET_FEET = RH - 14;                  // where her paws rest, at the front of the floor
const PET_SPOTS = [180, 132, 228];         // her three floor spots: the middle, the left, the right
const ASIDE_K = 0.45;                      // her size while she decorates, part of PET_S
let pet = null, roomFx = [], strokeAt = null;
function newPet() {
  return { spot: 0, x: PET_SPOTS[0], fy: PET_FEET, k: 1, face: 1, pose: "sit", wake: 1, move: null, aside: false, asideRoom: -1,
    until: time + 18 + Math.random() * 14, blinkAt: time + 2 + Math.random() * 2, swishAt: time + 3 + Math.random() * 4,
    perk: -9, happy: -9, purrAt: -9, meowAt: -9, tapT: -9, rub: 0 };
}
// The part of the room she covers, in room units, standing on x, feet at size k (her tail is left out:
// it curls toward the room's edge).
const catRect = (x, feet, k) => { const s = PET_S * k; return [x - s * 0.3, feet - s * 0.98, s * 0.6, s * 0.98]; };
const overlap = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
const spotRect = spot => { const at = SPOT_AT[spot], [bx, by, bw, bh] = at.box; return [at.x + bx, at.y + by, bw, bh]; };
// Where she sits while decorating: the front corner that covers no spot (the right one first), or else
// the place along the front, then the back, that covers the least.
function petAside(R) {
  const s = PET_S * ASIDE_K, feet = RH - 10, side = s * 0.3 + 4, list = [];
  for (const f of [feet, R.wallY + 60]) {
    list.push({ x: RW - side, feet: f, face: -1 }, { x: side, feet: f, face: 1 });
    for (let x = RW - side - 30; x > side; x -= 30) list.push({ x, feet: f, face: x > RW / 2 ? -1 : 1 });
  }
  const spots = R.spots.filter(sp => SPOT_AT[sp].layer > 0);
  let best = null;
  for (const c of list) {
    c.cover = spots.reduce((sum, sp) => sum + overlap(catRect(c.x, c.feet, ASIDE_K), spotRect(sp)), 0);
    if (!best || c.cover < best.cover) best = c;
    if (!c.cover) break;
  }
  return Object.assign({ k: ASIDE_K }, best);
}
// Decorate on: she goes aside. Done: back to the middle. Called each step; it only starts a move
// when decorate mode or the room changes.
function petPlace(p) {
  const aside = decorating && screen === "room";
  if (aside === p.aside && (!aside || p.asideRoom === S.roomView)) return;
  p.aside = aside; p.asideRoom = aside ? S.roomView : -1;
  const to = aside ? petAside(curRoom()) : { x: PET_SPOTS[0], feet: PET_FEET, k: 1, face: 1 };
  p.pose = "sit"; p.spot = 0; p.until = time + 15 + Math.random() * 15;
  if (S.calm) { Object.assign(p, { x: to.x, fy: to.feet, k: to.k, face: to.face, move: null }); return; }
  p.face = Math.abs(to.x - p.x) < 2 ? to.face : to.x > p.x ? 1 : -1;
  p.move = { x0: p.x, x1: to.x, f0: p.fy, f1: to.feet, k0: p.k, k1: to.k, face: to.face, t: 0, dur: 0.75 };
}
function roomUpdate(dt) {
  if (!pet) pet = newPet();
  const p = pet;
  if (time - p.blinkAt > 0.18) p.blinkAt = time + 2.5 + Math.random() * 3.5;      // blinks, even with calm motion
  if (time - p.swishAt > 1.5) p.swishAt = time + 5 + Math.random() * 6;
  if (S.calm) { p.move = null; p.pose = "sit"; }
  const fit = decorating ? 1 : 0;
  roomFit = S.calm || Math.abs(fit - roomFit) < 0.01 ? fit : roomFit + (fit - roomFit) * Math.min(1, dt * 8);
  petPlace(p);
  if (p.move) {                                                // a stroll to another spot, or aside and back
    const m = p.move;
    m.t += dt;
    const f = clamp01(m.t / m.dur), e = f * f * (3 - 2 * f);
    p.x = lerp(m.x0, m.x1, e);
    if (m.k1 !== undefined) { p.k = lerp(m.k0, m.k1, e); p.fy = lerp(m.f0, m.f1, e); }
    if (f >= 1) { p.move = null; p.x = m.x1; if (m.face) p.face = m.face; p.until = time + 15 + Math.random() * 15; }
  } else if (time > p.until && !S.calm && !p.aside) {
    p.until = time + 15 + Math.random() * 15;
    if (p.pose === "nap") p.pose = "sit";                       // she wakes up again
    else if (Math.random() < 0.4) { p.pose = "nap"; p.until = time + 10 + Math.random() * 12; }
    else if (Math.random() < 0.6) {
      const to = PET_SPOTS.map((x, i) => i).filter(i => i !== p.spot)[Math.floor(Math.random() * 2)];
      p.spot = to; p.face = PET_SPOTS[to] > p.x ? 1 : -1;
      p.move = { x0: p.x, x1: PET_SPOTS[to], t: 0, dur: 1.6 };
    }
  }
  const want = p.move || time < p.perk || p.pose === "sit" ? 1 : 0;
  p.wake = S.calm ? want : p.wake + (want - p.wake) * Math.min(1, dt * 2.5);
  for (const f of roomFx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  roomFx = roomFx.filter(f => f.life > 0);
}
// Leaving My room: it opens clean next time, with her cat back in the middle (main.js calls this).
function roomLeave() {
  decorating = false; roomTry = null; roomFocus = null; roomFit = 0;
  if (pet && (pet.aside || pet.k !== 1)) Object.assign(pet, { aside: false, asideRoom: -1, x: PET_SPOTS[0], fy: PET_FEET, k: 1, face: 1, spot: 0, move: null });
}
const petTarget = () => (pet.move || time < pet.perk || pet.pose === "sit" ? 1 : 0);
// Where she is on the screen, for taps and strokes (a little wider when curled up).
function petBox() {
  const { k, ox, oy } = roomAt, nap = pet.wake < 0.5, s = PET_S * pet.k, w = s * (nap ? 0.8 : 0.62) * k;
  const top = oy + (pet.fy - s * (nap ? 0.6 : 0.92)) * k, bottom = oy + pet.fy * k;
  return { x: ox + pet.x * k - w / 2, y: top, w, h: bottom - top };
}
function hearts(n) {
  if (S.calm) n = 1;
  const s = PET_S * pet.k;
  for (let i = 0; i < n; i++) roomFx.push({ x: pet.x + (i - (n - 1) / 2) * 22 * pet.k, y: pet.fy - s * 0.86, vx: (i - (n - 1) / 2) * 14, vy: S.calm ? 0 : -34 - i * 6, life: 1.1, max: 1.1 });
}
// Tapping her: she wakes up or looks up, gives a little squash and hop, squints happily, swishes
// her tail, meows in her own voice and purrs (a soft rumble shows around her while she purrs).
// Quick taps in a row keep her happy without piling up meows and purrs.
const TAP_HOP = 0.6, PURR_SHOW = 1.6;
function petCat() {
  if (!pet) return;
  const p = pet;
  p.perk = time + 3; p.pose = "sit"; p.until = Math.max(p.until, time + 12);
  p.tapT = time; p.happy = time + 1.8; p.swishAt = time;
  if (time > p.meowAt) { p.meowAt = time + 1.4; meow(0.05, VOICE[S.hero]); }
  if (time > p.purrAt) { p.purrAt = time + 1.3; sfx.purr(); }
  hearts(3);
}
// Her shape a moment after a tap: squash down, hop up a little stretched, land with a small squash.
// Returns [width, height, lift as a part of her size].
function tapShape(t) {
  if (S.calm || t < 0 || t > TAP_HOP) return [1, 1, 0];
  if (t < 0.1) { const f = Math.sin(t / 0.1 * Math.PI / 2); return [1 + 0.07 * f, 1 - 0.09 * f, 0]; }
  if (t < 0.45) { const f = (t - 0.1) / 0.35, up = Math.sin(f * Math.PI); return [lerp(1.07, 1, f) - 0.03 * up, lerp(0.91, 1, f) + 0.05 * up, up * 0.07]; }
  const f = Math.sin((t - 0.45) / 0.15 * Math.PI); return [1 + 0.04 * f, 1 - 0.05 * f, 0];
}
// A finger stroking across her (main.js sends every move on the room screen): a happy squint and a purr.
function roomStroke(x, y) {
  if (!pet || overlay || screen !== "room") return;
  const b = petBox();
  if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) { strokeAt = null; return; }
  if (strokeAt) pet.rub += Math.hypot(x - strokeAt[0], y - strokeAt[1]);
  strokeAt = [x, y];
  if (pet.rub < 50) return;
  pet.rub = 0; pet.happy = time + 1.6; pet.perk = Math.max(pet.perk, time + 2);
  if (time > pet.purrAt) { pet.purrAt = time + 2.6; pet.purred = time; sfx.purr(); hearts(1); }
}

/* ---------- the daily cat gift ----------
   One daily habit: winning today's Daily nap. Once she has, her cat holds a small present on
   the home screen; tapping it opens it. Each Daily nap won is one day of the gift week
   (markDaily in core.js counts it); day 7 is a bigger present. Missing a day takes nothing
   away: the week just carries on from where she is. The gift week card opens from Home. */
const giftReady = () => dailyDone() && S.gift.last !== todayKey();
const giftCatKey = () => S.hero;                              // her own cat brings it
const pickOne = list => list[Math.floor(Math.random() * list.length)];
// What is in the box. Days 1 to 6: usually coins (20 to 60), sometimes a powerup (22 in 100),
// rarely a thing for a room she has opened and does not own yet, up to 1500 coins (8 in 100;
// never a style piece: those come as a whole Style).
// Day 7: 150 coins and a powerup, and 3 times in 10 also a room thing up to 3000 coins.
function rollGift(day) {
  const out = { coins: 0, pu: "", item: "" };
  const pus = POWERUPS.filter(p => puOpen(p.id)).map(p => p.id);
  const items = cap => ROOM_ITEMS.filter(it => it.price > 0 && it.price <= cap && !isPiece(it.spot) && !S.room.own.includes(it.id) && roomOpen(roomOfSpot(it.spot)));
  if (day === 7) {
    out.coins = 150; out.pu = pickOne(pus);
    if (Math.random() < 0.3) { const list = items(3000); if (list.length) out.item = pickOne(list).id; }
    return out;
  }
  const r = Math.random();
  if (r < 0.08) { const list = items(1500); if (list.length) { out.item = pickOne(list).id; return out; } }
  if (r < 0.3) { out.pu = pickOne(pus); return out; }
  out.coins = 20 + 5 * Math.floor(Math.random() * 9);
  return out;
}
function openGift() {
  if (!giftReady() || overlay) return;
  const day = Math.max(1, S.gift.day), key = giftCatKey(), got = rollGift(day);   // the week day was counted when she won
  S.coins += got.coins;
  if (got.pu) S.pu[got.pu]++;
  if (got.item && !S.room.own.includes(got.item)) S.room.own.push(got.item);
  S.gift = Object.assign({}, S.gift, { last: todayKey() });
  S.stats.gifts++;
  save();
  sfx.magic(); if (got.coins) sfx.coin();
  homeCat.squishT = time;                                       // her cat on the home screen gives a little happy squish
  overlay = { kind: "gift", t: 0, delay: 0, at: time, day, key, got };
}
const roomBusy = () => !!pet && (!!pet.move || Math.abs(pet.wake - petTarget()) > 0.02 || time - Math.max(pet.tapT, pet.purred || -9) < PURR_SHOW) || roomFx.length > 0 || (decorating && !!roomFocus && !S.calm) || roomFit !== (decorating ? 1 : 0);

/* ---------- the room screen ---------- */
// A small wrapped present, standing on x, y (in whatever units are in use). Day 7's is golden.
function drawPresent(x, y, s, big) {
  const box = big ? ["#FFD23F", "#B8860B", "#FF5C8A"] : ["#FF8FB3", "#B02567", "#FFD23F"];
  rr(x - s / 2, y - s * 0.78, s, s * 0.78, s * 0.1); fs(box[0], box[1], Math.max(1.5, s * 0.07));
  rr(x - s * 0.6, y - s * 0.96, s * 1.2, s * 0.24, s * 0.08); fs(box[0], box[1], Math.max(1.5, s * 0.07));
  ctx.fillStyle = box[2]; ctx.fillRect(x - s * 0.08, y - s * 0.95, s * 0.16, s * 0.93);
  for (const d of [-1, 1]) { oval(x + d * s * 0.2, y - s * 1.06, s * 0.2, s * 0.12, d * 0.5); fs(box[2], box[1], Math.max(1.2, s * 0.05)); }
}
// The row of rooms at the top of My room. A room not open yet says when it opens.
function drawRoomTabs(y) {
  const tw = Math.max(64, Math.min(110, (W - 32 - 16) / 3));
  ROOMS.forEach((R, i) => {
    const x = W / 2 + (i - (ROOMS.length - 1) / 2) * (tw + 8) - tw / 2, open = roomOpen(i);
    pillButton(x, y, tw, 40, t("room_" + i), () => {
      if (!open) { toast(t("room_locked", t("room_" + i), ROOM_OPEN_AT[i])); sfx.no(); return; }
      if (S.roomView !== i) { S.roomView = i; save(); }
    }, open && curRoom() === R, { fill: open ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)", text: 0.34 });
    if (!open) {                                              // a small padlock
      const lx = x + tw - 13, ly = y + 20;
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(lx, ly - 2, 3.2, Math.PI, 0); ctx.stroke();
      rr(lx - 4.5, ly - 2, 9, 7, 2); ctx.fillStyle = SOFT; ctx.fill();
    }
  });
}
let roomAt = { k: 1, ox: 0, oy: 0 };
let decorating = false;                           // decorate mode: the spots show; Done hides them again
// The picker sheet at the bottom of the screen: the size of its tiles and its height.
function sheetSize() {
  const small = H < 640, tw = small ? 88 : 92, th = small ? 100 : 116;
  return { tw, th, h: 64 + th + 12 + safeArea().b };
}
// Where the room sits: under the room names, above the Decorate button. While decorating it eases up
// to sit above the picker sheet, so a thing she tries shows in full (but it never gets smaller than
// three quarters of the space it has otherwise).
let roomFit = 0;                                  // 0: the room as it opens, 1: room made for the picker sheet
function roomLayout() {
  const top = topY + 104, full = tabTop() - 66;
  const bottom = lerp(full, Math.min(full, Math.max(H - sheetSize().h - 8, top + (full - top) * 0.75)), roomFit);
  const availH = Math.max(60, bottom - top);
  const k = Math.max(0.2, Math.min((W - 20) / RW, availH / RH));
  return { k, ox: (W - RW * k) / 2, oy: top + Math.max(0, (availH - RH * k) * 0.5) };
}
// The part of a thing to outline or light up: most fill their spot's box; a few are much smaller.
const ITEM_BOX = { r_small: [-40, -108, 80, 112], r_tall: [-44, -210, 88, 214], gh_box: [-24, -136, 48, 140], gh_bath: [-30, -66, 60, 70] };
const boxFor = (spot, id) => (id && ITEM_BOX[id]) || (!id && SPOT_AT[spot].gbox) || SPOT_AT[spot].box;
const chipName = d => (d.style ? t("style") : t("rs_" + d.spots[0]));
function drawRoomScreen() {
  const R = curRoom();
  coinPill(16, topY + 11);
  buttons.push({ x: 16, y: topY + 9, w: 86, h: 40, onTap: () => openShop("room") });
  fitLabel(t("room"), W / 2, topY + 28, 26, W - 2 * 108, INK, 900);
  drawRoomTabs(topY + 52);
  const tb = tabTop();
  roomAt = roomLayout();
  const { k, ox, oy } = roomAt;
  if (!pet) pet = newPet();
  const p = pet, show = decorating;

  // the room itself, in room units
  rr(ox - 5, oy - 5 + 6, RW * k + 10, RH * k + 10, 24); ctx.fillStyle = "rgba(20, 28, 90, 0.22)"; ctx.fill();
  rr(ox - 5, oy - 5, RW * k + 10, RH * k + 10, 24); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(k, k);
  rr(0, 0, RW, RH, 20 / k); ctx.clip();
  R.base();
  // Its things: the wall things, then the floor things from back to front. Decorating, an empty spot
  // shows the faint shape of what goes there, in the same place and at the same size.
  const order = R.spots.filter(sp => SPOT_AT[sp].layer > 0)
    .sort((a, b) => SPOT_AT[a].layer - SPOT_AT[b].layer || (SPOT_AT[a].depth || 0) - (SPOT_AT[b].depth || 0));
  for (const sp of order) {
    const id = roomShow(sp), at = SPOT_AT[sp];
    if (id) drawThing(sp, id);
    else if (show && GHOSTS[sp]) { ctx.save(); ctx.translate(at.x, at.y); GHOSTS[sp](); ctx.restore(); }
  }
  // Decorating: a soft outline around each filled spot, and a gentle glow on the one being picked.
  if (show) for (const sp of order) {
    const id = roomShow(sp);
    if (!id || sp === roomFocus) continue;
    const at = SPOT_AT[sp], [bx, by, bw, bh] = boxFor(sp, id);
    rr(at.x + bx - 3, at.y + by - 3, bw + 6, bh + 6, 12);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)"; ctx.lineWidth = 4; ctx.stroke();
    ctx.setLineDash([9, 7]); ctx.strokeStyle = "rgba(70, 82, 156, 0.5)"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  const lit = !show || !roomFocus ? "" : roomFocus === "style" ? R.pieces.find(sp => WINDOW_SPOTS[sp]) || "" : roomFocus;
  if (lit) {
    const at = SPOT_AT[lit], [bx, by, bw, bh] = boxFor(lit, SWATCH[lit] ? "" : roomShow(lit));
    const a = S.calm ? 0.9 : 0.7 + 0.25 * Math.sin(time * 3.2);
    ctx.save();
    rr(at.x + bx - 5, at.y + by - 5, bw + 10, bh + 10, 14);
    ctx.fillStyle = "rgba(255, 232, 160, 0.22)"; ctx.fill();
    ctx.shadowColor = "rgba(255, 186, 60, 0.95)"; ctx.shadowBlur = 14;
    ctx.strokeStyle = `rgba(255, 160, 40, ${a})`; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.restore();
  }
  // her, in front of it all (small and in a corner while decorating)
  const s = PET_S * p.k;
  const bt = time - p.blinkAt, blink = bt >= 0 && bt < 0.18 ? Math.sin(bt / 0.18 * Math.PI) : 0;
  const st = time - p.swishAt, wag = S.calm || st < 0 || st > 1.5 ? 0 : Math.sin(st * 6) * 0.13 * Math.sin(st / 1.5 * Math.PI);
  const bob = p.move && !S.calm ? Math.abs(Math.sin(p.move.t * 7)) * 5 * p.k : 0;
  const [qx, qy, lift] = tapShape(time - p.tapT);              // a tap: squash, hop, land (her paws stay put)
  const purring = time - Math.max(p.tapT, p.purred || -9);     // a soft rumble while she purrs
  const rumble = !S.calm && purring >= 0 && purring < PURR_SHOW ? Math.sin(time * 70) * 0.7 * (1 - purring / PURR_SHOW) : 0;
  drawCat(p.x + rumble, p.fy - s * 0.37 * qy - bob - lift * s, s, S.hero, { seed: 1.3, wake: p.wake, hat: S.hat, neck: S.neck, still: true,
    sx: -p.face * qx, sy: qy, breath: S.calm ? 0 : 1, blink, wag, happy: time < p.happy });
  if (purring >= 0 && purring < PURR_SHOW && p.wake > 0.5) {  // little purr lines at her sides
    const a = Math.sin(clamp01(purring / PURR_SHOW) * Math.PI) * 0.55, cy = p.fy - s * 0.42;
    ctx.strokeStyle = `rgba(255, 92, 138, ${a})`; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (const d of [-1, 1]) for (let i = 0; i < 2; i++) {
      const r = s * (0.34 + i * 0.07) + (S.calm ? 0 : (purring * 18) % 8);
      ctx.beginPath(); ctx.arc(p.x, cy, r, d > 0 ? -0.35 : Math.PI - 0.35, d > 0 ? 0.35 : Math.PI + 0.35); ctx.stroke();
    }
  }
  if (p.wake < 0.5 && !S.calm) {                              // little z's while she naps
    const zt = (time * 0.45) % 1;
    ctx.globalAlpha = Math.sin(zt * Math.PI) * 0.8;
    label("z", p.x + s * 0.12 + zt * 10, p.fy - s * 0.62 - zt * 22, Math.round(20 + zt * 10), INK, 900);
    ctx.globalAlpha = 1;
  }
  for (const f of roomFx) { ctx.globalAlpha = clamp01(f.life / f.max); ctx.fillStyle = "#FF5C8A"; drawHeart(f.x, f.y, 22); ctx.globalAlpha = 1; }
  ctx.restore();

  // Decorating: each spot can be tapped (the smaller ones are on top, so a thing in front of a big
  // one can still be reached), and each empty spot (and the one being picked) has its name under it.
  if (show) {
    const taps = R.spots.filter(sp => SPOT_AT[sp].layer > 0 || WINDOW_SPOTS[sp]).map(sp => [sp, spotRect(sp)])
      .sort((a, b) => b[1][2] * b[1][3] - a[1][2] * a[1][3]);
    for (const [sp, r] of taps) buttons.push({ x: ox + r[0] * k, y: oy + r[1] * k, w: r[2] * k, h: r[3] * k, onTap: () => openPicker(sp), spotTap: true });
    const names = [], h = 20, roomy = k >= 0.6;               // a small room shows only the name being picked
    ctx.font = `800 12px ${FONT}`;
    for (const sp of order) {
      if ((roomShow(sp) || !roomy) && sp !== lit) continue;
      const at = SPOT_AT[sp], [bx, by, bw, bh] = boxFor(sp, roomShow(sp)), text = t("rs_" + sp), w = ctx.measureText(text).width + 16;
      let x = ox + (at.x + (at.lab ? at.lab[0] : bx + bw / 2)) * k, y = oy + (at.y + (at.lab ? at.lab[1] : by + bh + 10)) * k;
      x = Math.max(ox + w / 2 + 4, Math.min(ox + RW * k - w / 2 - 4, x));
      y = Math.max(oy + h / 2 + 4, Math.min(oy + RH * k - h / 2 - 4, y));
      const free = dy => !names.some(q => Math.abs(q.x - x) < (q.w + w) / 2 + 3 && Math.abs(q.y - y - dy) < h + 2);
      const dy = [0, 20, -20, 40, -40].find(free);              // never on top of another name
      names.push({ sp, text, x, y: y + (dy || 0), w });
    }
    for (const q of names) {
      const on = q.sp === lit;
      rr(q.x - q.w / 2, q.y - h / 2, q.w, h, h / 2); ctx.fillStyle = on ? "#FFF0B3" : "rgba(255, 255, 255, 0.92)"; ctx.fill();
      ctx.strokeStyle = on ? "#FF8A1F" : "rgba(70, 82, 156, 0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
      label(q.text, q.x, q.y + 1, 12, on ? "#9C3A00" : SOFT, 800);
      buttons.push({ x: q.x - q.w / 2, y: q.y - 13, w: q.w, h: 26, onTap: () => openPicker(q.sp), spotTap: true });
    }
  }
  // Tapping her: she purrs (not decorating, the furniture does nothing).
  const pb = petBox();
  buttons.push(Object.assign(pb, { onTap: petCat }));

  // One calm button under the room: Decorate. While decorating: a row of the room's spots, and Done.
  const by = tb - 56, roomEnd = oy + RH * k + 5;
  if (!decorating) {
    const bw = Math.min(200, W - 64);
    pillButton(W / 2 - bw / 2, by, bw, 46, t("decorate"), () => { decorating = true; roomFocus = null; }, false);
    return;
  }
  if (by - roomEnd >= 30) fitLabel(t("room_tip"), W / 2, (roomEnd + by) / 2, 13, W - 40, SOFT, 700);
  drawDecorChips(R, by);
}
// The row of names under the room while decorating: the Style first, then every spot. Too many to
// fit: it slides, with a soft arrow at the end that has more. Tapping a name lights up its spot and
// opens its picker. Done is always at the right.
function drawDecorChips(R, y) {
  const doneW = 88, x0 = 12, w = Math.max(60, W - 24 - doneW - 8), ch = 44, gap = 8;
  ctx.font = `800 13px ${FONT}`;
  const list = decorList(R), sizes = list.map(d => Math.max(64, ctx.measureText(chipName(d)).width + 30));
  const total = sizes.reduce((sum, cw) => sum + cw + gap, -gap), max = Math.max(0, total - w);
  rowScroll.decor = Math.max(0, Math.min(max, rowScroll.decor || 0));
  myRows.decor = { x: x0, y, w, h: ch, max };
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, y - 4, w + 4, ch + 12); ctx.clip();
  let cx = max > 0 ? x0 - rowScroll.decor : x0 + (w - total) / 2;
  list.forEach((d, i) => {
    const cw = sizes[i];
    if (cx + cw > x0 && cx < x0 + w) {
      const on = roomFocus === d.key, filled = d.style || d.spots.some(sp => S.room.put[sp]), down = pressedIn(cx, y, cw, ch) ? 3 : 0;
      rr(cx, y + 4, cw, ch, ch / 2); ctx.fillStyle = "rgba(20, 28, 90, 0.12)"; ctx.fill();
      rr(cx, y + down, cw, ch, ch / 2); ctx.fillStyle = on ? "#FFF0B3" : "#FFFFFF"; ctx.fill();
      if (on) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 2.6; ctx.stroke(); }
      else if (!filled) { ctx.setLineDash([5, 4]); ctx.strokeStyle = "#8FA0D8"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }   // empty: dashed, like its shape in the room
      else { ctx.strokeStyle = "#E9D3B0"; ctx.lineWidth = 2; ctx.stroke(); }
      label(chipName(d), cx + cw / 2, y + ch / 2 + 1 + down, 13, INK, 800);
      const l = Math.max(x0, cx), r = Math.min(x0 + w, cx + cw);
      if (r - l > 6) buttons.push({ x: l, y, w: r - l, h: ch + 4, onTap: () => openPicker(d.spots[0]) });
    }
    cx += cw + gap;
  });
  ctx.restore();
  rowArrows("decor", x0, y, w, ch, Math.max(80, w - 80));
  pillButton(W - 12 - doneW, y - 1, doneW, 46, t("done"), () => { decorating = false; roomFocus = null; roomTry = null; }, true);
}

/* ---------- the picker: a small sheet at the bottom, for one spot or for the Style ---------- */
// Any spot can be asked for: a wall, floor or window view opens its room's Style picker.
function openPicker(spot) {
  decorating = true; roomFocus = decorOf(spot).key; roomTry = null; rowScroll.pick = -1;     // -1: slide to the one in use
  overlay = { kind: "roompick", spot, t: 1, delay: 0, at: time };
}
function closePicker() { overlay = null; roomTry = null; roomFocus = null; }
function placeThing(spot, id) {
  if (id) S.room.put[spot] = id; else delete S.room.put[spot];
  roomTry = null;
  save();
  roomPop = { spot, t: time };
  sfx.place();
}
// A tile. Hers, or None: it goes in at once. Not hers yet: the first tap shows it in the room, the
// second asks "Buy?" (the picker stays open behind that card).
function pickThing(spot, id) {
  if (!id || roomOwns(id)) { placeThing(spot, id); return; }
  if (!roomTry || roomTry.spot !== spot || roomTry.id !== id) { roomTry = { spot, id }; roomPop = { spot, t: time }; sfx.peek(); return; }
  const it = roomItem(id), name = t("ri_" + id);
  askBuy({ name, price: it.price, pic: ["room", id] }, () => {
    if (!S.room.own.includes(id)) S.room.own.push(id);
    placeThing(spot, id);
  });
}
// Put a style's pieces in the room. Not hers yet: shown first, then the "Buy?" card for the pieces she lacks.
function useStyle(st) {
  const R = styleRoom(st);
  R.pieces.forEach((sp, i) => { S.room.put[sp] = st.put[i]; });
  roomTry = null;
  save();
  sfx.place();
}
function pickStyle(st) {
  if (styleOwned(st)) { useStyle(st); return; }
  if (!roomTry || roomTry.style !== st.id) { roomTry = { style: st.id }; sfx.peek(); return; }
  askBuy({ name: t("style_of", t("st_" + st.id)), price: styleCost(st), pic: ["style", st.id] }, () => {
    for (const id of st.put) if (roomItem(id).price > 0 && !S.room.own.includes(id)) S.room.own.push(id);
    useStyle(st);
  });
}
// A name in up to two lines that fit "maxW" at 12px.
function twoLines(text, maxW) {
  ctx.font = `700 12px ${FONT}`;
  if (ctx.measureText(text).width <= maxW) return [text];
  const words = text.split(" ");
  for (let n = words.length - 1; n > 0; n--) {
    const a = words.slice(0, n).join(" ");
    if (ctx.measureText(a).width <= maxW) return [a, words.slice(n).join(" ")];
  }
  return [text];
}
function drawRoomPick() {
  const o = overlay, d = decorOf(o.spot), R = ROOMS[roomOfSpot(o.spot)], spot = d.style ? "" : d.spots[0];
  const { tw, th, h } = sheetSize(), y = H - h;
  // The room above stays live: tapping another spot there opens that one. Nothing else behind can be tapped.
  buttons = buttons.filter(b => b.spotTap && b.y < y - 8);
  for (const b of buttons) b.h = Math.min(b.h, y - 8 - b.y);
  rr(0, y - 5, W, h + 40, 26); ctx.fillStyle = "rgba(20, 28, 90, 0.16)"; ctx.fill();
  rr(0, y, W, h + 40, 26); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  const now = d.style ? styleNow(R) : null, doneW = 88;
  const trying = !!roomTry && (d.style ? !!roomTry.style : roomTry.spot === spot);
  const textW = W - 20 - doneW - 26;
  leftLabel(d.style ? t("style") : t("rs_" + spot), 20, y + 25, 20, textW, INK);
  const tip = trying ? t("try_buy") : d.style && !now ? t("style_mix") : t("try_tip");
  label(tip, 20, y + 49, 12, trying ? "#9C3A00" : SOFT, 800, "left");
  pillButton(W - 16 - doneW, y + 14, doneW, 42, t("done"), closePicker, true);
  // the tiles, in a row that slides when there are more than fit
  const ids = d.style ? R.styles.map(q => q.id) : [""].concat(ROOM_ITEMS.filter(it => it.spot === spot).map(it => it.id));
  const gap = 8, x0 = 12, w = Math.max(60, W - 24), ty = y + 64, total = ids.length * (tw + gap) - gap, max = Math.max(0, total - w);
  const cur = d.style ? (now ? now.id : null) : S.room.put[spot] || "";
  if (rowScroll.pick < 0) rowScroll.pick = Math.max(0, ids.indexOf(cur)) * (tw + gap) + tw / 2 - w / 2;   // the one in use shows
  rowScroll.pick = Math.max(0, Math.min(max, rowScroll.pick || 0));
  myRows.pick = { x: x0, y: ty, w, h: th, max };
  const left = max > 0 ? x0 - rowScroll.pick : x0 + (w - total) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 2, ty - 4, w + 4, th + 10); ctx.clip();
  ids.forEach((id, i) => {
    const tx = left + i * (tw + gap);
    if (tx + tw < x0 || tx > x0 + w) return;
    const st = d.style ? styleById(id) : null, on = id === cur;
    const tried = !!roomTry && (st ? roomTry.style === id : roomTry.spot === spot && roomTry.id === id);
    const owned = st ? styleOwned(st) : !id || roomOwns(id), down = pressedIn(tx, ty, tw, th) ? 2 : 0, top = ty + down;
    rr(tx, top, tw, th, 16); ctx.fillStyle = on ? "#FFF0B3" : tried ? "#FFF7DE" : "#F1F5FF"; ctx.fill();
    if (on) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 3; ctx.stroke(); }
    else if (tried) { ctx.setLineDash([6, 4]); ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]); }
    const py = top + th * 0.3, ps = Math.min(tw * 0.62, th * 0.46);
    if (st) drawStyleSwatch(st, tx + tw / 2, py, ps);
    else if (id) drawThingPreview(spot, id, tx + tw / 2, py, ps);
    else { oval(tx + tw / 2, py, ps * 0.36, ps * 0.36); ctx.setLineDash([5, 4]); ctx.strokeStyle = "#8FA0D8"; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
    // its name (two lines at most), and the price while it is not hers
    const lines = twoLines(st ? t("st_" + id) : id ? t("ri_" + id) : t("no_hat"), tw - 10);
    const ny = top + th * 0.62 + (lines.length > 1 || !owned ? 0 : 6);
    lines.forEach((ln, j) => label(ln, tx + tw / 2, ny + j * 13, 12, INK, 700));
    if (!owned) {
      const num = String(st ? styleCost(st) : roomItem(id).price);
      ctx.font = `800 12px ${FONT}`;
      const lx = tx + tw / 2 - (ctx.measureText(num).width + 16) / 2, ly = top + th - 13;
      drawCoin(lx + 6, ly - 1, 6.5);
      label(num, lx + 16, ly, 12, INK, 800, "left");
    }
    const l = Math.max(x0, tx), r = Math.min(x0 + w, tx + tw);
    if (r - l > 6) buttons.push({ x: l, y: ty, w: r - l, h: th, onTap: () => (st ? pickStyle(st) : pickThing(spot, id)) });
  });
  ctx.restore();
  rowArrows("pick", x0, ty, w, th, Math.max(tw + gap, w - tw - gap));
  if (time - o.at < 0.25) buttons = [];                                 // the tap that opened it can't also choose
}

/* ---------- the gift card: what was in today's present ---------- */
function drawGiftCard() {
  const o = overlay, g = o.got;
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.max(220, Math.min(310, W - 40)), ch = 316;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  const pop = S.calm ? 1 : easeOutBack(clamp01((time - o.at) / 0.35));
  ctx.save(); ctx.translate(W / 2, y + ch / 2); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.translate(-W / 2, -y - ch / 2);
  card(x, y, cw, ch);
  fitLabel(t("gift_from", catName(o.key)), W / 2, y + 34, 21, cw - 30, INK, 900);
  fitLabel(o.day === 7 ? t("gift_big") : t("gift_day", o.day), W / 2, y + 58, 13, cw - 30, SOFT, 800);
  drawCat(W / 2 - 46, y + 118, 62, o.key, { wake: 1, still: true, noShadow: true, seed: 4, hat: hatFor(o.key), neck: neckFor(o.key) });
  // what was inside, next to the cat
  const px = W / 2 + 40, py = y + 116, lines = [];
  ctx.fillStyle = "#EEF3FF"; oval(px, py, 34, 34); ctx.fill();
  if (g.item) { drawThingPreview(roomItem(g.item).spot, g.item, px, py, 54); }
  else if (g.pu) drawIcon(PU_ICON[g.pu][0], px, py, 1.5, PU_ICON[g.pu][1]);
  else drawCoin(px, py, 18);
  if (g.coins) lines.push([t("gift_coins", g.coins), "#B8730A"]);
  if (g.pu) lines.push([t("gift_pu", t("pu_" + g.pu)), INK]);
  if (g.item) lines.push([t("gift_item", t("ri_" + g.item)), INK]);
  lines.forEach(([text, col], i) => fitLabel(text, W / 2, y + 176 + i * 22, 16, cw - 30, col, 800));
  if (g.item) fitLabel(t("gift_item_tip", t("room_" + roomOfSpot(roomItem(g.item).spot))), W / 2, y + 176 + lines.length * 22, 12, cw - 30, SOFT, 700);
  pillButton(x + 28, y + ch - 66, cw - 56, 48, t("done"), () => { overlay = null; }, true);
  ctx.restore();
  if (time - o.at < 0.3) buttons = [];                                  // the tap that opened it can't also close it
}

/* ---------- the gift week: 7 days, one for each Daily nap won; day 7 a big present ---------- */
function drawCalendar() {
  const o = overlay;
  buttons = [];
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const cw = Math.max(220, Math.min(330, W - 32)), gap = 8, bs = Math.floor((cw - 40 - 3 * gap) / 4);
  const ch = 60 + 2 * (bs + 18) + gap + 112;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  label(t("cal_title"), W / 2, y + 34, 22, INK, 900);
  // The days she won the Daily nap this week. A finished week shows full until the next day; then a new
  // week starts. The next box says Today until today's Daily nap is won, then Tomorrow.
  const won = dailyDone(), shown = S.gift.day >= 7 && !won ? 0 : S.gift.day;
  for (let i = 0; i < 7; i++) {
    const row = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4, wide = i === 6;
    const bx = x + 20 + col * (bs + gap), by = y + 58 + row * (bs + 18 + gap), bw = wide ? bs * 2 + gap : bs, bh = bs + 18;
    const done = i < shown, next = i === shown;
    rr(bx, by, bw, bh, 14); ctx.fillStyle = done ? "#E3F5DC" : next ? "#FFF0B3" : "#F1F5FF"; ctx.fill();
    if (next) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 2.5; ctx.stroke(); }
    label(t("cal_day", i + 1), bx + bw / 2, by + 12, 11, done ? "#2F7D32" : INK, 800);
    const cx = bx + bw / 2, cy = by + bh - 14;
    if (done) {                                               // opened: a tick
      ctx.strokeStyle = "#2F9E5B"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(cx - 9, cy - 10); ctx.lineTo(cx - 2, cy - 3); ctx.lineTo(cx + 10, cy - 17); ctx.stroke();
    } else drawPresent(cx, cy, wide ? Math.min(34, bs * 0.5) : Math.min(24, bs * 0.4), wide);
    if (next) fitLabel(won ? t("cal_next") : t("cal_today"), cx, by + 26, 10, bw - 6, "#9C3A00", 800);
  }
  const ty = y + 58 + 2 * (bs + 18 + gap) + 10;
  fitLabel(t("cal_tip"), W / 2, ty, 12, cw - 28, SOFT, 700);
  fitLabel(t("cal_tip2"), W / 2, ty + 17, 12, cw - 28, SOFT, 700);
  pillButton(x + 24, y + ch - 60, cw - 48, 44, t("done"), () => { overlay = null; }, true);
  if (time - o.at < 0.25) buttons = [];
}
