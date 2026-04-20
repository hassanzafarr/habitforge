import {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from "react";
import { marked } from "marked";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Bold, Italic, List, Hash, Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, qk } from "@/lib/api";
import type { Note, NoteCreate } from "@/lib/types";

marked.setOptions({ breaks: true, gfm: true });

const COLORS = [
  { key: null, label: "Default", cls: "bg-neutral-300 dark:bg-neutral-600" },
  { key: "rose", label: "Rose", cls: "bg-rose-400" },
  { key: "amber", label: "Amber", cls: "bg-amber-400" },
  { key: "emerald", label: "Emerald", cls: "bg-emerald-400" },
  { key: "sky", label: "Sky", cls: "bg-sky-400" },
  { key: "violet", label: "Violet", cls: "bg-violet-400" },
] as const;

function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

interface Props {
  note?: Note | null;
  onClose: () => void;
}

export function NoteEditor({ note, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!note;

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tags, setTags] = useState<string[]>(note?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [color, setColor] = useState<string | null>(note?.color ?? null);
  const [showPreview, setShowPreview] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = useRef(false);

  const createMut = useMutation({
    mutationFn: (body: NoteCreate) => api.createNote(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notes() });
      toast.success("Note created");
      onClose();
    },
    onError: () => toast.error("Failed to create note"),
  });

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof api.updateNote>[1]) =>
      api.updateNote(note!.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notes() });
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    },
    onError: () => toast.error("Auto-save failed"),
  });

  // Auto-save for existing notes
  useEffect(() => {
    if (!isEdit || !isDirty.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      updateMut.mutate({ title, content, tags, color });
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, color]);

  // Mark dirty on any change
  const markDirty = () => { isDirty.current = true; };

  // Keyboard shortcuts inside editor
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
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

  function wrapSelection(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const newContent =
      content.slice(0, start) + before + selected + after + content.slice(end);
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
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      updateMut.mutate({ title, content, tags, color });
      qc.invalidateQueries({ queryKey: qk.notes() });
      onClose();
    } else {
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

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
      markDirty();
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    markDirty();
  }

  const previewHtml = marked.parse(content) as string;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-border dark:border-neutral-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border dark:border-neutral-800 shrink-0">
          <input
            autoFocus
            type="text"
            placeholder="Note title…"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
            className="flex-1 text-xl font-semibold bg-transparent outline-none text-ink dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600 mr-4 py-1"
          />
          <div className="flex items-center gap-2">
            {savedIndicator && (
              <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <Check size={12} /> Saved
              </span>
            )}
            <button
              onClick={() => setShowPreview((p) => !p)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showPreview
                  ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30"
                  : "text-muted hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
              aria-label="Toggle preview"
              title="Toggle preview (Ctrl+P)"
            >
              {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close editor"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 shrink-0">
          <button
            onClick={() => wrapSelection("**", "**")}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => wrapSelection("*", "*")}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </button>
          <button
            onClick={() => {
              const ta = textareaRef.current;
              if (!ta) return;
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
            }}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="List item"
          >
            <List size={13} />
          </button>
          <button
            onClick={() => {
              const ta = textareaRef.current;
              if (!ta) return;
              const pos = ta.selectionStart;
              const before = content.slice(0, pos);
              const after = content.slice(pos);
              const newContent = before + (before.endsWith("\n") || before === "" ? "# " : "\n# ") + after;
              setContent(newContent);
              markDirty();
            }}
            className="p-1.5 rounded text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Heading"
          >
            <Hash size={13} />
          </button>
          <div className="w-px h-4 bg-border dark:bg-neutral-700 mx-1" />
          <span className="text-[11px] text-muted ml-auto">
            {wordCount(content)} words · {content.length} chars
          </span>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); markDirty(); }}
            onKeyDown={handleKeyDown}
            placeholder="Start writing… (Markdown supported)"
            className={cn(
              "flex-1 resize-none bg-transparent text-[15px] text-ink dark:text-neutral-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none px-6 py-5 leading-7 font-sans",
              showPreview ? "w-1/2 border-r border-border dark:border-neutral-800" : "w-full"
            )}
            spellCheck
          />
          {/* Preview */}
          {showPreview && (
            <div
              className="flex-1 overflow-y-auto px-6 py-5 text-[15px] text-ink dark:text-neutral-200 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 space-y-3">
          {/* Tags row */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-500 transition-colors ml-0.5"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              placeholder="Add tag…"
              className="text-xs bg-transparent outline-none text-muted placeholder:text-neutral-400 dark:placeholder:text-neutral-600 min-w-[80px]"
            />
          </div>

          {/* Color + actions row */}
          <div className="flex items-center justify-between">
            {/* Color swatches */}
            <div className="flex items-center gap-1.5">
              {COLORS.map(({ key, label, cls }) => (
                <button
                  key={String(key)}
                  onClick={() => { setColor(key); markDirty(); }}
                  aria-label={label}
                  title={label}
                  className={cn(
                    "w-5 h-5 rounded-full transition-transform hover:scale-110",
                    cls,
                    color === key && "ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-neutral-900 scale-110"
                  )}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-sm text-muted hover:text-ink hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
              >
                {isEdit ? "Save & Close" : "Create Note"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
