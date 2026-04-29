import type {
  Completion,
  CompletionStatus,
  DashboardSummary,
  GeneratedTodo,
  Habit,
  HabitCreate,
  HabitUpdate,
  HeatmapCell,
  Note,
  NoteCreate,
  NoteUpdate,
  Todo,
  TodoCreate,
  PushStatus,
  PushPublicKey,
  PushSubscriptionPayload,
  PushTestNotification,
  TodoUpdate,
} from "./types";

const BASE = import.meta.env.VITE_API_URL || "/api";

type TokenGetter = () => Promise<string | null>;
let getAuthToken: TokenGetter = async () => null;

export function setAuthTokenGetter(getter: TokenGetter) {
  getAuthToken = getter;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  listHabits: (includeArchived = false) =>
    req<Habit[]>(`/habits${includeArchived ? "?include_archived=true" : ""}`),
  getHabit: (id: number) => req<Habit>(`/habits/${id}`),
  createHabit: (body: HabitCreate) =>
    req<Habit>("/habits", { method: "POST", body: JSON.stringify(body) }),
  updateHabit: (id: number, body: HabitUpdate) =>
    req<Habit>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveHabit: (id: number) =>
    req<void>(`/habits/${id}`, { method: "DELETE" }),
  restoreHabit: (id: number) =>
    req<Habit>(`/habits/${id}/restore`, { method: "POST" }),
  reorderHabits: (items: { id: number; sortOrder: number }[]) =>
    req<Habit[]>(`/habits/reorder`, {
      method: "POST",
      body: JSON.stringify(items),
    }),

  upsertCompletion: (
    habitId: number,
    date: string,
    status: CompletionStatus = "done",
    note?: string | null
  ) =>
    req<Completion>(`/habits/${habitId}/completions`, {
      method: "POST",
      body: JSON.stringify({ date, status, note: note ?? null }),
    }),
  deleteCompletion: (habitId: number, date: string) =>
    req<void>(`/habits/${habitId}/completions/${date}`, { method: "DELETE" }),
  listCompletions: (habitId: number, from: string, to: string) =>
    req<Completion[]>(`/habits/${habitId}/completions?from=${from}&to=${to}`),

  heatmap: (from: string, to: string) =>
    req<HeatmapCell[]>(`/completions/heatmap?from=${from}&to=${to}`),
  summary: () => req<DashboardSummary>(`/dashboard/summary`),

  // ── Todos ──────────────────────────────────────────────────────────────
  listTodos: (includeCompleted = true) =>
    req<Todo[]>(`/todos${includeCompleted ? "" : "?include_completed=false"}`),
  createTodo: (body: TodoCreate) =>
    req<Todo>("/todos", { method: "POST", body: JSON.stringify(body) }),
  updateTodo: (id: number, body: TodoUpdate) =>
    req<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTodo: (id: number) =>
    req<void>(`/todos/${id}`, { method: "DELETE" }),
  generateTodos: (prompt: string) =>
    req<GeneratedTodo[]>("/ai/generate-todos", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),

  // ── Notes ──────────────────────────────────────────────────────────────
  listNotes: (params?: { q?: string; tag?: string; habitId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.habitId != null) qs.set("habit_id", String(params.habitId));
    const query = qs.toString();
    return req<Note[]>(`/notes${query ? `?${query}` : ""}`);
  },
  createNote: (body: NoteCreate) =>
    req<Note>("/notes", { method: "POST", body: JSON.stringify(body) }),
  updateNote: (id: number, body: NoteUpdate) =>
    req<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNote: (id: number) =>
    req<void>(`/notes/${id}`, { method: "DELETE" }),

  // Push notifications
  pushStatus: () => req<PushStatus>("/push/status"),
  pushPublicKey: () => req<PushPublicKey>("/push/public-key"),
  subscribePush: (body: PushSubscriptionPayload) =>
    req<void>("/push/subscribe", { method: "POST", body: JSON.stringify(body) }),
  unsubscribePush: (endpoint: string) =>
    req<void>(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: "DELETE" }),
  sendTestPush: (body?: PushTestNotification) =>
    req<{ sent: number; removed: number; total: number }>("/push/test", {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
};

export const qk = {
  habits: (archived = false) => ["habits", { archived }] as const,
  habit: (id: number) => ["habit", id] as const,
  completions: (id: number, from: string, to: string) =>
    ["completions", id, from, to] as const,
  heatmap: (from: string, to: string) => ["heatmap", from, to] as const,
  summary: () => ["summary"] as const,
  todos: (includeCompleted = true) => ["todos", { includeCompleted }] as const,
  notes: (params?: object) => ["notes", params ?? {}] as const,
  pushStatus: () => ["push-status"] as const,
};
