import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Skeleton({ className }) {
    return (_jsx("div", { className: cn("animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800", className) }));
}
export function SkeletonCard() {
    return (_jsxs("div", { className: "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsx(Skeleton, { className: "h-4 w-24 mb-3" }), _jsx(Skeleton, { className: "h-8 w-16" })] }));
}
