# E2E Tests for Laterr

This directory contains end-to-end tests using Playwright to ensure the application's card and overlay components work correctly.

## Test Files

### `cards-overlays.spec.ts`
Comprehensive E2E tests for card and overlay components, including:

#### Card Components
- **BookmarkCard** - Tests z-index fix from PR #204, hover behavior, gradient overlays
- **Card (UI)** - Base card component styling and display
- **MeasurementCard** - Card with hover states and dropdown menus
- **ItemCard** - Item display cards

#### Overlay Components
- **HoverCard** - Hover tooltips
- **Dialog** - Modal overlays
- **Drawer** - Side drawer overlays  
- **Sheet** - Sheet overlays
- **Popover** - Popover overlays
- **DropdownMenu** - Dropdown menu overlays
- **Tooltip** - Tooltip overlays

#### Test Scenarios
1. **Visual/Z-Index Testing** - Verifies elements don't disappear on hover, z-index hierarchy is maintained
2. **Interactive Testing** - Tests click/hover interactions, overlay dismissal
3. **Guest Login Mode** - Tests all components work in guest mode
4. **Responsive Testing** - Validates mobile viewport behavior and touch interactions

### `trash-flow.spec.ts`
Tests for trash/restore functionality with authenticated users.

### `screenshots.spec.ts`
Generates visual documentation screenshots of UI components.

## Current Test Status

### Passing Tests ✅
The following test suites are currently verified to work:
- **UI Card Components** (2 tests)
  - Component showcase card display
  - Card styling validation
- **Component Showcase Visual Tests** (7 tests total)
  - Full page screenshot (1 test)
  - Section screenshots (5 tests)
  - Documentation generation (1 test)

### Tests Requiring Authentication
The following tests **require authentication** and will skip if neither guest login nor E2E credentials are available:
- **BookmarkCard Z-Index Tests** - Require access to `/bookmarks` page
- **MeasurementCard Tests** - Require access to `/health` page
- **Bookmark-specific Overlay Tests** - Require bookmark data
- **Responsive Mobile Tests** - Require access to `/bookmarks` page
- **Guest/Auth Mode Tests** - Require authenticated access

These tests will **skip gracefully** with the message:
```
Authentication required but not available (enable guest mode or provide E2E_EMAIL/E2E_PASSWORD)
```

To run these tests, ensure:
1. Guest mode is enabled (`GUEST_MODE_ENABLED=true` in AuthPage.tsx), OR
2. Provide test credentials via `E2E_EMAIL` and `E2E_PASSWORD` environment variables

## Running Tests

### Prerequisites
```bash
# Install Playwright browsers (first time only)
npm run playwright:install
```

### Run All Tests
```bash
# Run all tests in headless mode
npx playwright test

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run tests in headed mode (see browser)
npx playwright test --headed
```

### Run Specific Test Files
```bash
# Run card and overlay tests only
npx playwright test tests/cards-overlays.spec.ts

# Run in UI mode
npx playwright test tests/cards-overlays.spec.ts --ui

# Run with specific browser
npx playwright test tests/cards-overlays.spec.ts --project=chromium
```

### Run Specific Test Suites
```bash
# Run only BookmarkCard tests
npx playwright test -g "BookmarkCard"

# Run only overlay component tests
npx playwright test -g "Overlay Components"

# Run only guest mode tests
npx playwright test -g "Guest Login Mode"

# Run only responsive tests
npx playwright test -g "Responsive Testing"
```

### Generate Screenshots
```bash
# Generate component showcase screenshots
npm run screenshots

# Generate in UI mode
npm run screenshots:ui
```

## Test Configuration

Tests are configured in `playwright.config.ts`:
- **Base URL**: `http://localhost:8080`
- **Test Directory**: `./tests`
- **Browser**: Chromium (Desktop Chrome)
- **Retries**: 2 in CI, 0 locally
- **Screenshots**: Only on failure
- **Trace**: On first retry
- **Web Server**: Automatically starts `npm run dev` before running tests

## Authentication and Guest Login Mode

The tests are designed to work flexibly with authentication:

### With Credentials (Recommended for Full Coverage)
If you provide test credentials:
- Set `E2E_EMAIL` and `E2E_PASSWORD` environment variables
- Tests will use `tryLogin()` to authenticate with these credentials
- All card and overlay tests will run with full functionality

