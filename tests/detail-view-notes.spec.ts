import { expect, test, type Page } from "@playwright/test";

const openAsGuestIfNeeded = async (page: Page) => {
  if (!page.url().includes("/auth")) {
    return;
  }
  const guestButton = page.getByRole("button", { name: /continue as guest/i });
  const hasGuestButton = await guestButton
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (!hasGuestButton) {
    throw new Error("Guest login is not available.");
  }
  await guestButton.click();
  await page.waitForURL(/\/(dashboard|bookmarks|components|health)/, { timeout: 15000 });
};

const openPath = async (page: Page, path: string) => {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/auth")) {
      await openAsGuestIfNeeded(page);
      continue;
    }
    if (page.url().includes(path)) {
      return;
    }
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }
  throw new Error(`Unable to access ${path}. Current URL: ${page.url()}`);
};

const mockUrlItem = {
  id: "e2e-detail-notes-1",
  user_id: "00000000-0000-0000-0000-000000000000",
  type: "url",
  title: "E2E URL bookmark",
  content: "https://example.com/product",
  summary: "Test summary for E2E",
  user_notes: "",
  tags: ["read later"],
  preview_image_url: "https://example.com/og.jpg",
  embedding: null,
  created_at: "2026-01-15T12:00:00.000Z",
  updated_at: "2026-01-15T12:00:00.000Z",
  deleted_at: null,
  category: null,
  category_id: null,
  metadata: null,
};

/**
 * Mocks Supabase REST for `items` so bookmarks grid has a URL card without relying on seeded DB.
 * Complements tests/cards-overlays.spec.ts (which skips when no data).
 */
test.describe("Detail view Notes focus (mocked items API)", () => {
  test("Notes textarea stays focused while typing", async ({ page }) => {
    await page.route("**/rest/v1/items**", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-range": "0-0/1",
          },
          body: JSON.stringify([mockUrlItem]),
        });
        return;
      }
      if (method === "PATCH" || method === "POST" || method === "DELETE") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: method === "DELETE" ? "{}" : JSON.stringify(mockUrlItem),
        });
        return;
      }
      await route.continue();
    });

    await openPath(page, "/bookmarks");

    await expect
      .poll(
        async () => (await page.locator("[data-testid^='bookmark-card-']").count()) > 0,
        { timeout: 20000 },
      )
      .toBeTruthy();

    const mediaCard = page
      .locator("[data-testid^='bookmark-card-']")
      .filter({ has: page.getByTestId("bookmark-card-overlay") })
      .first();
    await mediaCard.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });

    const notes = page.getByPlaceholder("Add your notes...");
    await notes.waitFor({ state: "visible", timeout: 10000 });
    await notes.click();
    await page.keyboard.type("e2e-focus");
    await expect(notes).toBeFocused();
  });
});
