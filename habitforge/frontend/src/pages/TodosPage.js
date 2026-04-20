import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const FILTERS = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "done", label: "Completed" },
];
export function TodosPage() {
    const [filter, setFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const { data: todos = [], isLoading } = useQuery({
        queryKey: qk.todos(),
        queryFn: () => api.listTodos(),
    });
    const totalCount = todos.length;
    const doneCount = todos.filter((t) => t.completed).length;
    const activeCount = totalCount - doneCount;
    return (_jsxs("div", { className: "mx-auto max-w-2xl px-4 py-8 space-y-6", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "flex items-center gap-2 text-2xl font-bold text-ink dark:text-white tracking-tight", children: [_jsx(ListTodo, { size: 24, className: "text-indigo-500" }), "To-Do List"] }), _jsxs("p", { className: "mt-1 text-sm text-muted", children: [activeCount, " active \u00B7 ", doneCount, " completed"] })] }), _jsxs("button", { id: "todos-add-btn", onClick: () => setShowForm((v) => !v), className: cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all", showForm
                            ? "bg-neutral-100 dark:bg-neutral-800 text-muted"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30"), children: [showForm ? _jsx(X, { size: 15 }) : _jsx(Plus, { size: 15 }), showForm ? "Cancel" : "New Task"] })] }), totalCount > 0 && (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-muted", children: [_jsx("span", { children: "Progress" }), _jsxs("span", { children: [Math.round((doneCount / totalCount) * 100), "%"] })] }), _jsx("div", { className: "h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500", style: { width: `${(doneCount / totalCount) * 100}%` } }) })] })), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400", children: _jsx(Circle, { size: 20 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-ink dark:text-white", children: activeCount }), _jsx("p", { className: "text-xs text-muted", children: "Remaining" })] })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-2xl border border-border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400", children: _jsx(CheckCircle2, { size: 20 }) }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-ink dark:text-white", children: doneCount }), _jsx("p", { className: "text-xs text-muted", children: "Completed" })] })] })] }), showForm && (_jsx(TodoForm, { onClose: () => setShowForm(false) })), _jsx("div", { className: "flex items-center gap-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 p-1", children: FILTERS.map((f) => (_jsx("button", { id: `todo-filter-${f.value}`, onClick: () => setFilter(f.value), className: cn("flex-1 py-1.5 rounded-lg text-sm font-medium transition-all", filter === f.value
                        ? "bg-white dark:bg-neutral-700 text-ink dark:text-white shadow-sm"
                        : "text-muted hover:text-ink dark:hover:text-white"), children: f.label }, f.value))) }), isLoading ? (_jsx("div", { className: "space-y-3", children: [...Array(3)].map((_, i) => (_jsx("div", { className: "h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" }, i))) })) : (_jsx(TodoList, { todos: todos, filter: filter }))] }));
}
