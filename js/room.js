"use strict";
/* ==================================================================
   DROP THE BEAN - room: her cats' own room, decorated with coins.
   One cozy room with 16 spots (the list is ROOM_SPOTS in core.js).
   Tapping a spot opens a small picker for that spot. Things she owns
   can be swapped freely; anything new goes through the "Buy?" card.
   Her cats live here: they nap, sit, wake up and wander a little.
   Everything is drawn in "room units": the room is 360 wide and 440
   tall, and the whole picture is scaled to fit the screen.
=================================================================== */

Object.assign(WORDS.en, {
  rs_wall: "Wallpaper", rs_floor: "Floor", rs_view: "Window view", rs_pic: "Picture", rs_shelf: "Shelf",
  rs_hang: "Ceiling", rs_sill: "Window sill", rs_lamp: "Lamp", rs_plant: "Plant", rs_tree: "Cat tree",
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
});

const RW = 360, RH = 440, WALL_Y = 290;
/* Where each spot is. (x, y) is the spot's anchor: the top-left of the wall and floor, the
   middle of the window glass and picture, the ceiling point a hanger hangs from, and the
   floor point a standing thing stands on. box = [dx, dy, w, h] from the anchor: the part a
   finger can tap, also used to fit the thing into a picker tile. "depth" sorts floor things
   and cats so the nearer ones are drawn on top. */
