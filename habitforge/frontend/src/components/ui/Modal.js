import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
export function Modal({ open, onClose, title, children }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: "fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose }), _jsx(motion.div, { className: "fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none", initial: { opacity: 0, y: 8, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.98 }, transition: { duration: 0.15 }, children: _jsxs("div", { className: "pointer-events-auto w-full max-w-md rounded-xl border border-border bg-white shadow-xl dark:bg-neutral-900 dark:border-neutral-800", children: [title && (_jsx("div", { className: "border-b border-border px-5 py-4 text-sm font-semibold dark:border-neutral-800", children: title })), _jsx("div", { className: "p-5", children: children })] }) })] })) }));
}
