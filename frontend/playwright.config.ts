import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:8771",
  },
  webServer: {
    command: "python ../run.py",
    url: "http://127.0.0.1:8771/healthz",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
