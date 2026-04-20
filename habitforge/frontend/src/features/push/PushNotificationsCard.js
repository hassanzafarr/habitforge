import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
function base64ToApplicationServerKey(base64) {
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
function getSubscriptionPayload(sub) {
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
    const hasServiceWorker = useMemo(() => typeof window !== "undefined" && "serviceWorker" in navigator, []);
    const hasPushManager = useMemo(() => typeof window !== "undefined" && "PushManager" in window, []);
    const hasNotificationApi = useMemo(() => typeof window !== "undefined" && "Notification" in window, []);
    const supported = useMemo(() => typeof window !== "undefined" && hasServiceWorker && hasPushManager && hasNotificationApi, [hasNotificationApi, hasPushManager, hasServiceWorker]);
    const isStandalone = useMemo(() => typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)")?.matches ||
            navigator.standalone === true), []);
    const { data: pushStatus } = useQuery({
        queryKey: qk.pushStatus(),
        queryFn: api.pushStatus,
        enabled: supported,
    });
    const syncLocalSubState = async () => {
        if (!supported)
            return;
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
            if (permission !== "granted")
                throw new Error("Notification permission denied.");
            const reg = await navigator.serviceWorker.ready;
            const existing = await reg.pushManager.getSubscription();
            const sub = existing ??
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
            if (!sub)
                return;
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
        mutationFn: () => api.sendTestPush({
            title: "HabitForge",
            body: "Test notification: your push setup is working.",
            url: "/habits",
        }),
        onSuccess: (result) => {
            if (result.sent > 0)
                toast.success(`Sent test push to ${result.sent} device(s).`);
            else
                toast.error("No active subscriptions found.");
            qc.invalidateQueries({ queryKey: qk.pushStatus() });
        },
        onError: (err) => toast.error(String(err)),
    });
    useEffect(() => {
        void syncLocalSubState();
    }, []);
    const pending = enableMutation.isPending || disableMutation.isPending || testMutation.isPending;
    const backendReady = !!pushStatus?.enabled;
    const supportHint = !hasServiceWorker
        ? "This browser does not support service workers."
        : !hasPushManager
            ? "Push API is unavailable in this browser context. On iPhone/iPad, install HabitForge to Home Screen and open the installed app."
            : !hasNotificationApi
                ? "Notifications API is unavailable in this browser."
                : !isStandalone
                    ? "Tip: install/open HabitForge as a PWA app for best mobile push support."
                    : null;
    return (_jsxs(Card, { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-ink dark:text-white", children: "Push Notifications" }), _jsx("p", { className: "text-xs text-muted", children: !supported
                                    ? supportHint
                                    : backendReady
                                        ? "Enable reminders on this device."
                                        : "Server push keys are not configured yet." })] }), _jsx("span", { className: "text-xs text-muted", children: supported && pushStatus ? `${pushStatus.count} device(s)` : " " })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { size: "sm", onClick: () => enableMutation.mutate(), disabled: pending || !backendReady || isSubscribed, children: [_jsx(Bell, { size: 14 }), "Enable"] }), _jsxs(Button, { size: "sm", variant: "secondary", onClick: () => disableMutation.mutate(), disabled: pending || !isSubscribed, children: [_jsx(BellOff, { size: 14 }), "Disable"] }), _jsxs(Button, { size: "sm", variant: "secondary", onClick: () => testMutation.mutate(), disabled: pending || !backendReady, children: [_jsx(Send, { size: 14 }), "Send Test"] })] })] }));
}
