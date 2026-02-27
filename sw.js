// ==================== fitTracker Service Worker ====================
// IMPORTANTE: Los archivos HTML NO se cachean para que Firebase Auth funcione siempre
const CACHE_NAME = 'fittracker-1772188811398';

// Solo cacheamos assets estáticos (JS, CSS, imágenes) — NUNCA HTML
const STATIC_ASSETS = [
  '/style.css',
  '/script.js',
  '/auth.js',
  '/dashboard.js',
  '/seguimiento.js',
  '/calendario.js',
  '/nutricion.js',
  '/exercises.js',
  '/live.js',
  '/modals.js',
  '/timer.js',
  '/manifest.json',
  '/imagenes/logo.png',
  '/iconos/Home.png',
  '/iconos/Settings.png',
  '/iconos/Power.png',
  '/icon-192.png',
  '/icon-512.png'
];

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log('[SW] Instalando versión:', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets estáticos (sin HTML)');
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] No se pudo cachear ' + url + ':', err);
        }))
      );
    })
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log('[SW] Activando versión:', CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
          });
        });
      })
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar peticiones externas
  const externalDomains = [
    'firebaseapp.com',
    'googleapis.com',
    'gstatic.com',
    'firebaseio.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'openfoodfacts.org',
    'cdn.jsdelivr.net',
    'rapidapi.com',
    'wger.de'
  ];

  if (externalDomains.some(domain => url.hostname.includes(domain))) {
    return;
  }

  // HTML: SIEMPRE ir a red, nunca caché — así Firebase Auth siempre verifica sesión
  const esHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (esHTML) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Sin red: fallback a index.html (que redirige a auth.html)
        return caches.match('/index.html') || new Response('Sin conexión', { status: 503 });
      })
    );
    return;
  }

  // Assets estáticos (JS, CSS, imágenes): caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});