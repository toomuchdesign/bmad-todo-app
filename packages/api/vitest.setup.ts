import { beforeEach } from "vitest";
import { cleanupTestDatabase } from "./test/test-utils/index.js";

beforeEach(async () => {
  await cleanupTestDatabase();
});
