// Keeps a copy of the game on the phone so it opens with no internet.
// Online: always fetch the newest files. Offline: use the saved copy.
const CACHE = "drop-the-bean-v4";
const FILES = ["./", "index.html", "levels-data.js", "js/core.js", "js/art.js", "js/play.js", "js/screens.js", "js/main.js",
  "manifest.webmanifest", "icon-180.png", "icon-512.png", "sounds/meow-soft.wav", "sounds/meow-kitten.wav", "sounds/meow-siamese.wav", "sounds/meow-house.wav", "sounds/meow-young.wav"];
// Music files are bigger. Each one is saved the first time it is played.
const isMusic = url => /\.(m4a|mp3)$/.test(new URL(url).pathname);

// A phone asks for music in pieces ("ranges"). Keep the whole file and hand out the piece asked for.
async function music(req) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(req.url);
  if (!full) {
    try {
      const res = await fetch(req.url);
      if (!res.ok) return res;
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

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (isMusic(e.request.url)) { e.respondWith(music(e.request)); return; }
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});