const SPOT_AT = {
  wall:  { x: 0, y: 0, box: [0, 0, RW, WALL_Y], layer: 0 },
  floor: { x: 0, y: WALL_Y, box: [0, 0, RW, RH - WALL_Y], layer: 0 },
  view:  { x: 262, y: 107, box: [-58, -62, 116, 124], layer: 0 },
  pic:   { x: 84, y: 64, box: [-42, -34, 84, 68], layer: 1 },
  shelf: { x: 90, y: 160, box: [-56, -52, 112, 64], layer: 1 },
  hang:  { x: 168, y: 0, box: [-30, 0, 60, 100], layer: 1 },
  sill:  { x: 268, y: 170, box: [-30, -44, 60, 46], layer: 1 },
  lamp:  { x: 168, y: 316, box: [-30, -128, 60, 132], layer: 2, depth: 316 },
  plant: { x: 32, y: 324, box: [-32, -116, 64, 120], layer: 2, depth: 324 },
  tree:  { x: 316, y: 324, box: [-42, -230, 84, 234], layer: 2, depth: 324 },
  rug:   { x: 186, y: 384, box: [-106, -28, 212, 56], layer: 2, depth: 0 },
  post:  { x: 40, y: 432, box: [-24, -98, 48, 102], layer: 2, depth: 432 },
  bed:   { x: 140, y: 394, box: [-44, -50, 88, 54], layer: 2, depth: 394 },
  cush:  { x: 252, y: 400, box: [-38, -26, 76, 32], layer: 2, depth: 400 },
  toy:   { x: 186, y: 432, box: [-26, -28, 52, 32], layer: 2, depth: 432 },
  bowl:  { x: 306, y: 432, box: [-30, -26, 60, 30], layer: 2, depth: 432 },
};
// The three spots that fill the whole wall, floor and window get a square swatch in the picker.
const SWATCH = { wall: 1, floor: 1, view: 1 };
const roomPut = spot => S.room.put[spot] || ROOM_FREE[spot] || "";
const roomOwns = id => { const it = roomItem(id); return !!it && (it.price === 0 || S.room.own.includes(id)); };

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
  p_heart: () => { picFrame("#FF9DB5", "#C2456E", "#FFF1F4"); heartPath(0, 3, 34); fs("#FF5C8A", "#C2456E", 2.4); },
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
    for (const [x, w, h, f, d] of [[-46, 10, 34, "#5AA9FF", "#1F57B0"], [-35, 8, 28, "#FF8A8A", "#B23A48"], [-26, 12, 38, "#82DD5C", "#35891E"]]) {
      rr(x, -h, w, h, 2); fs(f, d, 2.4); line([[x + 2, -h + 6], [x + w - 2, -h + 6]], d, 1.6);
    }
    ctx.save(); ctx.translate(-8, 0); ctx.rotate(0.35); rr(-1, -32, 10, 32, 2); fs("#FFD23F", "#B8860B", 2.4); ctx.restore();
    rr(22, -18, 18, 18, 4); fs("#FFFFFF", "#9AA7C9", 2.4);                      // a mug
    ctx.beginPath(); ctx.arc(41, -10, 5, -Math.PI / 2, Math.PI / 2); fs(null, "#9AA7C9", 2.4);
    ctx.fillStyle = "#FF8FB3"; heartPath(31, -9, 9); ctx.fill();
  },
  s_jar: () => {
    rr(-14, -36, 28, 36, 7); fs("rgba(214, 238, 255, 0.8)", "#7FA6C9", 2.6);
    ctx.save(); rr(-14, -36, 28, 36, 7); ctx.clip();
    for (const [x, y, d] of [[-6, -6, 1], [5, -9, -1], [-2, -15, -1], [7, -20, 1], [-6, -24, 1]]) { fishShape(x, y, 4, d); fs("#FFA24D", "#C25E12", 1.2); }
    ctx.restore();
    rr(-16, -43, 32, 9, 4); fs("#FF8A1F", "#B9590A", 2.4);
    for (const [x, h, f, d] of [[-46, 22, "#B981FF", "#6431BD"], [-46, 12, "#5FE0C0", "#1E7A62"]]) { rr(x, -h - (h === 12 ? 22 : 0), 26, h === 12 ? 10 : 22, 2); fs(f, d, 2.2); }
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
      else { fishShape(0, y, 8, 1); fs("#5AA9FF", "#1F57B0", 2.2); }
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
    pot(22, 15, "#5AA9FF", "#1F57B0");
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
    oval(0, -3, 18, 5); fs("#7F8AC9", "#2B3783", 2.6);
    line([[0, -4], [0, -86]], "#2B3783", 5); line([[0, -4], [0, -86]], "#7F8AC9", 2.4);
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
    ctx.beginPath(); ctx.ellipse(0, -50, 34, 30, 0, Math.PI, 0); ctx.closePath(); fs("#FF6B6B", "#B23A48", 2.8);
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
    line([[-14, -18], [14, -18]], "#5AA9FF", 2.6);
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
    pot(40, 30, "#8E6CC9", "#5A3E94");
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
    fishShape(-4, -88, 18, 1); fs("#5AA9FF", "#1F57B0", 2.8);
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
    oval(0, -14, 42, 16); fs("#7FA0FF", "#3D5BC2", 2.8);
    oval(0, -17, 28, 9); fs("#DDE6FF", "#3D5BC2", 2);
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
  c_round: () => { oval(0, -8, 33, 11); fs("#FF8A1F", "#B9590A", 2.8); oval(0, -10, 26, 7); fs("#FFB066"); oval(0, -10, 3, 2); fs("#B9590A"); },
  c_heart: () => { ctx.save(); ctx.translate(0, -10); ctx.scale(1, 0.5); heartPath(0, 6, 64); fs("#FF7EB6", "#B02567", 4); ctx.restore(); },
  c_star: () => { ctx.save(); ctx.translate(0, -10); ctx.scale(1, 0.5); starPath(0, 0, 36, 0.55); fs("#FFD23F", "#D9920C", 4.5); ctx.restore(); },
  c_bean: () => {
    ctx.beginPath(); ctx.moveTo(-36, 0); ctx.bezierCurveTo(-42, -30, -18, -40, 0, -34); ctx.bezierCurveTo(20, -42, 42, -30, 36, 0); ctx.closePath();
    fs("#5FCB9A", "#2B8261", 2.8);
    ctx.beginPath(); ctx.moveTo(-16, -18); ctx.quadraticCurveTo(0, -10, 18, -20); fs(null, "#2B8261", 2);
    oval(-18, -26, 8, 3); fs("rgba(255,255,255,0.4)");
  },
  y_yarn: () => {
    oval(0, -11, 11, 11); fs("#FF7EB6", "#B02567", 2.6);
    ctx.save(); oval(0, -11, 11, 11); ctx.clip();
    for (const k of [-6, 0, 6]) { ctx.beginPath(); ctx.ellipse(k, -11, 4, 12, 0.5, 0, Math.PI * 2); fs(null, "#B02567", 1.4); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(9, -4); ctx.quadraticCurveTo(18, 2, 24, -3); fs(null, "#B02567", 2);
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
    poly([[-21, -16], [21, -16], [15, 0], [-15, 0]]); fs("#5AA9FF", "#1F57B0", 2.6);
    ctx.fillStyle = "#FFFFFF"; paw(0, -8, 6);
  },
  d_double: () => {
    rr(-34, -4, 68, 8, 4); fs("#FFD3E0", "#D46A8E", 2.4);
    for (const [x, y] of [[-21, -15], [-14, -16], [-9, -14], [-17, -13]]) { oval(x, y, 3, 2.3); fs("#B9783D", "#7A4A1E", 1.2); }
    poly([[-29, -14], [-3, -14], [-6, -1], [-26, -1]]); fs("#FF8A8A", "#B23A48", 2.4);
    oval(16, -14, 11, 2.6); fs("#8CC4FF");
    poly([[3, -14], [29, -14], [26, -1], [6, -1]]); fs("#82DD5C", "#35891E", 2.4);
  },
  d_gold: () => {
    fishShape(2, -22, 10, -1); fs("#C3CBE0", "#6B7089", 2);
    ctx.fillStyle = INK; oval(10, -23, 1.6, 1.6); ctx.fill();
    poly([[-24, -17], [24, -17], [17, 0], [-17, 0]]); fs("#FFD23F", "#B8860B", 2.8);
    ctx.fillStyle = "#D9920C"; paw(0, -9, 7);
    ctx.fillStyle = "#FFFFFF"; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(wob(2.2)); twinkle(-20, -26, 4); twinkle(22, -6, 3); ctx.globalAlpha = 1;
  },
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
  PATTERNS[roomPut("wall")](0, 0, RW, WALL_Y);
  PATTERNS[roomPut("floor")](0, WALL_Y, RW, RH - WALL_Y);
  const g = ctx.createLinearGradient(0, WALL_Y, 0, WALL_Y + 26);                // a soft shadow where floor meets wall
  g.addColorStop(0, "rgba(60, 40, 30, 0.22)"); g.addColorStop(1, "rgba(60, 40, 30, 0)");
  ctx.fillStyle = g; ctx.fillRect(0, WALL_Y, RW, 26);
  rr(-4, WALL_Y - 10, RW + 8, 12, 3); fs("#FFFFFF", "#C9B8A6", 2.4);           // skirting board
  // window, curtains and sill
  const v = SPOT_AT.view;
  drawWindow(roomPut("view"), v.x - 52, v.y - 58, 104, 112);
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
    if (spot === "view") drawWindow(id, -40, -40, 80, 80);
    else { rr(-46, -46, 92, 92, 14); ctx.save(); ctx.clip(); PATTERNS[id](-46, -46, 92, 92); ctx.restore(); rr(-46, -46, 92, 92, 14); fs(null, "#C9B8A6", 2.4); }
  } else {
    const [bx, by, bw, bh] = PREVIEW_BOX[id] || SPOT_AT[spot].box, k = size / Math.max(bw, bh);
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    THINGS[id]();
  }
  ctx.restore();
}

