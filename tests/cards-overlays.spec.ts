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
    throw new Error("Guest login is not available. Enable guest mode or provide E2E credentials.");
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

const waitForBookmarksSurface = async (page: Page) => {
  await expect
    .poll(
      async () => {
        const hasCollection = (await page.getByTestId("bookmarks-collection").count()) > 0;
        const hasEmptyState = (await page.getByTestId("bookmarks-empty-state").count()) > 0;
        return hasCollection || hasEmptyState;
      },
      { timeout: 15000 },
    )
    .toBeTruthy();
};

test.describe("Card and Overlay Components", () => {
  test.describe("BookmarkCard", () => {
    test("should navigate to bookmarks page", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await expect(page).toHaveURL(/\/bookmarks/);
    });

    test("shows either collection or empty state", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await waitForBookmarksSurface(page);

      const hasCollection = (await page.getByTestId("bookmarks-collection").count()) > 0;
      const hasEmptyState = (await page.getByTestId("bookmarks-empty-state").count()) > 0;

      expect(hasCollection || hasEmptyState).toBeTruthy();
    });

    test("applies expected layering classes when cards are present", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await waitForBookmarksSurface(page);

      const cards = page.locator("[data-testid^='bookmark-card-']");
      if ((await cards.count()) === 0) {
        await expect(page.getByTestId("bookmarks-empty-state")).toBeVisible();
        return;
      }

      const mediaCards = cards.filter({ has: page.getByTestId("bookmark-card-overlay") });
      if ((await mediaCards.count()) === 0) {
        // Data set can contain note-only cards; layering assertion is media-card specific.
        await expect(cards.first()).toBeVisible();
        return;
      }

      const firstCard = mediaCards.first();
      await expect(firstCard).toBeVisible();

      const overlay = firstCard.getByTestId("bookmark-card-overlay");
      await expect(overlay).toBeAttached();
      await expect(overlay).toHaveClass(/z-30/);
      await expect(overlay).toHaveAttribute("data-contrast-mode", /^(light-text|dark-text)$/);

      const image = firstCard.getByTestId("bookmark-card-image");
      if ((await image.count()) > 0) {
        await expect(image).toBeVisible();
        await expect(image).toHaveClass(/z-20/);
      }
    });

    test("opens and closes card action menu when available", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await waitForBookmarksSurface(page);

      const actionButton = page
        .getByRole("button", { name: /card actions|row actions/i })
        .first();

      if ((await actionButton.count()) === 0) {
        await expect(page.getByTestId("bookmarks-empty-state")).toBeVisible();
        return;
      }

      await actionButton.click();
      await expect(page.locator("[role='menu']").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });

  test.describe("DetailViewModal Notes", () => {
    test("Notes textarea stays focused while typing on URL bookmark detail", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await waitForBookmarksSurface(page);

      const cards = page.locator("[data-testid^='bookmark-card-']");
      test.skip((await cards.count()) === 0, "requires at least one bookmark card");

      // URL items open DetailViewModal; note items open NoteEditorModal. Prefer media cards; fallback to "Read Later" URL cards without overlay.
      const mediaCards = cards.filter({ has: page.getByTestId("bookmark-card-overlay") });
      const urlReadLater = page.getByRole("article", { name: /^Read Later:/i });
      const mediaCount = await mediaCards.count();
      const readLaterCount = await urlReadLater.count();
      if (mediaCount === 0 && readLaterCount === 0) {
        test.skip(true, "requires a non-note URL bookmark (media card or Read Later)");
      }
      const targetCard = mediaCount > 0 ? mediaCards.first() : urlReadLater.first();
      await targetCard.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });

      const notes = page.getByPlaceholder("Add your notes...");
      await notes.waitFor({ state: "visible", timeout: 10000 });
      await notes.click();
      await page.keyboard.type("playwright");
      await expect(notes).toBeFocused();
    });
  });

  test.describe("NoteEditorModal", () => {
    test("rich text block stays focused while typing when a note card exists", async ({ page }) => {
      await openPath(page, "/bookmarks");
      await waitForBookmarksSurface(page);

      const noteArticles = page.getByRole("article", { name: /^Note:/ });
      const noteCount = await noteArticles.count();
      test.skip(noteCount === 0, "requires at least one note card in the list");

      await noteArticles.first().click();
      await page.getByRole("button", { name: /^Text$/i }).click();
      const input = page.getByPlaceholder("Text...");
      await input.click();
      await page.keyboard.type("hello");
      await expect(input).toBeFocused();
    });
  });

  test.describe("Components Showcase", () => {
    test("loads component showcase page", async ({ page }) => {
      await openPath(page, "/components");
      await expect(page.getByRole("heading", { name: "UI Components Showcase" })).toBeVisible();
    });

    test("opens and closes dialog", async ({ page }) => {
      await openPath(page, "/components");
      await page.getByRole("button", { name: "open-dialog-demo" }).click();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("opens and closes drawer", async ({ page }) => {
      await openPath(page, "/components");
      await page.getByRole("button", { name: "open-drawer-demo" }).click();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("opens and closes sheet", async ({ page }) => {
      await openPath(page, "/components");
      await page.getByRole("button", { name: "open-sheet-demo" }).click();
      await expect(page.getByRole("dialog").first()).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("opens and closes popover", async ({ page }) => {
      await openPath(page, "/components");
      await page.getByRole("button", { name: "open-popover-demo" }).click();
      await expect(page.getByText("Popover Title")).toBeVisible();
      await page.keyboard.press("Escape");
    });

    test("shows hover card content", async ({ page }) => {
      await openPath(page, "/components");
      const trigger = page.getByRole("button", { name: "hovercard-trigger" });
      await trigger.hover();
      await expect(page.getByText("User bio and information displayed on hover")).toBeVisible();
    });

    test("shows tooltip content", async ({ page }) => {
      await openPath(page, "/components");
      const trigger = page.getByRole("button", { name: "tooltip-trigger" });
      await trigger.hover();
      await expect(page.getByRole("tooltip").getByText("This is tooltip content")).toBeVisible();
    });
  });

  test.describe("Responsive + Guest Access", () => {
    test("bookmarks page works on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await openPath(page, "/bookmarks");
      await expect(page).toHaveURL(/\/bookmarks/);
    });

    test("guest can access major routes", async ({ page }) => {
      await openPath(page, "/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);

      await openPath(page, "/bookmarks");
      await expect(page).toHaveURL(/\/bookmarks/);

      await openPath(page, "/health");
      await expect(page).toHaveURL(/\/health/);

      await openPath(page, "/components");
      await expect(page).toHaveURL(/\/components/);
    });
  });
});
