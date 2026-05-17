import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const backendUrl = "http://127.0.0.1:8011";

async function resetData(request: APIRequestContext) {
  await request.post(`${backendUrl}/api/test/reset`);
}

async function openNewHabit(page: Page) {
  const desktopButton = page.getByRole("button", { name: /new habit/i }).first();
  if (await desktopButton.isVisible().catch(() => false)) {
    await desktopButton.click();
  } else {
    await page.locator("#mobile-nav-new-habit").click();
  }
}

test.beforeEach(async ({ request }) => {
  await resetData(request);
});

test("dashboard creates a reminded habit and toggles today's completion", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Push Notifications")).toBeVisible();

  await openNewHabit(page);
  await page.getByLabel(/name/i).fill("E2E Morning Run");
  await page.getByLabel(/push reminders/i).check();
  await page.locator('input[type="time"]').fill("07:30");
  await page.getByLabel(/timezone/i).fill("Europe/Berlin");
  await page.getByLabel(/max reminders/i).fill("3");
  await page.getByLabel(/streak-risk/i).fill("5");
  await page.getByRole("button", { name: "Create habit" }).click();

  await expect(page.getByRole("main").getByText("E2E Morning Run").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByRole("button", { name: "Mark undone" })).toBeVisible();
  await expect(page.getByText("1/1")).toBeVisible();

  await page.getByRole("button", { name: "Mark undone" }).click();
  await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible();
  await expect(page.getByText("0/1")).toBeVisible();
});

test("habits can be edited, archived, and restored", async ({ page }) => {
  await page.goto("/habits");
  await openNewHabit(page);
  await page.getByLabel(/name/i).fill("E2E Reading");
  await page.getByRole("button", { name: "Create habit" }).click();
  await expect(page.getByRole("button", { name: "E2E Reading" })).toBeVisible();

  await page.getByRole("button", { name: "Edit habit" }).click();
  await page.getByLabel(/name/i).fill("E2E Deep Reading");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "E2E Deep Reading" })).toBeVisible();

  await page.getByRole("button", { name: "Archive habit" }).click();
  await expect(page.getByRole("button", { name: "E2E Deep Reading" })).toBeHidden();
  await page.getByRole("button", { name: /archived habits/i }).click();
  await expect(page.getByRole("button", { name: "E2E Deep Reading" })).toBeVisible();
  await page.getByRole("button", { name: "Restore habit" }).click();
  await expect(page.getByText(/Archived habits \(0\)/)).toBeVisible();
});

test("todos and notes support core create and filter workflows", async ({ page }) => {
  await page.goto("/todos");
  await page.getByRole("button", { name: /new task/i }).click();
  await page.locator("#todo-title-input").fill("E2E Pay bills");
  await page.locator("#priority-high").click();
  await page.getByRole("button", { name: /add to-do/i }).click();
  await expect(page.getByText("E2E Pay bills")).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await page.locator("#todo-filter-done").click();
  await expect(page.getByText("E2E Pay bills")).toBeVisible();

  await page.goto("/notes");
  await page.getByRole("button", { name: /new note/i }).first().click();
  await page.getByPlaceholder(/note title/i).fill("E2E Reflection");
  await page.getByPlaceholder(/start writing/i).fill("A compact note for search.");
  await page.getByPlaceholder(/add tag/i).fill("e2e");
  await page.getByRole("button", { name: "Create Note" }).click();
  await expect(page.getByText("E2E Reflection")).toBeVisible();

  await page.getByPlaceholder(/search notes/i).fill("compact");
  await expect(page.getByText("E2E Reflection")).toBeVisible();
  await page.getByRole("button", { name: "Delete note" }).click({ force: true });
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
  await expect(page.getByRole("heading", { name: "E2E Reflection" })).toHaveCount(0);
});
