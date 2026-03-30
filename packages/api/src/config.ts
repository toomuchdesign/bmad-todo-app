import envSchema from "env-schema";

export type ApiConfig = {
  HOST: string;
  PORT: number;
  DATABASE_URL: string;
};

const configSchema = {
  type: "object",
  required: ["HOST", "PORT", "DATABASE_URL"],
  properties: {
    HOST: {
      type: "string",
    },
    PORT: {
      type: "integer",
    },
    DATABASE_URL: {
      type: "string",
    },
  },
} as const;

let cachedConfig: ApiConfig | undefined;

export function getConfig(): ApiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config = envSchema<ApiConfig>({
    schema: configSchema,
    dotenv: true,
  });

  cachedConfig = config;
  return config;
}
