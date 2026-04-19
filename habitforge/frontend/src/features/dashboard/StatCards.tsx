import { useQuery } from "@tanstack/react-query";
import { api, qk } from "@/lib/api";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-ink dark:text-white">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function StatCards() {
  const { data, isLoading } = useQuery({
    queryKey: qk.summary(),
    queryFn: api.summary,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  const pct = Math.round(data.weeklyCompletionRate * 100);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        label="Today"
        value={`${data.completedToday}/${data.dueToday}`}
        sub="habits completed"
        icon="✅"
      />
      <StatCard
        label="This week"
        value={`${pct}%`}
        sub="completion rate"
        icon="📊"
      />
      <StatCard
        label="Best streak"
        value={`${data.overallLongestStreak}d`}
        sub={data.overallCurrentStreak > 0 ? `${data.overallCurrentStreak}d current` : "no active streak"}
        icon="🔥"
      />
      <StatCard
        label="Habits"
        value={data.totalHabits}
        sub="active habits"
        icon="🎯"
      />
    </div>
  );
}
