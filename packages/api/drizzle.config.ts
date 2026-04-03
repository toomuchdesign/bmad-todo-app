import type { Config } from "drizzle-kit";

/**
 * Load DATABASE_URL from environment.
 * In deployed environments it comes from the platform;
 * locally, the npm script passes it via --env-file.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
