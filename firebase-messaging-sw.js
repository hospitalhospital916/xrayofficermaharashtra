importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyBVRXAra9pKpXbZYO4YkvbhuyWlKL8QVyk",
  authDomain: "xrayunionmah.firebaseapp.com",
  projectId: "xrayunionmah"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title || "नवीन मेसेज";
  const notificationOptions = {
    body: payload.notification.body || "तुम्हाला संघटना चॅटमध्ये नवीन मेसेज आला आहे.",
    icon: '1001264489.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});