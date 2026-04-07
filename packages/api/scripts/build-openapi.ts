import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "../src/app.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, "..");
const outFile = path.resolve(apiDir, "openapi.json");

const app = await buildApp({ logger: false });

try {
  const openapi = app.swagger();
  await fs.writeFile(outFile, `${JSON.stringify(openapi, null, 2)}\n`, "utf8");
} finally {
  await app.close();
}
