import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { PushNotificationsCard } from "./PushNotificationsCard";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/server";

describe("PushNotificationsCard", () => {
  function installPushEnvironment() {
    let currentSub: null | {
      endpoint: string;
      toJSON: () => {
        endpoint: string;
        expirationTime: null;
        keys: { p256dh: string; auth: string };
      };
      unsubscribe: () => Promise<boolean>;
    } = null;
    const subscription = {
      endpoint: "https://push.example/sub",
      toJSON: () => ({
        endpoint: "https://push.example/sub",
        expirationTime: null,
        keys: { p256dh: "p256dh-value", auth: "auth-value" },
      }),
      unsubscribe: vi.fn(async () => {
        currentSub = null;
        return true;
      }),
    };

    Object.defineProperty(window, "PushManager", { writable: true, value: class {} });
    Object.defineProperty(window, "Notification", {
      writable: true,
      value: { requestPermission: vi.fn(async () => "granted"), permission: "default" },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => currentSub),
            subscribe: vi.fn(async () => {
              currentSub = subscription;
              return subscription;
            }),
          },
        }),
      },
    });

    return { subscription };
  }

  it("shows backend-not-configured state when push is supported locally", async () => {
    installPushEnvironment();

    server.use(
      http.get("/api/push/status", () =>
        HttpResponse.json({ enabled: false, count: 0 })
      )
    );

    renderWithProviders(<PushNotificationsCard />);

    expect(
      await screen.findByText(/server push keys are not configured yet/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enable/i })).toBeDisabled();
    expect(await screen.findByText("0 device(s)")).toBeInTheDocument();
  });

  it("enables, tests, and disables a push subscription with mocked browser APIs", async () => {
    const { subscription } = installPushEnvironment();
    const calls: string[] = [];
    server.use(
      http.get("/api/push/status", () =>
        HttpResponse.json({ enabled: true, count: calls.includes("subscribe") ? 1 : 0 })
      ),
      http.get("/api/push/public-key", () => HttpResponse.json({ publicKey: "AQID" })),
      http.post("/api/push/subscribe", async ({ request }) => {
        calls.push("subscribe");
        expect(await request.json()).toMatchObject({
          endpoint: "https://push.example/sub",
          keys: { p256dh: "p256dh-value", auth: "auth-value" },
        });
        return new HttpResponse(null, { status: 204 });
      }),
      http.post("/api/push/test", () => {
        calls.push("test");
        return HttpResponse.json({ sent: 1, removed: 0, total: 1 });
      }),
      http.delete("/api/push/unsubscribe", ({ request }) => {
        calls.push(new URL(request.url).searchParams.get("endpoint") ?? "");
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderWithProviders(<PushNotificationsCard />);

    await userEvent.click(await screen.findByRole("button", { name: /enable/i }));
    expect(calls).toContain("subscribe");

    await userEvent.click(screen.getByRole("button", { name: /send test/i }));
    expect(calls).toContain("test");

    await userEvent.click(screen.getByRole("button", { name: /disable/i }));
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(calls).toContain("https://push.example/sub");
  });
});
