// ==================== fitTracker Service Worker ====================
const CACHE_NAME = 'fittracker-v2';

// Archivos a cachear para funcionamiento offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
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
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando assets estáticos');
      // addAll falla si algún archivo no existe, usamos add individual para ser tolerantes
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn(`[SW] No se pudo cachear ${url}:`, err);
        }))
      );
    })
  );
  self.skipWaiting();
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // No interceptar peticiones a Firebase, APIs externas ni CDNs
  const externalDomains = [
    'firebaseapp.com',
    'googleapis.com',
    'gstatic.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'openfoodfacts.org',
    'cdn.jsdelivr.net',
    'wger.de'
  ];

  if (externalDomains.some(domain => url.hostname.includes(domain))) {
    return; // Dejar pasar sin interceptar
  }

  // Estrategia: Network First con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, guardarla en caché
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin red: servir desde caché
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback para navegación (rutas HTML)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});