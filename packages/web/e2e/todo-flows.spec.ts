import { expect, test } from "@playwright/test";

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
