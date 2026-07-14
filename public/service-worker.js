const CACHE_NAME = 'gasto-facil-cache-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/welcome.html',
  '/login.html',
  '/account.html',
  '/restablecer-contrasena.html',
  '/css/main.css',
  '/manifest.json',
  '/js/pwa-register.js',
  '/js/index.js',
  '/js/common.js',
  '/js/config.js',
  '/js/escanear.js',
  '/js/gastos.js',
  '/js/nuevo-gasto.js',
  '/js/confirmar-gasto.js',
  '/js/resumen.js',
  '/js/exportar-pdf.js',
  '/js/exportar-excel.js',
  '/js/supabase.js',
  '/js/welcome.js',
  '/js/login.js',
  '/js/account.js',
  '/js/reset-password.js',
  '/vendor/exceljs.min.js',
  '/404.html',
  '/escanear/index.html',
  '/escanear/confirmar/index.html',
  '/gastos/index.html',
  '/gastos/nuevo/index.html',
  '/resumen/index.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (['style', 'image', 'font'].includes(event.request.destination)) {
    event.respondWith(cacheFirstWithUpdate(event.request));
    return;
  }
  if (event.request.destination === 'script') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request))
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request) || caches.match('/index.html') || caches.match('/');
  }
}

async function cacheFirstWithUpdate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkResponse = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cachedResponse || networkResponse;
}
