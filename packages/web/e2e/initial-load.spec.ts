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

test.describe("initial load", () => {
  test("renders heading, form, and empty state", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
    await expect(page.getByLabel("New todo title")).toBeVisible();
    await expect(page.getByLabel("New todo description")).toBeVisible();
    await expect(page.getByText("No todos yet.")).toBeVisible();
    await expect(page.getByText("Add your first one above.")).toBeVisible();
  });

  test("shows error banner with retry button on load failure", async ({
    page,
  }) => {
    await page.route("**/api/todos", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
    });

    await page.goto("/");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();

    const retryButton = page.getByRole("button", { name: "Retry" });
    await expect(retryButton).toBeVisible();

    // Remove the route intercept so retry succeeds
    await page.unroute("**/api/todos");

    await retryButton.click();

    // After retry, the error banner should disappear and page loads normally
    await expect(alert).not.toBeVisible();
    await expect(page.getByText("No todos yet.")).toBeVisible();
  });
});
