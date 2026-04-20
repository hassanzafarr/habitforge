/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
self.skipWaiting();
clientsClaim();
// Required literal for Workbox injectManifest.
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({ url }) => /^https:\/\/rsms\.me\/.*/i.test(url.href), new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
        new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365,
        }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
}));
registerRoute(({ url }) => /\/api\/.*/i.test(url.pathname), new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
        new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24,
        }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
}));
self.addEventListener("push", (event) => {
    let payload = {};
    try {
        payload = event.data?.json() ?? {};
    }
    catch {
        payload = { body: event.data?.text() ?? "" };
    }
    const title = payload.title ?? "HabitForge reminder";
    const options = {
        body: payload.body ?? "You have habits waiting today.",
        icon: payload.icon ?? "/logos/mainlogo.png",
        badge: payload.badge ?? "/logos/mainlogo.png",
        tag: payload.tag ?? "habitforge-reminder",
        data: { url: payload.url ?? "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = String(event.notification.data?.url ?? "/");
    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        });
        for (const client of clientList) {
            if ("focus" in client) {
                client.navigate(targetUrl);
                return client.focus();
            }
        }
        if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl);
        }
        return undefined;
    })());
});
