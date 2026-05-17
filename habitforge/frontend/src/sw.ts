/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

// Required literal for Workbox injectManifest.
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => /^https:\/\/rsms\.me\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Never cache API responses — they're user-scoped and would leak across accounts.
registerRoute(
  ({ url }) => /\/api\/.*/i.test(url.pathname),
  async ({ request }) => fetch(request)
);

interface HabitPushPayload {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  habitId?: number;
  streakRisk?: boolean;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: HabitPushPayload = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  const title = payload.title ?? "HabitForge reminder";
  const hasHabit = typeof payload.habitId === "number";
  const options: NotificationOptions & { actions?: { action: string; title: string }[] } = {
    body: payload.body ?? "You have habits waiting today.",
    icon: payload.icon ?? "/logos/mainlogo.png",
    badge: payload.badge ?? "/logos/mainlogo.png",
    tag: payload.tag ?? "habitforge-reminder",
    requireInteraction: payload.streakRisk === true,
    data: {
      url: payload.url ?? "/",
      habitId: payload.habitId ?? null,
    },
  };
  if (hasHabit) {
    options.actions = [
      { action: "done", title: "✓ Done" },
      { action: "snooze", title: "Snooze 30m" },
    ];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

async function relayActionToClient(
  habitId: number,
  action: "done" | "snooze"
): Promise<boolean> {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  if (clientList.length === 0) return false;
  for (const client of clientList) {
    client.postMessage({ type: "habit-push-action", habitId, action });
  }
  return true;
}

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const targetUrl = String(data.url ?? "/");
  const habitId = typeof data.habitId === "number" ? (data.habitId as number) : null;
  const action = event.action;

  event.waitUntil(
    (async () => {
      // Action button: try to relay to an open client.
      if (habitId !== null && (action === "done" || action === "snooze")) {
        const relayed = await relayActionToClient(habitId, action);
        if (relayed) return;
        // No open client — open the app so user can complete manually.
      }

      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          if (habitId !== null && (action === "done" || action === "snooze")) {
            client.postMessage({ type: "habit-push-action", habitId, action });
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })()
  );
});
