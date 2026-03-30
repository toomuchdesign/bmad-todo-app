import type { Config } from "drizzle-kit";
import { getConfig } from "./src/config.js";

const config = getConfig();

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: config.DATABASE_URL,
  },
} satisfies Config;
