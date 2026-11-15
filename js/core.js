"use strict";
/* ==================================================================
   DROP THE BEAN - core: canvas, saved data, words, cats, sound.
   Files load in this order: core, art, play, screens, main.
=================================================================== */

const LEVELS = window.LEVELS || [];
const CHAPTER_SIZE = 25;
const CHAPTER_KEYS = ["c_nap", "c_rails", "c_lock", "c_blanket", "c_gate", "c_house", "c_maze", "c_dream",
  "c_9", "c_10", "c_11", "c_12", "c_13", "c_14", "c_15", "c_16", "c_17", "c_18", "c_19", "c_20",
  "c_21", "c_22", "c_23", "c_24", "c_25", "c_26", "c_27", "c_28"];
const INK = "#252A5C";
const SOFT = "#5F6AA6";
const FONT = 'ui-rounded, "SF Pro Rounded", -apple-system, "Helvetica Neue", system-ui, sans-serif';
const LEAVE = 0.95;                 // seconds a full bed takes to wake up, cheer and go
const lerp = (a, b, v) => a + (b - a) * v;
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOutBack = v => { const c = 1.70158; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };

/* ---------- canvas ---------- */
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
const nameInput = document.getElementById("nameInput");
const playerInput = document.getElementById("playerInput");
const codeBox = document.getElementById("codeBox");
const restoreBox = document.getElementById("restoreBox");
let W = 0, H = 0, time = 0;

const probe = document.createElement("div");
probe.style.cssText = "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
  "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);";
document.body.appendChild(probe);
function safeArea() {
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}

/* ---------- the cast ----------
   Bean and Meowsy are the two stars. "mark" picks the fur pattern. */
const CATS = {
  k: { name: "Bean",   mark: "tux",      fur: "#2C2C3A", dark: "#0B0B12", light: "#FFFFFF", bed: "#4A4A63", bedIn: "#D4D4E6", face: "#1B1B28", lid: "#F2F2FA", eye: "#FFE35A", tip: "#FFFFFF" },
  g: { name: "Meowsy", mark: "tabbytux", fur: "#A6ABBB", dark: "#474D61", light: "#FFFFFF", bed: "#7E869F", bedIn: "#ECEEF4", face: "#2E3345", eye: "#8FDD5F", tip: "#FFFFFF", stripe: "#6A7086" },
  o: { name: "Pinto",  mark: "tabby",    fur: "#FFA63D", dark: "#B9590A", light: "#FFE3B8", bed: "#FF8A1F", face: "#4A2A12" },
  b: { name: "Navy",   mark: "belly",    fur: "#5AA9FF", dark: "#1F57B0", light: "#DCEBFF", bed: "#3B8BEF", face: "#16335F" },
  w: { name: "Butter", mark: "patch",    fur: "#FFFFFF", dark: "#8F9AC4", light: "#FFFFFF", bed: "#D3DBF3", face: "#3A3F66" },
  p: { name: "Jelly",  mark: "points",   fur: "#B981FF", dark: "#6431BD", light: "#EFE2FF", bed: "#9C5BF4", face: "#35176E", ear: "#8E55E6", tail: "#8E55E6" },
  m: { name: "Eda",    mark: "belly",    fur: "#82DD5C", dark: "#35891E", light: "#E1F8D3", bed: "#5FCB36", face: "#1E4D12", sprout: true },
  // The next three never sleep on a level floor. They can only be the player's own cat,
  // so their colors are kept well away from the seven above.
  a: { name: "Azuki",  mark: "belly",    fur: "#FF86B8", dark: "#B4296B", light: "#FFE3EF", bed: "#FF5C9D", face: "#6B123D", earIn: "#FFD6E6" },
  c: { name: "Cocoa",  mark: "points",   fur: "#9A6842", dark: "#55331A", light: "#F4DEC3", bed: "#7D4E2C", face: "#3A200E", ear: "#6E4526", tail: "#6E4526" },
  z: { name: "Magic",  mark: "sparkle",  fur: "#3FCFC4", dark: "#0E7C78", light: "#D5F7F3", bed: "#17AFA6", face: "#0B4F4C", eye: "#FFE35A" },
};
const CAST = ["k", "g", "o", "b", "w", "p", "m"];            // the cats that appear in levels
const HEROES = CAST.concat(["a", "c", "z"]);                 // the cats she can choose as her own
// Stars open up new cats to choose. Bean and Meowsy are free.
const CAT_STARS = { k: 0, g: 0, o: 30, b: 75, w: 150, p: 250, m: 400, a: 600, c: 900, z: 1200 };
const HATS = [
  { id: "bow", price: 60 }, { id: "cap", price: 90 }, { id: "flower", price: 120 },
  { id: "party", price: 160 }, { id: "beanie", price: 200 }, { id: "crown", price: 250 },
  { id: "tophat", price: 350 }, { id: "wizard", price: 500 },
];
// A second thing to wear, at the neck.
const NECKS = [
  { id: "collar", price: 80 }, { id: "bowtie", price: 150 }, { id: "scarf", price: 240 },
];
const POWERUPS = [
  { id: "hint", price: 30 }, { id: "snooze", price: 25 }, { id: "treat", price: 45 }, { id: "hammer", price: 40 },
];
// The Hammer fixes a hole that a bed broke. It shows up once she reaches level 501, where
// creaky boards begin, and she gets 2 to start with. Before that it is hidden everywhere.
const HAMMER_AT = 500;                                   // level 501, counted from 0
const puOpen = id => id !== "hammer" || !!S.hammerGot;
/* ---------- the cat room ----------
   One room with 16 spots. Each spot takes one thing from its own list. The spot id is also
   the name of its list. Wallpaper, floor and window view start with a free choice; every
   other spot starts empty. "n" is a fixed number for each thing, used by the backup code:
   never change or reuse one, only add new numbers at the end. The pictures are in js/room.js. */
