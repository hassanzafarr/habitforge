import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api, qk } from "@/lib/api";
import { HabitRow } from "@/features/habits/HabitRow";
import { HabitForm } from "@/features/habits/HabitForm";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { SHORTCUT_EVENTS } from "@/lib/useKeyboardShortcuts";

export function HabitsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Listen for N shortcut
  useEffect(() => {
    const handler = () => setShowCreate(true);
    window.addEventListener(SHORTCUT_EVENTS.newHabit, handler);
    return () => window.removeEventListener(SHORTCUT_EVENTS.newHabit, handler);
  }, []);

  const { data: habits, isLoading } = useQuery({
    queryKey: qk.habits(showArchived),
    queryFn: () => api.listHabits(showArchived),
  });

  const active = habits?.filter((h) => !h.archivedAt) ?? [];
  const archived = habits?.filter((h) => !!h.archivedAt) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-ink dark:text-white">Habits</h1>
          <p className="text-sm text-muted mt-0.5">Manage your daily practices</p>
        </div>
        {/* Hidden on mobile — FAB in bottom nav handles creation */}
        <Button onClick={() => setShowCreate(true)} className="hidden md:flex">
          <Plus size={15} />
          New Habit
        </Button>
      </div>

      {/* Keyboard hint — desktop only */}
      <p className="hidden md:block text-xs text-muted">
        Press{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-border text-xs dark:border-neutral-700">N</kbd>{" "}
        to create · Click a habit to view details
      </p>
      {/* Mobile hint */}
      <p className="md:hidden text-xs text-muted">Tap a habit to view details</p>

      {/* Active habits */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center dark:border-neutral-700">
          <p className="text-4xl mb-3">🌱</p>
          <p className="font-medium text-ink dark:text-white mb-1">No habits yet</p>
          <p className="text-sm text-muted mb-4">Start building your first habit today.</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create your first habit
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((h) => (
            <HabitRow key={h.id} habit={h} showArchived={showArchived} />
          ))}
        </div>
      )}

      {/* Archived toggle */}
      <div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="text-sm text-muted hover:text-ink dark:hover:text-white transition-colors"
        >
          {showArchived ? "▾" : "▸"} Archived habits ({archived.length})
        </button>

        {showArchived && archived.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 opacity-75">
            {archived.map((h) => (
              <HabitRow key={h.id} habit={h} showArchived={showArchived} />
            ))}
          </div>
        )}
      </div>

      <HabitForm open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
