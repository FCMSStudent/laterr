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
        // We catch and log but don't necessarily fail here if we want to continue,
        // but standard test behavior is to throw.
        throw e;
      }

      // Check for console errors
      expect(errors, `Found ${errors.length} console errors on ${pageInfo.name}`).toHaveLength(0);

      // Check for failed requests
      expect(failedRequests, `Found ${failedRequests.length} failed network requests on ${pageInfo.name}`).toHaveLength(0);

      // Layout Checks (Overlap, Misalignment, Viewport Overflow)
      const viewport = page.viewportSize();

      // Fetch all necessary data in one go to optimize performance
      const elementsData = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('button, a, input, [role="button"]'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
          });

        return els.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName.toLowerCase(),
            text: (el as HTMLElement).innerText?.substring(0, 20).replace(/\n/g, ' ') || '',
            box: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            },
            hasOverflow: el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
          };
        });
      });

      for (let i = 0; i < elementsData.length; i++) {
        const b1 = elementsData[i].box;
        const tagName1 = elementsData[i].tagName;
        const text1 = elementsData[i].text;

        // Check for elements extending beyond the viewport width
        if (viewport && b1.x + b1.width > viewport.width) {
          const msg = `[${pageInfo.name}] Element extends beyond viewport width: <${tagName1}> "${text1}" is at x=${Math.round(b1.x)} with width=${Math.round(b1.width)} (viewport width=${viewport.width})`;
          expect.soft(b1.x + b1.width, msg).toBeLessThanOrEqual(viewport.width + 1); // Allow 1px sub-pixel rounding slack
        }

        // Check for small touch targets (less than 44x44) - Only for mobile viewports if applicable, but good practice in general
        // We only check if it's not explicitly small by design (some inputs might be)
        if (b1.width < 32 || b1.height < 32) { // Using 32 as a more realistic threshold for general web, 44 is strict mobile
          const msg = `[${pageInfo.name}] Small touch target: <${tagName1}> "${text1}" is ${Math.round(b1.width)}x${Math.round(b1.height)}`;
          expect.soft(Math.min(b1.width, b1.height), msg).toBeGreaterThanOrEqual(32);
        }

        // Check for text overflow
        if (elementsData[i].hasOverflow) {
          const msg = `[${pageInfo.name}] Potential text overflow in <${tagName1}>: "${text1}..."`;
          expect.soft(elementsData[i].hasOverflow, msg).toBeFalsy();
        }

        for (let j = i + 1; j < elementsData.length; j++) {
          const b2 = elementsData[j].box;
          const tagName2 = elementsData[j].tagName;
          const text2 = elementsData[j].text;

          // Intersection Check
          const intersectionX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const intersectionY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          const intersectionArea = intersectionX * intersectionY;

          if (intersectionArea > 0) {
            const area1 = b1.width * b1.height;
            const area2 = b2.width * b2.height;
            const overlapPercent = intersectionArea / Math.min(area1, area2);

            if (overlapPercent > 0.5) { // If 50% of the smaller element is covered
               const msg = `[${pageInfo.name}] Significant element overlap (${Math.round(overlapPercent * 100)}%) between <${tagName1}> "${text1}" and <${tagName2}> "${text2}"`;
               expect.soft(overlapPercent, msg).toBeLessThanOrEqual(0.5);
            }

            // Misalignment check (elements close horizontally but slightly offset vertically)
            const verticalDiff = Math.abs(b1.y - b2.y);
            const horizontalGap = b1.x < b2.x ? b2.x - (b1.x + b1.width) : b1.x - (b2.x + b2.width);

            if (horizontalGap < 20 && verticalDiff > 0 && verticalDiff < 4) {
              const msg = `[${pageInfo.name}] Potential misalignment: <${tagName1}> and <${tagName2}> are vertically offset by ${Math.round(verticalDiff)}px`;
              expect.soft(verticalDiff, msg).toBe(0);
            }
          }
        }
      }
    });
  }
});
