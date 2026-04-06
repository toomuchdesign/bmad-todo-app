import { expect, test } from "@playwright/test";
import { createDeferred } from "./test-utils";

test.describe("Todo flows", () => {
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

      // After retry, the error banner should disappear and page loads normally
      await expect(alert).not.toBeVisible();
      await expect(page.getByText("No todos yet.")).toBeVisible();
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
      const deferred = createDeferred<void>();
      await page.route("**/todos", (route) => {
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

  test.describe("inline edit", () => {
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

    test("returns focus to title button after Escape cancel", async ({
      page,
    }) => {
      await page.goto("/");

      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Focus test todo");
      await addButton.click();

      const todoButton = page.getByRole("button", {
        name: "Focus test todo",
        exact: true,
      });
      await expect(todoButton).toBeVisible();

      await todoButton.click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await expect(editTitleInput).toBeVisible();
      await editTitleInput.press("Escape");

      await expect(todoButton).toBeFocused();
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

    test("shows error banner when edit PATCH fails", async ({ page }) => {
      await page.goto("/");

      // Create a todo to edit
      const titleInput = page.getByLabel("New todo title");
      const addButton = page.getByRole("button", { name: "Add" });
      await titleInput.fill("Edit fail test");
      await addButton.click();
      await expect(
        page.getByRole("button", { name: "Edit fail test", exact: true }),
      ).toBeVisible();

      // Enter edit mode
      await page
        .getByRole("button", { name: "Edit fail test", exact: true })
        .click();
      const editTitleInput = page.getByLabel("Edit todo title");
      await expect(editTitleInput).toBeVisible();

      // Intercept PATCH with failure
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

      // Edit and save
      await editTitleInput.clear();
      await editTitleInput.fill("Changed title");
      await editTitleInput.press("Enter");
      const editTextInput = page.getByLabel("Edit todo description");
      await editTextInput.press("Control+Enter");

      deferred.resolve();

      // Error banner appears
      await expect(page.getByRole("alert")).toBeVisible();

      // Todo still exists in the list (not lost)
      await expect(
        page.getByRole("checkbox", { name: /Edit fail test/ }),
      ).toBeVisible();
    });

    test.describe("keyboard-only", () => {
      test("edits a todo using only keyboard", async ({ page }) => {
        await page.goto("/");

        // Create a todo first
        const titleInput = page.getByLabel("New todo title");
        const addButton = page.getByRole("button", { name: "Add" });
        await titleInput.fill("Keyboard edit");
        await addButton.click();
        await expect(
          page.getByRole("button", { name: "Keyboard edit", exact: true }),
        ).toBeVisible();

        // Focus the todo title button and press Enter to enter edit mode
        const todoButton = page.getByRole("button", {
          name: "Keyboard edit",
          exact: true,
        });
        await todoButton.focus();
        await page.keyboard.press("Enter");

        // Edit the title
        const editTitleInput = page.getByLabel("Edit todo title");
        await expect(editTitleInput).toBeFocused();
        await editTitleInput.clear();
        await editTitleInput.fill("Keyboard edited");

        // Enter moves to description, Ctrl+Enter saves
        await page.keyboard.press("Enter");
        await expect(page.getByLabel("Edit todo description")).toBeFocused();
        await page.keyboard.press("Control+Enter");

        // Verify edit saved
        await expect(
          page.getByRole("button", { name: "Keyboard edited", exact: true }),
        ).toBeVisible();
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
});
