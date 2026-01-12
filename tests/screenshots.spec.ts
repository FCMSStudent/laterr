import { test, expect, Page } from '@playwright/test';
import { routes, authConfig } from './routes.config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Automated Screenshot Capture for All Routes
 * 
 * This test suite captures full-page screenshots of every route in the application.
 * Screenshots are saved to the /screenshots directory with clear naming based on route paths.
 * 
 * Features:
 * - Optional authentication (configurable via authConfig)
 * - Base URL from environment variable
 * - Waits for network idle before capturing
 * - Full-page screenshots
 * - Deterministic and reproducible
 */

// Ensure screenshots directory exists
const screenshotsDir = path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

/**
 * Performs login if authentication is enabled
 * @param page - Playwright page object
 */
async function performLogin(page: Page) {
  if (!authConfig.enabled) {
    console.log('Authentication disabled, skipping login');
    return;
  }

  console.log('Performing login...');
  
  // Navigate to auth page
  await page.goto('/auth');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Fill in login credentials using id selectors
  await page.fill('#email', authConfig.email);
  await page.fill('#password', authConfig.password);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForLoadState('networkidle');
  
  // Wait a bit for any post-login redirects or state updates
  await page.waitForTimeout(3000);
  
  console.log('Login completed');
}

/**
 * Sanitizes route path to create valid filename
 * @param routePath - The route path to sanitize
 * @returns Sanitized filename
 */
function sanitizeFileName(routePath: string): string {
  return routePath
    .replace(/^\//, '') // Remove leading slash
    .replace(/\//g, '-') // Replace slashes with dashes
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace special chars with underscore
    || 'root'; // Use 'root' for empty string (home page)
}

// Test suite for screenshot capture
test.describe('Screenshot Capture', () => {
  // Perform login once before all tests if auth is enabled
  test.beforeAll(async ({ browser }) => {
    if (!authConfig.enabled) {
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await performLogin(page);
      
      // Save authentication state for reuse
      await context.storageState({ 
        path: path.join(screenshotsDir, '.auth.json') 
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      await context.close();
    }
  });

  // Use authenticated state for all tests if auth was performed
  test.use(async ({ browser }, use) => {
    const authFile = path.join(screenshotsDir, '.auth.json');
    
    if (authConfig.enabled && fs.existsSync(authFile)) {
      const context = await browser.newContext({
        storageState: authFile,
      });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } else {
      const context = await browser.newContext();
      const page = await context.newPage();
      await use(page);
      await context.close();
    }
  });

  // Create a test for each route
  for (const route of routes) {
    test(`Capture screenshot: ${route.name}`, async ({ page }) => {
      console.log(`Capturing screenshot for: ${route.path}`);

      // Navigate to the route
      await page.goto(route.path);

      // Wait for network to be idle (no ongoing requests)
      await page.waitForLoadState('networkidle');

      // Additional wait for any animations or dynamic content
      await page.waitForTimeout(1000);

      // Hide dynamic elements if needed (timestamps, etc.)
      // This helps ensure reproducible screenshots
      await page.addStyleTag({
        content: `
          /* Hide potentially dynamic elements for screenshot consistency */
          [data-testid="timestamp"],
          .timestamp,
          .live-indicator,
          .current-time {
            visibility: hidden !important;
          }
        `,
      });

      // Capture full-page screenshot
      const fileName = `${sanitizeFileName(route.path)}.png`;
      const screenshotPath = path.join(screenshotsDir, fileName);

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`Screenshot saved: ${screenshotPath}`);

      // Verify screenshot was created
      expect(fs.existsSync(screenshotPath)).toBeTruthy();
    });
  }
});
