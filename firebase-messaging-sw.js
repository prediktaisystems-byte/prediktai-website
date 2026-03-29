importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyANiFQjhKNtCWYFdibEvm_HAbtcmVwjq00",
  authDomain: "gen-lang-client-0026790187.firebaseapp.com",
  projectId: "gen-lang-client-0026790187",
  storageBucket: "gen-lang-client-0026790187.firebasestorage.app",
  messagingSenderId: "173723999209",
  appId: "1:173723999209:web:e811b43d1030e135c68978"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
