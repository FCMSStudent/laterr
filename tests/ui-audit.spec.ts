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

      // --- Layout Audit (Overlapping and Misaligned elements) ---
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
            text: (el as HTMLElement).innerText?.substring(0, 20) || '',
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
        const e1 = elementsData[i];
        const b1 = e1.box;

        // Check for elements extending beyond the viewport width
        if (viewport && b1.x + b1.width > viewport.width) {
          const msg = `Element extends beyond viewport width on ${pageInfo.name}: <${e1.tagName}> "${e1.text}" is at x=${b1.x} with width=${b1.width} (viewport width=${viewport.width})`;
          expect.soft(b1.x + b1.width, msg).toBeLessThanOrEqual(viewport.width);
        }

        // Check for small touch targets (less than 44x44)
        if (b1.width < 44 || b1.height < 44) {
          const msg = `Small touch target detected on ${pageInfo.name}: <${e1.tagName}> "${e1.text}" is ${b1.width}x${b1.height} at (${b1.x}, ${b1.y})`;
          expect.soft(b1.width, msg).toBeGreaterThanOrEqual(44);
          expect.soft(b1.height, msg).toBeGreaterThanOrEqual(44);
        }

        // Check for text overflow
        if (e1.hasOverflow) {
          const msg = `Potential text overflow on ${pageInfo.name} in <${e1.tagName}>: "${e1.text}..."`;
          expect.soft(e1.hasOverflow, msg).toBeFalsy();
        }

        for (let j = i + 1; j < elementsData.length; j++) {
          const e2 = elementsData[j];
          const b2 = e2.box;

          // Intersection Check
          const intersectionX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
          const intersectionY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
          const intersectionArea = intersectionX * intersectionY;

          if (intersectionArea > 0) {
            const area1 = b1.width * b1.height;
            const area2 = b2.width * b2.height;
            const overlapPercent = intersectionArea / Math.min(area1, area2);

            if (overlapPercent > 0.5) { // If 50% of the smaller element is covered
               const msg = `Significant element overlap detected (${Math.round(overlapPercent * 100)}%) on ${pageInfo.name} between <${e1.tagName}> "${e1.text}" and <${e2.tagName}> "${e2.text}"`;
               expect.soft(overlapPercent, msg).toBeLessThanOrEqual(0.5);
            }
          }

          // Misalignment check (elements close horizontally but slightly offset vertically)
          const verticalDiff = Math.abs(b1.y - b2.y);
          const horizontalGap = b1.x < b2.x ? b2.x - (b1.x + b1.width) : b1.x - (b2.x + b2.width);

          if (horizontalGap < 50 && verticalDiff > 0 && verticalDiff < 5) {
            const msg = `Potential misalignment on ${pageInfo.name}: <${e1.tagName}> and <${e2.tagName}> are vertically offset by ${verticalDiff}px`;
            expect.soft(verticalDiff, msg).toBe(0);
          }
        }
      }
    });
  }
});
