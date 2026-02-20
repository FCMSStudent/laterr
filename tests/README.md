# Bookmark Reliability Test Runbook

This runbook documents the bookmark-focused hybrid gate:
- bookmark-scoped lint
- bookmark unit/component tests (Vitest + Testing Library)
- bookmark E2E tests (Playwright)

## Commands

```bash
# Build baseline
npm run build

# Lint only bookmark-relevant scope
npm run lint:bookmarks

# Bookmark unit/component tests
npm run test:bookmarks:unit

# Bookmark unit/component tests with coverage
npm run test:bookmarks:unit -- --coverage

# Bookmark E2E gate (includes cards-overlays + trash-flow)
npm run test:bookmarks:e2e

# Full local bookmark gate
npm run test:bookmarks
```

## Guest Mode Verification Flow

`tests/cards-overlays.spec.ts` and `tests/trash-flow.spec.ts` are guest-mode-first.

1. Navigate to a protected route (`/bookmarks`, `/dashboard`, etc.).
2. If redirected to `/auth`, test logic looks for a button matching `Continue as Guest`.
3. On success, tests continue to target routes and validate bookmark/overlay behavior.
4. If guest sign-in is unavailable, tests fail with an actionable message.

## Fixture Expectations

Bookmark E2E uses resilient expectations:
- `cards-overlays.spec.ts` accepts either:
  - collection present (`data-testid="bookmarks-collection"`), or
  - empty state present (`data-testid="bookmarks-empty-state"`).
- `trash-flow.spec.ts` attempts deterministic fixture creation through the UI.
  - If guest writes are blocked by policy, the test is skipped/fails explicitly with context.
  - Write-path correctness is still covered in unit/component tests through mocks.

## Runtime and Env Notes

- Unit tests run in `jsdom` with setup from `tests/setup/vitest.setup.ts`.
- Supabase client is test-runtime-safe (`src/lib/supabase/client.ts`) and won’t crash when `import.meta.env` is unavailable.
- Playwright relies on the local web server configured in `playwright.config.ts`.

## Troubleshooting

### 1. Redirects stay on `/auth` in E2E
- Confirm the auth page still renders a guest button matching `Continue as Guest`.
- Re-run a single spec in headed mode:
```bash
npx playwright test tests/cards-overlays.spec.ts --project=chromium --headed
```

### 2. Unit tests fail with browser API gaps
- Ensure `tests/setup/vitest.setup.ts` is loaded by `vitest.config.ts`.
- Check required polyfills/mocks for:
  - `IntersectionObserver`
  - `ResizeObserver`
  - `matchMedia`
  - clipboard
  - canvas/media stubs used by thumbnail tests

### 3. Supabase/env mismatch in tests
- Confirm tests mock Supabase at module boundaries where needed.
- If a test unexpectedly calls real client code, verify no `vi.mock` hoisting pitfalls.

### 4. E2E artifacts for debugging
After failures:
- inspect `test-results/`
- inspect `playwright-report/`

Open HTML report:
```bash
npx playwright show-report
```
