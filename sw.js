const CACHE_NAME = 'xray-union-v2'; // 1. व्हर्जन बदलून v2 केले

const urlsToCache = [
  '/',
  './index.html',
  './member-dashboard.html',
  './manifest.json'
];

// Install Event (नवीन सर्व्हिस वर्कर इन्स्टॉल करणे)
self.addEventListener('install', event => {
  self.skipWaiting(); // नवीन वर्करला वेटिंग मोडमध्ये न ठेवता लगेच लागू करा
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Event (जुना v1 कॅशे पूर्णपणे डिलीट करणे - यामुळे 404 एरर बंद होईल)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache); // जुना कॅशे साफ केला
          }
        })
      );
    }).then(() => self.clients.claim()) // सर्व ओपन पेजेसवर लगेच नवीन व्हर्जन ॲक्टिव्ह करा
  );
});

// Fetch Event (Network-First Strategy: आधी नेटवर्कवरून नवीन फाईल आणा, न सापडल्यास कॅशे वापरा)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // जर नेटवर्कवरून नवीन फाईल मिळाली, तर ती कॅशेमध्ये अपडेट करा
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // जर इंटरनेट बंद असेल किंवा नेटवर्क एरर आला, तर कॅशेमधून फाईल दाखवा
        return caches.match(event.request);
      })
  );
});
