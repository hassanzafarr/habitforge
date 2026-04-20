import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { TodosPage } from "@/pages/TodosPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
import { HabitForm } from "@/features/habits/HabitForm";
export default function App() {
    useKeyboardShortcuts();
    const [showCreate, setShowCreate] = useState(false);
    return (_jsxs("div", { className: "min-h-full flex flex-col bg-bg dark:bg-neutral-950", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-1 pb-16 md:pb-0", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/habits", element: _jsx(HabitsPage, {}) }), _jsx(Route, { path: "/habits/:id", element: _jsx(HabitDetailPage, {}) }), _jsx(Route, { path: "/todos", element: _jsx(TodosPage, {}) })] }) }), _jsx(BottomNav, { onNewHabit: () => setShowCreate(true) }), _jsx(HabitForm, { open: showCreate, onClose: () => setShowCreate(false) })] }));
}
