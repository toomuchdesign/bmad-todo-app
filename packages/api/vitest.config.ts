import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

loadEnvFile(resolve(import.meta.dirname, "../../.env.test"));

export default defineConfig({
  test: {
    dir: "test",
    fileParallelism: false,
    restoreMocks: true,
    mockReset: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
