import { NavLink } from "react-router-dom";
import { LayoutDashboard, ListChecks, CheckSquare, NotebookPen, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const handler = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
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

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-neutral-100 hover:text-ink dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

const LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/habits", label: "Habits", icon: ListChecks },
  { to: "/todos", label: "To-Do", icon: CheckSquare },
  { to: "/notes", label: "Notes", icon: NotebookPen },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur-sm dark:bg-neutral-950/90 dark:border-neutral-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink dark:text-white">
          <img src="/logos/mainlogo.png" alt="HabitForge" className="w-9 h-9 rounded-md object-cover" />
          <span className="text-[15px]">HabitForge</span>
        </NavLink>

        {/* Desktop nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-neutral-100 text-ink dark:bg-neutral-800 dark:text-white"
                    : "text-muted hover:text-ink hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:hover:text-white"
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-ink transition-opacity">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
