import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;

// The browser suite runs against a dedicated Next dev server with a
// deterministic in-test API stub. Keeping it on its own port means it
// cannot reuse a developer's existing server (and therefore cannot pick
// up a different API URL or the default 10-minute idle timeout).
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Use the locally installed Chrome channel. This keeps the suite
      // runnable on hospital/offline workstations where the Playwright
      // browser CDN is not reachable.
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    // Next 16 refuses a second dev server in the same directory. Build
    // and start a production bundle instead; this also verifies the same
    // client bundle used in deployment. The public env vars are inlined
    // at build time, so they are set for this command.
    command: `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Same-origin requests let Playwright fulfil the API without CORS
      // handling. The stub matches every /api/v1 request.
      NEXT_PUBLIC_API_URL: baseURL,
      // Short enough to observe the shared-workstation lock in a browser
      // test, long enough that normal form interactions do not race it.
      NEXT_PUBLIC_IDLE_TIMEOUT_MS: "8000",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
