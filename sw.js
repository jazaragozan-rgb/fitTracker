// ==================== fitTracker Service Worker ====================
const CACHE_NAME = 'fittracker-BUILD_TIMESTAMP';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/subindex.html',
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
  self.skipWaiting(); // Activa inmediatamente, sin esperar a que cierren pestañas
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets estáticos');
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] No se pudo cachear ${url}:`, err);
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
      .then(() => self.clients.claim()) // Toma control de todas las pestañas abiertas
      .then(() => {
        // Notifica a todos los clientes que hay una versión nueva
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

  // Estrategia: Network First con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});