import { test, expect } from "@playwright/test";

test("filling in the form updates the preview and produces a downloadable PDF", async ({
  page,
}) => {
  await page.goto("/app");

  const partyOne = page.getByRole("group", { name: "Party 1" });
  const partyTwo = page.getByRole("group", { name: "Party 2" });
  const preview = page.getByRole("region", { name: "NDA preview" });

  // An early `fill()` on a still-static prerendered input races client-side
  // hydration and gets silently dropped once React attaches its listeners
  // (`networkidle` is no guarantee under parallel test load). Retry the first
  // fill until the live preview reflects it, which proves hydration is done.
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

  await expect(preview.getByText("Acme Inc")).toBeVisible();
  await expect(preview.getByText("Widgets LLC")).toBeVisible();
  await expect(preview.locator("dd", { hasText: "July 14, 2026" })).toBeVisible();
  await expect(preview.locator("dd", { hasText: "Delaware" })).toBeVisible();

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

  expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
});

test("the download button is disabled until required fields are filled in", async ({ page }) => {
  await page.goto("/app");

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeDisabled();
  await expect(page.getByText("Please fill in all required fields before downloading.")).toBeVisible();
});
