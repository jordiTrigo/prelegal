import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the empty form has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/app");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("the filled-in form and preview have no detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/app");

  const partyOne = page.getByRole("group", { name: "Party 1" });
  const partyTwo = page.getByRole("group", { name: "Party 2" });
  const preview = page.getByRole("region", { name: "NDA preview" });

  // Retry the first fill until the preview reflects it: proves React has
  // hydrated, so the remaining fills can't be dropped (see nda-flow.spec.ts).
  await expect(async () => {
    await partyOne.getByLabel("Company name").fill("Acme Inc");
    await expect(preview.getByText("Acme Inc")).toBeVisible({ timeout: 1000 });
  }).toPass();
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
