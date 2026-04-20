import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListChecks, CheckSquare, NotebookPen, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
    useEffect(() => {
        const handler = () => setIsDark(document.documentElement.classList.contains("dark"));
        window.addEventListener("theme-change", handler);
        return () => window.removeEventListener("theme-change", handler);
    }, []);
    const toggle = () => {
        const html = document.documentElement;
        const next = !html.classList.contains("dark");
        html.classList.toggle("dark", next);
        localStorage.setItem("hf-theme", next ? "dark" : "light");
        setIsDark(next);
    };
    return (_jsx("button", { onClick: toggle, "aria-label": "Toggle dark mode", className: "flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-neutral-100 hover:text-ink dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors", children: isDark ? _jsx(Sun, { size: 16 }) : _jsx(Moon, { size: 16 }) }));
}
const LINKS = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/habits", label: "Habits", icon: ListChecks },
    { to: "/todos", label: "To-Do", icon: CheckSquare },
    { to: "/notes", label: "Notes", icon: NotebookPen },
];
export function Navbar() {
    return (_jsx("header", { className: "sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-sm dark:bg-neutral-950/90 dark:border-neutral-800", children: _jsxs("div", { className: "mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4", children: [_jsxs(NavLink, { to: "/", className: "flex items-center gap-2 font-semibold tracking-tight text-ink dark:text-white", children: [_jsx("img", { src: "/logos/mainlogo.png", alt: "HabitForge", className: "w-9 h-9 rounded-md object-cover" }), _jsx("span", { className: "text-[15px]", children: "HabitForge" })] }), _jsx("nav", { className: "hidden md:flex items-center gap-1", children: LINKS.map(({ to, label, icon: Icon, end }) => (_jsxs(NavLink, { to: to, end: end, className: ({ isActive }) => cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", isActive
                            ? "bg-neutral-100 text-ink dark:bg-neutral-800 dark:text-white"
                            : "text-muted hover:text-ink hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-white"), children: [_jsx(Icon, { size: 15 }), label] }, to))) }), _jsx(ThemeToggle, {})] }) }));
}
