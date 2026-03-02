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

      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      page.on('requestfailed', (request) => {
        failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
      });

      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      await injectAxe(page);
      await checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });

      expect(errors, `Found ${errors.length} console errors on ${pageInfo.name}`).toHaveLength(0);
      expect(
        failedRequests,
        `Found ${failedRequests.length} failed network requests on ${pageInfo.name}`,
      ).toHaveLength(0);
    });
  }

  test('Check for overlapping and misaligned elements', async ({ page }) => {
    await page.goto('/components');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();

    const elementsData = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, input, [role="button"]')).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
      });

      return els.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tagName: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.substring(0, 20) || '',
          box: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          hasOverflow: el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
        };
      });
    });

    for (let i = 0; i < elementsData.length; i++) {
      const b1 = elementsData[i].box;
      const tagName1 = elementsData[i].tagName;
      const text1 = elementsData[i].text;

      if (viewport && b1.x + b1.width > viewport.width) {
        const msg = `Element extends beyond viewport width: <${tagName1}> "${text1}" is at x=${b1.x} with width=${b1.width} (viewport width=${viewport.width})`;
        expect.soft(b1.x + b1.width, msg).toBeLessThanOrEqual(viewport.width);
      }

      if (b1.width < 44 || b1.height < 44) {
        const msg = `Small touch target detected: <${tagName1}> "${text1}" is ${b1.width}x${b1.height} at (${b1.x}, ${b1.y})`;
        expect.soft(b1.width, msg).toBeGreaterThanOrEqual(44);
        expect.soft(b1.height, msg).toBeGreaterThanOrEqual(44);
      }

      if (elementsData[i].hasOverflow) {
        const msg = `Potential text overflow in <${tagName1}>: "${text1}..."`;
        expect.soft(elementsData[i].hasOverflow, msg).toBeFalsy();
      }

      for (let j = i + 1; j < elementsData.length; j++) {
        const b2 = elementsData[j].box;
        const tagName2 = elementsData[j].tagName;
        const text2 = elementsData[j].text;

        const intersectionX = Math.max(0, Math.min(b1.x + b1.width, b2.x + b2.width) - Math.max(b1.x, b2.x));
        const intersectionY = Math.max(0, Math.min(b1.y + b1.height, b2.y + b2.height) - Math.max(b1.y, b2.y));
        const intersectionArea = intersectionX * intersectionY;

        if (intersectionArea > 0) {
          const area1 = b1.width * b1.height;
          const area2 = b2.width * b2.height;
          const overlapPercent = intersectionArea / Math.min(area1, area2);

          if (overlapPercent > 0.5) {
            const msg = `Significant element overlap detected (${Math.round(overlapPercent * 100)}%) between <${tagName1}> "${text1}" and <${tagName2}> "${text2}"`;
            expect.soft(overlapPercent, msg).toBeLessThanOrEqual(0.5);
          }

          const verticalDiff = Math.abs(b1.y - b2.y);
          const horizontalGap = b1.x < b2.x ? b2.x - (b1.x + b1.width) : b1.x - (b2.x + b2.width);
          if (horizontalGap < 50 && verticalDiff > 0 && verticalDiff < 5) {
            const msg = `Potential misalignment detected between <${tagName1}> and <${tagName2}> (${verticalDiff}px vertical offset)`;
            expect.soft(verticalDiff, msg).toBe(0);
          }
        }
      }
    }
  });
});
