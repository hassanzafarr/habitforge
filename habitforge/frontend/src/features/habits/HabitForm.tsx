import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, qk } from "@/lib/api";
import type { Habit, HabitCreate, FrequencyType } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// --- Preset colors ---
const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

// --- Preset emojis ---
const PRESET_EMOJIS = ["🎯", "💪", "📚", "🏃", "🧘", "💧", "🌿", "🎵", "✍️", "🔥", "⭐", "🎨"];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  open: boolean;
  onClose: () => void;
  habit?: Habit; // if provided → edit mode
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetPerWeek: number;
  activeDays: number[];
}

const DEFAULT: FormState = {
  name: "",
  description: "",
  icon: "🎯",
  color: "#6366f1",
  frequencyType: "daily",
  targetPerWeek: 3,
  activeDays: [1, 3, 5],
};

function toFormState(h?: Habit): FormState {
  if (!h) return DEFAULT;
  return {
    name: h.name,
    description: h.description ?? "",
    icon: h.icon,
    color: h.color,
    frequencyType: h.frequencyType,
    targetPerWeek: h.targetPerWeek,
    activeDays: h.activeDays,
  };
}

export function HabitForm({ open, onClose, habit }: Props) {
  const qc = useQueryClient();
  const isEdit = !!habit;

  const [form, setForm] = useState<FormState>(() => toFormState(habit));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) setForm(toFormState(habit));
  }, [open, habit]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.name.length > 60) e.name = "Max 60 characters";
    if (form.description.length > 280) e.description = "Max 280 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMut = useMutation({
    mutationFn: (body: HabitCreate) => api.createHabit(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits() });
      qc.invalidateQueries({ queryKey: qk.summary() });
      toast.success("Habit created!");
      onClose();
    },
    onError: (err) => toast.error(String(err)),
  });

  const updateMut = useMutation({
    mutationFn: (body: HabitCreate) => api.updateHabit(habit!.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.habits() });
      qc.invalidateQueries({ queryKey: qk.habit(habit!.id) });
      qc.invalidateQueries({ queryKey: qk.summary() });
      toast.success("Habit updated!");
      onClose();
    },
    onError: (err) => toast.error(String(err)),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const submit = () => {
    if (!validate()) return;
    const body: HabitCreate = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      color: form.color,
      frequencyType: form.frequencyType,
      targetPerWeek: form.targetPerWeek,
      activeDays: form.frequencyType === "custom_days" ? form.activeDays : [],
    };
    isEdit ? updateMut.mutate(body) : createMut.mutate(body);
  };

  const toggleDay = (d: number) =>
    set("activeDays", form.activeDays.includes(d)
      ? form.activeDays.filter((x) => x !== d)
      : [...form.activeDays, d].sort());

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Habit" : "New Habit"}>
      <div className="flex flex-col gap-4">
        {/* Preview pill */}
        <div className="flex items-center gap-3 rounded-lg border border-border p-3 dark:border-neutral-700">
          <span className="text-2xl">{form.icon}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: form.color }}
          >
            {form.name || "Habit name"}
          </span>
        </div>

        {/* Emoji row */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Icon</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => set("icon", e)}
                className={cn(
                  "h-9 w-9 rounded-md text-lg transition-all",
                  form.icon === e
                    ? "ring-2 ring-ink dark:ring-white bg-neutral-100 dark:bg-neutral-800"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color row */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Color</p>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                style={{ background: c }}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform",
                  form.color === c ? "ring-2 ring-offset-2 ring-ink dark:ring-white scale-110" : "hover:scale-105"
                )}
              />
            ))}
            {/* Custom color */}
            <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-xs text-muted hover:border-ink transition-colors dark:border-neutral-600">
              <input
                type="color"
                className="sr-only"
                value={form.color}
                onChange={(e) => set("color", e.target.value)}
              />
              +
            </label>
          </div>
        </div>

        <Input
          id="hf-name"
          label="Name *"
          placeholder="e.g. Morning run"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
          maxLength={60}
        />

        <Textarea
          id="hf-desc"
          label="Description"
          placeholder="Optional notes…"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          error={errors.description}
          maxLength={280}
        />

        {/* Frequency */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Frequency</p>
          <div className="flex flex-col gap-2">
            {(["daily", "weekly", "custom_days"] as FrequencyType[]).map((ft) => (
              <label key={ft} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="freq"
                  checked={form.frequencyType === ft}
                  onChange={() => set("frequencyType", ft)}
                  className="accent-ink"
                />
                <span className="text-sm">
                  {ft === "daily" && "Every day"}
                  {ft === "weekly" && "X times per week"}
                  {ft === "custom_days" && "Specific days"}
                </span>
              </label>
            ))}
          </div>

          {form.frequencyType === "weekly" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={7}
                value={form.targetPerWeek}
                onChange={(e) => set("targetPerWeek", Number(e.target.value))}
                className="w-16 h-8 rounded-md border border-border px-2 text-sm dark:bg-neutral-900 dark:border-neutral-700"
              />
              <span className="text-sm text-muted">times per week</span>
            </div>
          )}

          {form.frequencyType === "custom_days" && (
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "h-8 w-10 rounded-md text-xs font-medium transition-all",
                    form.activeDays.includes(i)
                      ? "bg-ink text-white dark:bg-white dark:text-neutral-900"
                      : "border border-border text-muted hover:border-ink dark:border-neutral-700"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Create habit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
