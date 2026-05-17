import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { HabitForm } from "./HabitForm";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/server";

describe("HabitForm", () => {
  it("validates required names", async () => {
    renderWithProviders(<HabitForm open onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /create habit/i }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
  });

  it("submits reminder fields in the create payload", async () => {
    const onClose = vi.fn();
    let payload: Record<string, unknown> | undefined;

    server.use(
      http.post("/api/habits", async ({ request }) => {
        payload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            id: 1,
            createdAt: "2026-05-15T00:00:00",
            archivedAt: null,
            sortOrder: 0,
            completedToday: false,
            currentStreak: 0,
            longestStreak: 0,
            completionRate30d: 0,
            totalCompletions: 0,
            ...payload,
          },
          { status: 201 }
        );
      })
    );

    renderWithProviders(<HabitForm open onClose={onClose} />);

    await userEvent.type(screen.getByLabelText(/name/i), "Morning run");
    await userEvent.click(screen.getByLabelText(/push reminders/i));
    fireEvent.change(screen.getByDisplayValue("20:00"), { target: { value: "07:30" } });
    fireEvent.change(screen.getByLabelText(/timezone/i), {
      target: { value: "Europe/Berlin" },
    });
    fireEvent.change(screen.getByLabelText(/max reminders/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/streak-risk/i), { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: /create habit/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(payload).toMatchObject({
      name: "Morning run",
      reminderEnabled: true,
      reminderDeadline: "07:30",
      reminderTimezone: "Europe/Berlin",
      reminderMaxPerDay: 3,
      streakRiskThreshold: 5,
    });
  });
});
