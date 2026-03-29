import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    dir: "src",
    restoreMocks: true,
    mockReset: true,
    unstubGlobals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
