import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Load root .env only if WEB_PORT is not already set.
 * When Playwright spawns the dev server, .env.test vars are already loaded
 * and should not be overwritten.
 */
if (!process.env.WEB_PORT) {
  loadEnvFile(resolve(import.meta.dirname, "../../.env"));
}

const apiHost = process.env.API_HOST;
const apiPort = process.env.API_PORT;
const webPort = Number(process.env.WEB_PORT);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/todos": `http://${apiHost}:${apiPort}`,
    },
  },
});
