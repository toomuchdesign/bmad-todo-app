import { expect, test } from "@playwright/test";

import { withFreshAuthenticatedUser } from "./test-utils";

withFreshAuthenticatedUser(test);

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
