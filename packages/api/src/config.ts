import { resolve } from "node:path";
import envSchema from "env-schema";

export type ApiConfig = {
  API_HOST: string;
  API_PORT: number;
  DATABASE_URL: string;
  WEB_ORIGIN: string;
  JWT_SECRET: string;
};

const configSchema = {
  type: "object",
  required: [
    "API_HOST",
    "API_PORT",
    "DATABASE_URL",
    "WEB_ORIGIN",
    "JWT_SECRET",
  ],
  properties: {
    API_HOST: {
      type: "string",
    },
    API_PORT: {
      type: "integer",
    },
    DATABASE_URL: {
      type: "string",
    },
    WEB_ORIGIN: {
      type: "string",
    },
    JWT_SECRET: {
      type: "string",
    },
  },
} as const;

/**
 * Root-level .env path, resolved relative to the api package directory.
 */
const ROOT_ENV_PATH = resolve(import.meta.dirname, "../../../.env");

let cachedConfig: ApiConfig | undefined;

export function getConfig(): ApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = envSchema<ApiConfig>({
    schema: configSchema,
    dotenv: { path: ROOT_ENV_PATH },
  });

  cachedConfig = config;
  return config;
}
