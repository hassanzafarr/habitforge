import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import type { PushSubscriptionPayload } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function base64ToApplicationServerKey(base64: string): ArrayBuffer {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(padded);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function getSubscriptionPayload(sub: PushSubscription): PushSubscriptionPayload {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

export function PushNotificationsCard() {
  const qc = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const supported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    []
  );

  const { data: pushStatus } = useQuery({
    queryKey: qk.pushStatus(),
    queryFn: api.pushStatus,
    enabled: supported,
  });

  const syncLocalSubState = async () => {
    if (!supported) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setIsSubscribed(!!sub);
  };

  const enableMutation = useMutation({
    mutationFn: async () => {
      const key = await api.pushPublicKey();
      if (!key.publicKey) {
        throw new Error("Push is not configured on the server.");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission denied.");

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToApplicationServerKey(key.publicKey),
        }));

      await api.subscribePush(getSubscriptionPayload(sub));
      await syncLocalSubState();
      await qc.invalidateQueries({ queryKey: qk.pushStatus() });
    },
    onSuccess: () => toast.success("Push notifications enabled."),
    onError: (err) => toast.error(String(err)),
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await api.unsubscribePush(endpoint);
      await syncLocalSubState();
      await qc.invalidateQueries({ queryKey: qk.pushStatus() });
    },
    onSuccess: () => toast.success("Push notifications disabled."),
    onError: (err) => toast.error(String(err)),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      api.sendTestPush({
        title: "HabitForge",
        body: "Test notification: your push setup is working.",
        url: "/habits",
      }),
    onSuccess: (result) => {
      if (result.sent > 0) toast.success(`Sent test push to ${result.sent} device(s).`);
      else toast.error("No active subscriptions found.");
      qc.invalidateQueries({ queryKey: qk.pushStatus() });
    },
    onError: (err) => toast.error(String(err)),
  });

  useEffect(() => {
    void syncLocalSubState();
  }, []);

  if (!supported) return null;

  const pending =
    enableMutation.isPending || disableMutation.isPending || testMutation.isPending;
  const backendReady = !!pushStatus?.enabled;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink dark:text-white">Push Notifications</p>
          <p className="text-xs text-muted">
            {backendReady
              ? "Enable reminders on this device."
              : "Server push keys are not configured yet."}
          </p>
        </div>
        <span className="text-xs text-muted">
          {pushStatus ? `${pushStatus.count} device(s)` : " "}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => enableMutation.mutate()}
          disabled={pending || !backendReady || isSubscribed}
        >
          <Bell size={14} />
          Enable
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => disableMutation.mutate()}
          disabled={pending || !isSubscribed}
        >
          <BellOff size={14} />
          Disable
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => testMutation.mutate()}
          disabled={pending || !backendReady}
        >
          <Send size={14} />
          Send Test
        </Button>
      </div>
    </Card>
  );
}
