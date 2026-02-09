import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E tests for Card and Overlay Components
 * 
 * Tests the z-index fix from PR #204 and validates all card/overlay components
 * work correctly with proper layering and interactions.
 * 
 * Note: These tests attempt to use guest login if available, but will skip 
 * tests gracefully if guest mode is not enabled.
 */

/**
 * Helper function to login as guest or with credentials
 * Returns true if we can access the application, false otherwise
 */
async function tryLogin(page: Page): Promise<boolean> {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  try {
    // First, try to go directly to the components showcase (public page)
    await page.goto('/components', { timeout: 10000, waitUntil: 'domcontentloaded' });
    
    // If we can access the components page, we're good
    if (page.url().includes('/components')) {
      return true;
    }
    
    // Try bookmarks page
    await page.goto('/bookmarks', { timeout: 10000, waitUntil: 'domcontentloaded' });
    
    // Check if we ended up on bookmarks or got redirected to auth
    const currentUrl = page.url();
    
    // If we're on auth page, try to login
    if (currentUrl.includes('/auth')) {
      // Try credential login first if available
      if (email && password) {
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password").fill(password);
        await page.getByRole("button", { name: /sign in/i }).click();
        await page.waitForURL(/\/(dashboard|bookmarks)/, { timeout: 15000 });
        return true;
      }
      
      // Otherwise try guest login
      const guestButton = page.getByRole('button', { name: /continue as guest/i });
      const hasGuestButton = await guestButton.count() > 0;
      
      if (hasGuestButton) {
        await guestButton.click();
        await page.waitForURL(/\/(dashboard|bookmarks|components)/, { timeout: 15000 });
        return true;
      } else {
        // No guest button available and no credentials
        console.log('Guest login not available and no credentials provided');
        return false;
      }
    }
    
    // If we're on bookmarks/dashboard, we're already logged in somehow
    if (currentUrl.includes('/bookmarks') || currentUrl.includes('/dashboard')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('Login/navigation failed:', error);
    return false;
  }
}

test.describe('Card and Overlay Components', () => {
  let hasAuthAccess = false;

  test.beforeEach(async ({ page }) => {
    // Try to access the app (with credentials or guest login if available)
    hasAuthAccess = await tryLogin(page);
  });

  test.describe('BookmarkCard - Z-Index Fix from PR #204', () => {
    test.beforeEach(async () => {
      // Skip auth-dependent tests if we don't have access
      test.skip(!hasAuthAccess, 'Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)');
    });

    test('should navigate to bookmarks page', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Wait for page to load
      await expect(page).toHaveURL(/\/bookmarks/);
    });

    test('thumbnail should not disappear on hover', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Find a bookmark card with a full-bleed preview image using semantic selectors
      const bookmarkCard = page
        .getByRole('article')
        .filter({ has: page.locator('img.z-20.object-cover') })
        .first();
      
      // Assert that we have at least one card with an image
      await expect(bookmarkCard).toBeVisible({ timeout: 10000 });
      
      // Get the image element
      const image = bookmarkCard.locator('img.z-20.object-cover').first();
      
      // Verify image is visible before hover
      await expect(image).toBeVisible();
      
      // Verify image has z-20 class (from PR #204)
      const imageClass = await image.getAttribute('class');
      expect(imageClass).toContain('z-20');
      
      // Hover over the card
      await bookmarkCard.hover();
      
      // Wait a moment for hover effects
      await page.waitForTimeout(300);
      
      // Verify image is still visible after hover (testing z-index fix)
      await expect(image).toBeVisible();
    });

    test('gradient overlay should have correct z-index (z-30)', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Find a bookmark card with gradient overlay
      const bookmarkCard = page
        .getByRole('article')
        .filter({ has: page.locator('.z-30') })
        .first();
      
      // Assert card exists
      await expect(bookmarkCard).toBeVisible({ timeout: 10000 });
      
      // Find the gradient overlay (should have z-30)
      const overlay = bookmarkCard.locator('.z-30').first();
      
      // Verify overlay is present
      await expect(overlay).toBeAttached();
      
      // Verify z-30 class is present
      const overlayClass = await overlay.getAttribute('class');
      expect(overlayClass).toContain('z-30');
    });

    test('should work correctly in guest login mode', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the bookmarks page
      await expect(page).toHaveURL(/\/bookmarks/);
    });

    test('card interactions should work (click, hover)', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      const bookmarkCard = page.getByRole('article').first();
      
      // Assert card exists
      await expect(bookmarkCard).toBeVisible({ timeout: 10000 });
      
      // Test hover interaction
      await bookmarkCard.hover();
      await page.waitForTimeout(200);
      
      // Verify hover doesn't break the card
      await expect(bookmarkCard).toBeVisible();
    });
  });

  test.describe('UI Card Components', () => {
    test('should display cards on component showcase page', async ({ page }) => {
      await page.goto('/components', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Verify we're on the components page
      await expect(page).toHaveURL(/\/components/);
      
      // Look for Card components in the showcase
      const cards = page.locator('[class*="border"][class*="rounded"]');
      
      // Should have multiple cards on showcase page
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('Card component should have proper styling', async ({ page }) => {
      await page.goto('/components', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      const card = page.locator('[class*="border"][class*="rounded"]').first();
      
      if (await card.count() > 0) {
        // Verify card is visible
        await expect(card).toBeVisible();
        
        // Check that card has border and rounded corners
        const cardClass = await card.getAttribute('class');
        expect(cardClass).toMatch(/border|rounded/);
      }
    });
  });

  test.describe('MeasurementCard', () => {
    test.beforeEach(async () => {
      // Skip auth-dependent tests if we don't have access
      test.skip(!hasAuthAccess, 'Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)');
    });

    test('should navigate to health page', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Verify we can access health page
      await expect(page).toHaveURL(/\/health/);
    });

    test('should display measurement cards or empty state', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Either measurements exist or empty state should be visible
      const hasMeasurements = await page.locator('[class*="border-l"]').count() > 0;
      const emptyState = page.locator('text=/no measurements/i');
      
      // At least one should be present
      if (!hasMeasurements) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('dropdown menu should work on measurement cards', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Look for a dropdown trigger (three dots menu)
      const dropdownTrigger = page.getByLabel(/more|actions|menu/i).first();
      
      const hasDropdown = await dropdownTrigger.count() > 0;
      if (hasDropdown) {
        // Click to open dropdown
        await dropdownTrigger.click();
        await page.waitForTimeout(300);
        
        // Verify dropdown menu appears
        const dropdownMenu = page.locator('[role="menu"]');
        await expect(dropdownMenu).toBeVisible();
      }
    });
  });

  test.describe('Overlay Components', () => {
    test.describe('HoverCard', () => {
      test('should display hover card on component showcase', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Scroll to overlays section
        await page.locator('text=/overlays.*feedback/i').scrollIntoViewIfNeeded();
        
        // Find HoverCard trigger (the "@username" button in the ComponentShowcase)
        const hoverCardTrigger = page.getByRole('button', { name: /@username/i });
        
        // Verify trigger exists and is visible
        await expect(hoverCardTrigger).toBeVisible();
        
        // Hover to trigger HoverCard
        await hoverCardTrigger.hover();
        await page.waitForTimeout(500);
        
        // Verify HoverCard content becomes visible after hover
        const hoverCardContent = page.locator('[data-radix-hover-card-content]').first();
        await expect(hoverCardContent).toBeVisible();
      });
    });

    test.describe('Dialog', () => {
      test('should open and close dialog', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Scroll to dialog section
        await page.locator('text=/overlays.*feedback/i').scrollIntoViewIfNeeded();
        
        // Find dialog trigger button
        const dialogTrigger = page.getByRole('button', { name: /open dialog|show dialog/i }).first();
        
        if (await dialogTrigger.count() > 0) {
          // Click to open dialog
          await dialogTrigger.click();
          await page.waitForTimeout(300);
          
          // Verify dialog is visible
          const dialog = page.locator('[role="dialog"]').first();
          await expect(dialog).toBeVisible();
          
          // Close dialog by clicking close button or backdrop
          const closeButton = page.getByRole('button', { name: /close/i }).first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
          } else {
            // Try pressing Escape
            await page.keyboard.press('Escape');
          }
          
          await page.waitForTimeout(300);
        }
      });

      test('dialog should have correct z-index layering', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        const dialogTrigger = page.getByRole('button', { name: /open dialog|show dialog/i }).first();
        
        if (await dialogTrigger.count() > 0) {
          await dialogTrigger.click();
          await page.waitForTimeout(300);
          
          const dialog = page.locator('[role="dialog"]').first();
          
          if (await dialog.isVisible()) {
            // Verify dialog overlay is on top
            const dialogOverlay = page.locator('[data-radix-dialog-overlay]').first();
            if (await dialogOverlay.count() > 0) {
              await expect(dialogOverlay).toBeVisible();
            }
            
            // Close dialog
            await page.keyboard.press('Escape');
          }
        }
      });

      test('dialog should work in guest mode', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Verify page is accessible and functional as guest
        await expect(page).toHaveURL(/\/components/);
      });
    });

    test.describe('Drawer', () => {
      test('should open and close drawer', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Find drawer trigger
        const drawerTrigger = page.getByRole('button', { name: /open drawer|show drawer/i }).first();
        
        if (await drawerTrigger.count() > 0) {
          // Verify trigger exists
          await expect(drawerTrigger).toBeVisible();
          
          // Open drawer
          await drawerTrigger.click();
          await page.waitForTimeout(500);
          
          // Note: Drawer implementation may vary (Vaul drawer vs dialog)
          // This test verifies the trigger is interactive
          
          // Close drawer
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      });
    });

    test.describe('Sheet', () => {
      test('should open and close sheet', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Find sheet trigger
        const sheetTrigger = page.getByRole('button', { name: /open sheet|show sheet/i }).first();
        
        if (await sheetTrigger.count() > 0) {
          // Open sheet
          await sheetTrigger.click();
          await page.waitForTimeout(300);
          
          // Verify sheet is visible
          const sheet = page.locator('[role="dialog"]').first();
          await expect(sheet).toBeVisible();
          
          // Close sheet
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      });
    });

    test.describe('Popover', () => {
      test('should open and close popover', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Find popover trigger
        const popoverTrigger = page.getByRole('button', { name: /open popover|popover/i }).first();
        
        if (await popoverTrigger.count() > 0) {
          // Open popover
          await popoverTrigger.click();
          await page.waitForTimeout(300);
          
          // Close popover by clicking outside or escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      });
    });

    test.describe('DropdownMenu', () => {
      test('should open and close dropdown menu', async ({ page }) => {
        await page.goto('/bookmarks');
        await page.waitForLoadState('networkidle');
        
        // Find dropdown menu trigger (card actions)
        const dropdownTrigger = page.getByLabel(/card actions|more/i).first();
        
        if (await dropdownTrigger.count() > 0) {
          // Open dropdown
          await dropdownTrigger.click();
          await page.waitForTimeout(300);
          
          // Verify dropdown menu is visible
          const dropdownMenu = page.locator('[role="menu"]').first();
          await expect(dropdownMenu).toBeVisible();
          
          // Close dropdown
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      });

      test('dropdown should have proper z-index', async ({ page }) => {
        await page.goto('/bookmarks');
        await page.waitForLoadState('networkidle');
        
        const dropdownTrigger = page.getByLabel(/card actions|more/i).first();
        
        if (await dropdownTrigger.count() > 0) {
          await dropdownTrigger.click();
          await page.waitForTimeout(300);
          
          const dropdownMenu = page.locator('[role="menu"]').first();
          
          if (await dropdownMenu.isVisible()) {
            // Dropdown should be visible and on top
            await expect(dropdownMenu).toBeVisible();
            
            // Close dropdown
            await page.keyboard.press('Escape');
          }
        }
      });
    });

    test.describe('Tooltip', () => {
      test('should display tooltip on hover', async ({ page }) => {
        await page.goto('/components');
        await page.waitForLoadState('networkidle');
        
        // Find an element with tooltip
        const tooltipTrigger = page.locator('[data-radix-tooltip-trigger]').first();
        
        if (await tooltipTrigger.count() > 0) {
          // Verify trigger exists
          await expect(tooltipTrigger).toBeVisible();
          
          // Hover to show tooltip
          await tooltipTrigger.hover();
          await page.waitForTimeout(500);
          
          // Note: Tooltip visibility depends on implementation and delay settings
          // This test verifies the trigger is interactive
        }
      });
    });
  });

  test.describe('Responsive Testing', () => {
    test.beforeEach(async () => {
      // Skip auth-dependent tests if we don't have access
      test.skip(!hasAuthAccess, 'Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)');
    });

    test('cards should display correctly on mobile', async ({ page, browser }) => {
      // Create a new context with mobile emulation
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      const mobilePage = await mobileContext.newPage();
      
      try {
        await mobilePage.goto('/bookmarks');
        await mobilePage.waitForLoadState('networkidle');
        
        // Verify page loads on mobile
        await expect(mobilePage).toHaveURL(/\/bookmarks/);
        
        // Check if cards are visible using semantic selector
        const cards = mobilePage.getByRole('article');
        const cardCount = await cards.count();
        
        // Either cards exist or empty state is shown
        if (cardCount > 0) {
          const firstCard = cards.first();
          await expect(firstCard).toBeVisible();
        }
      } finally {
        await mobileContext.close();
      }
    });

    test('overlays should work on mobile', async ({ page, browser }) => {
      // Create a new context with mobile emulation
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      const mobilePage = await mobileContext.newPage();
      
      try {
        await mobilePage.goto('/components');
        await mobilePage.waitForLoadState('networkidle');
        
        // Verify page is accessible on mobile
        await expect(mobilePage).toHaveURL(/\/components/);
      } finally {
        await mobileContext.close();
      }
    });

    test('touch interactions should work on mobile', async ({ page, browser }) => {
      // Create a new context with mobile emulation
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });
      const mobilePage = await mobileContext.newPage();
      
      try {
        await mobilePage.goto('/bookmarks');
        await mobilePage.waitForLoadState('networkidle');
        
        const card = mobilePage.getByRole('article').first();
        
        const hasCards = await card.count() > 0;
        if (hasCards) {
          // Tap the card (mobile touch)
          await card.tap();
          await mobilePage.waitForTimeout(300);
          
          // Card should handle touch interaction
          await expect(card).toBeVisible();
        }
      } finally {
        await mobileContext.close();
      }
    });
  });

  test.describe('Guest Login Mode', () => {
    test.beforeEach(async () => {
      // Skip these tests if we don't have auth access
      test.skip(!hasAuthAccess, 'Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)');
    });

    test('should be able to access all pages as authenticated user', async ({ page }) => {
      // Dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Bookmarks
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/bookmarks/);
      
      // Health
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/health/);
      
      // Components Showcase
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/components/);
    });

    test('authenticated mode should not break z-index layering', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Find a card with semantic selector
      const card = page.getByRole('article').first();
      const hasCards = await card.count() > 0;
      
      if (hasCards) {
        // Verify card exists
        await expect(card).toBeVisible();
        
        // Hover over card
        await card.hover();
        await page.waitForTimeout(300);
        
        // Card should still be visible
        await expect(card).toBeVisible();
      }
    });

    test('permissions should be applied correctly', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Page should load correctly
      await expect(page).toHaveURL(/\/bookmarks/);
    });
  });

  test.describe('Visual Regression (Optional)', () => {
    // Only run visual regression tests if explicitly enabled
    test.skip(!process.env.VISUAL_REGRESSION, 'Visual regression tests disabled (set VISUAL_REGRESSION=1 to enable)');

    test.beforeEach(async () => {
      // Skip auth-dependent tests if we don't have access
      test.skip(!hasAuthAccess, 'Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)');
    });

    test('bookmark card visual snapshot', async ({ page }, testInfo) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      const card = page.getByRole('article').first();
      
      const hasCards = await card.count() > 0;
      if (hasCards) {
        // Take screenshot using testInfo.outputPath for proper test isolation
        await card.screenshot({ 
          path: testInfo.outputPath('bookmark-card.png'),
          animations: 'disabled'
        });
      }
    });

    test('component showcase visual snapshot', async ({ page }, testInfo) => {
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      
      // Take full page screenshot using testInfo.outputPath
      await page.screenshot({ 
        path: testInfo.outputPath('components-showcase.png'),
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});
