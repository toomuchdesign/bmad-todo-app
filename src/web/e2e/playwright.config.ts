import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

/**
 * Load .env.test so spawned dev servers use the test database.
 * dotenv (used by the API's env-schema) won't overwrite these values.
 */
loadEnvFile(`${import.meta.dirname}/../../../src/api/.env.test`);

export default defineConfig({
  testDir: ".",
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "npm run dev:api",
      port: 3001,
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
