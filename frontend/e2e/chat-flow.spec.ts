import { test, expect } from "@playwright/test";
import { signUpAndLand } from "./auth-helpers";

const NDA_TEMPLATE_MARKDOWN = [
  "# Standard Terms",
  "",
  '1. **Introduction**. This MNDA covers the <span class="coverpage_link">Purpose</span>.',
  "",
  '2. **Term**. Commences on the <span class="coverpage_link">Effective Date</span>, governed by <span class="coverpage_link">Governing Law</span>.',
].join("\n");

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

async function mockDocumentTypeTemplate(page: import("@playwright/test").Page) {
  await page.route("**/api/document-types/mutual-nda", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mutual-nda", templateMarkdown: NDA_TEMPLATE_MARKDOWN }),
    });
  });
}

test("chatting with the assistant resolves a document type, fills the preview, and produces a downloadable PDF", async ({
  page,
}) => {
  await mockDocumentTypeTemplate(page);
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Great, I have everything I need. Your NDA is ready to preview and download.",
        documentType: "mutual-nda",
        fields: COMPLETE_FIELDS,
      }),
    });
  });

  await signUpAndLand(page);

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeDisabled();

  const preview = page.getByRole("region", { name: "Document preview" });

  // Retry the first send until it round-trips: an early submit on a still-
  // hydrating page can be dropped before React attaches its handlers (same
  // race documented in earlier login/nda-flow specs).
  await expect(async () => {
    await page
      .getByLabel("Message", { exact: true })
      .fill("We are Acme Inc and Widgets LLC, evaluating a partnership - need an NDA.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText("Great, I have everything I need.", { exact: false })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();

  await expect(preview.getByRole("heading", { name: "Mutual NDA - Cover Page" })).toBeVisible();
  await expect(preview.getByText("Acme Inc")).toBeVisible();
  await expect(preview.getByText("Widgets LLC")).toBeVisible();
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
  await mockDocumentTypeTemplate(page);
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

  await signUpAndLand(page);

  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("We need an NDA with Acme Inc.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Thanks! What's the purpose of this NDA?")).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeDisabled();
  await expect(
    page.getByText("Keep chatting to fill in all required fields before downloading.")
  ).toBeVisible();
});

test("explains an unsupported document request and suggests the closest supported type", async ({
  page,
}) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply:
          "We can't generate an Employment Agreement, but a Design Partner Agreement might fit - want to try that instead?",
      }),
    });
  });

  await signUpAndLand(page);

  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("I need an employment agreement.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByText("We can't generate an Employment Agreement", { exact: false })
    ).toBeVisible({ timeout: 1000 });
  }).toPass();

  await expect(
    page.getByText("Tell the assistant what document you need to see a live preview here.")
  ).toBeVisible();
});
