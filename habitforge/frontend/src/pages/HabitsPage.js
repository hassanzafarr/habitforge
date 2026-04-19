import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-6 md:py-8 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl md:text-2xl font-bold tracking-tight text-ink dark:text-white", children: "Habits" }), _jsx("p", { className: "text-sm text-muted mt-0.5", children: "Manage your daily practices" })] }), _jsxs(Button, { onClick: () => setShowCreate(true), className: "hidden md:flex", children: [_jsx(Plus, { size: 15 }), "New Habit"] })] }), _jsxs("p", { className: "hidden md:block text-xs text-muted", children: ["Press", " ", _jsx("kbd", { className: "px-1.5 py-0.5 rounded border border-border text-xs dark:border-neutral-700", children: "N" }), " ", "to create \u00B7 Click a habit to view details"] }), _jsx("p", { className: "md:hidden text-xs text-muted", children: "Tap a habit to view details" }), isLoading ? (_jsx("div", { className: "flex flex-col gap-2", children: [1, 2, 3, 4].map((i) => _jsx(Skeleton, { className: "h-16 w-full rounded-xl" }, i)) })) : active.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-border p-12 text-center dark:border-neutral-700", children: [_jsx("p", { className: "text-4xl mb-3", children: "\uD83C\uDF31" }), _jsx("p", { className: "font-medium text-ink dark:text-white mb-1", children: "No habits yet" }), _jsx("p", { className: "text-sm text-muted mb-4", children: "Start building your first habit today." }), _jsxs(Button, { onClick: () => setShowCreate(true), children: [_jsx(Plus, { size: 15 }), " Create your first habit"] })] })) : (_jsx("div", { className: "flex flex-col gap-2", children: active.map((h) => (_jsx(HabitRow, { habit: h, showArchived: showArchived }, h.id))) })), _jsxs("div", { children: [_jsxs("button", { onClick: () => setShowArchived((v) => !v), className: "text-sm text-muted hover:text-ink dark:hover:text-white transition-colors", children: [showArchived ? "▾" : "▸", " Archived habits (", archived.length, ")"] }), showArchived && archived.length > 0 && (_jsx("div", { className: "mt-2 flex flex-col gap-2 opacity-75", children: archived.map((h) => (_jsx(HabitRow, { habit: h, showArchived: showArchived }, h.id))) }))] }), _jsx(HabitForm, { open: showCreate, onClose: () => setShowCreate(false) })] }));
}
