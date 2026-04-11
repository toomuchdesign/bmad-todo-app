import { expect, test } from "@playwright/test";

import { createDeferred, registerTestUser } from "./test-utils";

// Module-scoped: shared across all tests within this spec file
let authToken: string;

test.beforeAll(async ({ request }) => {
  const { token } = await registerTestUser({ request });
  authToken = token;
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    `localStorage.setItem("auth_token", ${JSON.stringify(authToken)})`,
  );
});

test.describe("delete todo", () => {
  test("clicking Delete removes the todo from the list", async ({ page }) => {
    await page.goto("/");

    // Create a todo to delete
    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });
    await titleInput.fill("Delete me");
    await addButton.click();
    await expect(page.getByText("Delete me")).toBeVisible();

    // Click the Delete button
    await page.getByRole("button", { name: "Delete Delete me" }).click();

    // Verify the todo is removed from the list
    await expect(page.getByText("Delete me")).not.toBeVisible();
  });

  test("on API failure, todo remains visible and error banner is shown", async ({
    page,
  }) => {
    await page.goto("/");

    // Create a todo
    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });
    await titleInput.fill("Fail delete");
    await addButton.click();
    await expect(page.getByText("Fail delete")).toBeVisible();

    // Intercept the DELETE request with a failure
    const deferred = createDeferred();
    await page.route("**/api/todos/*", (route) => {
      if (route.request().method() === "DELETE") {
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

    await page.getByRole("button", { name: "Delete Fail delete" }).click();

    // Todo should still be visible (non-optimistic)
    await expect(page.getByText("Fail delete")).toBeVisible();

    // Let the DELETE failure resolve
    deferred.resolve();

    // Error banner appears and todo remains
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Fail delete")).toBeVisible();
  });

  test("moves focus to a checkbox after delete when items remain", async ({
    page,
  }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });

    // Create two todos so at least one remains after delete
    await titleInput.fill("Focus del A");
    await addButton.click();
    await expect(page.getByText("Focus del A")).toBeVisible();
    await titleInput.fill("Focus del B");
    await addButton.click();
    await expect(page.getByText("Focus del B")).toBeVisible();

    // Delete one
    await page.getByRole("button", { name: "Delete Focus del B" }).click();
    await expect(page.getByText("Focus del B")).not.toBeVisible();

    // Focus moves to a checkbox (the next item in the list)
    const focused = page.locator("input[type=checkbox]:focus");
    await expect(focused).toHaveCount(1);
  });

  test.describe("keyboard-only", () => {
    test("deletes a todo using only keyboard", async ({ page }) => {
      await page.goto("/");

      // Create a todo first
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Keyboard delete");
      await addButton.click();
      await expect(page.getByText("Keyboard delete")).toBeVisible();

      // Focus the delete button and press Enter
      const deleteButton = page.getByRole("button", {
        name: "Delete Keyboard delete",
      });
      await deleteButton.focus();
      await page.keyboard.press("Enter");

      // Verify todo is removed
      await expect(page.getByText("Keyboard delete")).not.toBeVisible();
    });
  });
});
