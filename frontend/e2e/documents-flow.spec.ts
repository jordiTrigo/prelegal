import { test, expect } from "@playwright/test";
import { signUpAndLand } from "./auth-helpers";

const NDA_TEMPLATE_MARKDOWN =
  '1. **Introduction**. This MNDA covers the <span class="coverpage_link">Purpose</span>.';

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

test("a downloaded document appears in My Documents and can be re-downloaded", async ({
  page,
}) => {
  await page.route("**/api/document-types/mutual-nda", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mutual-nda", templateMarkdown: NDA_TEMPLATE_MARKDOWN }),
    });
  });
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: "Great, your NDA is ready to preview and download.",
        documentType: "mutual-nda",
        fields: COMPLETE_FIELDS,
      }),
    });
  });

  await signUpAndLand(page);

  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("We need an NDA for Acme and Widgets.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Great, your NDA is ready", { exact: false })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  const downloadButton = page.getByRole("button", { name: "Download PDF" });
  await expect(downloadButton).toBeEnabled();
  await Promise.all([page.waitForEvent("download"), downloadButton.click()]);

  await page.getByRole("link", { name: "My Documents" }).click();
  await expect(page).toHaveURL(/\/documents(\?.*)?$/);
  await expect(page.getByText("Mutual NDA - Cover Page")).toBeVisible();

  const [redownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);
  expect(redownload.suggestedFilename()).toBe("mutual-nda.pdf");
});

test("editing a document from My Documents updates the same history entry", async ({ page }) => {
  await page.route("**/api/document-types/mutual-nda", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "mutual-nda", templateMarkdown: NDA_TEMPLATE_MARKDOWN }),
    });
  });

  let chatCallCount = 0;
  await page.route("**/api/chat", async (route) => {
    chatCallCount += 1;
    const fields =
      chatCallCount === 1 ? COMPLETE_FIELDS : { ...COMPLETE_FIELDS, purpose: "Revised purpose" };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply:
          chatCallCount === 1
            ? "Great, your NDA is ready to preview and download."
            : "Updated the purpose for you.",
        documentType: "mutual-nda",
        fields,
      }),
    });
  });

  await signUpAndLand(page);

  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("We need an NDA for Acme and Widgets.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Great, your NDA is ready", { exact: false })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);

  await page.getByRole("link", { name: "My Documents" }).click();
  await expect(page).toHaveURL(/\/documents(\?.*)?$/);
  await expect(page.getByText("Mutual NDA - Cover Page")).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);
  await expect(page.getByText(/Welcome back/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Document preview" }).getByText("Acme Inc")
  ).toBeVisible();

  await expect(async () => {
    await page.getByLabel("Message", { exact: true }).fill("Actually, change the purpose.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Updated the purpose for you.", { exact: false })).toBeVisible({
      timeout: 1000,
    });
  }).toPass();

  await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).click(),
  ]);

  await page.getByRole("link", { name: "My Documents" }).click();
  await expect(page).toHaveURL(/\/documents(\?.*)?$/);
  // Still exactly one Mutual NDA entry: editing updated the existing history
  // row rather than creating a second one alongside it.
  await expect(page.getByText("Mutual NDA - Cover Page")).toHaveCount(1);
});

test("My Documents shows an empty state for a new user", async ({ page }) => {
  await signUpAndLand(page);
  await page.getByRole("link", { name: "My Documents" }).click();

  await expect(page.getByText("You haven't created any documents yet.")).toBeVisible();
});
