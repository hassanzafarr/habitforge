import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Monthly calendar for a single habit.
 * Click any day to retroactively toggle done / skipped / undone.
 */
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isFuture, isToday, } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import { isoDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
export function MonthlyCalendar({ habit }) {
    const qc = useQueryClient();
    const [cursor, setCursor] = useState(new Date()); // year-month being viewed
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const from = isoDate(monthStart);
    const to = isoDate(monthEnd);
    const { data: completions } = useQuery({
        queryKey: qk.completions(habit.id, from, to),
        queryFn: () => api.listCompletions(habit.id, from, to),
    });
    // Build lookup: date → status
    const lookup = React.useMemo(() => {
        const m = new Map();
        if (completions)
            completions.forEach((c) => m.set(c.date, c.status));
        return m;
    }, [completions]);
    // Days in the view with leading empty slots to align to Mon
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    // getDay: 0=Sun…6=Sat → convert to Mon-first: Mon=0
    const leading = (getDay(monthStart) + 6) % 7;
    const upsertMut = useMutation({
        mutationFn: ({ date, status }) => api.upsertCompletion(habit.id, date, status),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.completions(habit.id, from, to) });
            qc.invalidateQueries({ queryKey: qk.habit(habit.id) });
        },
        onError: (e) => toast.error(String(e)),
    });
    const deleteMut = useMutation({
        mutationFn: (date) => api.deleteCompletion(habit.id, date),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.completions(habit.id, from, to) });
            qc.invalidateQueries({ queryKey: qk.habit(habit.id) });
        },
        onError: (e) => toast.error(String(e)),
    });
    function handleClick(date) {
        if (isFuture(date) && !isToday(date))
            return; // can't mark future
        const dateStr = isoDate(date);
        const current = lookup.get(dateStr);
        if (!current) {
            upsertMut.mutate({ date: dateStr, status: "done" });
        }
        else if (current === "done") {
            upsertMut.mutate({ date: dateStr, status: "skipped" });
        }
        else {
            deleteMut.mutate(dateStr);
        }
    }
    function dayStyle(d) {
        const dateStr = isoDate(d);
        const status = lookup.get(dateStr);
        const future = isFuture(d) && !isToday(d);
        if (future)
            return { cls: "opacity-30 cursor-not-allowed" };
        if (isToday(d)) {
            if (status === "done")
                return { cls: "ring-2 text-white", label: "✓" };
            return { cls: "ring-2 ring-ink dark:ring-white font-bold" };
        }
        if (status === "done")
            return { cls: "text-white", label: "✓" };
        if (status === "skipped")
            return { cls: "opacity-50", label: "–" };
        return { cls: "hover:bg-neutral-100 dark:hover:bg-neutral-800" };
    }
    return (_jsxs("div", { className: "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("button", { onClick: () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)), className: "p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800", children: _jsx(ChevronLeft, { size: 16 }) }), _jsx("p", { className: "text-sm font-semibold text-ink dark:text-white", children: format(cursor, "MMMM yyyy") }), _jsx("button", { onClick: () => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)), className: "p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800", disabled: cursor.getMonth() === new Date().getMonth() && cursor.getFullYear() === new Date().getFullYear(), children: _jsx(ChevronRight, { size: 16 }) })] }), _jsx("div", { className: "grid grid-cols-7 mb-1", children: DOW.map((d) => (_jsx("div", { className: "text-center text-[10px] font-medium text-muted py-0.5", children: d }, d))) }), _jsxs("div", { className: "grid grid-cols-7 gap-0.5", children: [Array.from({ length: leading }).map((_, i) => (_jsx("div", {}, `e-${i}`))), days.map((d) => {
                        const { cls, label } = dayStyle(d);
                        const dateStr = isoDate(d);
                        const status = lookup.get(dateStr);
                        const isDone = status === "done";
                        return (_jsx("button", { onClick: () => handleClick(d), "aria-label": `${dateStr} ${status ?? "not logged"}`, className: cn("relative flex h-9 w-full items-center justify-center rounded-md text-xs font-medium transition-colors", cls), style: isDone ? { backgroundColor: habit.color } : {}, children: label ?? d.getDate() }, dateStr));
                    })] }), _jsxs("div", { className: "mt-3 flex items-center gap-4 text-xs text-muted", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "h-3 w-3 rounded", style: { backgroundColor: habit.color } }), "Done"] }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx("span", { className: "h-3 w-3 rounded bg-neutral-200 dark:bg-neutral-700 opacity-50" }), "Skipped"] }), _jsx("span", { className: "ml-auto text-[10px] opacity-60", children: "Click to cycle: done \u2192 skipped \u2192 clear" })] })] }));
}
