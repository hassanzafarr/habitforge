/**
 * TodoForm — inline add/edit form with priority selector and optional due date.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import type { Todo, TodoCreate, TodoPriority } from "@/lib/types";
import { X, Plus, Calendar, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onClose?: () => void;
  editTodo?: Todo;
}

const PRIORITIES: { value: TodoPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-emerald-500" },
  { value: "medium", label: "Medium", color: "text-amber-500" },
  { value: "high", label: "High", color: "text-red-500" },
];

export function TodoForm({ onClose, editTodo }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(editTodo?.title ?? "");
  const [description, setDescription] = useState(editTodo?.description ?? "");
  const [priority, setPriority] = useState<TodoPriority>(editTodo?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(editTodo?.dueDate ?? "");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.todos() });
  };

  const createMut = useMutation({
    mutationFn: (body: TodoCreate) => api.createTodo(body),
    onSuccess: () => {
      invalidate();
      toast.success("Todo created!");
      if (onClose) onClose();
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate("");
    },
    onError: () => toast.error("Failed to create todo"),
  });

  const updateMut = useMutation({
    mutationFn: (body: TodoCreate) => api.updateTodo(editTodo!.id, body),
    onSuccess: () => {
      invalidate();
      toast.success("Todo updated!");
      if (onClose) onClose();
    },
    onError: () => toast.error("Failed to update todo"),
  });

  const pending = createMut.isPending || updateMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const body: TodoCreate = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueDate: dueDate || null,
    };
    if (editTodo) {
      updateMut.mutate(body);
    } else {
      createMut.mutate(body);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-5 shadow-sm space-y-4"
    >
      {/* Title row */}
      <div className="flex items-center gap-3">
        <input
          id="todo-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 bg-transparent text-sm font-medium text-ink dark:text-white placeholder:text-muted outline-none"
          autoFocus
          required
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Description */}
      <textarea
        id="todo-description-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Add a description (optional)"
        rows={2}
        className="w-full bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 text-sm text-ink dark:text-neutral-200 placeholder:text-muted outline-none resize-none border border-border dark:border-neutral-700 focus:ring-2 focus:ring-indigo-500/40"
      />

      {/* Priority + Due Date */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Priority */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-1">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              id={`priority-${p.value}`}
              onClick={() => setPriority(p.value)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                priority === p.value
                  ? "bg-white dark:bg-neutral-700 shadow-sm " + p.color
                  : "text-muted hover:" + p.color
              )}
            >
              <Flag size={11} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Due Date */}
        <label className="flex items-center gap-1.5 text-sm text-muted cursor-pointer hover:text-ink dark:hover:text-white transition-colors">
          <Calendar size={14} />
          <input
            id="todo-due-date-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-transparent outline-none text-xs text-ink dark:text-white"
          />
        </label>
      </div>

      {/* Submit */}
      <button
        id="todo-submit-btn"
        type="submit"
        disabled={!title.trim() || pending}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={15} />
        {editTodo ? "Save changes" : "Add To-Do"}
      </button>
    </form>
  );
}
