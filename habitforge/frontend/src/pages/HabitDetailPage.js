import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Archive, RotateCcw } from "lucide-react";
import { api, qk } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Heatmap } from "@/features/heatmap/Heatmap";
import { MonthlyCalendar } from "@/features/calendar/MonthlyCalendar";
import { HabitForm } from "@/features/habits/HabitForm";
import { rgbaFromHex } from "@/lib/utils";
export function HabitDetailPage() {
    const { id } = useParams();
    const habitId = parseInt(id ?? "0", 10);
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const { data: habit, isLoading } = useQuery({
        queryKey: qk.habit(habitId),
        queryFn: () => api.getHabit(habitId),
        enabled: !!habitId,
    });
    const archiveMut = useMutation({
        mutationFn: () => api.archiveHabit(habitId),
        onSuccess: () => {
            toast.success("Habit archived");
            qc.invalidateQueries({ queryKey: qk.habits() });
            navigate("/habits");
        },
        onError: (e) => toast.error(String(e)),
    });
    const restoreMut = useMutation({
        mutationFn: () => api.restoreHabit(habitId),
        onSuccess: () => {
            toast.success("Habit restored");
            qc.invalidateQueries({ queryKey: qk.habits() });
            qc.invalidateQueries({ queryKey: qk.habit(habitId) });
        },
        onError: (e) => toast.error(String(e)),
    });
    if (isLoading) {
        return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-8 space-y-6", children: [_jsx(Skeleton, { className: "h-8 w-48" }), _jsx(Skeleton, { className: "h-32 w-full rounded-xl" }), _jsx(Skeleton, { className: "h-48 w-full rounded-xl" })] }));
    }
    if (!habit) {
        return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-8 text-center", children: [_jsx("p", { className: "text-muted", children: "Habit not found." }), _jsxs(Button, { variant: "ghost", onClick: () => navigate("/habits"), className: "mt-4", children: [_jsx(ArrowLeft, { size: 14 }), " Back to Habits"] })] }));
    }
    const pct30 = Math.round((habit.completionRate30d ?? 0) * 100);
    const isArchived = !!habit.archivedAt;
    return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-5 md:space-y-6", children: [_jsxs("button", { onClick: () => navigate(-1), className: "flex items-center gap-1 text-sm text-muted hover:text-ink dark:hover:text-white transition-colors", children: [_jsx(ArrowLeft, { size: 14 }), " Back"] }), _jsxs("div", { className: "rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start gap-4", style: { backgroundColor: rgbaFromHex(habit.color, 0.08) }, children: [_jsx("div", { className: "flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl text-3xl shrink-0", style: { backgroundColor: rgbaFromHex(habit.color, 0.18) }, children: habit.icon }), _jsx("div", { className: "flex-1 min-w-0 w-full", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h1", { className: "text-lg md:text-xl font-bold tracking-tight text-ink dark:text-white", children: habit.name }), habit.description && (_jsx("p", { className: "text-sm text-muted mt-0.5", children: habit.description })), isArchived && (_jsx("span", { className: "inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full dark:bg-amber-900/20", children: "Archived" }))] }), _jsxs("div", { className: "flex gap-2 shrink-0", children: [!isArchived && (_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => setEditing(true), children: [_jsx(Pencil, { size: 13 }), " Edit"] })), isArchived ? (_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => restoreMut.mutate(), disabled: restoreMut.isPending, children: [_jsx(RotateCcw, { size: 13 }), " Restore"] })) : (_jsxs(Button, { variant: "secondary", size: "sm", onClick: () => archiveMut.mutate(), disabled: archiveMut.isPending, children: [_jsx(Archive, { size: 13 }), " Archive"] }))] })] }) })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [
                    { label: "Current streak", value: `${habit.currentStreak}d`, icon: "🔥" },
                    { label: "Longest streak", value: `${habit.longestStreak}d`, icon: "⭐" },
                    { label: "30-day rate", value: `${pct30}%`, icon: "📊" },
                    { label: "Total completions", value: habit.totalCompletions, icon: "✅" },
                ].map(({ label, value, icon }) => (_jsxs("div", { className: "rounded-xl border border-border bg-white p-4 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsxs("p", { className: "text-xs text-muted mb-1", children: [icon, " ", label] }), _jsx("p", { className: "text-2xl font-bold tracking-tight text-ink dark:text-white", children: value })] }, label))) }), _jsxs("div", { className: "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsx("p", { className: "mb-4 text-xs font-medium text-muted uppercase tracking-wider", children: "Activity \u2014 last 365 days" }), _jsx(Heatmap, { baseColor: habit.color, habitId: habit.id })] }), _jsx(MonthlyCalendar, { habit: habit }), _jsx(HabitForm, { open: editing, onClose: () => setEditing(false), habit: habit })] }));
}