const ROOM_SPOTS = ["wall", "floor", "view", "pic", "shelf", "hang", "sill", "lamp", "plant", "tree", "rug", "post", "bed", "cush", "toy", "bowl"];
const ROOM_ITEMS = [
  { n: 0, id: "w_plain", spot: "wall", price: 0 }, { n: 1, id: "w_stripe", spot: "wall", price: 300 }, { n: 2, id: "w_dots", spot: "wall", price: 650 },
  { n: 3, id: "w_flower", spot: "wall", price: 1300 }, { n: 4, id: "w_fish", spot: "wall", price: 2400 },
  { n: 5, id: "f_wood", spot: "floor", price: 0 }, { n: 6, id: "f_tile", spot: "floor", price: 250 }, { n: 7, id: "f_check", spot: "floor", price: 700 },
  { n: 8, id: "f_carpet", spot: "floor", price: 1200 }, { n: 9, id: "f_bamboo", spot: "floor", price: 2000 },
  { n: 10, id: "v_day", spot: "view", price: 0 }, { n: 11, id: "v_rain", spot: "view", price: 400 }, { n: 12, id: "v_sunset", spot: "view", price: 1000 },
  { n: 13, id: "v_stars", spot: "view", price: 2200 }, { n: 14, id: "v_rainbow", spot: "view", price: 4000 },
  { n: 15, id: "p_fish", spot: "pic", price: 150 }, { n: 16, id: "p_heart", spot: "pic", price: 350 }, { n: 17, id: "p_hills", spot: "pic", price: 700 },
  { n: 18, id: "p_cat", spot: "pic", price: 1800 },
  { n: 19, id: "s_books", spot: "shelf", price: 120 }, { n: 20, id: "s_jar", spot: "shelf", price: 400 }, { n: 21, id: "s_vine", spot: "shelf", price: 800 },
  { n: 22, id: "s_trophy", spot: "shelf", price: 2500 },
  { n: 23, id: "h_lantern", spot: "hang", price: 250 }, { n: 24, id: "h_plant", spot: "hang", price: 700 }, { n: 25, id: "h_mobile", spot: "hang", price: 1500 },
  { n: 26, id: "l_cactus", spot: "sill", price: 100 }, { n: 27, id: "l_flower", spot: "sill", price: 450 }, { n: 28, id: "l_fishbowl", spot: "sill", price: 1200 },
  { n: 29, id: "m_round", spot: "lamp", price: 300 }, { n: 30, id: "m_tall", spot: "lamp", price: 800 }, { n: 31, id: "m_mush", spot: "lamp", price: 2000 },
  { n: 32, id: "t_fern", spot: "plant", price: 150 }, { n: 33, id: "t_snake", spot: "plant", price: 450 }, { n: 34, id: "t_leaf", spot: "plant", price: 1000 },
  { n: 35, id: "t_banana", spot: "plant", price: 2200 },
  { n: 36, id: "r_small", spot: "tree", price: 900 }, { n: 37, id: "r_tall", spot: "tree", price: 3000 }, { n: 38, id: "r_castle", spot: "tree", price: 7500 },
  { n: 39, id: "u_round", spot: "rug", price: 200 }, { n: 40, id: "u_stripe", spot: "rug", price: 500 }, { n: 41, id: "u_paw", spot: "rug", price: 1100 },
  { n: 42, id: "u_rainbow", spot: "rug", price: 3000 },
  { n: 43, id: "o_rope", spot: "post", price: 200 }, { n: 44, id: "o_fish", spot: "post", price: 900 }, { n: 45, id: "o_cactus", spot: "post", price: 1800 },
  { n: 46, id: "b_box", spot: "bed", price: 100 }, { n: 47, id: "b_basket", spot: "bed", price: 400 }, { n: 48, id: "b_round", spot: "bed", price: 800 },
  { n: 49, id: "b_cave", spot: "bed", price: 1800 }, { n: 50, id: "b_cloud", spot: "bed", price: 5000 },
  { n: 51, id: "c_round", spot: "cush", price: 150 }, { n: 52, id: "c_heart", spot: "cush", price: 500 }, { n: 53, id: "c_star", spot: "cush", price: 1000 },
  { n: 54, id: "c_bean", spot: "cush", price: 2500 },
  { n: 55, id: "y_yarn", spot: "toy", price: 100 }, { n: 56, id: "y_mouse", spot: "toy", price: 250 }, { n: 57, id: "y_track", spot: "toy", price: 900 },
  { n: 58, id: "d_basic", spot: "bowl", price: 120 }, { n: 59, id: "d_double", spot: "bowl", price: 600 }, { n: 60, id: "d_gold", spot: "bowl", price: 3500 },
];
const roomItem = id => ROOM_ITEMS.find(it => it.id === id);
const ROOM_FREE = { wall: "w_plain", floor: "f_wood", view: "v_day" };      // what these three spots show until she picks
// Keep only things this game knows: owned once each (free ones need no owning), and each
// placed thing must be hers and belong to that spot.
function cleanRoom(r) {
  const out = { own: [], put: {} };
  if (!r || typeof r !== "object") return out;
  for (const id of Array.isArray(r.own) ? r.own : []) { const it = roomItem(id); if (it && it.price > 0 && !out.own.includes(id)) out.own.push(id); }
  const put = r.put && typeof r.put === "object" ? r.put : {};
  for (const spot of ROOM_SPOTS) {
    const it = roomItem(put[spot]);
    if (it && it.spot === spot && (it.price === 0 || out.own.includes(it.id))) out.put[spot] = it.id;
  }
  return out;
}
const PAIR = [["#FFC93C", "#8A5A00"],["#FF7EB6", "#A02567"], ["#5FE0C0", "#1E7A62"]];     // lock-and-key pair colors
/* ---------- chapter looks ----------
   Every chapter (25 levels) has its own colors and its own little shapes drifting
   in the background. All backgrounds stay light, so the dark text is easy to read.
   bg: top and bottom of the sky. tray: the board. wall: blocks. tiles: the floor. */
