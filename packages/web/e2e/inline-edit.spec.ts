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
