import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TodoList — renders todo items with toggle, edit, and delete capabilities.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, qk } from "@/lib/api";
import { TodoForm } from "./TodoForm";
import { CheckCircle2, Circle, Pencil, Trash2, Flag, CalendarDays, ClipboardList, } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, parseISO } from "date-fns";
const PRIORITY_STYLES = {
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
function DueDateChip({ dueDate }) {
    const parsed = parseISO(dueDate);
    const overdue = isPast(parsed) && !isToday(parsed);
    const due = isToday(parsed);
    return (_jsxs("span", { className: cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", overdue
            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            : due
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"), children: [_jsx(CalendarDays, { size: 10 }), overdue ? "Overdue · " : "", format(parsed, "MMM d")] }));
}
function TodoItem({ todo }) {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const invalidate = () => qc.invalidateQueries({ queryKey: qk.todos() });
    const toggleMut = useMutation({
        mutationFn: () => api.updateTodo(todo.id, { completed: !todo.completed }),
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: qk.todos() });
            const prev = qc.getQueryData(qk.todos());
            qc.setQueryData(qk.todos(), (old) => old?.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)));
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
        return (_jsx(motion.div, { layout: true, initial: { opacity: 0 }, animate: { opacity: 1 }, children: _jsx(TodoForm, { editTodo: todo, onClose: () => setEditing(false) }) }, "edit"));
    }
    return (_jsxs(motion.div, { layout: true, initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, x: -20 }, className: cn("group relative flex items-start gap-3 rounded-2xl border bg-white dark:bg-neutral-900 p-4 shadow-sm transition-all", todo.completed
            ? "border-neutral-200 dark:border-neutral-800 opacity-70"
            : "border-border dark:border-neutral-800 hover:shadow-md"), children: [_jsx("div", { className: cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", pStyles.bar) }), _jsx("button", { id: `todo-toggle-${todo.id}`, onClick: () => toggleMut.mutate(), "aria-label": todo.completed ? "Mark incomplete" : "Mark complete", className: cn("mt-0.5 shrink-0 transition-all", todo.completed
                    ? "text-indigo-500 dark:text-indigo-400"
                    : "text-neutral-300 dark:text-neutral-600 hover:text-indigo-500 dark:hover:text-indigo-400"), children: todo.completed ? _jsx(CheckCircle2, { size: 22 }) : _jsx(Circle, { size: 22 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: cn("text-sm font-semibold text-ink dark:text-white leading-snug", todo.completed && "line-through text-muted"), children: todo.title }), todo.description && (_jsx("p", { className: "mt-1 text-xs text-muted line-clamp-2", children: todo.description })), _jsxs("div", { className: "mt-2 flex flex-wrap items-center gap-1.5", children: [_jsxs("span", { className: cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", pStyles.badge), children: [_jsx(Flag, { size: 10 }), pStyles.text] }), todo.dueDate && _jsx(DueDateChip, { dueDate: todo.dueDate }), todo.completed && todo.completedAt && (_jsxs("span", { className: "text-[11px] text-muted", children: ["Done ", format(parseISO(todo.completedAt), "MMM d")] }))] })] }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { id: `todo-edit-${todo.id}`, onClick: () => setEditing(true), className: "p-1.5 rounded-md text-muted hover:text-ink dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors", "aria-label": "Edit todo", children: _jsx(Pencil, { size: 14 }) }), _jsx("button", { id: `todo-delete-${todo.id}`, onClick: () => deleteMut.mutate(), className: "p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", "aria-label": "Delete todo", children: _jsx(Trash2, { size: 14 }) })] })] }));
}
export function TodoList({ todos, filter }) {
    const filtered = todos.filter((t) => {
        if (filter === "active")
            return !t.completed;
        if (filter === "done")
            return t.completed;
        return true;
    });
    if (filtered.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-3 py-20 text-center text-muted", children: [_jsx(ClipboardList, { size: 40, className: "opacity-40" }), _jsx("p", { className: "text-sm font-medium", children: filter === "done"
                        ? "No completed tasks yet."
                        : filter === "active"
                            ? "All caught up! Nothing pending."
                            : "No todos yet. Add one above!" })] }));
    }
    return (_jsx("div", { className: "space-y-3", children: _jsx(AnimatePresence, { mode: "popLayout", children: filtered.map((todo) => (_jsx(TodoItem, { todo: todo }, todo.id))) }) }));
}