const LOOKS = [
  { bg: ["#A9DCFF", "#E3F4FF"], tray: "#4A5BC4", trayDark: "#2B3783", wall: "#6577DC", wallDark: "#35449E", tiles: ["#F4F7FF", "#E5EBFC"], motif: "bean" },      // 1 Nap Time
  { bg: ["#FFC2A1", "#FFF0DC"], tray: "#BE5439", trayDark: "#8C3521", wall: "#E07A5F", wallDark: "#A6452D", tiles: ["#FFF8F0", "#FBE8D8"], motif: "diamond" },   // 2 On Rails
  { bg: ["#FFE08A", "#FFF7DA"], tray: "#A06917", trayDark: "#7F5008", wall: "#D9A441", wallDark: "#9A6B14", tiles: ["#FFFCF0", "#FBF0CF"], motif: "key" },       // 3 Lock and Key
  { bg: ["#CDBBFF", "#F1EAFF"], tray: "#6B4FC0", trayDark: "#44308A", wall: "#7C6CC8", wallDark: "#4C3F96", tiles: ["#FAF7FF", "#EBE3FB"], motif: "patch" },     // 4 Blanket Fort
  { bg: ["#A8E6C4", "#EAFBF1"], tray: "#2B8261", trayDark: "#1D6349", wall: "#4DB58D", wallDark: "#247256", tiles: ["#F5FFF9", "#E0F5E9"], motif: "leaf" },      // 5 Baby Gates
  { bg: ["#FFB8CC", "#FFECF1"], tray: "#C2456E", trayDark: "#8A2A4B", wall: "#CF6684", wallDark: "#96405B", tiles: ["#FFF7F9", "#FBE3EA"], motif: "heart" },     // 6 Full House
  { bg: ["#F3D9B5", "#FFF6E6"], tray: "#9A6A3E", trayDark: "#6B4523", wall: "#C08F5E", wallDark: "#855A30", tiles: ["#FFFBF3", "#F6EAD6"], motif: "cloud" },     // 7 Pillow Maze
  { bg: ["#B3BEFF", "#E8ECFF"], tray: "#4450B8", trayDark: "#2A337F", wall: "#6B78DD", wallDark: "#3C479E", tiles: ["#F6F7FF", "#E4E7FB"], motif: "star" },      // 8 Dream Team
  { bg: ["#A7A2F0", "#E4DDFF"], tray: "#3B2F8F", trayDark: "#241C63", wall: "#5B4DC0", wallDark: "#30267A", tiles: ["#F7F5FF", "#E7E2FA"], motif: "moon" },      // 9 Night Train
  { bg: ["#9FE3E6", "#E6FAFA"], tray: "#22808C", trayDark: "#125660", wall: "#3D95A1", wallDark: "#1F6570", tiles: ["#F3FEFF", "#DDF3F4"], motif: "bubble" },    // 10 Safe and Sound
  { bg: ["#CDEB9A", "#F4FCE0"], tray: "#558120", trayDark: "#3E6311", wall: "#739F3D", wallDark: "#4A6E1F", tiles: ["#FBFFF2", "#EAF5D3"], motif: "diamond" },   // 11 Side Tracks
  { bg: ["#E5B8F4", "#FBEFFF"], tray: "#8E3FA8", trayDark: "#622377", wall: "#A565B8", wallDark: "#74408A", tiles: ["#FEF8FF", "#F2E2F8"], motif: "zzz" },       // 12 Hide and Sleep
  { bg: ["#FFC6DD", "#FFF5DC"], tray: "#C84274", trayDark: "#9C2A56", wall: "#D9668F", wallDark: "#9E3A62", tiles: ["#FFF9FB", "#FDE6EE"], motif: "confetti" },  // 13 Pajama Party
  { bg: ["#B5C7F2", "#EAF0FF"], tray: "#34437A", trayDark: "#1F2A54", wall: "#566AB0", wallDark: "#333F78", tiles: ["#F5F7FF", "#E2E7F7"], motif: "fish" },      // 14 Midnight Snack
  { bg: ["#A3D4F0", "#E2F3FB"], tray: "#1F6591", trayDark: "#124466", wall: "#3F8CBB", wallDark: "#1F5F87", tiles: ["#F4FBFF", "#DDEDF6"], motif: "zzz" },       // 15 Deep Sleep
  { bg: ["#E3D6C6", "#F8F3EC"], tray: "#70625A", trayDark: "#4A3F39", wall: "#978679", wallDark: "#65574D", tiles: ["#FDFBF8", "#EFE8E0"], motif: "patch" },     // 16 Rail Yard
  { bg: ["#FFD3A0", "#FFF3E0"], tray: "#A65B1E", trayDark: "#74390B", wall: "#B5743C", wallDark: "#7D4A1C", tiles: ["#FFFAF2", "#FAEAD5"], motif: "key" },       // 17 Under Lock and Key
  { bg: ["#C6E2FF", "#FFEFF6"], tray: "#5372BB", trayDark: "#3A5599", wall: "#86A4E6", wallDark: "#4F6FB5", tiles: ["#F8FBFF", "#E9EFFB"], motif: "cloud" },     // 18 Pillow Fort
  { bg: ["#BDB8F5", "#FBF3D2"], tray: "#4A3F9E", trayDark: "#2E2670", wall: "#7468CF", wallDark: "#463B99", tiles: ["#FAF8FF", "#ECE8FA"], motif: "moon" },      // 19 Full Moon
  { bg: ["#FFC4E6", "#E8F0FF"], tray: "#B9479B", trayDark: "#822C6C", wall: "#DB74BE", wallDark: "#9A4183", tiles: ["#FFF8FD", "#FAE4F3"], motif: "heart" },     // 20 Sweet Dreams
  { bg: ["#B7E8D8", "#EFFBF6"], tray: "#3A7D78", trayDark: "#235551", wall: "#54978F", wallDark: "#2F6B65", tiles: ["#F5FFFC", "#DFF3ED"], motif: "paw" },       // 21 Sleepwalkers
  { bg: ["#F0CDB0", "#FFF4EA"], tray: "#A8563A", trayDark: "#753521", wall: "#CF8163", wallDark: "#964D34", tiles: ["#FFF9F4", "#F8E6D9"], motif: "yarn" },      // 22 Cat Tower
  { bg: ["#C3CFEA", "#F2F5FC"], tray: "#4B5A8C", trayDark: "#303B63", wall: "#7484BA", wallDark: "#48568A", tiles: ["#F8FAFF", "#E6EAF5"], motif: "moon" },      // 23 Moonlight
  { bg: ["#B6EBA5", "#F0FCEA"], tray: "#37843A", trayDark: "#266A2B", wall: "#4C9C63", wallDark: "#2B6B40", tiles: ["#F7FFF4", "#E2F5DC"], motif: "leaf" },      // 24 Catnip Club
  { bg: ["#A9E0FF", "#FFF6D6"], tray: "#3479B4", trayDark: "#235C91", wall: "#62A8E3", wallDark: "#3476B0", tiles: ["#F6FCFF", "#E2F1FB"], motif: "cloud" },     // 25 Window Seat
  { bg: ["#D2D8E8", "#F6F7FB"], tray: "#566080", trayDark: "#394060", wall: "#7F8AAE", wallDark: "#525C80", tiles: ["#FAFBFE", "#E8EBF3"], motif: "yarn" },      // 26 Purr Factory
  { bg: ["#9FB0F5", "#DCD6FF"], tray: "#2C2F7E", trayDark: "#1A1C55", wall: "#4A50B5", wallDark: "#2A2E7A", tiles: ["#F5F6FF", "#E1E3FA"], motif: "star" },      // 27 Starry Night
  { bg: ["#FFE7A3", "#FFF1F7"], tray: "#8A3F9E", trayDark: "#5F2670", wall: "#A468B5", wallDark: "#733F85", tiles: ["#FFFAFF", "#F5E6F8"], motif: "paw" },       // 28 Nine Lives
];
// Blend two "#RRGGBB" colors: v = 0 gives the first, v = 1 the second.
function mix(a, b, v) {
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map(i => Math.round(lerp(p(a, i), p(b, i), v)).toString(16).padStart(2, "0")).join("");
}
for (const lk of LOOKS) lk.soft = mix(lk.wall, "#FFFFFF", 0.45);     // a pale version, for the empty level beds on the home screen

/* ---------- chapters past the 28 hand-made ones ----------
   The game is built to grow to 80 chapters (2000 levels). Chapters 1 to 28 have their own
   names and looks. After that, a name is made from two word lists and a look is a blend of
   two of the 28 looks with the colors turned around the color wheel. The same chapter number
   always gives the same name and look. Every look is checked so text stays easy to read:
   dark text on the sky and tiles, white text on the board color, both at least 4.5 to 1. */
