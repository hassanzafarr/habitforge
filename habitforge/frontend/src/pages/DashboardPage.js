import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "mx-auto max-w-6xl px-4 py-8 space-y-8", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight text-ink dark:text-white", children: "Dashboard" }), _jsx("p", { className: "text-sm text-muted mt-0.5", children: today })] }), _jsxs(Button, { onClick: () => setShowCreate(true), size: "md", children: [_jsx(Plus, { size: 15 }), "New Habit", _jsx("span", { className: "hidden sm:inline ml-1 text-xs opacity-60 font-mono", children: "N" })] })] }), _jsx(StatCards, {}), _jsxs("div", { className: "grid gap-6 lg:grid-cols-[1fr_auto]", children: [_jsxs("div", { children: [_jsx("h2", { className: "mb-3 text-sm font-semibold text-ink dark:text-white", children: "Today's Habits" }), _jsx(TodayHabitList, {})] }), _jsx("div", { className: "flex flex-col gap-6 lg:w-[340px]", children: _jsx(TrendChart, {}) })] }), _jsxs("div", { className: "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsx("h2", { className: "mb-4 text-xs font-medium text-muted uppercase tracking-wider", children: "Activity \u2014 all habits" }), _jsx(Heatmap, { baseColor: "#6366f1" })] }), _jsx(HabitForm, { open: showCreate, onClose: () => setShowCreate(false) })] }));
}
