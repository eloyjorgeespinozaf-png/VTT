// Service Worker - Visor Táctico de Terreno (VTT)
// Fase 19: App Instalable - PWA
const CACHE_NAME = 'vtt-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Evento install: Guarda en caché estático inicial la ruta raíz
self.addEventListener('install', (event) => {
  console.log('[SW-VTT] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW-VTT] Precargando caché estático inicial...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW-VTT] Aviso al precachear rutas iniciales:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Evento activate: Limpieza de cachés antiguas y toma de control
self.addEventListener('activate', (event) => {
  console.log('[SW-VTT] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW-VTT] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Evento fetch: Responde desde caché si existe o realiza la petición de red
self.addEventListener('fetch', (event) => {
  // Ignorar esquemas que no sean HTTP/HTTPS (por ejemplo extensiones del navegador)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Las peticiones externas a Google Maps y elevación se atienden siempre por red para mantener precisión táctica
  if (event.request.url.includes('googleapis.com') || event.request.url.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Si no hay red y se intenta navegar, retornar la página de inicio en caché
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
