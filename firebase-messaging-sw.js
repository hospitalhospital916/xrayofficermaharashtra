importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// तुमच्या प्रोजेक्टचे अधिकृत क्रेडेंशियल्स
const firebaseConfig = {
  apiKey: "AIzaSyBVRXAra9pKpXbZYO4YkvbhuyWlKL8QVyk",
  authDomain: "xrayunionmah.firebaseapp.com",
  projectId: "xrayunionmah",
  messagingSenderId: "1056581979379", // Firebase Console > Project Settings मधील Sender ID
  appId: "1:1056581979379:web:your_actual_app_id"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// ॲप बॅकग्राउंडमध्ये किंवा बंद असताना येणारे नोटिफिकेशन
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || "क्ष-किरण वैज्ञानिक अधिकारी संघटना";
  
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "नवीन परिपत्रक किंवा सूचना उपलब्ध झाली आहे.",
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200, 100, 200], // मोबाईल व्हायब्रेशन
    tag: payload.data?.tag || 'xray-union-notice',
    renotify: true,
    requireInteraction: true, // युझरने क्लिक करेपर्यंत स्क्रीनवर ठेवण्यासाठी
    data: {
      url: payload.data?.url || '/member-dashboard.html'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// नोटिफिकेशनवर क्लिक केल्यावर संबंधित पेज उघडणे
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/member-dashboard.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // ॲप आधीच उघडे असल्यास त्यावर फोकस करा
      for (let client of windowClients) {
        if (client.url.includes('xrayunionmah') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // ॲप बंद असल्यास नवीन विंडो/ॲक्टिव्हिटी उघडा
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
