import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from "react";
import { marked } from "marked";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Bold, Italic, List, Hash, Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, qk } from "@/lib/api";
marked.setOptions({ breaks: true, gfm: true });
const COLORS = [
    { key: null, label: "Default", cls: "bg-neutral-300 dark:bg-neutral-600" },
    { key: "rose", label: "Rose", cls: "bg-rose-400" },
    { key: "amber", label: "Amber", cls: "bg-amber-400" },
    { key: "emerald", label: "Emerald", cls: "bg-emerald-400" },
    { key: "sky", label: "Sky", cls: "bg-sky-400" },
    { key: "violet", label: "Violet", cls: "bg-violet-400" },
];
function wordCount(text) {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}
export function NoteEditor({ note, onClose }) {
    const qc = useQueryClient();
    const isEdit = !!note;
    const [title, setTitle] = useState(note?.title ?? "");
    const [content, setContent] = useState(note?.content ?? "");
    const [tags, setTags] = useState(note?.tags ?? []);
    const [tagInput, setTagInput] = useState("");
    const [color, setColor] = useState(note?.color ?? null);
    const [showPreview, setShowPreview] = useState(false);
    const [savedIndicator, setSavedIndicator] = useState(false);
    const textareaRef = useRef(null);
    const autoSaveTimer = useRef(null);
    const isDirty = useRef(false);
    const createMut = useMutation({
        mutationFn: (body) => api.createNote(body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.notes() });
            toast.success("Note created");
            onClose();
        },
        onError: () => toast.error("Failed to create note"),
    });
    const updateMut = useMutation({
        mutationFn: (body) => api.updateNote(note.id, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: qk.notes() });
            setSavedIndicator(true);
            setTimeout(() => setSavedIndicator(false), 2000);
        },
        onError: () => toast.error("Auto-save failed"),
    });
    // Auto-save for existing notes
    useEffect(() => {
        if (!isEdit || !isDirty.current)
            return;
        if (autoSaveTimer.current)
            clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            updateMut.mutate({ title, content, tags, color });
        }, 1500);
        return () => {
            if (autoSaveTimer.current)
                clearTimeout(autoSaveTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, tags, color]);
    // Mark dirty on any change
    const markDirty = () => { isDirty.current = true; };
    // Keyboard shortcuts inside editor
    const handleKeyDown = useCallback((e) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (isMod && e.key === "s") {
            e.preventDefault();
            handleSave();
            return;
        }
        if (isMod && e.key === "b") {
            e.preventDefault();
            wrapSelection("**", "**");
            return;
        }
        if (isMod && e.key === "i") {
            e.preventDefault();
            wrapSelection("*", "*");
            return;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, content, tags, color]);
    function wrapSelection(before, after) {
        const ta = textareaRef.current;
        if (!ta)
            return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = content.slice(start, end);
        const newContent = content.slice(0, start) + before + selected + after + content.slice(end);
        setContent(newContent);
        markDirty();
        requestAnimationFrame(() => {
            ta.focus();
            ta.setSelectionRange(start + before.length, end + before.length);
        });
    }
    function handleSave() {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }
        if (isEdit) {
            if (autoSaveTimer.current)
                clearTimeout(autoSaveTimer.current);
            updateMut.mutate({ title, content, tags, color });
            qc.invalidateQueries({ queryKey: qk.notes() });
            onClose();
        }
        else {
            createMut.mutate({ title, content, tags, color });
        }
    }
    function handleAddTag() {
        const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
        if (t && !tags.includes(t)) {
            const next = [...tags, t];
            setTags(next);
            markDirty();
        }
        setTagInput("");
    }
    function handleTagKeyDown(e) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            handleAddTag();
        }
        if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
            setTags(tags.slice(0, -1));
            markDirty();
        }
    }
    function removeTag(tag) {
        setTags(tags.filter((t) => t !== tag));
        markDirty();
    }
    const previewHtml = marked.parse(content);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-border dark:border-neutral-700 overflow-hidden", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-6 pt-5 pb-4 border-b border-border dark:border-neutral-800 shrink-0", children: [_jsx("input", { autoFocus: true, type: "text", placeholder: "Note title\u2026", value: title, onChange: (e) => { setTitle(e.target.value); markDirty(); }, className: "flex-1 text-xl font-semibold bg-transparent outline-none text-ink dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 mr-4 py-1" }), _jsxs("div", { className: "flex items-center gap-2", children: [savedIndicator && (_jsxs("span", { className: "flex items-center gap-1 text-xs text-emerald-500 font-medium", children: [_jsx(Check, { size: 12 }), " Saved"] })), _jsx("button", { onClick: () => setShowPreview((p) => !p), className: cn("p-1.5 rounded-md transition-colors", showPreview
                                        ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                                        : "text-muted hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800"), "aria-label": "Toggle preview", title: "Toggle preview (Ctrl+P)", children: showPreview ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors", "aria-label": "Close editor", children: _jsx(X, { size: 16 }) })] })] }), _jsxs("div", { className: "flex items-center gap-1 px-4 py-1.5 border-b border-border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 shrink-0", children: [_jsx("button", { onClick: () => wrapSelection("**", "**"), className: "p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Bold (Ctrl+B)", children: _jsx(Bold, { size: 13 }) }), _jsx("button", { onClick: () => wrapSelection("*", "*"), className: "p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Italic (Ctrl+I)", children: _jsx(Italic, { size: 13 }) }), _jsx("button", { onClick: () => {
                                const ta = textareaRef.current;
                                if (!ta)
                                    return;
                                const pos = ta.selectionStart;
                                const before = content.slice(0, pos);
                                const after = content.slice(pos);
                                const newContent = before + (before.endsWith("\n") || before === "" ? "- " : "\n- ") + after;
                                setContent(newContent);
                                markDirty();
                                requestAnimationFrame(() => {
                                    ta.focus();
                                    const newPos = pos + (before.endsWith("\n") || before === "" ? 2 : 3);
                                    ta.setSelectionRange(newPos, newPos);
                                });
                            }, className: "p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "List item", children: _jsx(List, { size: 13 }) }), _jsx("button", { onClick: () => {
                                const ta = textareaRef.current;
                                if (!ta)
                                    return;
                                const pos = ta.selectionStart;
                                const before = content.slice(0, pos);
                                const after = content.slice(pos);
                                const newContent = before + (before.endsWith("\n") || before === "" ? "# " : "\n# ") + after;
                                setContent(newContent);
                                markDirty();
                            }, className: "p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors", title: "Heading", children: _jsx(Hash, { size: 13 }) }), _jsx("div", { className: "w-px h-4 bg-border dark:bg-neutral-700 mx-1" }), _jsxs("span", { className: "text-[11px] text-muted ml-auto", children: [wordCount(content), " words \u00B7 ", content.length, " chars"] })] }), _jsxs("div", { className: "flex-1 min-h-0 flex overflow-hidden", children: [_jsx("textarea", { ref: textareaRef, value: content, onChange: (e) => { setContent(e.target.value); markDirty(); }, onKeyDown: handleKeyDown, placeholder: "Start writing\u2026 (Markdown supported)", className: cn("flex-1 resize-none bg-transparent text-[15px] text-ink dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none px-6 py-5 leading-7 font-sans", showPreview ? "w-1/2 border-r border-border dark:border-neutral-800" : "w-full"), spellCheck: true }), showPreview && (_jsx("div", { className: "flex-1 overflow-y-auto px-6 py-5 text-[15px] text-ink dark:text-neutral-200 prose prose-sm dark:prose-invert max-w-none", dangerouslySetInnerHTML: { __html: previewHtml } }))] }), _jsxs("div", { className: "shrink-0 px-4 py-3 border-t border-border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 space-y-3", children: [_jsxs("div", { className: "flex items-center flex-wrap gap-1.5", children: [tags.map((tag) => (_jsxs("span", { className: "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium", children: ["#", tag, _jsx("button", { onClick: () => removeTag(tag), className: "hover:text-red-500 transition-colors ml-0.5", "aria-label": `Remove tag ${tag}`, children: _jsx(X, { size: 10 }) })] }, tag))), _jsx("input", { type: "text", value: tagInput, onChange: (e) => setTagInput(e.target.value), onKeyDown: handleTagKeyDown, onBlur: handleAddTag, placeholder: "Add tag\u2026", className: "text-xs bg-transparent outline-none text-muted placeholder:text-neutral-400 dark:placeholder:text-neutral-600 min-w-[80px]" })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex items-center gap-1.5", children: COLORS.map(({ key, label, cls }) => (_jsx("button", { onClick: () => { setColor(key); markDirty(); }, "aria-label": label, title: label, className: cn("w-5 h-5 rounded-full transition-transform hover:scale-110", cls, color === key && "ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-neutral-900 scale-110") }, String(key)))) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-1.5 rounded-lg text-sm text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium", children: "Cancel" }), _jsx("button", { onClick: handleSave, disabled: createMut.isPending || updateMut.isPending, className: "px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60", children: isEdit ? "Save & Close" : "Create Note" })] })] })] })] }) }));
}
