import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";

interface PushActionMessage {
  type: "habit-push-action";
  habitId: number;
  action: "done" | "snooze";
}

function isPushActionMessage(data: unknown): data is PushActionMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "habit-push-action"
  );
}

export function usePushActionBridge() {
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const handler = async (event: MessageEvent) => {
      if (!isPushActionMessage(event.data)) return;
      const { habitId, action } = event.data;

      try {
        if (action === "done") {
          await api.pushAction({
            habitId,
            action: "done",
            date: new Date().toISOString().slice(0, 10),
          });
          toast.success("Habit checked in.");
        } else if (action === "snooze") {
          await api.pushAction({ habitId, action: "snooze", snoozeMinutes: 30 });
          toast.success("Snoozed 30 minutes.");
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: qk.habits() }),
          qc.invalidateQueries({ queryKey: qk.summary() }),
          qc.invalidateQueries({ queryKey: qk.habit(habitId) }),
        ]);
      } catch (err) {
        toast.error(`Push action failed: ${String(err)}`);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [qc]);
}
