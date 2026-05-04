const CACHE_NAME = "keuanganku-cache"; // ❌ tidak perlu V1/V2 lagi

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  self.skipWaiting(); // langsung aktif tanpa nunggu versi lama
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// ACTIVATE (auto bersihin cache lama)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      self.clients.claim(); // paksa update ke tab aktif
    })()
  );
});

// FETCH (selalu cek server dulu → anti stuck versi lama)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});