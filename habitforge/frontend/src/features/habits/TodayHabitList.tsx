/**
 * Today's check-off list with optimistic updates and animated check circles.
 * Pressing 1-9 toggles the Nth habit via keyboard shortcut.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import type { Habit } from "@/lib/types";
import { todayIso } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Check circle ──────────────────────────────────────────────────────────────

interface CheckCircleProps {
  done: boolean;
  color: string;
  onClick: () => void;
}

function CheckCircle({ done, color, onClick }: CheckCircleProps) {
  return (
    <motion.button
      onClick={onClick}
      aria-label={done ? "Mark undone" : "Mark done"}
      whileTap={{ scale: 0.85 }}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        borderColor: done ? color : "#d6d3d1",
        backgroundColor: done ? color : "transparent",
      }}
    >
      <AnimatePresence>
        {done && (
          <motion.svg
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ── Habit row ─────────────────────────────────────────────────────────────────

interface HabitRowProps {
  habit: Habit;
  done: boolean;
  index: number;
  onToggle: () => void;
}

function HabitRow({ habit, done, index, onToggle }: HabitRowProps) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 md:gap-4 rounded-xl border border-border bg-white px-3 md:px-4 py-3 dark:bg-neutral-900 dark:border-neutral-800"
      animate={{ opacity: done ? 0.65 : 1 }}
    >
      <CheckCircle done={done} color={habit.color} onClick={onToggle} />
      <span className="text-xl select-none">{habit.icon}</span>
      <div className="flex-1 min-w-0">
        <p
          className={`truncate text-sm font-medium transition-colors ${
            done
              ? "line-through text-muted"
              : "text-ink dark:text-neutral-100"
          }`}
        >
          {habit.name}
        </p>
        {habit.currentStreak > 0 && (
          <p className="text-xs text-muted">🔥 {habit.currentStreak} day streak</p>
        )}
      </div>
      {index < 9 && (
        <span className="hidden sm:flex h-5 w-5 items-center justify-center rounded border border-border text-[10px] font-mono text-muted dark:border-neutral-700">
          {index + 1}
        </span>
      )}
    </motion.div>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────

export function TodayHabitList() {
  const qc = useQueryClient();
  const today = todayIso();

  const { data: habits, isLoading } = useQuery({
    queryKey: qk.habits(),
    queryFn: () => api.listHabits(),
  });

  // Optimistic overrides. Server `completedToday` remains the durable source of truth.
  const [localDoneOverrides, setLocalDoneOverrides] = useState<Map<number, boolean>>(
    new Map()
  );
  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  function isHabitDone(habit: Habit): boolean {
    const override = localDoneOverrides.get(habit.id);
    if (override !== undefined) return override;
    return habit.completedToday;
  }

  // Listen for 1-9 keyboard shortcut events
  useEffect(() => {
    const handler = (e: Event) => {
      const { index } = (e as CustomEvent<{ index: number }>).detail;
      const habit = habitsRef.current?.[index];
      if (habit) toggleHabit(habit);
    };
    window.addEventListener("hf:toggle-habit", handler);
    return () => window.removeEventListener("hf:toggle-habit", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const upsertMut = useMutation({
    mutationFn: (id: number) => api.upsertCompletion(id, today, "done"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.summary() });
      qc.invalidateQueries({ queryKey: qk.habits() });
    },
    onError: (_err, id) => {
      setLocalDoneOverrides((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
      toast.error("Failed to mark habit");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteCompletion(id, today),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.summary() });
      qc.invalidateQueries({ queryKey: qk.habits() });
    },
    onError: (_err, id) => {
      setLocalDoneOverrides((prev) => {
        const m = new Map(prev);
        m.set(id, true);
        return m;
      });
      toast.error("Failed to unmark habit");
    },
  });

  function toggleHabit(habit: Habit) {
    if (isHabitDone(habit)) {
      // optimistic remove
      setLocalDoneOverrides((prev) => {
        const m = new Map(prev);
        m.set(habit.id, false);
        return m;
      });
      deleteMut.mutate(habit.id);
    } else {
      // optimistic add
      setLocalDoneOverrides((prev) => {
        const m = new Map(prev);
        m.set(habit.id, true);
        return m;
      });
      upsertMut.mutate(habit.id);
    }
  }

  useEffect(() => {
    if (!habits?.length) return;
    // Drop overrides once server data matches, preventing stale local flags.
    setLocalDoneOverrides((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      for (const [id, value] of prev) {
        const habit = habits.find((h) => h.id === id);
        if (!habit || habit.completedToday === value) {
          next.delete(id);
        }
      }
      return next;
    });
  }, [habits]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!habits?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center dark:border-neutral-700">
        <p className="text-3xl mb-2">🎯</p>
        <p className="text-sm text-muted">
          No habits yet. Press{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-border text-xs dark:border-neutral-700">
            N
          </kbd>{" "}
          to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {habits.map((habit, i) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            done={isHabitDone(habit)}
            index={i}
            onToggle={() => toggleHabit(habit)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
