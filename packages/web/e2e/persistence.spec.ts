import { expect, test } from "@playwright/test";

import { registerTestUser } from "./test-utils";

// Module-scoped: shared across all tests within this spec file
let userId: string;

test.beforeAll(async ({ request }) => {
  userId = await registerTestUser({ request });
});

test.beforeEach(async ({ page }) => {
  // Intercept all API requests and inject the per-spec user ID (dual-mode fallback).
  // page.route() persists across page.goto() and page.reload() calls for the lifetime of this page.
  // TODO(story 6.3): remove this header injection once dual-mode is dropped and JWT auth is required.
  await page.route("**/api/**", (route) => {
    route.continue({
      headers: { ...route.request().headers(), "x-user-id": userId },
    });
  });
});

test.describe("data persistence", () => {
  test("todos survive a page reload", async ({ page }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });

    await titleInput.fill("Persist me");
    await addButton.click();
    await expect(page.getByText("Persist me")).toBeVisible();

    // Reload the page
    await page.reload();

    // Todo should still be present
    await expect(page.getByText("Persist me")).toBeVisible();
  });
});
