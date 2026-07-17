import { expect, type Page } from "@playwright/test";

export const TEST_PASSWORD = "correct-horse-battery";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/** Signs up a fresh, unique user and waits for landing on /app. Retries the
 * submit like the chat send button elsewhere in this suite: with no native
 * form fallback, a click before React hydrates is silently dropped. */
export async function signUpAndLand(page: Page, emailPrefix = "e2e"): Promise<string> {
  const email = uniqueEmail(emailPrefix);
  await page.goto("/signup");
  await expect(async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/app(\?.*)?$/, { timeout: 1000 });
  }).toPass();
  return email;
}

/** Clicks Sign out and waits for landing on /. Same retry rationale as
 * signUpAndLand: Sign out is a React onClick handler, not a native link, so
 * a click before hydration is silently dropped. */
export async function signOutAndLand(page: Page): Promise<void> {
  await expect(async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/", { timeout: 1000 });
  }).toPass();
}
