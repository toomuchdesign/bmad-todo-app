import type { Page, TestType } from "@playwright/test";

import { registerTestUser } from "./auth";

type TestUser = {
  userId: string;
  token: string;
};

/**
 * Registers a fresh user and injects the auth token into localStorage
 * before each test. Most specs use this — it skips the login UI entirely.
 *
 * @example
 * const testUser = withFreshAuthenticatedUser(test);
 * // testUser.token is available after beforeAll runs
 */
function withFreshAuthenticatedUser(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright's TestType generic is complex; any is the pragmatic choice here
  testInstance: TestType<any, any>,
): TestUser {
  const testUser: TestUser = { userId: "", token: "" };

  testInstance.beforeAll(async ({ request }) => {
    const { userId, token } = await registerTestUser({ request });
    testUser.userId = userId;
    testUser.token = token;
  });

  testInstance.beforeEach(async ({ page }: { page: Page }) => {
    await page.addInitScript(
      `localStorage.setItem("auth_token", ${JSON.stringify(testUser.token)})`,
    );
  });

  return testUser;
}

export { withFreshAuthenticatedUser };
