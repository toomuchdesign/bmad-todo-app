import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

/**
 * Load root .env.test so spawned dev servers use the test database.
 * env-schema (used by the API) won't overwrite these values.
 */
loadEnvFile(resolve(import.meta.dirname, "../../../.env.test"));

const apiPort = Number(process.env.API_PORT);

export default defineConfig({
  testDir: ".",
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npm run dev:api",
      port: apiPort,
      cwd: "../../..",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev:web",
      url: "http://localhost:5173",
      cwd: "../../..",
      reuseExistingServer: !process.env.CI,
    },
  ],
  globalSetup: "./global-setup.ts",
});
