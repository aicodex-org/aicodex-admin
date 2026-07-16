import {defineConfig, devices} from "@playwright/test";
import {resolveE2EBaseURL} from "./playwright/support/runtime";

const baseURL = resolveE2EBaseURL(process.env.AICODEX_ADMIN_E2E_BASE_URL);

export default defineConfig({
  testDir: "./playwright/e2e",
  outputDir: "output/playwright/test-results",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["line"],
    ["html", {outputFolder: "output/playwright/report", open: "never"}],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
    },
  ],
  webServer: {
    command: "yarn start",
    url: baseURL,
    // 完整 suite 禁止复用既有 Vite，避免继承可能指向共享后台的 proxy。
    reuseExistingServer: false,
    timeout: 210_000,
    env: {
      PORT: "7002",
      AICODEX_ADMIN_DEV_PROXY_TARGET: "http://127.0.0.1:8000",
    },
  },
});
