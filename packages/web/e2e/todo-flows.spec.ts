import { expect, test } from "@playwright/test";
import { createDeferred } from "./test-utils";

test.describe("Todo flows", () => {
  test.describe("page load", () => {
    test("renders the Todos heading and add form", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
      await expect(page.getByLabel("New todo text")).toBeVisible();
    });
  });

  test.describe("empty state", () => {
    test("shows empty state message when no todos exist", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByText("No todos yet.")).toBeVisible();
      await expect(page.getByText("Add your first one above.")).toBeVisible();
    });
  });

  test.describe("create todo flow", () => {
    test("adds a new todo to the list at the top", async ({ page }) => {
      await page.goto("/");

      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });

      await input.fill("First todo");
      await addButton.click();

      const items = page.getByRole("listitem");
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText("First todo");
    });

    test("places newest todo above existing ones", async ({ page }) => {
      await page.goto("/");

      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });

      await input.fill("Second todo");
      await addButton.click();

      const items = page.getByRole("listitem");
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText("Second todo");
      await expect(items.nth(1)).toContainText("First todo");
    });
  });

  test.describe("inline validation", () => {
    test("shows inline validation for empty and whitespace input", async ({
      page,
    }) => {
      await page.goto("/");

      const addButton = page.getByRole("button", { name: "Add" });

      // Submit empty input
      await addButton.click();
      await expect(
        page.getByText("Todo text must not be empty."),
      ).toBeVisible();

      // Submit whitespace-only input
      const input = page.getByLabel("New todo text");
      await input.fill("   ");
      await addButton.click();
      await expect(
        page.getByText("Todo text must not be empty."),
      ).toBeVisible();
    });

    test("shows inline validation for too-long input", async ({ page }) => {
      await page.goto("/");

      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });

      await input.fill("a".repeat(201));
      await addButton.click();

      await expect(
        page.getByText("Todo text must be between 1 and 200 characters."),
      ).toBeVisible();
    });
  });

  test.describe("inline edit flow", () => {
    test("edits a todo with Enter and saves updated text", async ({ page }) => {
      await page.goto("/");

      // Create a todo to edit
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Todo to edit");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Todo to edit", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Todo to edit", exact: true })
        .click();
      const editInput = page.getByLabel("Edit todo text");
      await expect(editInput).toBeVisible();
      await expect(editInput).toBeFocused();

      // Clear and type new text, then press Enter
      await editInput.clear();
      await editInput.fill("Edited todo");
      await editInput.press("Enter");

      // Verify updated text is shown and edit mode exited
      await expect(
        page.getByRole("button", { name: "Edited todo", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Edit todo text")).not.toBeVisible();
    });

    test("cancels edit with Escape and restores original text", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Cancel test todo");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Cancel test todo", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Cancel test todo", exact: true })
        .click();
      const editInput = page.getByLabel("Edit todo text");
      await expect(editInput).toBeVisible();

      // Type different text and press Escape
      await editInput.clear();
      await editInput.fill("Should not save");
      await editInput.press("Escape");

      // Verify original text is restored
      await expect(
        page.getByRole("button", { name: "Cancel test todo", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Edit todo text")).not.toBeVisible();
    });

    test("shows validation error for empty text in edit mode", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Validation test todo");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Validation test todo", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Validation test todo", exact: true })
        .click();
      const editInput = page.getByLabel("Edit todo text");
      await expect(editInput).toBeVisible();

      // Clear input and press Enter
      await editInput.clear();
      await editInput.press("Enter");

      // Verify validation error and edit mode stays open
      await expect(
        page.getByText("Todo text must not be empty."),
      ).toBeVisible();
      await expect(editInput).toBeVisible();
    });
  });

  test.describe("toggle completion flow", () => {
    test("marks an incomplete todo as completed via checkbox", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to toggle
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Toggle me");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Toggle me", exact: true }),
      ).toBeVisible();

      // Toggle completion
      const checkbox = page.getByRole("checkbox", { name: /Toggle me/ });
      await expect(checkbox).not.toBeChecked();
      await checkbox.click();

      // Verify checkbox is now checked and text shows completed style
      await expect(checkbox).toBeChecked();
    });

    test("unchecks a completed todo via checkbox", async ({ page }) => {
      await page.goto("/");

      // Create and complete a todo
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Uncomplete me");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Uncomplete me", exact: true }),
      ).toBeVisible();

      const checkbox = page.getByRole("checkbox", { name: /Uncomplete me/ });
      await checkbox.click();
      await expect(checkbox).toBeChecked();

      // Toggle back to incomplete
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
    });

    test("reverts checkbox and shows error banner when toggle fails", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Fail toggle");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Fail toggle", exact: true }),
      ).toBeVisible();

      // Intercept the PATCH request — hold it until deferred resolves
      const deferred = createDeferred<void>();
      await page.route("**/todos/*", (route) => {
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
  });

  test.describe("delete todo flow", () => {
    test("clicking Delete removes the todo from the list", async ({ page }) => {
      await page.goto("/");

      // Create a todo to delete
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Delete me");
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
      const input = page.getByLabel("New todo text");
      const addButton = page.getByRole("button", { name: "Add" });
      await input.fill("Fail delete");
      await addButton.click();
      await expect(page.getByText("Fail delete")).toBeVisible();

      // Intercept the DELETE request with a failure
      const deferred = createDeferred<void>();
      await page.route("**/todos/*", (route) => {
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
  });

  test.describe("error state", () => {
    test("shows error banner with retry button on load failure", async ({
      page,
    }) => {
      await page.route("**/todos", (route) => {
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
      await page.unroute("**/todos");

      await retryButton.click();

      // After retry, the error banner should disappear and list should load
      await expect(alert).not.toBeVisible();
      await expect(page.getByRole("list")).toBeVisible();
    });
  });
});
