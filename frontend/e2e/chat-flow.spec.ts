import { test, expect } from "@playwright/test";

const COMPLETE_FIELDS = {
  partyOne: {
    companyName: "Acme Inc",
    signerName: "Jane Doe",
    signerTitle: "CEO",
    noticeAddress: "jane@acme.com",
  },
  partyTwo: {
    companyName: "Widgets LLC",
    signerName: "John Roe",
    signerTitle: "COO",
    noticeAddress: "john@widgets.com",
  },
  purpose: "Evaluating a potential partnership",
  effectiveDate: "2026-07-14",
  mndaTermType: "expires",
  mndaTermYears: 2,
  confidentialityTermType: "years",
  confidentialityTermYears: 3,
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

test("chatting with the assistant fills the preview and produces a downloadable PDF", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Great, I have everything I need. Your NDA is ready to preview and download.",
        fields: COMPLETE_FIELDS,
      }),
    });
  });

  await page.goto("/app");

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeDisabled();

  const preview = page.getByRole("region", { name: "NDA preview" });

  // Retry the first send until it round-trips: an early submit on a still-
  // hydrating page can be dropped before React attaches its handlers (same
  // race documented in earlier login/nda-flow specs).
  await expect(async () => {
    await page
      .getByLabel("Message")
      .fill("We are Acme Inc and Widgets LLC, evaluating a partnership.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText("Great, I have everything I need.", { exact: false })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();

  await expect(preview.getByText("Acme Inc")).toBeVisible();
  await expect(preview.getByText("Widgets LLC")).toBeVisible();
  await expect(preview.locator("dd", { hasText: "July 14, 2026" })).toBeVisible();
  await expect(preview.locator("dd", { hasText: "Delaware" })).toBeVisible();

  await expect(downloadButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

  expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
});

test("the download button is disabled until the assistant has all required fields", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Thanks! What's the purpose of this NDA?",
        fields: { partyOne: { companyName: "Acme Inc" } },
      }),
    });
  });

  await page.goto("/app");

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeDisabled();
  await expect(
    page.getByText("Keep chatting to fill in all required fields before downloading.")
  ).toBeVisible();
});