const NAME_A = ["Sleepy", "Cozy", "Snug", "Quiet", "Lazy", "Fluffy", "Warm", "Drowsy", "Golden", "Velvet", "Purring", "Misty", "Gentle"];
const NAME_B = ["Hideout", "Corner", "Garden", "Attic", "Hammock", "Basket", "Sunbeam", "Teacup", "Porch", "Bookshelf", "Lantern", "Meadow"];
function chapterName(n) {                       // n counts from 0
  if (n < CHAPTER_KEYS.length) return t(CHAPTER_KEYS[n]);
  const k = n - CHAPTER_KEYS.length;            // 13 x 12 = 156 different names before any comes back
  return NAME_A[(k * 5 + 2) % NAME_A.length] + " " + NAME_B[(k * 7 + 3) % NAME_B.length];
}
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbHex = c => "#" + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
function luminance(h) {
  const c = hexRGB(h).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// Turn a color around the color wheel by "deg" degrees, keeping how light and how strong it is.
function hueShift(h, deg) {
  let [r, g, b] = hexRGB(h).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let hh = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
  }
  hh = ((hh + deg) % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2;
  const seg = Math.floor(hh / 60);
  [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg] || [c, x, 0];
  return rgbHex([r, g, b].map(v => (v + m) * 255));
}
// Make a color darker (toward "to" = black) or lighter (toward white) until the test passes.
function nudge(h, to, ok) { for (let i = 0; i < 60 && !ok(h); i++) h = mix(h, to, 0.06); return ok(h) ? h : to; }
const MOTIFS = ["bean", "diamond", "key", "patch", "leaf", "heart", "cloud", "star", "moon", "bubble", "zzz", "confetti", "fish", "paw", "yarn"];
const lookCache = {};
function lookFor(n) {
  n = Math.max(0, Math.floor(n) || 0);
  if (n < LOOKS.length) return LOOKS[n];
  if (lookCache[n]) return lookCache[n];
  const k = n - LOOKS.length;
  const A = LOOKS[(k * 7 + 3) % LOOKS.length], B = LOOKS[(k * 11 + 8) % LOOKS.length];
  const deg = 25 + (k * 47) % 310;
  const blend = key => hueShift(mix(A[key], B[key], 0.5), deg);
  const lk = {
    bg: [0, 1].map(i => hueShift(mix(A.bg[i], B.bg[i], 0.5), deg)),
    tiles: [0, 1].map(i => hueShift(mix(A.tiles[i], B.tiles[i], 0.5), deg)),
    tray: blend("tray"), trayDark: blend("trayDark"), wall: blend("wall"), wallDark: blend("wallDark"),
    motif: MOTIFS[(k * 5 + 1) % MOTIFS.length],
  };
  const inkOK = c => contrast(c, INK) >= 4.6;
  lk.bg = lk.bg.map(c => nudge(c, "#FFFFFF", inkOK));
  lk.tiles = lk.tiles.map(c => nudge(c, "#FFFFFF", inkOK));
  lk.tray = nudge(lk.tray, "#000000", c => contrast(c, "#FFFFFF") >= 4.6);
  lk.trayDark = nudge(lk.trayDark, "#000000", c => luminance(c) < luminance(lk.tray) * 0.7);
  lk.wallDark = nudge(lk.wallDark, "#000000", c => luminance(c) < luminance(lk.wall) * 0.7);
  lk.soft = mix(lk.wall, "#FFFFFF", 0.45);
  return (lookCache[n] = lk);
}

/* ---------- saved on this device ---------- */
const SAVE_KEY = "dropthebean.save.v2";
function freshSave() {
  return { stars: {}, coins: 60, pu: { hint: 3, snooze: 2, treat: 1, hammer: 0 }, hammerGot: false, perfect: {}, hero: "k", cats: [], names: {}, hat: "", hats: [],
    neck: "", necks: [], sound: true, music: true, track: 0, meow: 0, timer: true, shapes: false, calm: false,
    daily: { last: "", streak: 0 }, setup: false, player: "", room: { own: [], put: {} } };
}
const starSum = sv => Object.values(sv.stars).reduce((a, b) => a + b, 0);
// "cats" lists cats that stay hers whatever her star count: the cat she already had
// as her own before cats needed stars is never taken away.
function keepHero(sv) { if (CAT_STARS[sv.hero] > starSum(sv) && !sv.cats.includes(sv.hero)) sv.cats.push(sv.hero); }
function loadSave() {
  const base = freshSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const got = JSON.parse(raw);
      Object.assign(base, got);
      base.pu = Object.assign(freshSave().pu, got.pu || {});
      base.daily = Object.assign(freshSave().daily, got.daily || {});
    }
  } catch (e) { /* private mode or damaged data: start fresh */ }
  delete base.theme;                                  // boards used to be chosen by hand: now each chapter has its own look
  for (const k of ["cats", "hats", "necks"]) if (!Array.isArray(base[k])) base[k] = [];
  for (const k of ["stars", "perfect"]) if (!base[k] || typeof base[k] !== "object") base[k] = {};
  if (!base.names || typeof base.names !== "object") base.names = {};
  for (const p of POWERUPS) base.pu[p.id] = Math.max(0, Math.floor(Number(base.pu[p.id]) || 0));
  base.hammerGot = !!base.hammerGot;
  if (!HEROES.includes(base.hero)) base.hero = "k";
  if (!HATS.some(h => h.id === base.hat)) base.hat = "";
  if (!NECKS.some(q => q.id === base.neck)) base.neck = "";
  base.room = cleanRoom(base.room);                    // saves from before the room get an empty one
  keepHero(base);
  return base;
}
let S = loadSave();
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* play on without saving */ } }

/* ---------- backup code ----------
   Everything a player has earned, packed into one line of text that starts with
   "BEAN-". Typing it into the game on another phone brings it all back.
   Nothing is sent anywhere: the code is the save. */
const b64 = bytes => btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = str => Uint8Array.from(atob(str.replace(/-/g, "+").replace(/_/g, "/")), ch => ch.charCodeAt(0));
const codeSum = body => { let sum = 0; for (const ch of body) sum = (sum * 31 + ch.charCodeAt(0)) % 65536; return sum.toString(16).padStart(4, "0"); };

function makeCode() {
  let n = 0, np = 0;
  for (const k in S.stars) n = Math.max(n, Number(k) + 1);
  for (const k in S.perfect) np = Math.max(np, Number(k) + 1);
  const stars = new Uint8Array(Math.ceil(n / 4));                    // two bits per level
  for (let i = 0; i < n; i++) stars[i >> 2] |= (S.stars[i] || 0) << ((i & 3) * 2);
  const perfect = new Uint8Array(Math.ceil(np / 8));                 // one bit per level: solved in the fewest slides
  for (let i = 0; i < np; i++) if (S.perfect[i]) perfect[i >> 3] |= 1 << (i & 7);
  const data = { v: 1, p: S.player || "", s: b64(stars), pf: b64(perfect), c: S.coins, u: [S.pu.hint, S.pu.snooze, S.pu.treat, S.pu.hammer || 0], hg: S.hammerGot ? 1 : 0,
    h: S.hero, ck: S.cats, n: S.names, t: S.hat, o: S.hats, nk: S.neck, ns: S.necks, d: [S.daily.last, S.daily.streak],
    x: [S.sound ? 1 : 0, S.music ? 1 : 0, S.track, S.meow || 0, S.timer ? 1 : 0, S.shapes ? 1 : 0, S.calm ? 1 : 0] };
  // the room: one bit per thing she owns (by its fixed number), then what stands in each spot (-1: nothing)
  const own = new Uint8Array(Math.ceil(ROOM_ITEMS.length / 8));
  for (const id of S.room.own) { const it = roomItem(id); if (it) own[it.n >> 3] |= 1 << (it.n & 7); }
  data.rm = b64(own);
  data.rp = ROOM_SPOTS.map(spot => { const it = roomItem(S.room.put[spot]); return it ? it.n : -1; });
  const body = b64(new TextEncoder().encode(JSON.stringify(data)));
  return "BEAN-" + body + "-" + codeSum(body);
}

// Find the code inside whatever was pasted. Line breaks and spaces inside it are fine, and so are
// words before or after it ("my code: BEAN-... thanks!"). The check digits must still match.
function findCode(text) {
  const flat = String(text).replace(/\s+/g, "");
  for (let at = flat.indexOf("BEAN-"); at >= 0; at = flat.indexOf("BEAN-", at + 1)) {
    const rest = flat.slice(at + 5);
    const ends = [];                                   // every place the code could end: a dash and four check digits
    for (let i = rest.indexOf("-"); i >= 0; i = rest.indexOf("-", i + 1)) if (/^[0-9a-f]{4}$/.test(rest.slice(i + 1, i + 5))) ends.push(i);
    for (const i of ends.reverse()) {                  // longest first
      const body = rest.slice(0, i);
      if (/^[A-Za-z0-9_-]+$/.test(body) && codeSum(body) === rest.slice(i + 1, i + 5)) return body;
    }
  }
  return null;
}

