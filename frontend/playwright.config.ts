import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // More parallel browsers than this starves WebKit of CPU long enough that
  // React hydration on /app can exceed the 30s test timeout.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8001",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // Exercise the real deliverable: the static export served by FastAPI,
    // exactly as it runs in the Docker container.
    command: 'npm run build && cd ../backend && uv run uvicorn app.main:app --port 8001',
    url: "http://localhost:8001/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
