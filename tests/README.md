# Screenshot Tests

This directory contains automated screenshot tests for the Laterr application.

## Files

- **routes.config.ts** - Centralized list of routes and authentication configuration
- **screenshots.spec.ts** - Main Playwright test suite for capturing screenshots

## Usage

See [SCREENSHOTS.md](../SCREENSHOTS.md) in the root directory for complete documentation.

## Quick Start

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run screenshot capture
npm run screenshots

# Run with UI mode for debugging
npm run screenshots:ui
```

## Adding New Routes

Edit `routes.config.ts` and add your route to the `routes` array:

```typescript
export const routes = [
  // ... existing routes
  { path: '/new-page', name: 'new-page' },
];
```

## Configuration

Authentication and base URL can be configured via environment variables:

- `VITE_SCREENSHOT_BASE_URL` - Base URL for screenshots (default: http://localhost:8080)
- `VITE_SCREENSHOT_EMAIL` - Login email
- `VITE_SCREENSHOT_PASSWORD` - Login password
- `VITE_SCREENSHOT_SKIP_AUTH` - Set to 'true' to skip authentication
