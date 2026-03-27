import { expect, it } from "vitest";
import { buildApp } from "../src/app";

it("boots the Fastify app", async () => {
  const app = buildApp({ logger: false });
  await app.ready();
  await app.close();
  expect(true).toBe(true);
});
