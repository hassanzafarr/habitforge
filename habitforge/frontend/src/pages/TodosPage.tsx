/**
 * TodosPage — main page for the /todos route.
 * Shows summary stats, add form, filter tabs, and the todo list.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import { TodoForm } from "@/features/todos/TodoForm";
import { TodoList } from "@/features/todos/TodoList";
import { CheckCircle2, Circle, ListTodo, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Completed" },
];

export function TodosPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: qk.todos(),
    queryFn: () => api.listTodos(),
  });

  const totalCount = todos.length;
  const doneCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - doneCount;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink dark:text-white tracking-tight">
            <ListTodo size={24} className="text-indigo-500" />
            To-Do List
          </h1>
          <p className="mt-1 text-sm text-muted">
            {activeCount} active &middot; {doneCount} completed
          </p>
        </div>

        <button
          id="todos-add-btn"
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            showForm
              ? "bg-neutral-100 dark:bg-neutral-800 text-muted"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30"
          )}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "New Task"}
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Progress</span>
            <span>{Math.round((doneCount / totalCount) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${(doneCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Circle size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink dark:text-white">{activeCount}</p>
            <p className="text-xs text-muted">Remaining</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink dark:text-white">{doneCount}</p>
            <p className="text-xs text-muted">Completed</p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <TodoForm onClose={() => setShowForm(false)} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            id={`todo-filter-${f.value}`}
            onClick={() => setFilter(f.value)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
              filter === f.value
                ? "bg-white dark:bg-neutral-700 text-ink dark:text-white shadow-sm"
                : "text-muted hover:text-ink dark:hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <TodoList todos={todos} filter={filter} />
      )}
    </div>
  );
}
