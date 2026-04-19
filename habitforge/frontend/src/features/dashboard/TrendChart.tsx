import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { api, qk } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-sm dark:bg-neutral-900 dark:border-neutral-700">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-bold text-ink dark:text-white">
        {Math.round((payload[0].value ?? 0) * 100)}%
      </p>
    </div>
  );
}

export function TrendChart() {
  const { data: summary, isLoading } = useQuery({
    queryKey: qk.summary(),
    queryFn: api.summary,
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!summary?.last30DaysTrend?.length) return null;

  const chartData = summary.last30DaysTrend.map((p) => ({
    date: format(parseISO(p.date), "MMM d"),
    rate: p.rate,
  }));

  return (
    <div className="rounded-xl border border-border bg-white p-5 dark:bg-neutral-900 dark:border-neutral-800">
      <p className="mb-4 text-xs font-medium text-muted uppercase tracking-wider">
        30-day completion trend
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tw-prose-hr, #e7e5e4)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#trendGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
