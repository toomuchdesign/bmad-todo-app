/**
 * Truncates all application tables using the shared cleanup utility.
 *
 * This script does NOT load any env file itself — the caller is responsible
 * for ensuring DATABASE_URL is set (e.g. via --env-file or loadEnvFile)
 * so that it can safely target any environment (dev, test, CI).
 *
 * Import directly from db.js (not the barrel) to avoid loading vitest,
 * buildApp, and the full test-utils module graph unnecessarily.
 */
import { cleanupTestDatabase, closeTestDb } from "../test/test-utils/db.js";

await cleanupTestDatabase();
// Close the connection pool so the process can exit immediately.
await closeTestDb();