/* ---------- her cats in the room ----------
   Places a cat can be ("perches"): a few spots on the floor, the window sill, and every
   bed, cushion, rug, cat tree, toy, bowl and post she has placed. Each perch takes one cat.
   A cat rests a while (asleep or sitting up), then sometimes walks or hops to a free perch.
   "sleep" perches are where cats like to nap; "play" makes them bounce about. */
const FLOOR_SPOTS = [[108, 334], [214, 336], [262, 322], [96, 424], [244, 428], [154, 344], [294, 372], [74, 352]];
function roomPerches() {
  const out = FLOOR_SPOTS.map(([x, y]) => ({ x, y, depth: y, sleep: 0.35 }));
  out.push({ x: 226, y: SPOT_AT.sill.y, depth: 200, sleep: 0.3, high: true });
  const at = s => SPOT_AT[s], put = s => S.room.put[s];
  if (put("bed")) out.push({ x: at("bed").x, y: at("bed").y - (put("bed") === "b_box" ? 22 : put("bed") === "b_cave" ? 4 : 14), depth: at("bed").depth + 0.5, sleep: 0.9 });
  if (put("cush")) out.push({ x: at("cush").x, y: at("cush").y - (put("cush") === "c_bean" ? 20 : 10), depth: at("cush").depth + 0.5, sleep: 0.85 });
  if (put("rug")) out.push({ x: at("rug").x + 10, y: at("rug").y + 4, depth: at("rug").y + 4, sleep: 0.6 });
  if (put("toy")) out.push({ x: at("toy").x + 34, y: at("toy").y - 2, depth: at("toy").depth + 0.5, sleep: 0, play: true });
  if (put("bowl")) out.push({ x: at("bowl").x - 36, y: at("bowl").y, depth: at("bowl").depth + 0.5, sleep: 0 });
  if (put("post")) out.push({ x: at("post").x + 30, y: at("post").y + 2, depth: at("post").depth + 2, sleep: 0.1 });
  const tr = at("tree"), tops = { r_small: [[0, -100]], r_tall: [[-17, -112], [12, -200]], r_castle: [[-22, -120], [-2, -198]] }[put("tree")] || [];
  for (const [dx, dy] of tops) out.push({ x: tr.x + dx, y: tr.y + dy, depth: tr.depth + 1, sleep: 0.5, high: true });
  return out;
}
let roomCats = [], roomSig = "", roomFx = [];
function roomCatKeys() { return [S.hero].concat(HEROES.filter(k => k !== S.hero && catOpen(k))); }
// Called every frame on the room screen: if her cats or her room changed, everyone finds a place again.
function syncRoom() {
  const keys = roomCatKeys(), sig = keys.join("") + "|" + ROOM_SPOTS.map(s => S.room.put[s] || "").join(",");
  if (sig === roomSig) return;
  const fresh = !roomSig;
  roomSig = sig;
  const perches = roomPerches(), old = roomCats;
  roomCats = [];
  // the nicest places first: her own cat always takes the best one (so a new bed gets tried out
  // at once), the others pick among the next few
  const order = perches.map((p, i) => i).sort((a, b) => perches[b].sleep - perches[a].sleep + (Math.random() - 0.5) * 0.3);
  keys.forEach((key, n) => {
    const was = old.find(c => c.key === key);
    const free = order.filter(i => !roomCats.some(c => c.p === i));
    const p = free.length ? free[fresh || n === 0 ? 0 : Math.floor(Math.random() * Math.min(3, free.length))] : n % perches.length;
    const at = perches[p];
    const cat = { key, p, x: at.x, y: at.y, depth: at.depth, pose: Math.random() < at.sleep ? "sleep" : "sit", wake: 0, move: null, face: 1,
      until: time + 2 + Math.random() * 6, perk: -9, seed: n * 2.3 };
    if (was && !fresh && !S.calm) {                       // walk over from where it was, rather than jump (calm motion: just be there)
      cat.x = was.x; cat.y = was.y; cat.depth = was.depth; cat.wake = was.wake;
      if (Math.hypot(at.x - was.x, at.y - was.y) > 2) startWalk(cat, at);
    }
    else cat.wake = cat.pose === "sit" ? 1 : 0;
    roomCats.push(cat);
  });
  roomCats.perches = perches;
}
function startWalk(cat, to) {
  const d = Math.hypot(to.x - cat.x, to.y - cat.y);
  const high = to.y < WALL_Y + 20 || cat.y < WALL_Y + 20;
  cat.move = { x0: cat.x, y0: cat.y, d0: cat.depth, x1: to.x, y1: to.y, d1: to.depth, t: 0,
    dur: Math.max(0.5, Math.min(3, d / 70)), h: high ? 14 + Math.abs(to.y - cat.y) * 0.4 : 0 };
  if (Math.abs(to.x - cat.x) > 1) cat.face = to.x > cat.x ? 1 : -1;
}
function roomUpdate(dt) {
  syncRoom();
  const perches = roomCats.perches || [];
  for (const cat of roomCats) {
    const at = perches[cat.p];
    if (cat.move) {
      const m = cat.move;
      m.t += dt;
      const f = clamp01(m.t / m.dur), e = f * f * (3 - 2 * f);
      cat.x = lerp(m.x0, m.x1, e); cat.y = lerp(m.y0, m.y1, e) - Math.sin(f * Math.PI) * m.h; cat.depth = lerp(m.d0, m.d1, f);
      if (m.h) cat.depth = Math.max(m.d0, m.d1);
      if (f >= 1) {
        cat.move = null; cat.x = m.x1; cat.y = m.y1; cat.depth = m.d1;
        cat.pose = at && Math.random() < at.sleep ? "sleep" : "sit";
        cat.until = time + 5 + Math.random() * 7;
      }
    } else if (time > cat.until && at) {
      cat.until = time + 4 + Math.random() * 7;
      const free = perches.map((p, i) => i).filter(i => !roomCats.some(c => c.p === i));
      if (!S.calm && free.length && Math.random() < 0.45) {          // off to somewhere new (calm motion: they stay put)
        const i = free[Math.floor(Math.random() * free.length)];
        cat.p = i; startWalk(cat, perches[i]);
      } else cat.pose = Math.random() < at.sleep ? "sleep" : "sit";   // or just wake up a bit, or doze off
    }
    const want = cat.move || time < cat.perk || cat.pose === "sit" ? 1 : 0;
    cat.wake = S.calm ? want : cat.wake + (want - cat.wake) * Math.min(1, dt * 3);
  }
  for (const f of roomFx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  roomFx = roomFx.filter(f => f.life > 0);
}
const roomBusy = () => roomCats.some(c => c.move || Math.abs(c.wake - (c.move || time < c.perk || c.pose === "sit" ? 1 : 0)) > 0.02) || roomFx.length > 0;
// Tapping a cat wakes it up for a moment, and it says hello.
function petCat(cat) {
  cat.perk = time + 3;
  meow(0.05, VOICE[cat.key]);
  sfx.purr();                                             // and a happy purr
  const n = S.calm ? 1 : 3;
  for (let i = 0; i < n; i++) roomFx.push({ x: cat.x + (i - 1) * 8, y: cat.y - 44, vx: (i - 1) * 10, vy: -30 - i * 6, life: 1, max: 1 });
}
const CAT_S = 42;                                         // a cat's size in room units

/* ---------- the room screen ---------- */
let roomAt = { k: 1, ox: 0, oy: 0 };
function drawRoomScreen() {
  const s = safeArea();
  roundButton(16, topY + 6, 44, "back", () => go("home"));
  coinPill(W - 16 - 86, topY + 11);
  fitLabel(t("room"), W / 2, topY + 28, 26, W - 2 * 108, INK, 900);
  fitLabel(t("room_tip"), W / 2, topY + 64, 13, W - 40, SOFT, 700);
  const top = topY + 78, bottom = H - s.b - 72, availH = Math.max(60, bottom - top);
  const k = Math.max(0.2, Math.min((W - 20) / RW, availH / RH));
  const ox = (W - RW * k) / 2, oy = top + Math.max(0, (availH - RH * k) * 0.3);
  roomAt = { k, ox, oy };
  syncRoom();

  // the room itself, in room units
  rr(ox - 5, oy - 5 + 6, RW * k + 10, RH * k + 10, 24); ctx.fillStyle = "rgba(20, 28, 90, 0.22)"; ctx.fill();
  rr(ox - 5, oy - 5, RW * k + 10, RH * k + 10, 24); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(k, k);
  rr(0, 0, RW, RH, 20 / k); ctx.clip();
  drawRoomBase();
  for (const spot of ROOM_SPOTS) if (SPOT_AT[spot].layer === 1 && S.room.put[spot]) drawThing(spot, S.room.put[spot]);
  // floor things and cats, from back to front
  const list = [];
  for (const spot of ROOM_SPOTS) if (SPOT_AT[spot].layer === 2 && S.room.put[spot]) list.push({ depth: SPOT_AT[spot].depth, spot });
  for (const cat of roomCats) list.push({ depth: cat.depth, cat });
  list.sort((a, b) => a.depth - b.depth);
  for (const it of list) {
    if (it.spot) { drawThing(it.spot, S.room.put[it.spot]); continue; }
    const c = it.cat, awake = c.wake > 0.5;
    drawCat(c.x, c.y - CAT_S * 0.37, CAT_S, c.key, { seed: c.seed, wake: c.wake, hat: hatFor(c.key), neck: neckFor(c.key),
      still: !(c.move || (awake && (roomCats.perches[c.p] || {}).play)), sx: c.face > 0 ? -1 : 1, sy: 1, noShadow: c.y < WALL_Y });
    if (!awake && !S.calm) {                                        // little z's while asleep
      const zt = ((time + c.seed) * 0.45) % 1;
      ctx.globalAlpha = Math.sin(zt * Math.PI) * 0.8;
      label("z", c.x + 14 + zt * 6, c.y - CAT_S * 0.75 - zt * 12, Math.round(10 + zt * 5), INK, 900);
      ctx.globalAlpha = 1;
    }
  }
  for (const f of roomFx) { ctx.globalAlpha = clamp01(f.life / f.max); ctx.fillStyle = "#FF5C8A"; drawHeart(f.x, f.y, 12); ctx.globalAlpha = 1; }
  // empty spots wear a small "+" so she knows they can be tapped
  if (!overlay) for (const spot of ROOM_SPOTS) {
    if (SWATCH[spot] || S.room.put[spot]) continue;
    const [bx, by, bw, bh] = SPOT_AT[spot].box, at = SPOT_AT[spot];
    const mx = at.x + bx + bw / 2, my = at.y + by + bh / 2 + (spot === "hang" ? -14 : 0);
    const beat = S.calm ? 0 : Math.sin(time * 3 + mx) * 0.08;
    ctx.globalAlpha = 0.9;
    oval(mx, my, 11 * (1 + beat), 11 * (1 + beat)); fs("rgba(255, 255, 255, 0.9)", "#8FB4E3", 2.4);
    line([[mx - 5, my], [mx + 5, my]], SOFT, 3); line([[mx, my - 5], [mx, my + 5]], SOFT, 3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // tapping: spots first (the big wall and floor at the bottom), then cats on top
  for (const spot of ROOM_SPOTS) {
    const [bx, by, bw, bh] = SPOT_AT[spot].box, at = SPOT_AT[spot];
    buttons.push({ x: ox + (at.x + bx) * k, y: oy + (at.y + by) * k, w: bw * k, h: bh * k, onTap: () => openPicker(spot) });
  }
  for (const c of roomCats) {
    const r = CAT_S * 0.5 * k;
    buttons.push({ x: ox + c.x * k - r, y: oy + (c.y - CAT_S * 0.37) * k - r * 1.1, w: r * 2, h: r * 2, onTap: () => petCat(c) });
  }

  const pw = Math.min(260, W - 72);
  pillButton(W / 2 - pw / 2, H - s.b - 62, pw, 46, t("powerups"), () => go("shop"), false, { fill: "#FFFFFF" });
}

/* ---------- the picker for one spot ---------- */
function openPicker(spot) { overlay = { kind: "roompick", spot, t: 1, delay: 0, at: time }; }
function placeThing(spot, id) {
  if (id) S.room.put[spot] = id; else delete S.room.put[spot];
  save();
  overlay = null;
  roomPop = { spot, t: time };
  sfx.place();
}
function pickThing(spot, id) {
  if (!id || roomOwns(id)) { placeThing(spot, id); return; }
  const it = roomItem(id), name = t("ri_" + id);
  askBuy({ name, price: it.price, pic: ["room", id] }, () => {
    if (!S.room.own.includes(id)) S.room.own.push(id);
    placeThing(spot, id);
    toast(t("bought_item", name));
  });
}
function drawRoomPick() {
  const o = overlay, spot = o.spot;
  buttons = [];                                                         // nothing behind the card can be tapped
  ctx.fillStyle = "rgba(20, 26, 80, 0.5)"; ctx.fillRect(0, 0, W, H);
  const items = (ROOM_FREE[spot] ? [] : [""]).concat(ROOM_ITEMS.filter(it => it.spot === spot).map(it => it.id));
  const cw = Math.max(220, Math.min(340, W - 32)), colsN = 3, gap = 8;
  const rowsN = Math.ceil(items.length / colsN);
  const roomForTiles = H - topY - 12 - 66 - 74 - (rowsN - 1) * gap;            // title above, Done below
  const tw = Math.max(52, Math.min((cw - 32 - gap * (colsN - 1)) / colsN, roomForTiles / rowsN));
  const ch = 66 + rowsN * tw + (rowsN - 1) * gap + 74;
  const x = (W - cw) / 2, y = Math.max(topY + 4, (H - ch) / 2);
  card(x, y, cw, ch);
  fitLabel(t("rs_" + spot), W / 2, y + 36, 22, cw - 36, INK, 900);
  const gw = colsN * tw + (colsN - 1) * gap, gx0 = (W - gw) / 2, now = roomPut(spot);
  items.forEach((id, i) => {
    const tx = gx0 + (i % colsN) * (tw + gap), ty = y + 62 + Math.floor(i / colsN) * (tw + gap);
    const on = id === now, owned = !id || roomOwns(id);
    rr(tx, ty, tw, tw, 14); ctx.fillStyle = on ? "#FFF0B3" : "#F1F5FF"; ctx.fill();
    if (on) { ctx.strokeStyle = "#FF8A1F"; ctx.lineWidth = 3; ctx.stroke(); }
    if (id) drawThingPreview(spot, id, tx + tw / 2, ty + tw * 0.42, tw * 0.62);
    else label(t("no_hat"), tx + tw / 2, ty + tw * 0.42, Math.round(Math.max(11, tw * 0.17)), SOFT, 800);
    const ly = ty + tw - 11;
    if (owned) fitLabel(id ? t("ri_" + id) : t("room_none"), tx + tw / 2, ly, 11, tw - 8, INK, 700);
    else {                                                              // not hers yet: the price
      const num = String(roomItem(id).price);
      ctx.font = `800 12px ${FONT}`;
      const left = tx + tw / 2 - (ctx.measureText(num).width + 16) / 2;
      drawCoin(left + 6, ly - 1, 6.5);
      label(num, left + 16, ly, 12, INK, 800, "left");
    }
    buttons.push({ x: tx, y: ty, w: tw, h: tw, onTap: () => pickThing(spot, id) });
  });
  pillButton(x + 24, y + ch - 62, cw - 48, 46, t("done"), () => { overlay = null; }, true);
  if (time - o.at < 0.25) buttons = [];                                 // the tap that opened it can't also choose
}
