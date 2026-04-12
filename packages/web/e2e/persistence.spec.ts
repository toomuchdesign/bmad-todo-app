import { expect, test } from "@playwright/test";

import {
  registerUserWithCredentials,
  withFreshAuthenticatedUser,
} from "./test-utils";

withFreshAuthenticatedUser(test);

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

  test("todos survive a logout -> login cycle", async ({ page, request }) => {
    // Log out
    await page.goto("/");
    await page.getByRole("button", { name: "Log out" }).click();
    const user = await registerUserWithCredentials({ request });

    // Log in via UI
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.locator("form").getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByRole("textbox", { name: "New todo title" }),
    ).toBeVisible();

    // Create a todo
    await page.getByLabel("New todo title").fill("Survive logout");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Survive logout")).toBeVisible();

    // Log out
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByLabel("Email")).toBeVisible();

    // Log back in with the same credentials
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.locator("form").getByRole("button", { name: "Log in" }).click();

    // Todo should still be there
    await expect(page.getByText("Survive logout")).toBeVisible();
  });
});
