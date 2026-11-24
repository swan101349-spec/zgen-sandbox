/* ZGenArtStudio Pro | isolated, version-pinned offline shell.
   Cache application bytes only, never artwork, IndexedDB or downloaded files.
   Do not skipWaiting: an active painting session must not be replaced mid-stroke.
*/
'use strict';
const PREFIX = 'zgen-pro-pwa-';
const CACHE = PREFIX + '20261124-c2-9272e953-v1';
const FILES = [
  './index.html',
  './manifest.json',
  './mobile-shell.css',
  './mobile-shell.js',
  './c2-wet-snapshot-codec.js',
  './c2-project-v3.js',
  './c2-live-projects.js',
  './icons/zgen-192.png',
  './icons/zgen-512.png'
];
const ROOT = new URL('./', self.registration.scope);
const INDEX = new URL('./index.html', ROOT).href;
const URLS = new Set(FILES.map(path => new URL(path, ROOT).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...URLS]);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  const target = new URL(url.pathname, url.origin).href;
  const nav = request.mode === 'navigate' && (target === ROOT.href || target === INDEX);
  if (!nav && !URLS.has(target)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(nav ? INDEX : target);
    if (cached) return cached;
    return fetch(request);
  })());
});
