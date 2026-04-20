const BASE = import.meta.env.VITE_API_URL || "/api";
async function req(path, init) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    if (res.status === 204)
        return undefined;
    return (await res.json());
}
export const api = {
    listHabits: (includeArchived = false) => req(`/habits${includeArchived ? "?include_archived=true" : ""}`),
    getHabit: (id) => req(`/habits/${id}`),
    createHabit: (body) => req("/habits", { method: "POST", body: JSON.stringify(body) }),
    updateHabit: (id, body) => req(`/habits/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    archiveHabit: (id) => req(`/habits/${id}`, { method: "DELETE" }),
    restoreHabit: (id) => req(`/habits/${id}/restore`, { method: "POST" }),
    reorderHabits: (items) => req(`/habits/reorder`, {
        method: "POST",
        body: JSON.stringify(items),
    }),
    upsertCompletion: (habitId, date, status = "done", note) => req(`/habits/${habitId}/completions`, {
        method: "POST",
        body: JSON.stringify({ date, status, note: note ?? null }),
    }),
    deleteCompletion: (habitId, date) => req(`/habits/${habitId}/completions/${date}`, { method: "DELETE" }),
    listCompletions: (habitId, from, to) => req(`/habits/${habitId}/completions?from=${from}&to=${to}`),
    heatmap: (from, to) => req(`/completions/heatmap?from=${from}&to=${to}`),
    summary: () => req(`/dashboard/summary`),
    // ── Todos ──────────────────────────────────────────────────────────────
    listTodos: (includeCompleted = true) => req(`/todos${includeCompleted ? "" : "?include_completed=false"}`),
    createTodo: (body) => req("/todos", { method: "POST", body: JSON.stringify(body) }),
    updateTodo: (id, body) => req(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteTodo: (id) => req(`/todos/${id}`, { method: "DELETE" }),
    // Push notifications
    pushStatus: () => req("/push/status"),
    pushPublicKey: () => req("/push/public-key"),
    subscribePush: (body) => req("/push/subscribe", { method: "POST", body: JSON.stringify(body) }),
    unsubscribePush: (endpoint) => req(`/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: "DELETE" }),
    sendTestPush: (body) => req("/push/test", {
        method: "POST",
        body: JSON.stringify(body ?? {}),
    }),
};
export const qk = {
    habits: (archived = false) => ["habits", { archived }],
    habit: (id) => ["habit", id],
    completions: (id, from, to) => ["completions", id, from, to],
    heatmap: (from, to) => ["heatmap", from, to],
    summary: () => ["summary"],
    todos: (includeCompleted = true) => ["todos", { includeCompleted }],
    pushStatus: () => ["push-status"],
};
