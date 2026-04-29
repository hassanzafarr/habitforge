import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[60] flex items-end sm:items-center sm:justify-center pointer-events-none overflow-y-auto overscroll-contain"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <div className="pointer-events-auto w-full sm:max-w-md max-h-[100dvh] sm:max-h-[90dvh] sm:m-4 flex flex-col rounded-t-2xl sm:rounded-xl border border-border bg-white shadow-xl dark:bg-neutral-900 dark:border-neutral-800">
              {title && (
                <div className="shrink-0 border-b border-border px-5 py-4 text-sm font-semibold dark:border-neutral-800">
                  {title}
                </div>
              )}
              <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
