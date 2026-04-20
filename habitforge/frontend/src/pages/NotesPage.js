import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { NotebookPen, Plus, Search, SortAsc, SortDesc, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, qk } from "@/lib/api";
import { NoteCard } from "@/features/notes/NoteCard";
import { NoteEditor } from "@/features/notes/NoteEditor";
import { Skeleton } from "@/components/ui/Skeleton";
function NotesSkeleton() {
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "rounded-xl border border-border bg-white dark:bg-neutral-900 p-4 space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-full" }), _jsx(Skeleton, { className: "h-3 w-2/3" })] }, i))) }));
}
export function NotesPage() {
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activeTag, setActiveTag] = useState(null);
    const [sortKey, setSortKey] = useState("updated");
    const [sortAsc, setSortAsc] = useState(false);
    const searchRef = useRef(null);
    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);
    // Keyboard shortcut: Ctrl+Shift+N → open new note
    useEffect(() => {
        function handler(e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
                e.preventDefault();
                openNew();
            }
            if (e.key === "/" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        }
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);
    const queryParams = useMemo(() => ({
        q: debouncedSearch || undefined,
        tag: activeTag || undefined,
    }), [debouncedSearch, activeTag]);
    const { data: notes = [], isLoading } = useQuery({
        queryKey: qk.notes(queryParams),
        queryFn: () => api.listNotes(queryParams),
        staleTime: 15_000,
    });
    // Collect all unique tags from notes
    const allTags = useMemo(() => {
        const tagSet = new Set();
        notes.forEach((n) => n.tags?.forEach((t) => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [notes]);
    // Client-side sort (server already handles pinned-first + updated_at desc as default)
    const sorted = useMemo(() => {
        const arr = [...notes];
        arr.sort((a, b) => {
            // Pinned always floats first
            if (a.pinned !== b.pinned)
                return a.pinned ? -1 : 1;
            let cmp = 0;
            if (sortKey === "updated")
                cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            else if (sortKey === "created")
                cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            else
                cmp = a.title.localeCompare(b.title);
            return sortAsc ? cmp : -cmp;
        });
        return arr;
    }, [notes, sortKey, sortAsc]);
    const pinned = sorted.filter((n) => n.pinned);
    const unpinned = sorted.filter((n) => !n.pinned);
    function openNew() {
        setEditingNote(null);
        setEditorOpen(true);
    }
    function openEdit(note) {
        setEditingNote(note);
        setEditorOpen(true);
    }
    function closeEditor() {
        setEditorOpen(false);
        setEditingNote(null);
    }
    function toggleSort(key) {
        if (sortKey === key)
            setSortAsc((a) => !a);
        else {
            setSortKey(key);
            setSortAsc(false);
        }
    }
    return (_jsxs("div", { className: "mx-auto max-w-6xl px-4 py-6 space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/40", children: _jsx(NotebookPen, { size: 18, className: "text-indigo-600 dark:text-indigo-400" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-bold text-ink dark:text-white leading-tight", children: "Notes" }), _jsxs("p", { className: "text-xs text-muted", children: [notes.length, " ", notes.length === 1 ? "note" : "notes"] })] })] }), _jsxs("button", { onClick: openNew, className: "flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm", children: [_jsx(Plus, { size: 16, strokeWidth: 2.5 }), _jsx("span", { className: "hidden sm:inline", children: "New Note" })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "relative flex-1 min-w-[200px]", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" }), _jsx("input", { ref: searchRef, type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search notes\u2026 (/)", className: "w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-border bg-white dark:bg-neutral-900 dark:border-neutral-700 text-ink dark:text-white placeholder:text-muted outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow" }), search && (_jsx("button", { onClick: () => setSearch(""), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors", children: _jsx(X, { size: 13 }) }))] }), _jsx("div", { className: "flex items-center gap-1 rounded-lg border border-border dark:border-neutral-700 overflow-hidden text-xs bg-white dark:bg-neutral-900", children: ["updated", "created", "title"].map((k) => (_jsxs("button", { onClick: () => toggleSort(k), className: cn("px-2.5 py-2 flex items-center gap-1 transition-colors font-medium capitalize", sortKey === k
                                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                                : "text-muted hover:text-ink dark:hover:text-white"), children: [k, sortKey === k && (sortAsc ? _jsx(SortAsc, { size: 11 }) : _jsx(SortDesc, { size: 11 }))] }, k))) })] }), allTags.length > 0 && (_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("button", { onClick: () => setActiveTag(null), className: cn("text-xs px-2.5 py-1 rounded-full border transition-colors font-medium", activeTag === null
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-border dark:border-neutral-700 text-muted hover:text-ink dark:hover:text-white"), children: "All" }), allTags.map((tag) => (_jsxs("button", { onClick: () => setActiveTag(activeTag === tag ? null : tag), className: cn("text-xs px-2.5 py-1 rounded-full border transition-colors font-medium", activeTag === tag
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-border dark:border-neutral-700 text-muted hover:text-ink dark:hover:text-white"), children: ["#", tag] }, tag)))] })), isLoading ? (_jsx(NotesSkeleton, {})) : sorted.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4", children: _jsx(NotebookPen, { size: 28, className: "text-neutral-400" }) }), _jsx("h3", { className: "text-base font-semibold text-ink dark:text-white mb-1", children: search || activeTag ? "No notes found" : "Your notebook is empty" }), _jsx("p", { className: "text-sm text-muted mb-4 max-w-xs", children: search || activeTag
                            ? "Try adjusting your search or filters."
                            : "Capture thoughts, reflections, and ideas alongside your habits." }), !search && !activeTag && (_jsx("button", { onClick: openNew, className: "px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors", children: "Capture your first thought" }))] })) : (_jsxs("div", { className: "space-y-5", children: [pinned.length > 0 && (_jsxs("section", { children: [_jsxs("h2", { className: "flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-2.5", children: [_jsx(Pin, { size: 11 }), " Pinned"] }), _jsx(AnimatePresence, { mode: "popLayout", children: _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: pinned.map((note) => (_jsx(NoteCard, { note: note, onEdit: openEdit }, note.id))) }) })] })), unpinned.length > 0 && (_jsxs("section", { children: [pinned.length > 0 && (_jsx("h2", { className: "text-xs font-semibold text-muted uppercase tracking-wider mb-2.5", children: "All Notes" })), _jsx(AnimatePresence, { mode: "popLayout", children: _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3", children: unpinned.map((note) => (_jsx(NoteCard, { note: note, onEdit: openEdit }, note.id))) }) })] }))] })), _jsx(motion.button, { onClick: openNew, whileTap: { scale: 0.93 }, className: "md:hidden fixed bottom-20 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/40", "aria-label": "New note", children: _jsx(Plus, { size: 24, strokeWidth: 2.5 }) }), _jsx(AnimatePresence, { children: editorOpen && (_jsx(NoteEditor, { note: editingNote, onClose: closeEditor }, editingNote?.id ?? "new")) })] }));
}
