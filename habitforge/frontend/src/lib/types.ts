export type FrequencyType = "daily" | "weekly" | "custom_days";
export type CompletionStatus = "done" | "skipped";
export type HabitType = "positive" | "negative";

export interface Habit {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  frequencyType: FrequencyType;
  targetPerWeek: number;
  activeDays: number[];
  habitType: HabitType;
  createdAt: string;
  archivedAt: string | null;
  sortOrder: number;
  completedToday: boolean;
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
  habitType?: HabitType;
}

export type HabitUpdate = Partial<HabitCreate> & { sortOrder?: number };

export type TodoPriority = "low" | "medium" | "high";

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  priority: TodoPriority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface TodoCreate {
  title: string;
  description?: string | null;
  priority?: TodoPriority;
  dueDate?: string | null;
}

export type TodoUpdate = Partial<TodoCreate> & { completed?: boolean };

export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[] | null;
  pinned: boolean;
  color: string | null;
  habitId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreate {
  title: string;
  content?: string;
  tags?: string[] | null;
  pinned?: boolean;
  color?: string | null;
  habitId?: number | null;
}

export type NoteUpdate = Partial<NoteCreate>;

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  expirationTime: number | null;
  keys: PushKeys;
}

export interface PushStatus {
  enabled: boolean;
  count: number;
}

export interface PushPublicKey {
  publicKey: string | null;
}

export interface PushTestNotification {
  title?: string;
  body?: string;
  url?: string;
}
