import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { DashboardPage } from "@/pages/DashboardPage";
import { HabitsPage } from "@/pages/HabitsPage";
import { HabitDetailPage } from "@/pages/HabitDetailPage";
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts";
export default function App() {
    useKeyboardShortcuts();
    return (_jsxs("div", { className: "min-h-full flex flex-col bg-bg dark:bg-neutral-950", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-1", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/habits", element: _jsx(HabitsPage, {}) }), _jsx(Route, { path: "/habits/:id", element: _jsx(HabitDetailPage, {}) })] }) })] }));
}
