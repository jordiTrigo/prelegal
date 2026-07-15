import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the empty form has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("the filled-in form and preview have no detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const partyOne = page.getByRole("group", { name: "Party 1" });
  const partyTwo = page.getByRole("group", { name: "Party 2" });

  await partyOne.getByLabel("Company name").fill("Acme Inc");
  await partyOne.getByLabel("Signer name").fill("Jane Doe");
  await partyOne.getByLabel("Signer title").fill("CEO");
  await partyOne.getByLabel("Notice address (email or postal)").fill("jane@acme.com");

  await partyTwo.getByLabel("Company name").fill("Widgets LLC");
  await partyTwo.getByLabel("Signer name").fill("John Roe");
  await partyTwo.getByLabel("Signer title").fill("COO");
  await partyTwo.getByLabel("Notice address (email or postal)").fill("john@widgets.com");

  await page.getByLabel("Purpose").fill("Evaluating a potential partnership");
  await page.getByLabel("Effective date", { exact: true }).fill("2026-07-14");
  await page.getByLabel("Governing law (state)").fill("Delaware");
  await page.getByLabel("Jurisdiction (city/county and state)").fill("New Castle, DE");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
