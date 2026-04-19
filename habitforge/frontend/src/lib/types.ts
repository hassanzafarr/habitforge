export type FrequencyType = "daily" | "weekly" | "custom_days";
export type CompletionStatus = "done" | "skipped";

export interface Habit {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetPerWeek: number;
  activeDays: number[];
  createdAt: string;
  archivedAt: string | null;
  sortOrder: number;
  currentStreak: number;
  longestStreak: number;
  completionRate30d: number;
  totalCompletions: number;
}

export interface Completion {
  id: number;
  habitId: number;
  date: string;
  status: CompletionStatus;
  note: string | null;
  createdAt: string;
}

export interface HeatmapCell {
  date: string;
  count: number;
  total: number;
}

export interface TrendPoint {
  date: string;
  rate: number;
}

export interface DashboardSummary {
  totalHabits: number;
  completedToday: number;
  dueToday: number;
  overallCurrentStreak: number;
  overallLongestStreak: number;
  weeklyCompletionRate: number;
  last30DaysTrend: TrendPoint[];
}

export interface HabitCreate {
  name: string;
  description?: string | null;
  icon?: string;
  color?: string;
  frequencyType?: FrequencyType;
  targetPerWeek?: number;
  activeDays?: number[];
}

export type HabitUpdate = Partial<HabitCreate> & { sortOrder?: number };
