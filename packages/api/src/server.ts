import buildApp from "./app.js";
import { getConfig } from "./config.js";

const app = await buildApp();

try {
  const config = getConfig();

  await app.listen({
    port: config.API_PORT,
    host: config.API_HOST,
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
