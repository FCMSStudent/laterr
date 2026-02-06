import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("trash flow", () => {
  test.skip(!email || !password, "E2E credentials not provided");

  test("move to trash and restore", async ({ page }) => {
    await page.goto("/auth");

    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/bookmarks");

    await page.getByLabel("Add new item").click();
    await page.getByPlaceholder(/paste a url/i).fill("https://example.com");
    await page.getByRole("button", { name: /add url/i }).click();

    const actionsButton = page.getByLabel("Card actions").first();
    await actionsButton.click();
    await page.getByRole("menuitem", { name: /move to trash/i }).click();

    await page.getByRole("button", { name: "Trash" }).click();
    await expect(page.getByText("Trash is empty")).not.toBeVisible();

    const restoreActionsButton = page.getByLabel("Card actions").first();
    await restoreActionsButton.click();
    await page.getByRole("menuitem", { name: /restore/i }).click();

    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("Trash is empty")).not.toBeVisible();
  });
});
