/**
 * Truncates all application tables using the shared cleanup utility.
 *
 * This script does NOT load any env file itself — the caller is responsible
 * for ensuring DATABASE_URL is set (e.g. via --env-file or loadEnvFile)
 * so that it can safely target any environment (dev, test, CI).
 */
const { cleanupTestDatabase } = await import("../test/test-utils/index.js");
await cleanupTestDatabase();
