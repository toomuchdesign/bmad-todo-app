import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    include: ["src/**/*.test.ts?(x)"],
    restoreMocks: true,
    mockReset: true,
    unstubGlobals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
