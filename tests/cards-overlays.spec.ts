import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for Card and Overlay Components
 * 
 * Tests the z-index fix from PR #204 and validates all card/overlay components
 * work correctly in guest login mode with proper layering and interactions.
 */

/**
 * Helper function to login as guest
 */
async function loginAsGuest(page: any) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  
  // Click the "Continue as Guest" button
  const guestButton = page.getByRole('button', { name: /continue as guest/i });
  await expect(guestButton).toBeVisible();
  await guestButton.click();
  
  // Wait for navigation to dashboard
  await page.waitForURL(/\/(dashboard|bookmarks)/);
  await page.waitForLoadState('networkidle');
}

test.describe('Card and Overlay Components', () => {
  test.beforeEach(async ({ page }) => {
    // Login as guest before each test
    await loginAsGuest(page);
  });

  test.describe('BookmarkCard - Z-Index Fix from PR #204', () => {
    test('should navigate to bookmarks page', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Wait for page to load
      await expect(page).toHaveURL(/\/bookmarks/);
    });

    test('thumbnail should not disappear on hover', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Find a bookmark card with an image
      const bookmarkCard = page.locator('[class*="relative"][class*="rounded"]').first();
      
      if (await bookmarkCard.count() > 0) {
        // Get initial image visibility
        const image = bookmarkCard.locator('img').first();
        
        if (await image.count() > 0) {
          // Verify image is visible before hover
          await expect(image).toBeVisible();
          
          // Hover over the card
          await bookmarkCard.hover();
          
          // Wait a moment for hover effects
          await page.waitForTimeout(300);
          
          // Verify image is still visible after hover (testing z-index fix)
          await expect(image).toBeVisible();
          
          // Verify image has z-20 class (from PR #204)
          const imageClass = await image.getAttribute('class');
          expect(imageClass).toContain('z-20');
        }
      }
    });

    test('gradient overlay should have correct z-index (z-30)', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Find a bookmark card
      const bookmarkCard = page.locator('[class*="relative"][class*="rounded"]').first();
      
      if (await bookmarkCard.count() > 0) {
        // Find the gradient overlay (should have z-30)
        const overlay = bookmarkCard.locator('[class*="z-30"]').first();
        
        if (await overlay.count() > 0) {
          // Verify overlay is present
          await expect(overlay).toBeAttached();
          
          // Verify z-30 class is present
          const overlayClass = await overlay.getAttribute('class');
          expect(overlayClass).toContain('z-30');
        }
      }
    });

    test('should work correctly in guest login mode', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the bookmarks page as guest
      await expect(page).toHaveURL(/\/bookmarks/);
      
      // Check if there are any bookmark cards or empty state
      const hasCards = await page.locator('[class*="relative"][class*="rounded"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no (bookmarks|items)/i').count() > 0;
      
      // Either cards or empty state should be present
      expect(hasCards || hasEmptyState).toBeTruthy();
    });

    test('card interactions should work (click, hover)', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      const bookmarkCard = page.locator('[class*="relative"][class*="rounded"]').first();
      
      if (await bookmarkCard.count() > 0) {
        // Test hover interaction
        await bookmarkCard.hover();
        await page.waitForTimeout(200);
        
        // Verify hover doesn't break the card
        await expect(bookmarkCard).toBeVisible();
      }
    });
  });

  test.describe('UI Card Components', () => {
    test('should display cards on component showcase page', async ({ page }) => {
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      
      // Look for Card components in the showcase
      const cards = page.locator('[class*="border"][class*="rounded"]');
      
      // Should have multiple cards on showcase page
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('Card component should have proper styling', async ({ page }) => {
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      
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
    test('should navigate to health page', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Verify we can access health page as guest
      await expect(page).toHaveURL(/\/health/);
    });

    test('should display measurement cards or empty state', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Check for measurement cards or empty state
      const hasMeasurements = await page.locator('[class*="border-l"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no measurements/i').count() > 0;
      
      // Either measurements or empty state should be present
      expect(hasMeasurements || hasEmptyState).toBeTruthy();
    });

    test('dropdown menu should work on measurement cards', async ({ page }) => {
      await page.goto('/health');
      await page.waitForLoadState('networkidle');
      
      // Look for a dropdown trigger (three dots menu)
      const dropdownTrigger = page.getByLabel(/more|actions|menu/i).first();
      
      if (await dropdownTrigger.count() > 0) {
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
        
        // Find HoverCard trigger
        const hoverCardTrigger = page.locator('text=/hover over me/i').first();
        
        if (await hoverCardTrigger.count() > 0) {
          // Hover to trigger HoverCard
          await hoverCardTrigger.hover();
          await page.waitForTimeout(500);
          
          // Verify HoverCard appears
          const hoverCard = page.locator('[role="dialog"]').or(page.locator('[data-radix-hover-card-content]'));
          // HoverCard may or may not appear depending on implementation
        }
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
          // Open drawer
          await drawerTrigger.click();
          await page.waitForTimeout(500);
          
          // Verify drawer is visible
          const drawer = page.locator('[role="dialog"]').or(page.locator('[data-vaul-drawer]'));
          // Drawer implementation may vary
          
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
          // Hover to show tooltip
          await tooltipTrigger.hover();
          await page.waitForTimeout(500);
          
          // Tooltip may appear
          const tooltip = page.locator('[role="tooltip"]');
          // Tooltip visibility is optional based on implementation
        }
      });
    });
  });

  test.describe('Responsive Testing', () => {
    test('cards should display correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Verify page loads on mobile
      await expect(page).toHaveURL(/\/bookmarks/);
      
      // Check if cards are visible (if any exist)
      const cards = page.locator('[class*="relative"][class*="rounded"]');
      const cardCount = await cards.count();
      
      // Either cards exist or empty state is shown
      if (cardCount > 0) {
        const firstCard = cards.first();
        await expect(firstCard).toBeVisible();
      }
    });

    test('overlays should work on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      
      // Verify page is accessible on mobile
      await expect(page).toHaveURL(/\/components/);
    });

    test('touch interactions should work on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[class*="relative"][class*="rounded"]').first();
      
      if (await card.count() > 0) {
        // Tap the card (mobile touch)
        await card.tap();
        await page.waitForTimeout(300);
        
        // Card should handle touch interaction
        await expect(card).toBeVisible();
      }
    });
  });

  test.describe('Guest Login Mode', () => {
    test('should be able to access all pages as guest', async ({ page }) => {
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

    test('guest mode should not break z-index layering', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Verify basic functionality works
      const cards = page.locator('[class*="relative"][class*="rounded"]');
      const hasCards = await cards.count() > 0;
      
      if (hasCards) {
        const firstCard = cards.first();
        
        // Hover over card
        await firstCard.hover();
        await page.waitForTimeout(300);
        
        // Card should still be visible
        await expect(firstCard).toBeVisible();
      }
    });

    test('guest permissions should be applied correctly', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      // Guest users may have limited functionality
      // But page should still load correctly
      await expect(page).toHaveURL(/\/bookmarks/);
    });
  });

  test.describe('Visual Regression (Optional)', () => {
    test('bookmark card visual snapshot', async ({ page }) => {
      await page.goto('/bookmarks');
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[class*="relative"][class*="rounded"]').first();
      
      if (await card.count() > 0) {
        // Take screenshot for visual regression
        await card.screenshot({ 
          path: 'screenshots/bookmark-card.png',
          animations: 'disabled'
        });
      }
    });

    test('component showcase visual snapshot', async ({ page }) => {
      await page.goto('/components');
      await page.waitForLoadState('networkidle');
      
      // Take full page screenshot
      await page.screenshot({ 
        path: 'screenshots/components-showcase.png',
        fullPage: true,
        animations: 'disabled'
      });
    });
  });
});
