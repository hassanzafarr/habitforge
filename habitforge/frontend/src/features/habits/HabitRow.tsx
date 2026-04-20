/**
 * Habits list row — shows icon, name, frequency, streaks, completion rate,
 * and edit/archive/restore/delete buttons.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Archive, RotateCcw, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { api, qk } from "@/lib/api";
import type { Habit } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { HabitForm } from "./HabitForm";
import { Badge } from "@/components/ui/Badge";
import { rgbaFromHex } from "@/lib/utils";

function frequencyLabel(h: Habit): string {
  if (h.frequencyType === "daily") return "Daily";
  if (h.frequencyType === "weekly") return `${h.targetPerWeek}×/week`;
  const days = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  return h.activeDays.map((d) => days[d]).join(" · ");
}

interface Props {
  habit: Habit;
  showArchived: boolean;
}

export function HabitRow({ habit, showArchived }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const archiveMut = useMutation({
    mutationFn: () => api.archiveHabit(habit.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits(showArchived) });
      qc.invalidateQueries({ queryKey: qk.summary() });
      toast.success(`"${habit.name}" archived`);
    },
    onError: (e) => toast.error(String(e)),
  });

  const restoreMut = useMutation({
    mutationFn: () => api.restoreHabit(habit.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits(showArchived) });
      qc.invalidateQueries({ queryKey: qk.summary() });
      toast.success(`"${habit.name}" restored`);
    },
    onError: (e) => toast.error(String(e)),
  });

  const isArchived = !!habit.archivedAt;
  const pct = Math.round((habit.completionRate30d ?? 0) * 100);

  return (
    <>
      <motion.div
        layout
        className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 dark:bg-neutral-900 dark:border-neutral-800"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Color + icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
          style={{ backgroundColor: rgbaFromHex(habit.color, 0.12) }}
        >
          {habit.icon}
        </div>

        {/* Name + frequency */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => navigate(`/habits/${habit.id}`)}
              className="truncate text-sm font-medium text-ink hover:underline dark:text-neutral-100 text-left"
            >
              {habit.name}
            </button>
            {habit.habitType === "negative" && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400">
                break
              </span>
            )}
          </div>
          <p className="text-xs text-muted">{frequencyLabel(habit)}</p>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 text-center">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">
              {habit.habitType === "negative" ? "✨" : "🔥"}{habit.currentStreak}
            </p>
            <p className="text-[10px] text-muted">
              {habit.habitType === "negative" ? "clean" : "streak"}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">{habit.longestStreak}</p>
            <p className="text-[10px] text-muted">best</p>
          </div>
          <div>
            <Badge
              style={{
                backgroundColor: rgbaFromHex(habit.color, 0.12),
                color: habit.color,
              }}
            >
              {pct}% / 30d
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/habits/${habit.id}`)}
            aria-label="View detail"
          >
            <ExternalLink size={14} />
          </Button>
          {!isArchived && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              aria-label="Edit habit"
            >
              <Pencil size={14} />
            </Button>
          )}
          {isArchived ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => restoreMut.mutate()}
              disabled={restoreMut.isPending}
              aria-label="Restore habit"
            >
              <RotateCcw size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archiveMut.mutate()}
              disabled={archiveMut.isPending}
              aria-label="Archive habit"
            >
              <Archive size={14} />
            </Button>
          )}
        </div>
      </motion.div>

      <HabitForm open={editing} onClose={() => setEditing(false)} habit={habit} />
    </>
  );
}
