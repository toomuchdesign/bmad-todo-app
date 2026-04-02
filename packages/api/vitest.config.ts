import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineProject } from "vitest/config";

loadEnvFile(resolve(import.meta.dirname, "../../.env.test"));

export default defineProject({
  test: {
    include: ["test/**/*.test.ts?(x)"],
    fileParallelism: false,
    restoreMocks: true,
    mockReset: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
