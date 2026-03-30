import buildApp from "./app.js";
import { getConfig } from "./config.js";

const app = await buildApp();

try {
  const config = getConfig();

  await app.listen({
    port: config.PORT,
    host: config.HOST,
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
