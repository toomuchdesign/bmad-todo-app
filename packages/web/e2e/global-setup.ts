import { execSync } from "node:child_process";

/**
 * Resets the database before the E2E test suite.
 * The .env.test vars are already loaded by playwright.config.ts,
 * so DATABASE_URL points to bmad_todo_test.
 */
export default function globalSetup() {
  execSync("npm -w api run db:reset", {
    env: { ...process.env },
    stdio: "inherit",
  });
}
