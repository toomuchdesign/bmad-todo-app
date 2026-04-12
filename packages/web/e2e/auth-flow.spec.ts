import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  registerUserWithCredentials,
  type UserCredentials,
} from "./test-utils";

// Pre-registered user for login tests
let existingUser: UserCredentials;

test.beforeAll(async ({ request }) => {
  existingUser = await registerUserWithCredentials({ request });
});

// No auth token injection — this spec tests the auth UI flow
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("auth flow", () => {
  test("app loads with login screen when no auth token", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    // AC4: login screen shown specifically, not register or todo list
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });

  test("full registration flow -> todo list", async ({ page }) => {
    const email = `e2e-reg-${randomUUID()}@test.local`;

    // Navigate to register
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Register" })
      .click();

    // Fill and submit
    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("securepassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Should see the todo list
    await expect(
      page.getByRole("textbox", { name: "New todo title" }),
    ).toBeVisible();
  });

  test("logout -> login screen", async ({ page }) => {
    // Login first
    await page.getByLabel("Email").fill(existingUser.email);
    await page.getByLabel("Password").fill(existingUser.password);
    await page.locator("form").getByRole("button", { name: "Log in" }).click();
    await expect(
      page.getByRole("textbox", { name: "New todo title" }),
    ).toBeVisible();

    // Logout
    await page.getByRole("button", { name: "Log out" }).click();

    // Back to login screen
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("login with existing credentials -> todo list", async ({ page }) => {
    await page.getByLabel("Email").fill(existingUser.email);
    await page.getByLabel("Password").fill(existingUser.password);
    await page.locator("form").getByRole("button", { name: "Log in" }).click();

    await expect(
      page.getByRole("textbox", { name: "New todo title" }),
    ).toBeVisible();
  });
});
