importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBVRXAra9pKpXbZYO4YkvbhuyWlKL8QVyk",
  authDomain: "xrayunionmah.firebaseapp.com",
  projectId: "xrayunionmah",
  storageBucket: "xrayunionmah.firebasestorage.app",
  messagingSenderId: "763805226978",
  appId: "1:763805226978:web:6bae81a0b6358b47d88bbb",
  measurementId: "G-EQS6WH6XLF"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || data.title || "क्ष-किरण वैज्ञानिक अधिकारी संघटना";
  const body = payload.notification?.body || data.body || "नवीन परिपत्रक / सूचना उपलब्ध आहे.";
  const url = data.url || "/member-dashboard.html";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192x192.png",
    badge: "/favicon-32x32.png",
    vibrate: [200,100,200],
    tag: data.tag || data.circularId || "xray-union-notice",
    renotify: true,
    requireInteraction: true,
    data: { url }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/member-dashboard.html";
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type:"window", includeUncontrolled:true });
    for (const client of list) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(targetUrl);
        return;
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
