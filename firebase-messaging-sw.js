// Firebase Cloud Messaging Background Service Worker
// Placed in the root directory to handle background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Config object template.
// Note: In worker context, localStorage is not accessible.
// We initialize default fallback or expect configuration events.
const firebaseConfig = {
    apiKey: "AIzaSyAD3OnwT0Z2bFsL-_TQQVCIZsMf-Q7hxYM",
    authDomain: "wallcitybiz.firebaseapp.com",
    projectId: "wallcitybiz",
    storageBucket: "wallcitybiz.firebasestorage.app",
    messagingSenderId: "813427109242",
    appId: "1:813427109242:web:ab7a89bcedf62798903ac3"
};

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    firebase.initializeApp(firebaseConfig);
    
    // Retrieve an instance of Firebase Messaging.
    const messaging = firebase.messaging();
    
    // Background Message Handler
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        
        const notificationTitle = payload.notification.title || 'Rotary Biz Hub Notification';
        const notificationOptions = {
            body: payload.notification.body || 'You have a new update in the portal.',
            icon: '/favicon.ico' || payload.notification.image || 'https://www.rotary.org/etc.clientlibs/rotary-org/clientlibs/clientlib-site/resources/images/rotary-logo-color.png',
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} else {
    console.log('[firebase-messaging-sw.js] Running in mock/unconfigured mode. Background worker is registered but idle.');
}

// Fallback listener for standard push actions
self.addEventListener('push', (event) => {
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.notification?.title || 'Rotary Biz Hub';
            const options = {
                body: data.notification?.body || 'New alert received.',
                icon: 'https://www.rotary.org/etc.clientlibs/rotary-org/clientlibs/clientlib-site/resources/images/rotary-logo-color.png'
            };
            event.waitUntil(self.registration.showNotification(title, options));
        } catch (e) {
            // Text data push fallback
            const text = event.data.text();
            event.waitUntil(self.registration.showNotification('Rotary Biz Hub Alert', {
                body: text,
                icon: 'https://www.rotary.org/etc.clientlibs/rotary-org/clientlibs/clientlib-site/resources/images/rotary-logo-color.png'
            }));
        }
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
