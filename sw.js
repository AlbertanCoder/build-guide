/*
 * Offline support for Shad's Build Guide (a service worker).
 *
 * What it does
 *   - After the first visit the page, the 3D viewer, the models and the pictures open with no network.
 *   - The page itself (index.html) is fetched from the network first, so when you are online you always
 *     get the newest text. Only when you are offline does it fall back to the last copy it saw.
 *   - Everything else on this site (scripts, models, pictures) is served from the cache straight away and
 *     refreshed in the background, so a changed file shows up on the next visit.
 *
 * What it never does
 *   - It never touches /api/ (the Guide Assistant), non-GET requests or other websites.
 *   - It never stores shop prices or stock on its own. Those figures live inside index.html with the date
 *     they were checked; the page works out "checked N days ago" itself, so an old offline copy shows
 *     the warning instead of presenting old stock as current.
 *
 * To force every device to drop its old cache, change CACHE below (for example when a model is rebuilt).
 */
"use strict";

/* v3 (4 Nov 2026): scripts are now network first too. Under v2 an old cached assistant.js ran next to a newer page,
   and Shad's bought ticks did not show. Change CACHE for every release, and index.html asks for assistant.js with
   this same name (?v=...), so a page and its script always come together (check-chat-memory.py checks the two match). */
const CACHE = "build-guide-v5";

const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "shad-drone-icon.svg",
  "docs/icons/icon-192.png",
  "docs/icons/icon-512.png",
  "docs/icons/icon-maskable-512.png",
  "docs/icons/apple-touch-icon.png",
  "docs/icons/favicon.ico",
  "docs/js/assistant.js",
  "docs/js/domain.js",
  "docs/js/viewer3d.js",
  "docs/vendor/three/build/three.core.js",
  "docs/vendor/three/build/three.module.js",
  "docs/vendor/three/addons/controls/OrbitControls.js",
  "docs/vendor/three/addons/loaders/GLTFLoader.js",
  "docs/vendor/three/addons/renderers/CSS2DRenderer.js",
  "docs/vendor/three/addons/utils/BufferGeometryUtils.js",
  "docs/vendor/three/addons/utils/SkeletonUtils.js",
  "docs/models/final-product.glb",
  "docs/models/step-01-parts.glb",
  "docs/models/step-02-frame.glb",
  "docs/models/step-03-stack.glb",
  "docs/models/step-04-receiver-fpv.glb",
  "docs/models/step-05-power.glb",
  "docs/models/step-06-payload.glb",
  "docs/models/step-07-mount.glb",
  "docs/models/step-08-test.glb",
  "docs/images/build/01-parts.svg",
  "docs/images/build/02-frame.svg",
  "docs/images/build/03-stack.svg",
  "docs/images/build/04-receiver-fpv.svg",
  "docs/images/build/05-power.svg",
  "docs/images/build/06-payload.svg",
  "docs/images/build/07-mount.svg",
  "docs/images/build/08-test.svg",
  "docs/images/build/finished-drone-poster.jpg"   /* the phone's picture of the finished drone (job 11) */
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      /* one missing file must not stop the whole install */
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function sameSiteGet(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  return true;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!sameSiteGet(request)) return;

  /* the page: network first, last copy when offline */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put("index.html", copy));
        return response;
      }).catch(() => caches.match("index.html").then((hit) => hit || caches.match("./")))
    );
    return;
  }

  /* scripts: network first like the page (a script must match the page it came with), the last copy when offline */
  if (request.destination === "script" || /\.js$/.test(new URL(request.url).pathname)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
        return response;
      }).catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || Response.error()))
    );
    return;
  }

  /* everything else (models, pictures): cache first, refreshed in the background */
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const refresh = fetch(request).then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => null);
        return hit || refresh.then((response) => response || Response.error());
      })
    )
  );
});
