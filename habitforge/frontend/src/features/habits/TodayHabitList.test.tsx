import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { TodayHabitList } from "./TodayHabitList";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/server";

function habit(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Hydrate",
    description: null,
    icon: "H",
    color: "#6366f1",
    frequencyType: "daily",
    targetPerWeek: 7,
    activeDays: [],
    habitType: "positive",
    createdAt: "2026-05-15T00:00:00",
    archivedAt: null,
    sortOrder: 0,
    completedToday: false,
    currentStreak: 2,
    longestStreak: 3,
    completionRate30d: 0.5,
    totalCompletions: 10,
    reminderEnabled: false,
    reminderDeadline: null,
    reminderTimezone: "UTC",
    reminderMaxPerDay: 2,
    streakRiskThreshold: 3,
    ...overrides,
  };
}

describe("TodayHabitList", () => {
  it("rolls back an optimistic completion when the API fails", async () => {
    let releaseFailure: (() => void) | undefined;
    server.use(
      http.get("/api/habits", () => HttpResponse.json([habit()])),
      http.post(
        "/api/habits/:id/completions",
        () =>
          new Promise<Response>((resolve) => {
            releaseFailure = () => resolve(HttpResponse.text("boom", { status: 500 }));
          })
      )
    );

    renderWithProviders(<TodayHabitList />);

    const toggle = await screen.findByRole("button", { name: /mark done/i });
    await userEvent.click(toggle);

    expect(screen.getByRole("button", { name: /mark undone/i })).toBeInTheDocument();
    releaseFailure?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /mark done/i })).toBeInTheDocument()
    );
  });
});
