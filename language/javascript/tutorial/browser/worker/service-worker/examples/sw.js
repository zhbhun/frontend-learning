var cacheStorageKey = "minimal-pwa-15";

var cacheList = ["/", "/index.js"];

console.log("...");

self.addEventListener("install", (e) => {
  console.log("install", e);
  e.waitUntil(
    caches
      .open(cacheStorageKey)
      .then((cache) => cache.addAll(cacheList))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("fetch", function (e) {
  console.log("fetch", e);
  e.respondWith(
    caches.match(e.request).then(function (response) {
      console.log("fetch1", e, response);
      if (response != null) {
        return response;
      }
      return fetch(e.request.url);
    })
  );
});

self.addEventListener("activate", function (e) {
  console.log("activate", e);
  e.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.map((name) => {
          if (name !== cacheStorageKey) {
            return caches.delete(name);
          }
        });
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});
