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
import { cn, haptic } from "@/lib/utils";
import { useBackDismiss } from "@/lib/useBackDismiss";

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
  useBackDismiss(open, () => setOpen(false));

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
    haptic("light");
    setOpen(false);
    // Defer modal mount until after speed-dial exit animation, so heavy
    // form/editor render does not stall the close transition.
    setTimeout(fn, 220);
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
            className="md:hidden fixed left-1/2 bottom-24 z-40 flex flex-col items-end gap-2.5"
            style={{ x: "-50%", willChange: "transform" }}
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
              closed: { transition: { staggerChildren: 0.025, staggerDirection: -1 } },
            }}
            role="menu"
            aria-label="Quick create"
          >
            {actions.map((a) => (
              <motion.button
                key={a.id}
                id={a.id}
                role="menuitem"
                onClick={() => handleAction(a.onClick)}
                variants={{
                  open: { opacity: 1, y: 0, scale: 1 },
                  closed: { opacity: 0, y: 8, scale: 0.96 },
                }}
                transition={{ type: "tween", duration: 0.16, ease: "easeOut" }}
                style={{ willChange: "transform, opacity" }}
                className={cn(
                  "flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-white shadow-lg active:scale-95",
                  a.color
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  {a.icon}
                </span>
                <span className="text-sm font-semibold">New {a.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur-md dark:bg-neutral-950/95 dark:border-neutral-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
            onClick={() => { haptic("medium"); setOpen((v) => !v); }}
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
