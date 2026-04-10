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

test.describe("create todo", () => {
  test("adds a new todo to the list and returns focus to title input", async ({
    page,
  }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });

    await titleInput.fill("First todo");
    await addButton.click();

    const items = page.getByRole("listitem");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("First todo");
    await expect(titleInput).toBeFocused();
  });

  test("adds a todo with title and description", async ({ page }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const textInput = page.getByLabel("New todo description");
    const addButton = page.getByRole("button", { name: "Add" });

    await titleInput.fill("Detailed todo");
    await textInput.fill("Some extra details");
    await addButton.click();

    const items = page.getByRole("listitem");
    await expect(items.first()).toContainText("Detailed todo");
    await expect(items.first()).toContainText("Some extra details");
  });

  test("places newest todo above existing ones", async ({ page }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const addButton = page.getByRole("button", { name: "Add" });

    await titleInput.fill("Second todo");
    await addButton.click();

    const items = page.getByRole("listitem");
    await expect(items.first()).toContainText("Second todo");
    await expect(items.nth(1)).toContainText("Detailed todo");
  });

  test.describe("validation", () => {
    test("shows inline validation for empty and whitespace input", async ({
      page,
    }) => {
      await page.goto("/");

      const addButton = page.getByRole("button", { name: "Add" });

      // Submit empty input
      await addButton.click();
      await expect(page.getByText("Title must not be empty.")).toBeVisible();

      // Submit whitespace-only input
      const titleInput = page.getByLabel("New todo title");
      await titleInput.fill("   ");
      await addButton.click();
      await expect(page.getByText("Title must not be empty.")).toBeVisible();
    });

    test("shows inline validation for too-long input", async ({ page }) => {
      await page.goto("/");

      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });

      await titleInput.fill("a".repeat(101));
      await addButton.click();

      await expect(
        page.getByText("Title must be between 1 and 100 characters."),
      ).toBeVisible();
    });
  });

  test("shows error banner and preserves input when create fails", async ({
    page,
  }) => {
    await page.goto("/");

    const titleInput = page.getByLabel("New todo title");
    const textInput = page.getByLabel("New todo description");
    const addButton = page.getByRole("button", { name: "Add" });

    await titleInput.fill("Fail create");
    await textInput.fill("Some details");

    const itemCountBefore = await page.getByRole("listitem").count();

    // Intercept POST with failure
    const deferred = createDeferred();
    await page.route("**/api/todos", (route) => {
      if (route.request().method() === "POST") {
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

    await addButton.click();
    deferred.resolve();

    // Error banner appears
    await expect(page.getByRole("alert")).toBeVisible();

    // No ghost todo added to the list
    await expect(page.getByRole("listitem")).toHaveCount(itemCountBefore);

    // Input is preserved — user can retry without retyping
    await expect(titleInput).toHaveValue("Fail create");
    await expect(textInput).toHaveValue("Some details");
  });

  test.describe("keyboard-only", () => {
    test("creates a todo using only keyboard", async ({ page }) => {
      await page.goto("/");

      // Tab to title input (may already be focused or need one Tab from body)
      const titleInput = page.getByLabel("New todo title");
      await titleInput.focus();
      await page.keyboard.type("Keyboard todo");

      // Tab to description
      await page.keyboard.press("Tab");
      await expect(page.getByLabel("New todo description")).toBeFocused();
      await page.keyboard.type("Keyboard desc");

      // Tab to Add button and press Enter
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Add" })).toBeFocused();
      await page.keyboard.press("Enter");

      // Verify todo was created
      await expect(page.getByText("Keyboard todo")).toBeVisible();
      await expect(page.getByText("Keyboard desc")).toBeVisible();
    });

    test("submits add form with Ctrl+Enter from description textarea", async ({
      page,
    }) => {
      await page.goto("/");

      const titleInput = page.getByLabel("New todo title");
      await titleInput.fill("Ctrl enter todo");
      const textInput = page.getByLabel("New todo description");
      await textInput.fill("Ctrl enter desc");

      // Ctrl+Enter in textarea submits the form
      await textInput.press("Control+Enter");

      await expect(page.getByText("Ctrl enter todo")).toBeVisible();
      await expect(page.getByText("Ctrl enter desc")).toBeVisible();
    });
  });
});
