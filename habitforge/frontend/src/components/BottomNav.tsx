/**
 * Bottom navigation bar — visible only on mobile (hidden on md+).
 * FAB is a speed-dial that fans out: New Habit, New Todo, New Note.
 */
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  CheckSquare,
  NotebookPen,
  Plus,
  X,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onNewHabit: () => void;
  onNewTodo: () => void;
  onNewNote: () => void;
}

interface DialAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

export function BottomNav({ onNewHabit, onNewTodo, onNewNote }: Props) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const actions: DialAction[] = [
    {
      id: "speed-dial-habit",
      label: "Habit",
      icon: <ListChecks size={18} />,
      color: "bg-indigo-600 shadow-indigo-500/40",
      onClick: onNewHabit,
    },
    {
      id: "speed-dial-todo",
      label: "To-Do",
      icon: <ListTodo size={18} />,
      color: "bg-emerald-600 shadow-emerald-500/40",
      onClick: onNewTodo,
    },
    {
      id: "speed-dial-note",
      label: "Note",
      icon: <NotebookPen size={18} />,
      color: "bg-amber-600 shadow-amber-500/40",
      onClick: onNewNote,
    },
  ];

  const handleAction = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      {/* Backdrop when speed-dial open */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Speed-dial action buttons */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden fixed left-1/2 -translate-x-1/2 bottom-24 z-40 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            role="menu"
            aria-label="Quick create"
          >
            {actions.map((a, i) => (
              <motion.button
                key={a.id}
                id={a.id}
                role="menuitem"
                onClick={() => handleAction(a.onClick)}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ delay: (actions.length - 1 - i) * 0.04 }}
                className="flex items-center gap-2 pr-4 pl-3 py-2 rounded-full text-white shadow-lg active:scale-95 transition-transform"
                style={{}}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full shadow-md",
                    a.color
                  )}
                >
                  {a.icon}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold px-3 py-1.5 rounded-full text-white shadow-md",
                    a.color
                  )}
                >
                  New {a.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-md dark:bg-neutral-950/95 dark:border-neutral-800"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {/* Dashboard */}
          <NavLink
            to="/"
            end
            id="mobile-nav-dashboard"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )
            }
          >
            <LayoutDashboard size={22} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </NavLink>

          {/* Habits */}
          <NavLink
            to="/habits"
            id="mobile-nav-habits"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )
            }
          >
            <ListChecks size={22} />
            <span className="text-[10px] font-medium">Habits</span>
          </NavLink>

          {/* Speed-dial FAB */}
          <button
            id="mobile-nav-fab"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close quick create menu" : "Open quick create menu"}
            aria-expanded={open}
            aria-haspopup="menu"
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg active:scale-95 transition-all -mt-5",
              open
                ? "bg-neutral-700 shadow-neutral-500/40 rotate-45"
                : "bg-indigo-600 shadow-indigo-500/40"
            )}
          >
            {open ? <X size={26} strokeWidth={2.5} /> : <Plus size={26} strokeWidth={2.5} />}
          </button>

          {/* To-Do */}
          <NavLink
            to="/todos"
            id="mobile-nav-todos"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )
            }
          >
            <CheckSquare size={22} />
            <span className="text-[10px] font-medium">To-Do</span>
          </NavLink>

          {/* Notes */}
          <NavLink
            to="/notes"
            id="mobile-nav-notes"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              )
            }
          >
            <NotebookPen size={22} />
            <span className="text-[10px] font-medium">Notes</span>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
