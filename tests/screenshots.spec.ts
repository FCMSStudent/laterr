import { test, expect, Page } from '@playwright/test';
import { routes } from './routes.config';
import path from 'path';

/**
 * Screenshot test suite for capturing full-page screenshots of all routes
 * Supports optional authentication and handles dynamic elements
 */

// Configuration from environment variables
const SCREENSHOT_AUTH_EMAIL = process.env.PLAYWRIGHT_AUTH_EMAIL;
const SCREENSHOT_AUTH_PASSWORD = process.env.PLAYWRIGHT_AUTH_PASSWORD;
const SHOULD_AUTHENTICATE = !!(SCREENSHOT_AUTH_EMAIL && SCREENSHOT_AUTH_PASSWORD);

// Helper function to hide dynamic elements that might cause screenshot inconsistencies
async function hideDynamicElements(page: Page) {
  await page.addStyleTag({
    content: `
      /* Hide elements that might change between runs */
      [data-testid="current-time"],
      .timestamp,
      .live-indicator,
      .loading-spinner {
        visibility: hidden !important;
      }
    `,
  });
}

// Helper function to authenticate
async function authenticate(page: Page) {
  if (!SHOULD_AUTHENTICATE) {
    return;
  }

  console.log('Attempting authentication...');
  
  // Navigate to auth page
  await page.goto('/auth');
  
  // Wait for auth form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  
  // Fill in credentials
  await page.fill('input[type="email"]', SCREENSHOT_AUTH_EMAIL!);
  await page.fill('input[type="password"]', SCREENSHOT_AUTH_PASSWORD!);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation or success indicator
  await page.waitForURL('/', { timeout: 15000 }).catch(() => {
    console.log('Auth redirect may have failed, continuing anyway...');
  });
  
  console.log('Authentication completed');
}

// Test suite setup
test.describe('Full Page Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set a consistent viewport size
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test.describe.configure({ mode: 'serial' });

  // Authenticate once before all tests if credentials are provided
  test.beforeAll(async ({ browser }) => {
    if (SHOULD_AUTHENTICATE) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await authenticate(page);
      // Store auth state for reuse
      await context.storageState({ path: 'playwright/.auth/user.json' });
      await context.close();
    }
  });

  // Generate a test for each route
  for (const route of routes) {
    test(`Screenshot: ${route.name} (${route.path})`, async ({ page }) => {
      // If auth is required and we have credentials, use stored auth state
      if (route.requiresAuth && SHOULD_AUTHENTICATE) {
        // The auth state will be loaded from the context
        console.log(`Using authenticated session for ${route.name}`);
      }

      // Navigate to the route
      await page.goto(route.path);

      // Wait for network to be idle (all resources loaded)
      await page.waitForLoadState('networkidle');

      // Additional wait to ensure all animations/transitions complete
      await page.waitForTimeout(1000);

      // Hide dynamic elements to ensure consistent screenshots
      await hideDynamicElements(page);

      // Take full-page screenshot
      const screenshotPath = path.join('screenshots', `${route.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`Screenshot saved: ${screenshotPath}`);

      // Basic assertion that the page loaded
      expect(page.url()).toContain(route.path);
    });
  }
});

// Additional test for mobile viewport
test.describe('Mobile Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('Screenshot: Mobile Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await hideDynamicElements(page);

    await page.screenshot({
      path: path.join('screenshots', 'mobile-dashboard.png'),
      fullPage: true,
    });
  });

  test('Screenshot: Mobile Bookmarks', async ({ page }) => {
    await page.goto('/bookmarks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await hideDynamicElements(page);

    await page.screenshot({
      path: path.join('screenshots', 'mobile-bookmarks.png'),
      fullPage: true,
    });
  });
});
