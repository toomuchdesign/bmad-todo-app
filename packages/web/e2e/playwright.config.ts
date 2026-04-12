import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

/**
 * Load root .env.test so spawned dev servers use the test database and ports.
 * env-schema (used by the API) won't overwrite these values.
 */
loadEnvFile(resolve(import.meta.dirname, "../../../.env.test"));

const apiHost = process.env.API_HOST;
const apiPort = process.env.API_PORT;
const webPort = process.env.WEB_PORT;

export default defineConfig({
  testDir: ".",
  use: {
    baseURL: `http://localhost:${webPort}`,
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: `http://${apiHost}:${apiPort}/healthcheck`,
      cwd: "../../..",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev:web",
      url: `http://localhost:${webPort}`,
      cwd: "../../..",
      reuseExistingServer: !process.env.CI,
    },
  ],
  globalSetup: "./global-setup.ts",
});
