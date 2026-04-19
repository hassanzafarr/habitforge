import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { Button } from "@/components/ui/Button";
import { HabitForm } from "./HabitForm";
import { Badge } from "@/components/ui/Badge";
import { rgbaFromHex } from "@/lib/utils";
function frequencyLabel(h) {
    if (h.frequencyType === "daily")
        return "Daily";
    if (h.frequencyType === "weekly")
        return `${h.targetPerWeek}×/week`;
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    return h.activeDays.map((d) => days[d]).join(" · ");
}
export function HabitRow({ habit, showArchived }) {
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
    return (_jsxs(_Fragment, { children: [_jsxs(motion.div, { layout: true, className: "flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 dark:bg-neutral-900 dark:border-neutral-800", initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, children: [_jsx("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl", style: { backgroundColor: rgbaFromHex(habit.color, 0.12) }, children: habit.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("button", { onClick: () => navigate(`/habits/${habit.id}`), className: "truncate text-sm font-medium text-ink hover:underline dark:text-neutral-100 text-left", children: habit.name }), _jsx("p", { className: "text-xs text-muted", children: frequencyLabel(habit) })] }), _jsxs("div", { className: "hidden sm:flex items-center gap-6 text-center", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-ink dark:text-white", children: ["\uD83D\uDD25", habit.currentStreak] }), _jsx("p", { className: "text-[10px] text-muted", children: "streak" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-ink dark:text-white", children: habit.longestStreak }), _jsx("p", { className: "text-[10px] text-muted", children: "best" })] }), _jsx("div", { children: _jsxs(Badge, { style: {
                                        backgroundColor: rgbaFromHex(habit.color, 0.12),
                                        color: habit.color,
                                    }, children: [pct, "% / 30d"] }) })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => navigate(`/habits/${habit.id}`), "aria-label": "View detail", children: _jsx(ExternalLink, { size: 14 }) }), !isArchived && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setEditing(true), "aria-label": "Edit habit", children: _jsx(Pencil, { size: 14 }) })), isArchived ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => restoreMut.mutate(), disabled: restoreMut.isPending, "aria-label": "Restore habit", children: _jsx(RotateCcw, { size: 14 }) })) : (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => archiveMut.mutate(), disabled: archiveMut.isPending, "aria-label": "Archive habit", children: _jsx(Archive, { size: 14 }) }))] })] }), _jsx(HabitForm, { open: editing, onClose: () => setEditing(false), habit: habit })] }));
}