```bash
export E2E_EMAIL="your-test-email@example.com"
export E2E_PASSWORD="your-test-password"
npx playwright test tests/cards-overlays.spec.ts
```

### With Guest Login
If guest login is enabled in the app (`GUEST_MODE_ENABLED=true` in `AuthPage.tsx`):
- Tests will use `tryLogin()` to authenticate as a guest user
- All card and overlay tests will run
- The helper automatically clicks "Continue as Guest (Agent Testing)" button

### Without Authentication
If neither credentials nor guest login are available:
- **Component Showcase tests** will still pass (no auth required)
- **Bookmark/Health page tests** will be **skipped** with clear messages
- Tests won't fail due to authentication issues
- Skip messages indicate: "Authentication required but not available"

## Key Test Cases

### PR #204 Z-Index Fix Validation
The tests specifically validate the z-index fix from PR #204:
- Image has `z-20` class and remains visible on hover
- Gradient overlay has `z-30` class and renders above image
- Hover interactions don't cause thumbnails to disappear

### Accessibility
Tests use semantic selectors (roles, labels) to ensure accessibility:
- `getByRole('button')` for buttons
- `getByLabel()` for labeled elements
- `locator('[role="menu"]')` for ARIA roles

### Responsive Design
Mobile viewport tests use `375x667` (iPhone SE) to verify:
- Cards display correctly on small screens
- Touch interactions work
- Overlays position correctly

## Visual Regression (Optional)

The test suite includes optional visual regression tests that generate baseline screenshots:
- `screenshots/bookmark-card.png` - Individual card snapshot
- `screenshots/components-showcase.png` - Full component showcase

These can be used for visual comparison in CI/CD pipelines.

## Debugging Tests

### View Test Reports
```bash
# After running tests, view HTML report
npx playwright show-report
```

### Debug Mode
```bash
# Run in debug mode with Playwright Inspector
npx playwright test --debug

# Debug specific test
npx playwright test tests/cards-overlays.spec.ts --debug -g "thumbnail should not disappear"
```

### Headed Mode
```bash
# Run tests with visible browser
npx playwright test --headed --slowmo=1000
```

### Trace Viewer
```bash
# Run with trace enabled
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

The tests are configured to run in CI with:
- 2 retries for flaky test resilience
- Single worker to avoid race conditions
- Screenshots on failure for debugging
- Trace on first retry for investigation

Set up in your CI pipeline:
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npm run playwright:install

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests fail with "Timeout waiting for..."
- Increase timeout in individual tests: `test.setTimeout(60000)`
- Check if dev server is running: `npm run dev`
- Verify base URL in `playwright.config.ts`

### Guest login not working
- Verify Supabase anonymous auth is enabled
- Check `GUEST_MODE_ENABLED` is true in `AuthPage.tsx`
- Ensure button text matches selector in `tryLogin()`
- OR provide `E2E_EMAIL` and `E2E_PASSWORD` credentials instead

### Components not found
- Wait for elements to load: `await page.waitForLoadState('networkidle')`
- Use conditional checks: `if (await element.count() > 0)`
- Verify selectors match actual DOM structure

## Best Practices

1. **Use semantic selectors**: Prefer `getByRole()`, `getByLabel()` over CSS selectors
2. **Wait for stability**: Use `waitForLoadState('networkidle')` before assertions
3. **Handle empty states**: Check for both content and empty state messages
4. **Conditional testing**: Use `if (await element.count() > 0)` for optional elements
5. **Clean up**: Close dialogs/modals after testing to avoid state leakage
6. **Timeouts**: Add small waits for animations: `await page.waitForTimeout(300)`

## Contributing

When adding new tests:
1. Follow existing test structure and naming conventions
2. Use the `tryLogin()` helper for authentication
3. Add `test.skip(!hasAuthAccess, 'message')` for auth-dependent tests
4. Add descriptive test names that explain what's being tested
5. Include comments for complex interactions
6. Use semantic selectors (role, label) over CSS selectors
7. Assert elements exist rather than wrapping in `if (count() > 0)`
8. Clean up after tests (close modals, reset state)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
