import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
const VARIANTS = {
    primary: "bg-ink text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
    secondary: "bg-white border border-border text-ink hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800",
    ghost: "text-ink hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
};
const SIZES = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-5 text-base",
};
export const Button = forwardRef(({ className, variant = "primary", size = "md", ...rest }, ref) => (_jsx("button", { ref: ref, className: cn("inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50 disabled:pointer-events-none", VARIANTS[variant], SIZES[size], className), ...rest })));
Button.displayName = "Button";
