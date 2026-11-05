// 日記アプリを端末に保存しておき、ネットがなくても開けるようにする
const CACHE = 'diary-app-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 保存済みのものをすぐ返し、裏で新しい版を取りに行く（次回から反映）
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  const fromNet = fetch(req).then(async res => {
    if (res.ok) {
      const copy = res.clone();
      const c = await caches.open(CACHE);
      await c.put(req, copy);
    }
    return res;
  }).catch(() => null);
  e.waitUntil(fromNet);

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fromNet;
    if (res) return res;
    if (req.mode === 'navigate') {
      const idx = await caches.match('./index.html') || await caches.match('./');
      if (idx) return idx;
    }
    return Response.error();
  })());
});
