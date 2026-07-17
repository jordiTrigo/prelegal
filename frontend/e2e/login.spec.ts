import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signOutAndLand, signUpAndLand, TEST_PASSWORD, uniqueEmail } from "./auth-helpers";

test("signing up creates an account and brings the user into the platform", async ({ page }) => {
  await signUpAndLand(page);
  await expect(page.getByRole("heading", { name: "Legal Document Assistant" })).toBeVisible();
});

test("a returning user can sign in with their email and password", async ({ page }) => {
  const email = await signUpAndLand(page);
  await signOutAndLand(page);

  await expect(async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/app(\?.*)?$/, { timeout: 1000 });
  }).toPass();
});

test("sign in fails with the wrong password", async ({ page }) => {
  const email = await signUpAndLand(page);
  await signOutAndLand(page);

  await expect(async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page).toHaveURL("/");
});

test("signing up with an email already in use shows an error", async ({ page }) => {
  const email = uniqueEmail("duplicate");
  await page.goto("/signup");
  await expect(async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/app(\?.*)?$/, { timeout: 1000 });
  }).toPass();

  await signOutAndLand(page);
  await page.goto("/signup");
  await expect(async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("An account with that email already exists")).toBeVisible({
      timeout: 1000,
    });
  }).toPass();
});

test("/app redirects to the sign-in screen when signed out", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL("/");
});

test("/documents redirects to the sign-in screen when signed out", async ({ page }) => {
  await page.goto("/documents");
  await expect(page).toHaveURL("/");
});

test("the login screen has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("the sign-up screen has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/signup");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
