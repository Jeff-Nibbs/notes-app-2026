// Minimal service worker for PWA installability only.
// The app is online-only: no caching, no offline fallback (spec §1).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
