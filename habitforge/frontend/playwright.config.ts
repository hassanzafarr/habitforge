import { defineConfig, devices } from "@playwright/test";

const frontendUrl = "http://127.0.0.1:5179";
const backendUrl = "http://127.0.0.1:8011";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "python e2e_server.py",
      cwd: "../backend",
      url: `${backendUrl}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5179",
      env: {
        ...process.env,
        VITE_MOCK_CLERK: "1",
        VITE_CLERK_PUBLISHABLE_KEY: "pk_test_mock",
        VITE_API_URL: "http://127.0.0.1:8011/api",
      },
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
