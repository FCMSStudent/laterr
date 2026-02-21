import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('UI Accessibility Audit', () => {
  const pages = [
    { name: 'Landing', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Bookmarks', path: '/bookmarks' },
    { name: 'Subscriptions', path: '/subscriptions' },
    { name: 'Health', path: '/health' },
    { name: 'Settings', path: '/settings' },
    { name: 'Auth', path: '/auth' },
    { name: 'Components Showcase', path: '/components' },
  ];

  for (const pageInfo of pages) {
    test(`Full audit for ${pageInfo.name}`, async ({ page }) => {
      const errors: string[] = [];
      const failedRequests: string[] = [];

      // Monitor console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Monitor failed requests
      page.on('requestfailed', request => {
        failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
      });

      // Navigate to the page
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Inject axe-core
      await injectAxe(page);

      // Run accessibility check
      try {
        await checkA11y(page, undefined, {
          detailedReport: true,
          detailedReportOptions: { html: true },
        });
      } catch (e) {
        console.error(`Accessibility issues found on ${pageInfo.name}`);
        throw e;
      }

      // Check for console errors
      expect(errors, `Found ${errors.length} console errors on ${pageInfo.name}`).toHaveLength(0);

      // Check for failed requests
      expect(failedRequests, `Found ${failedRequests.length} failed network requests on ${pageInfo.name}`).toHaveLength(0);
    });
  }

  test('Check for overlapping and misaligned elements', async ({ page }) => {
    await page.goto('/components');
    await page.waitForLoadState('networkidle');

    // Filter for visible elements only
    const elements = await page.locator('button:visible, a:visible, input:visible, [role="button"]:visible').all();

    const bboxes = [];
    for (const el of elements) {
      const box = await el.boundingBox();
      if (box) {
        bboxes.push({ box, el });
      }
    }

    for (let i = 0; i < bboxes.length; i++) {
      const b1 = bboxes[i].box;
      const el1 = bboxes[i].el;
      const tagName1 = await el1.evaluate(node => node.tagName.toLowerCase());
      const text1 = (await el1.innerText()).substring(0, 20);

      // Check for small touch targets (less than 44x44)
      if (b1.width < 44 || b1.height < 44) {
        const msg = `Small touch target detected: <${tagName1}> "${text1}" is ${b1.width}x${b1.height} at (${b1.x}, ${b1.y})`;
        expect.soft(b1.width, msg).toBeGreaterThanOrEqual(44);
        expect.soft(b1.height, msg).toBeGreaterThanOrEqual(44);
      }

      // Check for text overflow
      const hasOverflow = await el1.evaluate(node => {
        const el = node as HTMLElement;
        return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      });
      if (hasOverflow) {
        const msg = `Potential text overflow in <${tagName1}>: "${text1}..."`;
        expect.soft(hasOverflow, msg).toBeFalsy();
      }

      for (let j = i + 1; j < bboxes.length; j++) {
        const b2 = bboxes[j].box;
        const el2 = bboxes[j].el;
        const tagName2 = await el2.evaluate(node => node.tagName.toLowerCase());
        const text2 = (await el2.innerText()).substring(0, 20);

        // Intersection Check
        const intersectionX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
        const intersectionY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
        const intersectionArea = intersectionX * intersectionY;

        if (intersectionArea > 0) {
          const area1 = b1.width * b1.height;
          const area2 = b2.width * b2.height;
          const overlapPercent = intersectionArea / Math.min(area1, area2);

          if (overlapPercent > 0.5) { // If 50% of the smaller element is covered
             const msg = `Significant element overlap detected (${Math.round(overlapPercent * 100)}%) between <${tagName1}> "${text1}" and <${tagName2}> "${text2}"`;
             expect.soft(overlapPercent, msg).toBeLessThanOrEqual(0.5);
          }
        }

        // Misalignment check (elements close horizontally but slightly offset vertically)
        const verticalDiff = Math.abs(b1.y - b2.y);
        const horizontalGap = b1.x < b2.x ? b2.x - (b1.x + b1.width) : b1.x - (b2.x + b2.width);

        if (horizontalGap < 50 && verticalDiff > 0 && verticalDiff < 5) {
         const msg = `Potential misalignment: <${tagName1}> "${text1}" and <${tagName2}> "${text2}" are vertically offset by ${verticalDiff}px at y=${b1.y}`;
           expect.soft(verticalDiff, msg).toBe(0);
        }
      }
    }
  });
});