// Returns a full save made from the code, or null if the code is damaged or not one of ours.
function readCode(text) {
  const body = findCode(text);
  if (!body) return null;
  let d;
  try { d = JSON.parse(new TextDecoder().decode(unb64(body))); } catch (e) { return null; }
  if (!d || d.v !== 1) return null;
  const count = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const out = freshSave();
  out.setup = true;
  out.player = String(d.p || "").slice(0, 16);
  try {
    const stars = unb64(String(d.s || ""));
    for (let i = 0; i < stars.length * 4 && i < LEVELS.length; i++) { const v = (stars[i >> 2] >> ((i & 3) * 2)) & 3; if (v) out.stars[i] = v; }
  } catch (e) { return null; }
  try {                                               // older codes have no "pf": no paw stamps, nothing else lost
    const perfect = unb64(String(d.pf || ""));
    for (let i = 0; i < perfect.length * 8 && i < LEVELS.length; i++) if (out.stars[i] && (perfect[i >> 3] >> (i & 7)) & 1) out.perfect[i] = 1;
  } catch (e) { out.perfect = {}; }
  out.coins = count(d.c, 999999);
  const u = Array.isArray(d.u) ? d.u : [];
  // Older codes have no Hammer: it comes back as 0, and the 2 free ones still come at level 501.
  out.pu = { hint: count(u[0], 999), snooze: count(u[1], 999), treat: count(u[2], 999), hammer: count(u[3], 999) };
  out.hammerGot = d.hg === 1;
  // Lists keep only the ids this game knows, each one once. Older codes have no "ck", "nk" or "ns": those start empty.
  const known = (list, ok) => (Array.isArray(list) ? list : []).filter((id, i, all) => ok(id) && all.indexOf(id) === i);
  out.hero = HEROES.includes(d.h) ? d.h : "k";
  out.cats = known(d.ck, k => HEROES.includes(k) && CAT_STARS[k] > 0);
  keepHero(out);                                      // the cat she had as her own stays hers
  if (d.n && typeof d.n === "object") for (const k of Object.keys(d.n)) if (HEROES.includes(k) && typeof d.n[k] === "string" && d.n[k]) out.names[k] = d.n[k].slice(0, 12);
  out.hats = known(d.o, id => HATS.some(h => h.id === id));
  out.hat = out.hats.includes(d.t) ? d.t : "";
  out.necks = known(d.ns, id => NECKS.some(q => q.id === id));
  out.neck = out.necks.includes(d.nk) ? d.nk : "";
  if (Array.isArray(d.d)) out.daily = { last: String(d.d[0] || ""), streak: count(d.d[1], 9999) };
  const x = Array.isArray(d.x) ? d.x : [1, 1, 0, 0, 1, 0, 0];
  out.sound = !!x[0]; out.music = !!x[1]; out.track = count(x[2], TRACK_FILES.length - 1); out.meow = count(x[3], 5);
  out.timer = !!x[4]; out.shapes = !!x[5]; out.calm = !!x[6];
  // Older codes have no room ("rm", "rp"): the room starts empty. Unknown numbers are dropped.
  try {
    const bits = unb64(String(d.rm || "")), room = { own: [], put: {} };
    for (const it of ROOM_ITEMS) if ((bits[it.n >> 3] >> (it.n & 7)) & 1) room.own.push(it.id);
    const rp = Array.isArray(d.rp) ? d.rp : [];
    ROOM_SPOTS.forEach((spot, i) => { const it = ROOM_ITEMS.find(q => q.n === rp[i]); if (it) room.put[spot] = it.id; });
    out.room = cleanRoom(room);
  } catch (e) { out.room = { own: [], put: {} }; }
  return out;
}

const totalStars = () => starSum(S);
const nextUnsolved = () => { for (let i = 0; i < LEVELS.length; i++) if (!S.stars[i]) return i; return 0; };
// A cat can be chosen once she has enough stars for it (or it was already hers).
const catOpen = k => totalStars() >= CAT_STARS[k] || S.cats.includes(k);
const nextCat = () => HEROES.find(k => !catOpen(k)) || "";

// The player's own cat takes Bean's place in every level; Bean takes that cat's place.
function skin(key) {
  if (S.hero === "k") return key;
  if (key === "k") return S.hero;
  if (key === S.hero) return "k";
  return key;
}
const catName = key => (key === S.hero && S.names[key]) || CATS[key].name;

