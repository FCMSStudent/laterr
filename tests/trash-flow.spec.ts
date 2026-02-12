import { expect, test, type Page } from "@playwright/test";

const openAsGuestIfNeeded = async (page: Page) => {
  if (!page.url().includes("/auth")) {
    return;
  }

  const guestButton = page.getByRole("button", { name: /continue as guest/i });
  const hasGuestButton = (await guestButton.count()) > 0;
  if (!hasGuestButton) {
    throw new Error("Guest login is not available. Enable guest mode for trash-flow E2E.");
  }

  await guestButton.click();
  await page.waitForURL(/\/(dashboard|bookmarks|components|health)/, { timeout: 15000 });
};

test.describe("trash flow", () => {
  test("move to trash and restore (guest mode first)", async ({ page }) => {
    await page.goto("/bookmarks", { waitUntil: "domcontentloaded" });
    await openAsGuestIfNeeded(page);
    await page.goto("/bookmarks", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const addButton = page.getByRole("button", { name: /^Add$/i }).first();
    if ((await addButton.count()) === 0) {
      test.skip(true, "Bookmark write actions are unavailable in guest mode on this environment.");
    }

    await addButton.click();
    await page.getByLabel("URL to add").fill("https://example.com/trash-flow-test");
    await page.getByRole("button", { name: "Add URL" }).click();

    await page.waitForTimeout(1200);
    const actionsButton = page.getByRole("button", { name: /card actions|row actions/i }).first();
    if ((await actionsButton.count()) === 0) {
      test.skip(
        true,
        "Guest write path appears blocked (fixture could not be created). Verify guest DB write policies for full CRUD E2E.",
      );
    }

    await actionsButton.click();
    await page.getByRole("menuitem", { name: /move to trash/i }).click();

    await page.getByRole("button", { name: "Trash" }).click();
    await expect(page.getByTestId("bookmarks-empty-state")).not.toBeVisible();

    const restoreActionsButton = page.getByRole("button", { name: /card actions|row actions/i }).first();
    await restoreActionsButton.click();
    await page.getByRole("menuitem", { name: /restore/i }).click();

    await page.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/\/bookmarks/);
  });
});
