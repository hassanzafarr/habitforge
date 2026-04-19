import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Card({ className, children, onClick }) {
    return (_jsx("div", { onClick: onClick, className: cn("rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", onClick && "cursor-pointer hover:shadow-md transition-shadow", className), children: children }));
}
