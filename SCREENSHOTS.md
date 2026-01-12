# Screenshot Automation

Automated system for capturing full-page screenshots of all routes in the web application using Playwright.

## Overview

This system provides:
- ✅ Automated screenshot capture for all defined routes
- ✅ Optional authentication support
- ✅ Full-page screenshots with network idle wait
- ✅ Configurable base URL via environment variables
- ✅ Clean, deterministic, and reproducible screenshots
- ✅ CI/CD integration with GitHub Actions

## Installation

1. **Install Playwright browsers:**
   ```bash
   npm run playwright:install
   ```

2. **Configure environment (optional):**
   
   Create or update `.env` file:
   ```bash
   # Optional: Override base URL (defaults to http://localhost:8080)
   VITE_SCREENSHOT_BASE_URL=http://localhost:8080
   
   # Optional: Override authentication credentials
   VITE_SCREENSHOT_EMAIL=your_email@example.com
   VITE_SCREENSHOT_PASSWORD=your_password
   
   # Optional: Skip authentication entirely
   VITE_SCREENSHOT_SKIP_AUTH=false
   ```

## Usage

### Local Development

**Run screenshots (headless):**
```bash
npm run screenshots
```

**Run with UI mode (debug/development):**
```bash
npm run screenshots:ui
```

Screenshots are saved to the `/screenshots` directory.

### CI/CD (GitHub Actions)

The workflow is configured in `.github/workflows/screenshots.yml`.

**Manual trigger:**
1. Go to Actions tab in GitHub
2. Select "Screenshot Capture" workflow
3. Click "Run workflow"

**Required GitHub Secrets:**
- `VITE_SCREENSHOT_EMAIL` - Authentication email
- `VITE_SCREENSHOT_PASSWORD` - Authentication password
- `VITE_SCREENSHOT_BASE_URL` (optional) - Target URL for screenshots
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

Artifacts (screenshots and reports) are available for download after the workflow completes.

## Configuration

### Routes

Edit `tests/routes.config.ts` to add or remove routes:

```typescript
export const routes = [
  { path: '/', name: 'home' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/app', name: 'app' },
  // Add more routes here
];
```

### Authentication

Configure in `tests/routes.config.ts`:

```typescript
export const authConfig = {
  email: process.env.VITE_SCREENSHOT_EMAIL || 'default@example.com',
  password: process.env.VITE_SCREENSHOT_PASSWORD || 'defaultpass',
  enabled: process.env.VITE_SCREENSHOT_SKIP_AUTH !== 'true',
};
```

### Playwright Configuration

Modify `playwright.config.ts` for advanced settings:
- Timeout adjustments
- Browser settings
- Viewport sizes
- Parallel execution

## File Structure

```
/
├── tests/
│   ├── routes.config.ts          # Route definitions and auth config
│   └── screenshots.spec.ts       # Main screenshot test suite
├── screenshots/                   # Output directory for screenshots
│   ├── .auth.json                # Auth state (gitignored)
│   ├── home.png
│   ├── dashboard.png
│   └── ...
├── playwright.config.ts          # Playwright configuration
└── .github/
    └── workflows/
        └── screenshots.yml       # CI workflow
```

## Features

### Dynamic Element Hiding

The system automatically hides potentially dynamic elements to ensure reproducible screenshots:
- Timestamps
- Live indicators
- Current time displays

Customize in `tests/screenshots.spec.ts`:

```typescript
await page.addStyleTag({
  content: `
    .your-dynamic-element {
      visibility: hidden !important;
    }
  `,
});
```

### Authentication Flow

1. Before all tests, performs login once
2. Saves authentication state to `.auth.json`
3. Reuses auth state for all subsequent screenshots
4. Skips auth for routes marked with `skipAuth: true`

### Network Idle

Each page waits for:
1. Initial navigation
2. Network idle (no pending requests)
3. Additional 1-second buffer for animations

## Troubleshooting

**Playwright not installed:**
```bash
npm run playwright:install
```

**Screenshots incomplete or cut off:**
- Increase timeout in `playwright.config.ts`
- Adjust `waitForTimeout` in `screenshots.spec.ts`

**Login fails:**
- Verify credentials in `.env` or environment variables
- Check auth form selectors in `performLogin()` function
- Run with UI mode to debug: `npm run screenshots:ui`

**Port conflicts:**
- Update port in `playwright.config.ts` webServer configuration
- Update port in `vite.config.ts`

## Development Notes

- Screenshots are **not committed** to the repository (in `.gitignore`)
- Auth state file (`.auth.json`) is gitignored for security
- System designed for local development and CI use only
- Not for production runtime use
