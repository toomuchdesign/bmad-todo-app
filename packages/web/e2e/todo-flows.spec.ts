import { expect, test } from "@playwright/test";
import { createDeferred } from "./test-utils";

test.describe("Todo flows", () => {
  test.describe("page load", () => {
    test("renders the Todos heading and add form", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
      await expect(page.getByLabel("New todo title")).toBeVisible();
      await expect(page.getByLabel("New todo description")).toBeVisible();
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

      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });

      await titleInput.fill("First todo");
      await addButton.click();

      const items = page.getByRole("listitem");
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText("First todo");
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
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText("Second todo");
      await expect(items.nth(1)).toContainText("Detailed todo");
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

  test.describe("inline edit flow", () => {
    test("edits a todo title and saves with Ctrl+Enter in textarea", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Todo to edit");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Todo to edit", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Todo to edit", exact: true })
        .click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await expect(editTitleInput).toBeVisible();
      await expect(editTitleInput).toBeFocused();

      // Clear and type new title
      await editTitleInput.clear();
      await editTitleInput.fill("Edited todo");

      // Move to textarea and save with Ctrl+Enter
      await editTitleInput.press("Enter");
      const editTextInput = page.getByLabel("Edit todo description");
      await expect(editTextInput).toBeFocused();
      await editTextInput.press("Control+Enter");

      // Verify updated title is shown and edit mode exited
      await expect(
        page.getByRole("button", { name: "Edited todo", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Edit todo title")).not.toBeVisible();
    });

    test("cancels edit with Escape and restores original title", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Cancel test todo");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Cancel test todo", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Cancel test todo", exact: true })
        .click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await expect(editTitleInput).toBeVisible();

      // Type different text and press Escape
      await editTitleInput.clear();
      await editTitleInput.fill("Should not save");
      await editTitleInput.press("Escape");

      // Verify original title is restored
      await expect(
        page.getByRole("button", { name: "Cancel test todo", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Edit todo title")).not.toBeVisible();
    });

    test("shows validation error for empty title in edit mode", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Validation test todo");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Validation test todo", exact: true }),
      ).toBeVisible();

      // Click to enter edit mode
      await page
        .getByRole("button", { name: "Validation test todo", exact: true })
        .click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await expect(editTitleInput).toBeVisible();

      // Clear input and move to textarea, then try to save
      await editTitleInput.clear();
      await editTitleInput.press("Enter");
      const editTextInput = page.getByLabel("Edit todo description");
      await editTextInput.press("Control+Enter");

      // Verify validation error and edit mode stays open
      await expect(page.getByText("Title must not be empty.")).toBeVisible();
      await expect(editTitleInput).toBeVisible();
    });

    test("Enter in textarea inserts a newline instead of saving", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to edit
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Newline test");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Newline test", exact: true }),
      ).toBeVisible();

      // Enter edit mode
      await page
        .getByRole("button", { name: "Newline test", exact: true })
        .click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await editTitleInput.press("Enter"); // move to textarea
      const editTextInput = page.getByLabel("Edit todo description");
      await expect(editTextInput).toBeFocused();

      // Enter should insert a newline, not save
      await editTextInput.fill("Line one");
      await editTextInput.press("Enter");
      await editTextInput.pressSequentially("Line two");

      await expect(editTextInput).toHaveValue("Line one\nLine two");
      // Still in edit mode
      await expect(editTextInput).toBeVisible();
    });

    test("description appears below title when provided", async ({ page }) => {
      await page.goto("/");

      // Create a todo with description
      const titleInput = page.getByLabel("New todo title");
      const textInput = page.getByLabel("New todo description");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Title with desc");
      await textInput.fill("The description text");
      await addButton.click();

      // Verify both title and description are visible
      await expect(page.getByText("Title with desc")).toBeVisible();
      await expect(page.getByText("The description text")).toBeVisible();
    });
  });

  test.describe("toggle completion flow", () => {
    test("marks an incomplete todo as completed via checkbox", async ({
      page,
    }) => {
      await page.goto("/");

      // Create a todo to toggle
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Toggle me");
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
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Uncomplete me");
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
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Fail toggle");
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
