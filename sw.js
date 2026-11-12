// ROSELLIA service worker: network-first for the app shell (same as SKYOPS)
// IMPORTANT: change the version number below every time you upload a new index.html
const CACHE = "rosellia-v6";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.hostname.endsWith("supabase.co")) return;   // never cache database calls
  if (e.request.method !== "GET") return;
  // menu PDFs are big: serve from the phone's saved copy first, download only once
  if (url.origin === location.origin && url.pathname.endsWith(".pdf")) {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  e.respondWith(
    fetch(e.request).then(res => {
      if (url.origin === location.origin || url.hostname.endsWith("jsdelivr.net")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
