self.addEventListener('push', function (event) {
    if (event.data) {
        const payload = event.data.json()
        const { title, body, icon, data } = payload

        const options = {
            body: body,
            icon: icon || '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                url: data?.url || '/',
                ...data
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Ver detalles',
                },
            ]
        }

        event.waitUntil(
            self.registration.showNotification(title, options)
        )
    }
})

self.addEventListener('notificationclick', function (event) {
    event.notification.close()

    // Get the URL from the notification data
    const urlToOpen = event.notification.data?.url || '/'

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            // Check if there's already a tab open with this URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i]
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus()
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen)
            }
        })
    )
})

self.addEventListener('install', function (event) {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting()
})

self.addEventListener('activate', function (event) {
    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(self.clients.claim())
})