/* ---------- daily puzzle ---------- */
const todayKey = d => { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
// Today's level is one she has already passed (a new player gets one of the first few),
// picked by scrambling the date so that one day's pick says nothing about the next.
// It is chosen once and remembered for the day, so passing more levels does not change it.
function dailyIndex() {
  const day = todayKey();
  if (S.daily.day === day && S.daily.pick >= 0 && S.daily.pick < LEVELS.length) return S.daily.pick;
  let pool = [];
  for (let i = 0; i < LEVELS.length; i++) if (S.stars[i]) pool.push(i);
  if (pool.length < 5) pool = LEVELS.slice(0, 5).map((_, i) => i);
  let h = 2166136261;
  for (const ch of day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  let at = (h >>> 0) % Math.max(1, pool.length);
  if (pool.length > 1 && pool[at] === S.daily.pick) at = (at + 1) % pool.length;      // never the same level two days running
  S.daily.day = day; S.daily.pick = pool[at] || 0;
  save();
  return S.daily.pick;
}
const dailyDone = () => S.daily.last === todayKey();
function dailyStreak() {
  if (dailyDone()) return S.daily.streak || 1;
  const y = new Date(); y.setDate(y.getDate() - 1);
  return S.daily.last === todayKey(y) ? (S.daily.streak || 0) : 0;
}
function markDaily() {
  if (dailyDone()) return false;
  S.daily = Object.assign({}, S.daily, { last: todayKey(), streak: dailyStreak() + 1 });
  return true;
}

/* ---------- words ---------- */
const WORDS = {
  en: {
    play: "Play level {0}", daily: "Daily nap", daily_done: "Daily nap done", streak: "Streak: {0}",
    mycat: "My cat", shop: "Shop", settings: "Settings", level: "Level {0}",
    left: "{0} left", slides: "{0} slides", slides_of: "{0} / {1} slides",
    win: "All tucked in!", lose: "Time's up!", paused: "Paused",
    win_slides: "Solved in {0} slides", win_slide1: "Solved in 1 slide", perfect: "Perfect!",
    star_marks: "3 stars: {0} or fewer. 2 stars: {1} or fewer.",
    star_rule: "3 stars: finish with half the time left.", star_snooze: "A Snooze was used, so 2 stars at most.",
    star_relaxed: "Relaxed mode: fewer moves, more stars.", relaxed_done: "Solved", time_left: "Time left: {0}",
    turn_title: "Please turn your phone upright", turn_sub: "This game is played standing tall.",
    coins_won: "+{0} coins", gift: "A gift: 1 {0}!", new_cat: "New cat: {0}!", streak_days: "Daily streak: {0}",
    next: "Next level", again: "Play again", retry: "Try again", home: "Home", resume: "Resume", restart: "Restart",
    done: "Done", back: "Back", start: "Start playing",
    need_bed: "{0} cats still need a bed.", need_bed1: "1 cat still needs a bed.", use_snooze: "Snooze: 30 more seconds",
    s_sound: "Sound: {0}", s_music: "Music: {0}", m_0: "Lullaby", m_1: "Sunny Window", m_2: "Tiptoe", m_3: "Dreamy", m_4: "Zoomies", m_5: "Hot Springs Town", m_6: "Happy Adventure", m_7: "Flowerbed Fields", m_8: "Catmint", m_9: "Cozy Puzzle", m_10: "Hush Hamlet",
    pick_music: "Music", pick_meow: "Meow sound",
    s_meow: "Meow: {0}", w_0: "Mrow", w_1: "Soft mew", w_2: "Kitten", w_3: "Siamese", w_4: "House cat", w_5: "Young cat", s_timer: "Timer: On", s_timer_off: "Timer: Off (relaxed)",
    s_shapes: "Color shapes: {0}", s_calm: "Calm motion: {0}", on: "On", off: "Off",
    next_cat: "Next cat: {0} at {1} stars", all_cats: "All cats are yours!", cat_locked: "{0} joins you at {1} stars",
    stars_of: "{0} of {1} stars",
    pu_hint: "Hint", pu_snooze: "Snooze", pu_treat: "Treat", pu_hammer: "Hammer",
    pu_hint_d: "Shows the next move for a bed", pu_snooze_d: "Adds 30 seconds", pu_treat_d: "Tucks in the cat you pick.",
    pu_hammer_d: "Fixes one broken board",
    bought: "Bought 1 {0}", bought_item: "It's yours: {0}!", need_coins: "You need {0} more coins", no_timer: "No timer in relaxed mode",
    buy_q: "Buy {0}?", buy_yes: "Buy", buy_no: "Not now", buy_have: "You have {0} coins",
    aim_treat: "Tap a cat to tuck it in", aim_hint: "Tap a bed to see its next move", aim_cancel: "Tap anywhere else to cancel",
    aim_hammer: "Tap a hole to fix it", no_holes: "No holes to fix", hammer_back: "Your Hammer is back",
    hammer_new: "New: 2 Hammers! Each one fixes a hole.",
    bed_wait: "This bed has to wait. Try this first.", no_hint: "No hint right now", treat_back: "Your Treat is back",
    thinking: "Thinking", hint_lost: "Try undo or restart",
    pick_cat: "Pick your cat", name_cat: "Tap the name to change it", no_hat: "None",
    tab_cats: "Cats", tab_hats: "Hats", tab_neck: "Neck", wear_tip: "Tap one to wear it", shop_outfits: "Hats and bow ties are in My cat",
    hat_bow: "Bow", hat_cap: "Nightcap", hat_flower: "Flower", hat_party: "Party hat", hat_crown: "Crown",
    hat_beanie: "Beanie", hat_tophat: "Top hat", hat_wizard: "Wizard hat",
    neck_collar: "Bell collar", neck_bowtie: "Bow tie", neck_scarf: "Scarf",
    backup: "Name and backup", your_name: "Your name", your_code: "Your backup code", copy: "Copy code",
    copied: "Copied! Send it to yourself to keep it safe.", code_note: "It holds your stars, coins, cats, outfits and room.",
    code_note2: "Copy a fresh one now and then.", have_code: "New phone? Paste your code here", restore: "Restore",
    restore_sure: "Tap Restore again to replace this phone's progress", bad_code: "That code doesn't look right",
    restored: "Progress restored!", welcome: "Welcome back, {0}!",
    powerups: "Powerups", have: "You have {0}",
    c_nap: "Nap Time", c_rails: "On Rails", c_lock: "Lock and Key", c_blanket: "Blanket Fort",
    c_gate: "Baby Gates", c_house: "Full House", c_maze: "Pillow Maze", c_dream: "Dream Team",
    c_9: "Night Train", c_10: "Safe and Sound", c_11: "Side Tracks", c_12: "Hide and Sleep",
    c_13: "Pajama Party", c_14: "Midnight Snack", c_15: "Deep Sleep", c_16: "Rail Yard",
    c_17: "Under Lock and Key", c_18: "Pillow Fort", c_19: "Full Moon", c_20: "Sweet Dreams",
    c_21: "Sleepwalkers", c_22: "Cat Tower", c_23: "Moonlight", c_24: "Catnip Club",
    c_25: "Window Seat", c_26: "Purr Factory", c_27: "Starry Night", c_28: "Nine Lives",
    b_k: "Naps anywhere. Even on your keyboard.", b_g: "Chirps at birds. Has never caught one.",
    b_o: "Thinks every box is a gift for him.", b_b: "Loves the rain. From indoors.",
    b_w: "Soft as butter. Steals your pillow.", b_p: "Wobbles when she runs. Runs a lot.",
    b_m: "Grows a little sprout when happy.",
    b_a: "Sweet as a bun. Hides your socks.", b_c: "Warm like hot cocoa. Sits on your book.",
    b_z: "Vanishes at bath time. Every time.",
    h_drag: ["Drag the bed over the sleeping cats.", "It takes cats of its own color."],
    h_block: ["Another cat blocks the way.", "Tuck that cat in first."],
    h_rail: ["New: beds with arrows are on rails.", "They only slide the way the arrows point."],
    h_lock: ["New: a locked bed can't move.", "Fill the bed with the key to open it."],
    h_blanket: ["New: who is under the blanket?", "Slide a bed next to it to peek."],
    h_gate: ["New: a gate keeps beds away from a cat.", "Fill the bed of the gate's color to open it."],
    h_mix: ["Rails and locks together.", "Plan the order before you slide."],
    h_mix2: ["Gates, locks and blankets.", "Peek first, then plan."],
    h_all: ["Everything at once.", "Take your time. You know all the tricks."],
    h_creaky: ["New: creaky boards break after a bed crosses them.", "Plan your path. A broken board is a hole."],
    h_oneway: ["New: arrow tiles go one way.", "A bed on an arrow can only move the way it points."],
    stuck: "The beds can't reach their cats now.", stuck2: "Undo or restart.",
    room: "My room", room_tip: "Tap a spot to decorate", room_none: "Nothing here", in_room: "In your room",
    chapters: "Chapters", chapter_n: "Chapter {0}", where: "Where I am", you_here: "You are here",
  },
};
function t(key) {
  const v = WORDS.en[key] || key;
  if (typeof v !== "string") return v;
  const args = arguments;
  return v.replace(/\{(\d)\}/g, (_, n) => args[Number(n) + 1]);
}
const clock = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

/* ---------- sound: made on the fly, no audio files ---------- */
let actx = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { actx = new AC(); } catch (e) { return null; }
    loadMeows();
    loadSfx();
  }
  // An iPhone pauses audio when you leave the game ("suspended" or "interrupted").
  // Wake it again on the next touch, whatever the paused state is called.
  if (actx.state !== "running") { try { const p = actx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* try again next touch */ } }
  return actx;
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && actx && (S.sound || S.music)) audio(); recordedMusic(false); });

function tone(freq, dur, o) {
  o = o || {};
  if (!(o.music ? S.music : S.sound)) return;
  const a = audio(); if (!a || a.state !== "running") return;
  const osc = a.createOscillator(), g = a.createGain(), t0 = o.at || a.currentTime + (o.delay || 0);
  osc.type = o.type || "sine";
  osc.frequency.setValueAtTime(freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t0 + (o.attack || 0.012));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}
// Each cat has its own voice: higher or lower.
const VOICE = { k: 1.0, g: 1.18, o: 0.86, b: 0.95, w: 1.3, p: 1.42, m: 1.1, a: 1.24, c: 0.8, z: 1.5 };

// A meow, built from scratch: a buzzy note that rises ("me") then falls ("ow"),
// pushed through a filter that slides from a bright "e" sound to a round "o" sound.
// Six recordings to choose from in Settings (see CREDITS.md). The first is the owner's own pick: it is the default.
const MEOW_FILES = ["sounds/meow-mrow.wav", "sounds/meow-soft.wav", "sounds/meow-kitten.wav", "sounds/meow-siamese.wav", "sounds/meow-house.wav", "sounds/meow-young.wav"];
const MEOW_GAIN = [0.8, 0.6, 0.45, 0.7, 0.7, 0.6];
const MEOW_SPREAD = [0.1, 0.4, 0.4, 0.4, 0.4, 0.4];      // how much each cat's voice shifts the pitch (the default stays close to the original)
const meowBuffers = [];
function loadMeows() {
  MEOW_FILES.forEach((url, i) => {
    fetch(url).then(r => r.arrayBuffer())
      .then(data => actx.decodeAudioData(data, buf => { meowBuffers[i] = buf; }, () => {}))
      .catch(() => { /* no recording: the built-in meow below is used */ });
  });
}

