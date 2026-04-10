import { expect, test } from "@playwright/test";

import { createDeferred, registerTestUser } from "./test-utils";

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

test.describe("toggle completion", () => {
  test("toggles completion on and off via checkbox", async ({ page }) => {
    await page.goto("/");

    // Create a todo to toggle
    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });
    await titleInput.fill("Toggle me");
    await addButton.click();
    await expect(
      page.getByRole("button", { name: "Toggle me", exact: true }),
    ).toBeVisible();

    // Toggle completion on
    const checkbox = page.getByRole("checkbox", { name: /Toggle me/ });
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Toggle completion off
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });

  test("reverts checkbox and shows error banner when toggle fails", async ({
    page,
  }) => {
    await page.goto("/");

    // Create a todo
    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });
    await titleInput.fill("Fail toggle");
    await addButton.click();
    await expect(
      page.getByRole("button", { name: "Fail toggle", exact: true }),
    ).toBeVisible();

    // Intercept the PATCH request — hold it until deferred resolves
    const deferred = createDeferred();
    await page.route("**/api/todos/*", (route) => {
      if (route.request().method() === "PATCH") {
        deferred.promise.then(() => {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              code: "INTERNAL_ERROR",
              message: "Server error",
            }),
          });
        });
      } else {
        route.continue();
      }
    });

    const checkbox = page.getByRole("checkbox", { name: /Fail toggle/ });
    await checkbox.click();

    // Optimistic: checkbox is immediately checked before API responds
    await expect(checkbox).toBeChecked();

    // Let the PATCH failure resolve
    deferred.resolve();

    // After failure: checkbox reverts to unchecked and error banner shows
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test.describe("keyboard-only", () => {
    test("toggles a todo using only keyboard", async ({ page }) => {
      await page.goto("/");

      // Create a todo first
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Keyboard toggle");
      await addButton.click();
      await expect(page.getByText("Keyboard toggle")).toBeVisible();

      // Tab from title input through the todo item controls to reach the checkbox
      await titleInput.focus();
      await page.keyboard.press("Tab"); // description
      await page.keyboard.press("Tab"); // Add button
      await page.keyboard.press("Tab"); // checkbox
      const checkbox = page.getByRole("checkbox", {
        name: /Keyboard toggle/,
      });
      await expect(checkbox).toBeFocused();
      await page.keyboard.press("Space");

      await expect(checkbox).toBeChecked();
    });
  });
});
