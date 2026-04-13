import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/web", "packages/api"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**"],
      exclude: ["**/*.d.ts", "**/*.test.*", "**/test/**"],
    },
  },
});
