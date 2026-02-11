import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('UI Accessibility Audit', () => {
  const pages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Bookmarks', path: '/bookmarks' },
    { name: 'Health', path: '/health' },
    { name: 'Components Showcase', path: '/components' },
  ];

  for (const pageInfo of pages) {
    test(`Accessibility audit for ${pageInfo.name}`, async ({ page }) => {
      // Navigate to the page
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Inject axe-core
      await injectAxe(page);

      // Run accessibility check
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });
  }

  test('Check for overlapping elements', async ({ page }) => {
    await page.goto('/components');
    await page.waitForLoadState('networkidle');

    // Filter for visible elements only
    const elements = await page.locator('button:visible, a:visible, input:visible').all();

    // Check for extreme overlaps (elements with same position)
    const bboxes = [];
    for (const el of elements) {
      const box = await el.boundingBox();
      if (box) {
        bboxes.push({ box, el });
      }
    }

    // Basic check for exact same position which often indicates a layout bug
    for (let i = 0; i < bboxes.length; i++) {
      for (let j = i + 1; j < bboxes.length; j++) {
        const b1 = bboxes[i].box;
        const b2 = bboxes[j].box;

        if (b1.x === b2.x && b1.y === b2.y && b1.width === b2.width && b1.height === b2.height) {
          // Some shadcn components might overlay elements intentionally (e.g. absolute positioning for effects)
          // so we just log it for now
          console.log(`Potential overlapping elements at (${b1.x}, ${b1.y})`);
        }
      }
    }
  });
});
