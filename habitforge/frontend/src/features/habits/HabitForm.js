import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { api, qk } from "@/lib/api";
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
const DEFAULT = {
    name: "",
    description: "",
    icon: "🎯",
    color: "#6366f1",
    frequencyType: "daily",
    targetPerWeek: 3,
    activeDays: [1, 3, 5],
    habitType: "positive",
};
function toFormState(h) {
    if (!h)
        return DEFAULT;
    return {
        name: h.name,
        description: h.description ?? "",
        icon: h.icon,
        color: h.color,
        frequencyType: h.frequencyType,
        targetPerWeek: h.targetPerWeek,
        activeDays: h.activeDays,
        habitType: h.habitType ?? "positive",
    };
}
export function HabitForm({ open, onClose, habit }) {
    const qc = useQueryClient();
    const isEdit = !!habit;
    const [form, setForm] = useState(() => toFormState(habit));
    const [errors, setErrors] = useState({});
    useEffect(() => {
        if (open)
            setForm(toFormState(habit));
    }, [open, habit]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const validate = () => {
        const e = {};
        if (!form.name.trim())
            e.name = "Name is required";
        if (form.name.length > 60)
            e.name = "Max 60 characters";
        if (form.description.length > 280)
            e.description = "Max 280 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const createMut = useMutation({
        mutationFn: (body) => api.createHabit(body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.habits() });
            qc.invalidateQueries({ queryKey: qk.summary() });
            toast.success("Habit created!");
            onClose();
        },
        onError: (err) => toast.error(String(err)),
    });
    const updateMut = useMutation({
        mutationFn: (body) => api.updateHabit(habit.id, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.habits() });
            qc.invalidateQueries({ queryKey: qk.habit(habit.id) });
            qc.invalidateQueries({ queryKey: qk.summary() });
            toast.success("Habit updated!");
            onClose();
        },
        onError: (err) => toast.error(String(err)),
    });
    const isPending = createMut.isPending || updateMut.isPending;
    const submit = () => {
        if (!validate())
            return;
        const body = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            icon: form.icon,
            color: form.color,
            frequencyType: form.frequencyType,
            targetPerWeek: form.targetPerWeek,
            activeDays: form.frequencyType === "custom_days" ? form.activeDays : [],
            habitType: form.habitType,
        };
        isEdit ? updateMut.mutate(body) : createMut.mutate(body);
    };
    const toggleDay = (d) => set("activeDays", form.activeDays.includes(d)
        ? form.activeDays.filter((x) => x !== d)
        : [...form.activeDays, d].sort());
    return (_jsx(Modal, { open: open, onClose: onClose, title: isEdit ? "Edit Habit" : "New Habit", children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-border p-3 dark:border-neutral-700", children: [_jsx("span", { className: "text-2xl", children: form.icon }), _jsx("span", { className: "text-sm font-semibold", style: { color: form.color }, children: form.name || "Habit name" }), form.habitType === "negative" && (_jsx("span", { className: "ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400", children: "break" }))] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-muted", children: "Habit type" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { type: "button", onClick: () => set("habitType", "positive"), className: cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all", form.habitType === "positive"
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                        : "border-border text-muted hover:border-ink dark:border-neutral-700"), children: [_jsx(CheckCircle2, { size: 15 }), " Build habit"] }), _jsxs("button", { type: "button", onClick: () => set("habitType", "negative"), className: cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-all", form.habitType === "negative"
                                        ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400"
                                        : "border-border text-muted hover:border-ink dark:border-neutral-700"), children: [_jsx(XCircle, { size: 15 }), " Break habit"] })] })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-muted", children: "Icon" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: PRESET_EMOJIS.map((e) => (_jsx("button", { type: "button", onClick: () => set("icon", e), className: cn("h-9 w-9 rounded-md text-lg transition-all", form.icon === e
                                    ? "ring-2 ring-ink dark:ring-white bg-neutral-100 dark:bg-neutral-800"
                                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800"), children: e }, e))) })] }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-muted", children: "Color" }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [PRESET_COLORS.map((c) => (_jsx("button", { type: "button", onClick: () => set("color", c), style: { background: c }, className: cn("h-7 w-7 rounded-full transition-transform", form.color === c ? "ring-2 ring-offset-2 ring-ink dark:ring-white scale-110" : "hover:scale-105") }, c))), _jsxs("label", { className: "flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-xs text-muted hover:border-ink transition-colors dark:border-neutral-600", children: [_jsx("input", { type: "color", className: "sr-only", value: form.color, onChange: (e) => set("color", e.target.value) }), "+"] })] })] }), _jsx(Input, { id: "hf-name", label: "Name *", placeholder: "e.g. Morning run", value: form.name, onChange: (e) => set("name", e.target.value), error: errors.name, maxLength: 60 }), _jsx(Textarea, { id: "hf-desc", label: "Description", placeholder: "Optional notes\u2026", value: form.description, onChange: (e) => set("description", e.target.value), error: errors.description, maxLength: 280 }), _jsxs("div", { children: [_jsx("p", { className: "mb-1.5 text-xs font-medium text-muted", children: "Frequency" }), _jsx("div", { className: "flex flex-col gap-2", children: ["daily", "weekly", "custom_days"].map((ft) => (_jsxs("label", { className: "flex cursor-pointer items-center gap-2", children: [_jsx("input", { type: "radio", name: "freq", checked: form.frequencyType === ft, onChange: () => set("frequencyType", ft), className: "accent-ink" }), _jsxs("span", { className: "text-sm", children: [ft === "daily" && "Every day", ft === "weekly" && "X times per week", ft === "custom_days" && "Specific days"] })] }, ft))) }), form.frequencyType === "weekly" && (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("input", { type: "number", min: 1, max: 7, value: form.targetPerWeek, onChange: (e) => set("targetPerWeek", Number(e.target.value)), className: "w-16 h-8 rounded-md border border-border px-2 text-sm dark:bg-neutral-900 dark:border-neutral-700" }), _jsx("span", { className: "text-sm text-muted", children: "times per week" })] })), form.frequencyType === "custom_days" && (_jsx("div", { className: "mt-2 flex gap-1.5 flex-wrap", children: DAYS.map((d, i) => (_jsx("button", { type: "button", onClick: () => toggleDay(i), className: cn("h-8 w-10 rounded-md text-xs font-medium transition-all", form.activeDays.includes(i)
                                    ? "bg-ink text-white dark:bg-white dark:text-neutral-900"
                                    : "border border-border text-muted hover:border-ink dark:border-neutral-700"), children: d }, d))) }))] }), _jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [_jsx(Button, { variant: "secondary", onClick: onClose, disabled: isPending, children: "Cancel" }), _jsx(Button, { onClick: submit, disabled: isPending, children: isPending ? "Saving…" : isEdit ? "Save changes" : "Create habit" })] })] }) }));
}
