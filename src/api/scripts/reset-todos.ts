import { loadEnvFile } from "node:process";

loadEnvFile(".env.test");

import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("TRUNCATE TABLE todos;");
} finally {
  await client.end();
}
