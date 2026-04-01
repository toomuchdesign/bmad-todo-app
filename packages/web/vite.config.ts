import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

loadEnvFile(resolve(import.meta.dirname, "../../.env"));

const apiPort = process.env.API_PORT;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/todos": `http://localhost:${apiPort}`,
    },
  },
});
