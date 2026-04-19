import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Bottom navigation bar — visible only on mobile (hidden on md+).
 * Provides thumb-friendly nav: Dashboard, New Habit (FAB), Habits.
 */
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListChecks, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
export function BottomNav({ onNewHabit }) {
    return (_jsx("nav", { className: "md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-md dark:bg-neutral-950/95 dark:border-neutral-800", "aria-label": "Mobile navigation", children: _jsxs("div", { className: "flex items-center justify-around h-16 px-2 max-w-lg mx-auto", children: [_jsxs(NavLink, { to: "/", end: true, id: "mobile-nav-dashboard", className: ({ isActive }) => cn("flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-colors", isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"), children: [_jsx(LayoutDashboard, { size: 22 }), _jsx("span", { className: "text-[10px] font-medium", children: "Dashboard" })] }), _jsx("button", { id: "mobile-nav-new-habit", onClick: onNewHabit, "aria-label": "Create new habit", className: "flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 active:scale-95 transition-transform -mt-5", children: _jsx(Plus, { size: 26, strokeWidth: 2.5 }) }), _jsxs(NavLink, { to: "/habits", id: "mobile-nav-habits", className: ({ isActive }) => cn("flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl transition-colors", isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"), children: [_jsx(ListChecks, { size: 22 }), _jsx("span", { className: "text-[10px] font-medium", children: "Habits" })] })] }) }));
}
