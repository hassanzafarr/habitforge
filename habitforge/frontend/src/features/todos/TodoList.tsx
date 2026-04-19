/**
 * TodoList — renders todo items with toggle, edit, and delete capabilities.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, qk } from "@/lib/api";
import type { Todo, TodoPriority } from "@/lib/types";
import { TodoForm } from "./TodoForm";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Flag,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";

const PRIORITY_STYLES: Record<TodoPriority, { bar: string; badge: string; text: string }> = {
  low: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    text: "Low",
  },
  medium: {
    bar: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    text: "Medium",
  },
  high: {
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    text: "High",
  },
};

function DueDateChip({ dueDate }: { dueDate: string }) {
  const parsed = parseISO(dueDate);
  const overdue = isPast(parsed) && !isToday(parsed);
  const due = isToday(parsed);
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
        overdue
          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          : due
          ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      )}
    >
      <CalendarDays size={10} />
      {overdue ? "Overdue · " : ""}
      {format(parsed, "MMM d")}
    </span>
  );
}

interface ItemProps {
  todo: Todo;
}

function TodoItem({ todo }: ItemProps) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.todos() });

  const toggleMut = useMutation({
    mutationFn: () => api.updateTodo(todo.id, { completed: !todo.completed }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.todos() });
      const prev = qc.getQueryData<Todo[]>(qk.todos());
      qc.setQueryData<Todo[]>(qk.todos(), (old) =>
        old?.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(qk.todos(), ctx?.prev);
      toast.error("Failed to toggle todo");
    },
    onSettled: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteTodo(todo.id),
    onSuccess: () => { invalidate(); toast.success("Todo deleted"); },
    onError: () => toast.error("Failed to delete todo"),
  });

  const pStyles = PRIORITY_STYLES[todo.priority];

  if (editing) {
    return (
      <motion.div layout key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <TodoForm editTodo={todo} onClose={() => setEditing(false)} />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border bg-white dark:bg-neutral-900 p-4 shadow-sm transition-all",
        todo.completed
          ? "border-neutral-200 dark:border-neutral-800 opacity-70"
          : "border-border dark:border-neutral-800 hover:shadow-md"
      )}
    >
      {/* Priority bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", pStyles.bar)} />

      {/* Checkbox */}
      <button
        id={`todo-toggle-${todo.id}`}
        onClick={() => toggleMut.mutate()}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "mt-0.5 shrink-0 transition-all",
          todo.completed
            ? "text-indigo-500 dark:text-indigo-400"
            : "text-neutral-300 dark:text-neutral-600 hover:text-indigo-500 dark:hover:text-indigo-400"
        )}
      >
        {todo.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold text-ink dark:text-white leading-snug",
            todo.completed && "line-through text-muted"
          )}
        >
          {todo.title}
        </p>

        {todo.description && (
          <p className="mt-1 text-xs text-muted line-clamp-2">{todo.description}</p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Priority badge */}
          <span className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", pStyles.badge)}>
            <Flag size={10} />
            {pStyles.text}
          </span>

          {/* Due date */}
          {todo.dueDate && <DueDateChip dueDate={todo.dueDate} />}

          {/* Completed at */}
          {todo.completed && todo.completedAt && (
            <span className="text-[11px] text-muted">
              Done {format(parseISO(todo.completedAt), "MMM d")}
            </span>
          )}
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          id={`todo-edit-${todo.id}`}
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-md text-muted hover:text-ink dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Edit todo"
        >
          <Pencil size={14} />
        </button>
        <button
          id={`todo-delete-${todo.id}`}
          onClick={() => deleteMut.mutate()}
          className="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete todo"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

interface ListProps {
  todos: Todo[];
  filter: "all" | "active" | "done";
}

export function TodoList({ todos, filter }: ListProps) {
  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center text-muted">
        <ClipboardList size={40} className="opacity-40" />
        <p className="text-sm font-medium">
          {filter === "done"
            ? "No completed tasks yet."
            : filter === "active"
            ? "All caught up! Nothing pending."
            : "No todos yet. Add one above!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {filtered.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </AnimatePresence>
    </div>
  );
}
