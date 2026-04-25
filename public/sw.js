const CACHE_NAME = 'xshift-static-v1';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/Xshift.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1'
  ) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  const shouldCache =
    STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/_next/static/');

  if (!shouldCache) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    }),
  );
});

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Xshift',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/status-bar.png',
    url: '/admin/dashboard',
  };

  let payload = fallback;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_err) {
      payload = fallback;
    }
  }

  const title = payload.title || fallback.title;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || fallback.body,
      icon: payload.icon || fallback.icon,
      badge: payload.badge || fallback.badge,
      tag: payload.tag || 'xshift-notification',
      data: {
        url: payload.url || fallback.url,
        ...(payload.data || {}),
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/admin/dashboard';
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
