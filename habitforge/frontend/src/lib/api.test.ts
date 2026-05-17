import { afterEach, describe, expect, it, vi } from "vitest";
import { api, qk, setAuthTokenGetter } from "./api";

describe("api client", () => {
  afterEach(() => {
    setAuthTokenGetter(async () => null);
  });

  it("adds auth tokens to requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    setAuthTokenGetter(async () => "token-123");

    await api.listHabits();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/habits",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api.archiveHabit(42)).resolves.toBeUndefined();
  });

  it("throws useful errors for failed responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad input", { status: 422, statusText: "Unprocessable Entity" }))
    );

    await expect(api.createHabit({ name: "" })).rejects.toThrow(
      "422 Unprocessable Entity bad input"
    );
  });

  it("maps endpoint wrapper methods to their HTTP contracts", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.getHabit(1);
    await api.updateHabit(1, { name: "Updated" });
    await api.restoreHabit(1);
    await api.reorderHabits([{ id: 1, sortOrder: 2 }]);
    await api.upsertCompletion(1, "2026-05-15", "skipped", "rest");
    await api.deleteCompletion(1, "2026-05-15");
    await api.listCompletions(1, "2026-05-01", "2026-05-31");
    await api.heatmap("2026-05-01", "2026-05-31");
    await api.summary();
    await api.listTodos(false);
    await api.createTodo({ title: "Task", priority: "high" });
    await api.updateTodo(2, { completed: true });
    await api.deleteTodo(2);
    await api.generateTodos("plan");
    await api.listNotes({ q: "one", tag: "tag", habitId: 1 });
    await api.createNote({ title: "N", content: "C" });
    await api.updateNote(3, { pinned: true });
    await api.deleteNote(3);
    await api.pushStatus();
    await api.pushPublicKey();
    await api.subscribePush({
      endpoint: "https://push.example/1",
      expirationTime: null,
      keys: { p256dh: "p", auth: "a" },
    });
    await api.unsubscribePush("https://push.example/1");
    await api.sendTestPush();
    await api.snoozeHabit(1, 10);
    await api.pushAction({ habitId: 1, action: "done" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/habits/1",
      "/api/habits/1",
      "/api/habits/1/restore",
      "/api/habits/reorder",
      "/api/habits/1/completions",
      "/api/habits/1/completions/2026-05-15",
      "/api/habits/1/completions?from=2026-05-01&to=2026-05-31",
      "/api/completions/heatmap?from=2026-05-01&to=2026-05-31",
      "/api/dashboard/summary",
      "/api/todos?include_completed=false",
      "/api/todos",
      "/api/todos/2",
      "/api/todos/2",
      "/api/ai/generate-todos",
      "/api/notes?q=one&tag=tag&habit_id=1",
      "/api/notes",
      "/api/notes/3",
      "/api/notes/3",
      "/api/push/status",
      "/api/push/public-key",
      "/api/push/subscribe",
      "/api/push/unsubscribe?endpoint=https%3A%2F%2Fpush.example%2F1",
      "/api/push/test",
      "/api/push/habits/1/snooze",
      "/api/push/action",
    ]);
  });

  it("creates stable query keys", () => {
    expect(qk.habits(true)).toEqual(["habits", { archived: true }]);
    expect(qk.habit(7)).toEqual(["habit", 7]);
    expect(qk.completions(7, "a", "b")).toEqual(["completions", 7, "a", "b"]);
    expect(qk.heatmap("a", "b")).toEqual(["heatmap", "a", "b"]);
    expect(qk.summary()).toEqual(["summary"]);
    expect(qk.todos(false)).toEqual(["todos", { includeCompleted: false }]);
    expect(qk.notes({ q: "x" })).toEqual(["notes", { q: "x" }]);
    expect(qk.pushStatus()).toEqual(["push-status"]);
  });
});
