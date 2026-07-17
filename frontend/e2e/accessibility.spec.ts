import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("the empty chat has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/app");

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("the chat with an assistant reply and a resolved document type has no detectable accessibility violations", async ({
  page,
}) => {
  await page.route("**/api/document-types/mutual-nda", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mutual-nda",
        templateMarkdown:
          '1. **Introduction**. This MNDA covers the <span class="coverpage_link">Purpose</span>.',
      }),
    });
  });
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Thanks! What's the purpose of this NDA?",
        documentType: "mutual-nda",
        fields: { partyOne: { companyName: "Acme Inc" } },
      }),
    });
  });

  await page.goto("/app");

  // Retry the first send until it round-trips: see chat-flow.spec.ts for the
  // hydration race this guards against.
  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("We are Acme Inc, need an NDA.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Thanks! What's the purpose of this NDA?")).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