function meow(delay, pitch) {
  if (!S.sound) return;
  const a = audio(); if (!a || a.state !== "running") return;
  const rec = meowBuffers[S.meow];
  if (rec) {                                       // the real recording, a little higher or lower for each cat
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = rec;
    const spread = MEOW_SPREAD[S.meow] || 0.4;
    src.playbackRate.value = 1 - spread * 0.2 + ((pitch || 1) - 0.86) * spread;
    g.gain.value = MEOW_GAIN[S.meow] || 0.6;
    src.connect(g); g.connect(a.destination);
    src.start(a.currentTime + (delay || 0));
    return;
  }
  const t0 = a.currentTime + (delay || 0), dur = 0.5 + Math.random() * 0.12;
  const f0 = 540 * (pitch || 1) * (0.97 + Math.random() * 0.06);
  const osc = a.createOscillator(); osc.type = "sawtooth";
  osc.frequency.setValueAtTime(f0 * 0.72, t0);
  osc.frequency.linearRampToValueAtTime(f0 * 1.28, t0 + 0.13);
  osc.frequency.linearRampToValueAtTime(f0 * 1.08, t0 + 0.3);
  osc.frequency.linearRampToValueAtTime(f0 * 0.6, t0 + dur);
  const mouth = a.createBiquadFilter(); mouth.type = "bandpass"; mouth.Q.value = 3.2;
  mouth.frequency.setValueAtTime(2400, t0);
  mouth.frequency.linearRampToValueAtTime(1500, t0 + 0.2);
  mouth.frequency.linearRampToValueAtTime(780, t0 + dur);
  const body = a.createBiquadFilter(); body.type = "lowpass"; body.frequency.value = 1000;
  const g = a.createGain(), g2 = a.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.55, t0 + 0.07);
  g.gain.setValueAtTime(0.55, t0 + 0.28);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(0.07, t0 + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(mouth); mouth.connect(g); g.connect(a.destination);
  osc.connect(body); body.connect(g2); g2.connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

/* ---------- recorded sound effects ----------
   Short recordings for the moments that matter most (see sounds/manifest.json and CREDITS.md),
   each at the gain the manifest suggests. If a file did not load, the made-in-code sound
   below plays instead, so the game never goes quiet. "tuck2" is a warm kalimba note: it is
   pitched up one step for each cat tucked in a row, which stays sweet where the bright
   first pick would get shrill. */
const SFX_FILES = {
  pickup: ["sounds/sfx-pickup.wav", 0.8], drop: ["sounds/sfx-drop.wav", 0.6], bump: ["sounds/sfx-bump.wav", 0.55],
  crack: ["sounds/sfx-crack.wav", 0.7], tuck: ["sounds/sfx-tuck.wav", 0.7], tuck2: ["sounds/sfx-tuck-2.wav", 0.7],
  star: ["sounds/sfx-star.wav", 0.35], win: ["sounds/sfx-win.wav", 0.6], coin: ["sounds/sfx-coin.wav", 0.35],
  tap: ["sounds/sfx-tap.wav", 0.35], purr: ["sounds/sfx-purr.wav", 0.55],
};
const sfxBuffers = {};
function loadSfx() {
  for (const name of Object.keys(SFX_FILES)) {
    fetch(SFX_FILES[name][0]).then(r => { if (!r.ok) throw new Error("missing"); return r.arrayBuffer(); })
      .then(data => actx.decodeAudioData(data, buf => { sfxBuffers[name] = buf; }, () => {}))
      .catch(() => { /* not loaded: the made-in-code sound is used */ });
  }
}
// Play a recording. Returns false only when the recording is not there, so the caller can
// fall back to its made-in-code sound. With sound off nothing plays (and it returns true).
function playRec(name, o) {
  if (!S.sound) return true;
  const buf = sfxBuffers[name];
  if (!buf) return false;
  o = o || {};
  const a = audio(); if (!a || a.state !== "running") return true;
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = buf; src.playbackRate.value = o.rate || 1;
  g.gain.value = SFX_FILES[name][1] * (o.vol === undefined ? 1 : o.vol);
  src.connect(g); g.connect(a.destination);
  src.start(a.currentTime + (o.delay || 0));
  return true;
}

let lastBump = 0;
const sfx = {
  slide:  () => tone(320, 0.04, { type: "triangle", vol: 0.05 }),
  // a cat hops into bed. n = how many came right before it (1, 2, 3 ...): each one a step higher
  tuck:   n => {
    if (n > 0) { if (!playRec("tuck2", { rate: Math.pow(2, Math.min(n, 8) / 12) })) { sfx.tuckTone(); sfx.combo(n); } return; }
    playRec("tuck") || sfx.tuckTone();
  },
  tuckTone: () => { tone(520, 0.13, { to: 900, vol: 0.15 }); tone(780, 0.1, { to: 1350, vol: 0.05, delay: 0.03 }); },
  // a bed is full: a soft chime, then that cat's own meow
  done:   pitch => { [659, 831, 988].forEach((f, i) => tone(f, 0.22, { vol: 0.05, delay: i * 0.05, type: "triangle" })); meow(0.1, pitch); },
  purr:   () => playRec("purr") || sfx.purrTone(),
  purrTone: () => { for (let i = 0; i < 12; i++) tone(52 + (i % 2) * 6, 0.05, { type: "sawtooth", vol: 0.045, delay: 0.15 + i * 0.045 }); },
  meow:   (d, pitch) => meow(d, pitch),
  win:    () => playRec("win") || sfx.winTone(),
  winTone: () => { [523, 659, 784, 1047].forEach((f, i) => { tone(f, 0.26, { vol: 0.14, delay: 0.1 + i * 0.11, type: "triangle" }); tone(f * 1.5, 0.2, { vol: 0.04, delay: 0.1 + i * 0.11 }); }); },
  lose:   () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, { vol: 0.13, delay: i * 0.16, type: "triangle" })),
  bump:   () => { if (time - lastBump > 0.25) { lastBump = time; playRec("bump") || tone(120, 0.07, { type: "square", vol: 0.04 }); } },
  tick:   () => tone(880, 0.05, { vol: 0.07 }),
  tap:    () => playRec("tap", { vol: 0.7 }) || tone(440, 0.05, { vol: 0.07, type: "triangle" }),
  undo:   () => tone(500, 0.1, { to: 300, vol: 0.1, type: "triangle" }),
  unlock: () => { tone(700, 0.08, { vol: 0.12, type: "square", delay: 0.2 }); tone(1100, 0.16, { vol: 0.12, type: "triangle", delay: 0.28 }); },
  coin:   () => playRec("coin") || sfx.coinTone(),
  coinTone: () => { tone(1319, 0.07, { vol: 0.1 }); tone(1760, 0.16, { vol: 0.1, delay: 0.06 }); },
  peek:   () => tone(600, 0.1, { to: 1000, vol: 0.08, type: "triangle" }),
  magic:  () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.18, { vol: 0.08, delay: i * 0.05 })),
  no:     () => tone(200, 0.12, { to: 150, vol: 0.08, type: "triangle" }),
  // picking a bed up and putting it down
  pick:   () => playRec("pickup") || tone(560, 0.07, { to: 760, vol: 0.05, type: "triangle" }),
  drop:   () => playRec("drop") || sfx.dropTone(),
  dropTone: () => { tone(170, 0.09, { to: 110, vol: 0.09 }); tone(340, 0.04, { vol: 0.025, type: "triangle", delay: 0.01 }); },
  // cats tucked in one after another: each one a step higher (n = 1, 2, 3 ...)
  combo:  n => { const f = 660 * Math.pow(2, Math.min(n, 9) * 2 / 12); tone(f, 0.12, { vol: 0.06, type: "triangle", delay: 0.06 }); tone(f * 2, 0.08, { vol: 0.02, delay: 0.08 }); },
  // a star lands on the win card (i = 0, 1, 2)
  star:   i => playRec("star", { rate: [1, 1.12, 1.26][i] || 1.26 }) || sfx.starTone(i),
  starTone: i => { tone([784, 988, 1175][i] || 1175, 0.14, { vol: 0.09, type: "triangle" }); tone(([784, 988, 1175][i] || 1175) * 1.5, 0.1, { vol: 0.03, delay: 0.02 }); },
  // a creaky board breaks
  crack:  () => playRec("crack") || sfx.crackTone(),
  crackTone: () => { tone(1500, 0.025, { type: "square", vol: 0.04 }); tone(420, 0.12, { to: 70, type: "sawtooth", vol: 0.08, delay: 0.015 }); tone(900, 0.03, { type: "square", vol: 0.03, delay: 0.07 }); tone(110, 0.16, { to: 60, vol: 0.08, delay: 0.05 }); },
  place:  () => { tone(392, 0.08, { vol: 0.07, type: "triangle" }); tone(587, 0.12, { vol: 0.06, type: "triangle", delay: 0.07 }); },
};

