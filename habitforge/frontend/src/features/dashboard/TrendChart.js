import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, } from "recharts";
import { format, parseISO } from "date-fns";
import { api, qk } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "rounded-lg border border-border bg-white px-3 py-2 shadow-sm dark:bg-neutral-900 dark:border-neutral-700", children: [_jsx("p", { className: "text-xs text-muted", children: label }), _jsxs("p", { className: "text-sm font-bold text-ink dark:text-white", children: [Math.round((payload[0].value ?? 0) * 100), "%"] })] }));
}
export function TrendChart() {
    const { data: summary, isLoading } = useQuery({
        queryKey: qk.summary(),
        queryFn: api.summary,
    });
    if (isLoading)
        return _jsx(Skeleton, { className: "h-48 w-full rounded-xl" });
    if (!summary?.last30DaysTrend?.length)
        return null;
    const chartData = summary.last30DaysTrend.map((p) => ({
        date: format(parseISO(p.date), "MMM d"),
        rate: p.rate,
    }));
    return (_jsxs("div", { className: "rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800", children: [_jsx("p", { className: "mb-4 text-xs font-medium text-muted uppercase tracking-wider", children: "30-day completion trend" }), _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(AreaChart, { data: chartData, margin: { top: 4, right: 4, left: -32, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "trendGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#6366f1", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#6366f1", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--tw-prose-hr, #e7e5e4)", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "#78716c" }, tickLine: false, axisLine: false, interval: 6 }), _jsx(YAxis, { domain: [0, 1], tick: { fontSize: 10, fill: "#78716c" }, tickLine: false, axisLine: false, tickFormatter: (v) => `${Math.round(v * 100)}%` }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "rate", stroke: "#6366f1", strokeWidth: 2, fill: "url(#trendGrad)", dot: false })] }) })] }));
}
