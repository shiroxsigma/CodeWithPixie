import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

const port = process.env.CWP_E2E_PORT || "8785";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL,
  },
  webServer: {
    command: `${process.env.CWP_TEST_PYTHON || "python"} ../run.py`,
    url: `${baseURL}/healthz`,
    env: {
      CWP_PORT: port,
      CWP_HOST: "127.0.0.1",
      CWP_WORKSPACE_ROOT: resolve("../logs/browser-workspace"),
    },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
