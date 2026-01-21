# Screenshot Testing with Playwright

This document describes how to set up and use the automated screenshot testing system for the Laterr application.

## Overview

The screenshot testing system uses Playwright to automatically capture full-page screenshots of all application routes. This is useful for:

- Visual regression testing
- Documentation
- Design reviews
- Debugging layout issues
- Ensuring consistent UI across different browsers and viewports

## Setup

### 1. Install Dependencies

The required dependencies (@playwright/test and dotenv) are already included in package.json. Install them with:

```bash
npm install
```

### 2. Install Playwright Browsers

Install the Playwright browser binaries:

```bash
npm run playwright:install
```

This will download Chromium, Firefox, and WebKit browsers used for testing.

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Base URL for screenshot tests (defaults to http://localhost:8080)
PLAYWRIGHT_BASE_URL=http://localhost:8080

# Optional: Authentication credentials for protected routes
PLAYWRIGHT_AUTH_EMAIL=your_test_email@example.com
PLAYWRIGHT_AUTH_PASSWORD=your_test_password
```

**Note:** If `PLAYWRIGHT_AUTH_EMAIL` and `PLAYWRIGHT_AUTH_PASSWORD` are not set, screenshots will be taken without authentication.

## Running Screenshots

### Development Mode

Run screenshot tests in Chromium browser:

```bash
npm run screenshots
```

### Interactive UI Mode

Run screenshot tests with Playwright's interactive UI:

```bash
npm run screenshots:ui
```

This mode is helpful for:
- Debugging tests
- Inspecting page state
- Viewing screenshots immediately
- Time-travel debugging

### All Browsers

Run screenshot tests across all configured browsers (Chromium, Firefox, WebKit):

```bash
npx playwright test tests/screenshots.spec.ts
```

### Specific Viewport

Run screenshot tests for mobile viewports:

```bash
npx playwright test tests/screenshots.spec.ts --project="Mobile Chrome"
```

## Screenshot Output

Screenshots are saved to the `screenshots/` directory with the following naming convention:

- Desktop screenshots: `{route-name}.png` (e.g., `dashboard.png`, `bookmarks.png`)
- Mobile screenshots: `mobile-{route-name}.png` (e.g., `mobile-dashboard.png`)

## Routes Tested

The following routes are automatically captured (configured in `tests/routes.config.ts`):

1. `/` - Home page (Dashboard)
2. `/dashboard` - Main dashboard
3. `/app` - Bookmarks app view
4. `/bookmarks` - Bookmarks page
5. `/subscriptions` - Subscriptions management
6. `/health` - Health check page
7. `/landing` - Landing page
8. `/auth` - Authentication page

## Configuration

### Playwright Configuration

The main configuration is in `playwright.config.ts`. Key settings:

- **Base URL**: Configured via `PLAYWRIGHT_BASE_URL` environment variable
- **Viewport**: Desktop screenshots use 1920x1080, mobile uses device-specific sizes
- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Timeout**: Default timeout is 30 seconds
- **Retries**: 2 retries on CI, 0 locally

### Routes Configuration

Routes are defined in `tests/routes.config.ts`. To add a new route:

```typescript
{
  path: '/new-route',
  name: 'new-route',
  description: 'Description of the route',
  requiresAuth: false, // Set to true if authentication is needed
}
```

### Screenshot Spec

The screenshot logic is in `tests/screenshots.spec.ts`. Key features:

- **Network Idle**: Waits for all network requests to complete before capturing
- **Dynamic Elements**: Hides elements like timestamps that might cause inconsistencies
- **Authentication**: Supports optional authentication before screenshot capture
- **Full Page**: Captures entire scrollable page, not just viewport

## CI/CD Integration

### GitHub Actions

A GitHub Actions workflow is included in `.github/workflows/screenshots.yml` that:

1. Runs on push to main and pull requests
2. Sets up Node.js and installs dependencies
3. Installs Playwright browsers
4. Runs the dev server in the background
5. Executes screenshot tests
6. Uploads screenshots as artifacts

To use in CI, ensure the following secrets are set in your repository (if authentication is required):

- `PLAYWRIGHT_AUTH_EMAIL`
- `PLAYWRIGHT_AUTH_PASSWORD`

### Viewing CI Screenshots

After a CI run:

1. Go to the Actions tab in GitHub
2. Select the workflow run
3. Download the "screenshots" artifact
4. Extract and view the PNG files

## Troubleshooting

### Screenshots are blank or incomplete

- Ensure the application is running before tests start
- Increase wait times in the test spec if content loads slowly
- Check that the base URL is correct

### Authentication fails

- Verify credentials are correct in `.env`
- Check that the auth form selectors in `screenshots.spec.ts` match your application
- Review authentication flow in the test output

### Browser not installed

Run:

```bash
npm run playwright:install
```

### Port conflicts

If port 8080 is already in use, update `PLAYWRIGHT_BASE_URL` in `.env` to use a different port, and ensure your dev server runs on that port.

## Best Practices

1. **Keep routes updated**: When adding new routes to the application, add them to `tests/routes.config.ts`
2. **Hide dynamic content**: Update the `hideDynamicElements()` function to hide any elements that change between runs
3. **Review regularly**: Periodically review screenshots to catch unintended UI changes
4. **Commit selectively**: Decide whether to commit screenshots to git or only generate them in CI
5. **Use version control**: If committing screenshots, use git LFS for better performance

## Advanced Usage

### Custom Screenshot Options

You can customize screenshot options in `screenshots.spec.ts`:

```typescript
await page.screenshot({
  path: screenshotPath,
  fullPage: true,
  animations: 'disabled', // Disable CSS animations
  scale: 'css', // Use CSS pixel scale
});
```

### Multiple Viewports

Add more viewport configurations in the test suite:

```typescript
test.describe('Tablet Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
  });
  // ... tests
});
```

### Dark Mode Screenshots

Capture screenshots in dark mode by setting the color scheme:

```typescript
await page.emulateMedia({ colorScheme: 'dark' });
await page.screenshot({ path: 'screenshots/dark-dashboard.png' });
```

## Related Files

- `playwright.config.ts` - Main Playwright configuration
- `tests/routes.config.ts` - Routes to test
- `tests/screenshots.spec.ts` - Screenshot test suite
- `.github/workflows/screenshots.yml` - CI workflow
- `screenshots/` - Output directory for screenshots

## Support

For issues or questions about screenshot testing:

1. Check the [Playwright documentation](https://playwright.dev/)
2. Review test output and logs
3. Open an issue in the repository
