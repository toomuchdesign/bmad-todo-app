import { afterAll } from "vitest";
import { closeTestDb } from "./test/test-utils/index.js";

// Per-file test isolation: each test file creates its own user and cleans
// only that user's todos. No global cleanup is needed.

afterAll(async () => {
  await closeTestDb();
});
