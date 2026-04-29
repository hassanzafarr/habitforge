import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import type { GeneratedTodo } from "@/lib/types";
import { TodoForm } from "@/features/todos/TodoForm";
import { TodoList } from "@/features/todos/TodoList";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "done";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "done", label: "Completed" },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function TodosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);

  // AI prompt modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // AI results modal
  const [generatedTodos, setGeneratedTodos] = useState<GeneratedTodo[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: qk.todos(),
    queryFn: () => api.listTodos(),
  });

  const totalCount = todos.length;
  const doneCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - doneCount;

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const result = await api.generateTodos(aiPrompt.trim());
      setGeneratedTodos(result);
      setShowAiModal(false);
      setAiPrompt("");
      setShowResultsModal(true);
    } catch (err) {
      toast.error("Failed to generate todos. Check your HuggingFace API key.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      await Promise.all(generatedTodos.map((t) => api.createTodo(t)));
      await qc.invalidateQueries({ queryKey: qk.todos() });
      toast.success(`${generatedTodos.length} todos added!`);
      setShowResultsModal(false);
      setGeneratedTodos([]);
    } catch {
      toast.error("Failed to save todos.");
    } finally {
      setSaving(false);
    }
  }

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

        <div className="flex flex-col items-end gap-2">
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
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/30"
          >
            <Sparkles size={15} />
            AI Generate
          </button>
        </div>
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
      {showForm && <TodoForm onClose={() => setShowForm(false)} />}

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

      {/* AI Prompt Modal */}
      <Modal
        open={showAiModal}
        onClose={() => {
          if (generating) return;
          setShowAiModal(false);
          setAiPrompt("");
        }}
        title={
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            Generate todos with AI
          </span>
        }
      >
        <div className="space-y-4">
          <Textarea
            id="ai-prompt"
            label="What do you need to get done?"
            placeholder="e.g. Plan a trip to Tokyo next month, prepare a presentation for Monday..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="min-h-[120px]"
            disabled={generating}
          />
          <button
            onClick={handleGenerate}
            disabled={!aiPrompt.trim() || generating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
          >
            {generating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Generate todos
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* AI Results Modal */}
      <Modal
        open={showResultsModal}
        onClose={() => {
          if (saving) return;
          setShowResultsModal(false);
          setGeneratedTodos([]);
        }}
        title={
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            {generatedTodos.length} todos generated
          </span>
        }
      >
        <div className="space-y-4">
          <ul className="space-y-2">
            {generatedTodos.map((todo, i) => (
              <li
                key={i}
                className="rounded-xl border border-border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-ink dark:text-white leading-snug">
                    {todo.title}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                      PRIORITY_COLOR[todo.priority]
                    )}
                  >
                    {todo.priority}
                  </span>
                </div>
                {todo.description && (
                  <p className="text-xs text-muted leading-snug">{todo.description}</p>
                )}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus size={15} />
                Add all todos
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
