import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Global shortcut state shared across the app via custom events
export const SHORTCUT_EVENTS = {
  newHabit: "hf:new-habit",
  search: "hf:search",
} as const;

/**
 * Keyboard shortcuts:
 *  N         → open New Habit modal
 *  /         → focus search
 *  1-9       → toggle habit N for today (dispatched, handled in TodayHabitList)
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (isInput) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.newHabit));
      }

      if (e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.search));
      }

      // 1-9: toggle habit at that position today
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        window.dispatchEvent(new CustomEvent("hf:toggle-habit", { detail: { index: num - 1 } }));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
}
