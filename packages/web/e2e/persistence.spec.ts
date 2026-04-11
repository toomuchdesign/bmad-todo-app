import { expect, test } from "@playwright/test";

import { registerTestUser } from "./test-utils";

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
