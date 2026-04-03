import { execSync } from "node:child_process";

/**
 * Resets the database before the E2E test suite.
 *
 * When reusing existing dev servers (local dev), the servers connect to
 * the dev database (.env), not the test database (.env.test).
 * Load the correct env file so db:reset targets the right database.
 */
export default function globalSetup() {
  execSync("npm -w api run db:reset", {
    env: { ...process.env },
    stdio: "inherit",
  });
}
