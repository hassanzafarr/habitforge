import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { motion } from "framer-motion";
import { Pin, PinOff, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, qk } from "@/lib/api";
const COLOR_BORDER = {
    rose: "border-l-rose-400",
    amber: "border-l-amber-400",
    emerald: "border-l-emerald-400",
    sky: "border-l-sky-400",
    violet: "border-l-violet-400",
};
function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)
        return "just now";
    if (mins < 60)
        return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return "Yesterday";
    if (days < 7)
        return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function stripMarkdown(text) {
    return text
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/\n+/g, " ")
        .trim();
}
export function NoteCard({ note, onEdit }) {
    const qc = useQueryClient();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const pinMut = useMutation({
        mutationFn: () => api.updateNote(note.id, { pinned: !note.pinned }),
        onSuccess: () => qc.invalidateQueries({ queryKey: qk.notes() }),
        onError: () => toast.error("Failed to update pin"),
    });
    const deleteMut = useMutation({
        mutationFn: () => api.deleteNote(note.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.notes() });
            toast.success("Note deleted");
        },
        onError: () => toast.error("Failed to delete note"),
    });
    const borderColor = note.color ? COLOR_BORDER[note.color] : null;
    const preview = stripMarkdown(note.content).slice(0, 180);
    return (_jsxs(motion.div, { layout: true, initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, scale: 0.96 }, transition: { duration: 0.18 }, className: cn("group relative rounded-xl border border-border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 cursor-pointer", "hover:shadow-md transition-shadow border-l-4", borderColor ?? "border-l-transparent", note.pinned && "ring-1 ring-amber-400/40"), onClick: () => onEdit(note), children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); pinMut.mutate(); }, "aria-label": note.pinned ? "Unpin note" : "Pin note", className: cn("absolute top-3 right-3 p-1 rounded-md transition-colors", note.pinned
                    ? "text-amber-400 hover:text-amber-500"
                    : "text-transparent group-hover:text-neutral-300 dark:group-hover:text-neutral-600 hover:!text-amber-400"), children: note.pinned ? _jsx(Pin, { size: 14, fill: "currentColor" }) : _jsx(PinOff, { size: 14 }) }), _jsx("h3", { className: "font-semibold text-sm text-ink dark:text-white pr-6 line-clamp-1 mb-1", children: note.title }), preview && (_jsx("p", { className: "text-xs text-muted line-clamp-2 leading-relaxed mb-3", children: preview })), note.tags && note.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-2", children: note.tags.map((tag) => (_jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium", children: ["#", tag] }, tag))) })), _jsxs("div", { className: "flex items-center justify-between mt-1", children: [_jsx("span", { className: "text-[10px] text-muted", children: relativeTime(note.updatedAt) }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { onClick: () => onEdit(note), className: "p-1 rounded-md text-muted hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors", "aria-label": "Edit note", children: _jsx(Pencil, { size: 13 }) }), confirmDelete ? (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => deleteMut.mutate(), className: "text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors", children: "Delete" }), _jsx("button", { onClick: () => setConfirmDelete(false), className: "text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-ink dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors", children: "Cancel" })] })) : (_jsx("button", { onClick: () => setConfirmDelete(true), className: "p-1 rounded-md text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", "aria-label": "Delete note", children: _jsx(Trash2, { size: 13 }) }))] })] })] }));
}
