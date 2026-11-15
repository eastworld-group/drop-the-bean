// Keeps a copy of the game on the phone so it opens with no internet.
// Online: fetch the newest files. Offline, or when the network is too slow: use the saved copy.
const CACHE = "drop-the-bean-v8";
// Music lives in its own store with a name that does not change, so a new version of the
// game never throws away tracks she has already downloaded.
const MUSIC_CACHE = "drop-the-bean-music";
const FILES = ["./", "index.html", "levels-data.js", "js/core.js", "js/art.js", "js/play.js", "js/screens.js", "js/room.js", "js/main.js",
  "manifest.webmanifest", "icon-180.png", "icon-512.png", "sounds/meow-mrow.wav", "sounds/meow-soft.wav", "sounds/meow-kitten.wav", "sounds/meow-siamese.wav", "sounds/meow-house.wav", "sounds/meow-young.wav",
  // recorded sound effects (first picks only; see sounds/manifest.json)
  "sounds/sfx-pickup.wav", "sounds/sfx-drop.wav", "sounds/sfx-bump.wav", "sounds/sfx-crack.wav", "sounds/sfx-tuck.wav", "sounds/sfx-star.wav",
  "sounds/sfx-win.wav", "sounds/sfx-coin.wav", "sounds/sfx-tap.wav", "sounds/sfx-purr.wav"];
// Music files are bigger. Each one is saved the first time it is played.
const isMusic = url => /\.(m4a|mp3)$/.test(new URL(url).pathname);
// Only a real, whole answer from this site is worth keeping: not an error page,
// not a piece of a file, not a page some Wi-Fi sign-in sent us to instead.
const good = res => !!res && res.status === 200 && res.type === "basic" && !res.redirected;
const WAIT = 3000;                 // how long the network gets before the saved copy is used

// A phone asks for music in pieces ("ranges"). Keep the whole file and hand out the piece asked for.
async function music(req) {
  const cache = await caches.open(MUSIC_CACHE);
  let full = await cache.match(req.url);
  if (!full) {
    try {
      const res = await fetch(req.url);
      if (!good(res)) return res;
      await cache.put(req.url, res.clone());
      full = res;
    } catch (e) { return new Response("", { status: 503 }); }
  }
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.get("range") || "");
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": full.headers.get("Content-Type") || "audio/mp4", "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": String(end - start + 1) } });
}

// Everything else: ask the network, and keep the answer if it is a good one. If the network
// fails, answers with an error, or says nothing for three seconds, hand back the saved copy.
async function fresh(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const saved = async () => (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? cache.match("index.html") : undefined);
  const hold = work => { try { event.waitUntil(work); } catch (e) { /* too late to ask for more time: the work still runs */ } };
  const net = fetch(req).then(res => {
    if (good(res)) hold(cache.put(req, res.clone()).catch(() => { /* storage full: still playable */ }));
    return res;
  });
  let timer;
  const slow = new Promise(resolve => { timer = setTimeout(resolve, WAIT, "slow"); });
  try {
    const first = await Promise.race([net, slow]);
    if (first !== "slow") {
      if (first.status >= 500) { const copy = await saved(); if (copy) return copy; }    // the server is unwell: the saved copy is better
      return first;
    }
    const copy = await saved();
    if (copy) { hold(net.catch(() => { /* a late answer still refreshes the saved copy */ })); return copy; }
    return await net;                                 // nothing saved yet: keep waiting for the network
  } catch (e) {
    return (await saved()) || Response.error();
  } finally { clearTimeout(timer); }
}

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
// A new version clears out the old game files. Music found in an old store is moved into
// the music store first, so nothing she already downloaded has to be fetched again.
async function tidy() {
  const music = await caches.open(MUSIC_CACHE);
  for (const key of await caches.keys()) {
    if (key === CACHE || key === MUSIC_CACHE) continue;
    try {
      const old = await caches.open(key);
      for (const req of await old.keys()) {
        if (!isMusic(req.url) || await music.match(req.url)) continue;
        const res = await old.match(req);
        if (good(res)) await music.put(req.url, res);
      }
    } catch (e) { /* could not move it: it will be fetched again when played */ }
    await caches.delete(key);
  }
  await self.clients.claim();
}
self.addEventListener("activate", e => { e.waitUntil(tidy()); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (isMusic(e.request.url)) { e.respondWith(music(e.request)); return; }
  e.respondWith(fresh(e));
});
