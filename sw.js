/* Mediks: permite abrir la app sin internet. Las páginas se piden primero a la red (así siempre ves la versión
   más nueva) y, si no hay conexión, se usa la última copia guardada. Los datos del consultorio NO pasan por aquí:
   siguen guardándose en el navegador y en la nube como siempre. */
const VERSION = 'mediks-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
const NO_CACHEAR = /(firestore|identitytoolkit|securetoken|googleapis\.com\/(?!css)|accounts\.google|oauth2|apis\.google\.com|calendar)/i;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NO_CACHEAR.test(req.url)) return;
  if (req.mode === 'navigate' || (url.origin === location.origin && /\.(html|webmanifest)$/.test(url.pathname))) {
    e.respondWith(
      fetch(req).then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html') || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(enCache => {
      const red = fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
        return r;
      }).catch(() => enCache);
      return enCache || red;
    })
  );
});
