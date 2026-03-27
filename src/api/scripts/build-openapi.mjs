import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, "..");
const outFile = path.resolve(apiDir, "openapi.json");

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "bmad-todo API",
    version: "0.0.0",
  },
  paths: {
    "/todos": {
      get: {
        responses: {
          501: {
            description: "Not implemented",
          },
        },
      },
    },
  },
};

await fs.writeFile(outFile, `${JSON.stringify(openapi, null, 2)}\n`, "utf8");