// Five music tracks to choose from in Settings. Each step can carry a melody note;
// every fourth step adds a low note with a gentle fifth above it.
const SONGS = [
  { beat: 0.42, wave: "triangle",          // Lullaby: slow and sleepy
    lead: [659, 0, 587, 523, 440, 0, 392, 0, 440, 523, 587, 0, 523, 0, 0, 0, 587, 0, 523, 440, 392, 0, 330, 0, 392, 440, 523, 0, 440, 0, 0, 0],
    bass: [131, 110, 87.3, 98, 131, 110, 87.3, 98] },
  { beat: 0.3, wave: "triangle",           // Sunny Window: bright and happy
    lead: [523, 659, 784, 0, 659, 784, 1047, 0, 880, 784, 659, 0, 784, 0, 0, 0, 587, 698, 880, 0, 698, 880, 1175, 0, 988, 880, 784, 0, 659, 0, 0, 0],
    bass: [131, 131, 175, 196, 147, 147, 196, 131] },
  { beat: 0.34, wave: "square",            // Tiptoe: sneaky and playful
    lead: [330, 0, 0, 392, 0, 0, 440, 0, 392, 0, 330, 0, 294, 0, 0, 0, 330, 0, 0, 440, 0, 0, 494, 0, 440, 0, 392, 0, 330, 0, 0, 0],
    bass: [82.4, 82.4, 110, 98, 82.4, 82.4, 123.5, 98] },
  { beat: 0.5, wave: "sine",               // Dreamy: wide and floaty
    lead: [784, 0, 0, 0, 659, 0, 587, 0, 0, 0, 523, 0, 587, 0, 0, 0, 880, 0, 0, 0, 784, 0, 659, 0, 0, 0, 587, 0, 659, 0, 0, 0],
    bass: [87.3, 131, 110, 98, 87.3, 131, 147, 98] },
  { beat: 0.22, wave: "triangle",          // Zoomies: fast and bouncy
    lead: [392, 494, 587, 494, 392, 494, 587, 784, 440, 523, 659, 523, 440, 523, 659, 880, 349, 440, 523, 440, 349, 440, 523, 698, 392, 494, 587, 784, 587, 494, 392, 0],
    bass: [98, 98, 110, 110, 87.3, 87.3, 98, 98] },
];
let songAt = 0, songStep = 0, songId = -1;
// Tracks 6 to 8 are recordings (see CREDITS.md). They play through a normal
// audio player, which is the most reliable way on an iPhone.
const TRACK_FILES = [null, null, null, null, null,
  "sounds/music-hot-springs.m4a", "sounds/music-happy-adventure.m4a", "sounds/music-flowerbed-fields.m4a",
  "sounds/music-catmint.m4a", "sounds/music-cozy-puzzle.m4a", "sounds/music-hush-hamlet.m4a"];
// The recordings are not all equally loud (see sounds/manifest.json): Catmint is about 3.5 dB
// softer than the rest and Cozy Puzzle about 3 dB louder. These volumes even them out.
// (An iPhone ignores a player's volume, so there they play as recorded.)
const TRACK_VOL = { 8: 1, 9: 0.47 };
const trackVol = id => TRACK_VOL[id] === undefined ? 0.67 : TRACK_VOL[id];
const players = {};
const brokenAt = {};                // recorded tracks that would not load (no internet yet), and when that happened
let playingTrack = -1;
const trackBroken = id => brokenAt[id] !== undefined;
// Start, switch or stop the recorded track so it matches the setting.
// A phone only lets sound start from a touch, so starting waits for one.
function recordedMusic(fromTouch) {
  const want = S.music && TRACK_FILES[S.track] && !document.hidden ? S.track : -1;
  if (playingTrack !== -1 && playingTrack !== want) { players[playingTrack].pause(); playingTrack = -1; }
  if (want === -1) return;
  let el = players[want];
  if (!el) {
    if (!fromTouch) return;
    if (trackBroken(want) && Date.now() - brokenAt[want] < 20000) return;     // it just failed: wait a little before trying again
    el = players[want] = new Audio(TRACK_FILES[want]);
    el.loop = true; el.preload = "auto"; el.volume = trackVol(want);
    // The file could not be fetched (first play with no internet): throw this player away so a
    // later touch can try again. Until one works, musicTick plays a built-in tune instead.
    el.addEventListener("error", () => {
      brokenAt[want] = Date.now();
      if (players[want] === el) delete players[want];
      if (playingTrack === want) playingTrack = -1;
    });
    el.addEventListener("playing", () => { delete brokenAt[want]; });
  }
  if (el.paused && fromTouch) { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); }
  if (!el.paused || fromTouch) playingTrack = want;
}

function musicTick() {
  recordedMusic(false);
  if (!S.music || (TRACK_FILES[S.track] && !trackBroken(S.track)) || !actx || actx.state !== "running") return;
  const id = SONGS[S.track] ? S.track : 0;
  if (id !== songId) { songId = id; songStep = 0; }
  const song = SONGS[id];
  if (songAt < actx.currentTime) songAt = actx.currentTime + 0.08;
  while (songAt < actx.currentTime + 0.25) {
    const i = songStep % song.lead.length;
    if (song.lead[i]) tone(song.lead[i], song.beat * 1.3, { at: songAt, vol: song.wave === "square" ? 0.014 : 0.028, type: song.wave, music: true });
    if (i % 4 === 0) {
      const b = song.bass[i / 4];
      tone(b, song.beat * 3.6, { at: songAt, vol: 0.034, music: true, attack: 0.05 });
      tone(b * 3, song.beat * 3.2, { at: songAt, vol: 0.012, music: true, attack: 0.2 });
    }
    songAt += song.beat; songStep++;
  }
}
// Music on or off (the pause menu), or one track chosen from the list in Settings (-1: off).
function toggleMusic() { S.music = !S.music; save(); if (S.music) audio(); recordedMusic(true); }
function chooseTrack(id) {
  if (id < 0) S.music = false; else { S.music = true; S.track = id; }
  save(); if (S.music) audio();
  recordedMusic(true);
}
const musicLabel = () => t("s_music", S.music ? t("m_" + S.track) : t("off"));
