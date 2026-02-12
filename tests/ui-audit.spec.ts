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
    // Also check for target size (WCAG 2.1 Success Criterion 2.5.5)
    for (let i = 0; i < bboxes.length; i++) {
      const b1 = bboxes[i].box;
      const el1 = bboxes[i].el;

      // Check for small touch targets (less than 44x44)
      if (b1.width < 44 || b1.height < 44) {
        const tagName = await el1.evaluate(node => node.tagName.toLowerCase());
        const innerText = await el1.innerText();
        console.warn(`Small touch target detected: <${tagName}> "${innerText.substring(0, 20)}" is ${b1.width}x${b1.height} at (${b1.x}, ${b1.y})`);
      }

      // Check for text overflow
      const hasOverflow = await el1.evaluate(node => {
        const el = node as HTMLElement;
        return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      });
      if (hasOverflow) {
        const tagName = await el1.evaluate(node => node.tagName.toLowerCase());
        const text = await el1.innerText();
        console.warn(`Potential text overflow in <${tagName}>: "${text.substring(0, 20)}..."`);
      }

      for (let j = i + 1; j < bboxes.length; j++) {
        const b2 = bboxes[j].box;

        // Exact overlap
        if (b1.x === b2.x && b1.y === b2.y && b1.width === b2.width && b1.height === b2.height) {
          console.log(`Potential overlapping elements at (${b1.x}, ${b1.y})`);
        }

        // Significant intersection (could indicate layout failure)
        const intersectionX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
        const intersectionY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
        const intersectionArea = intersectionX * intersectionY;

        if (intersectionArea > 0) {
          const area1 = b1.width * b1.height;
          const area2 = b2.width * b2.height;
          const overlapPercent = intersectionArea / Math.min(area1, area2);

          if (overlapPercent > 0.8) { // If 80% of the smaller element is covered
             console.warn(`High element overlap detected (${Math.round(overlapPercent * 100)}%) between elements at (${b1.x}, ${b1.y}) and (${b2.x}, ${b2.y})`);
          }
        }
      }
    }
  });
});
