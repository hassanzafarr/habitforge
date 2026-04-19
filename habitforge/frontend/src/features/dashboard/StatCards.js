import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
function StatCard({ label, value, sub, icon }) {
    return (_jsxs(Card, { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-medium text-muted uppercase tracking-wider", children: label }), _jsx("span", { className: "text-xl", children: icon })] }), _jsx("p", { className: "text-3xl font-bold tracking-tight text-ink dark:text-white", children: value }), sub && _jsx("p", { className: "text-xs text-muted", children: sub })] }));
}
export function StatCards() {
    const { data, isLoading } = useQuery({
        queryKey: qk.summary(),
        queryFn: api.summary,
        refetchInterval: 30_000,
    });
    if (isLoading) {
        return (_jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [1, 2, 3, 4].map((i) => _jsx(SkeletonCard, {}, i)) }));
    }
    if (!data)
        return null;
    const pct = Math.round(data.weeklyCompletionRate * 100);
    return (_jsxs("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [_jsx(StatCard, { label: "Today", value: `${data.completedToday}/${data.dueToday}`, sub: "habits completed", icon: "\u2705" }), _jsx(StatCard, { label: "This week", value: `${pct}%`, sub: "completion rate", icon: "\uD83D\uDCCA" }), _jsx(StatCard, { label: "Best streak", value: `${data.overallLongestStreak}d`, sub: data.overallCurrentStreak > 0 ? `${data.overallCurrentStreak}d current` : "no active streak", icon: "\uD83D\uDD25" }), _jsx(StatCard, { label: "Habits", value: data.totalHabits, sub: "active habits", icon: "\uD83C\uDFAF" })] }));
}
