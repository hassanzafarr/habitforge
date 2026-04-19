import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { StatCards } from "@/features/dashboard/StatCards";
import { TrendChart } from "@/features/dashboard/TrendChart";
import { TodayHabitList } from "@/features/habits/TodayHabitList";
import { Heatmap } from "@/features/heatmap/Heatmap";
import { HabitForm } from "@/features/habits/HabitForm";
import { Button } from "@/components/ui/Button";
import { SHORTCUT_EVENTS } from "@/lib/useKeyboardShortcuts";

export function DashboardPage() {
  const [showCreate, setShowCreate] = useState(false);

  // Listen for N shortcut from anywhere
  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener(SHORTCUT_EVENTS.newHabit, handler);
    return () => window.removeEventListener(SHORTCUT_EVENTS.newHabit, handler);
  }, []);

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-muted mt-0.5">{today}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="md">
          <Plus size={15} />
          New Habit
          <span className="hidden sm:inline ml-1 text-xs opacity-60 font-mono">N</span>
        </Button>
      </div>

      {/* Stat cards */}
      <StatCards />

      {/* Today + heatmap/trend */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {/* Today's habits */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink dark:text-white">Today's Habits</h2>
          <TodayHabitList />
        </div>

        {/* Right column: heatmap + trend */}
        <div className="flex flex-col gap-6 lg:w-[340px]">
          <TrendChart />
        </div>
      </div>

      {/* Global heatmap */}
      <div className="rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800">
        <h2 className="mb-4 text-xs font-medium text-muted uppercase tracking-wider">
          Activity — all habits
        </h2>
        <Heatmap baseColor="#6366f1" />
      </div>

      {/* Create habit modal */}
      <HabitForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
