import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function Badge({ children, className, style }) {
    return (_jsx("span", { style: style, className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className), children: children }));
}
