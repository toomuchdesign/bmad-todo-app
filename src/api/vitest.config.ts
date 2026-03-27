import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

loadEnvFile(".env.test");

export default defineConfig({
  test: {
    dir: "test",
    restoreMocks: true,
    mockReset: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
