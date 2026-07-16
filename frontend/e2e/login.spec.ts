import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the fake login screen brings the user into the platform", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Email").fill("anyone@example.com");
  await page.getByLabel("Password").fill("anything-works");
  // Works both before hydration (native submit to action="/app") and after
  // (onSubmit router.push), so no hydration wait is needed.
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
});

test("submitting the login form with empty fields also enters the platform", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app(\?.*)?$/);
});

test("the NDA tool is reachable directly at /app after a full page load", async ({ page }) => {
  await page.goto("/app");

  await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
});

test("the login screen has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
