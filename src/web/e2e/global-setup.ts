import { execSync } from "node:child_process";

const PROJECT_ROOT = new URL("../../..", import.meta.url).pathname;

/**
 * Resets the test database before the E2E test suite.
 * The .env.test vars are already loaded by playwright.config.ts,
 * so DATABASE_URL points to bmad_todo_test.
 */
export default function globalSetup() {
  execSync("npm -w src/api run db:reset", {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
}
