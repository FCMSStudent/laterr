/**
 * Centralized list of routes to capture screenshots for
 * Add or remove routes as needed for your application
 */
export const routes = [
  { path: '/', name: 'home' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/app', name: 'app' },
  { path: '/bookmarks', name: 'bookmarks' },
  { path: '/subscriptions', name: 'subscriptions' },
  { path: '/health', name: 'health' },
  { path: '/landing', name: 'landing' },
  // Auth page doesn't require login, so it's included separately
  { path: '/auth', name: 'auth', skipAuth: true },
] as const;

/**
 * Authentication credentials
 * Override with environment variables for CI
 */
export const authConfig = {
  email: process.env.VITE_SCREENSHOT_EMAIL || 'itswaledx@gmail.com',
  password: process.env.VITE_SCREENSHOT_PASSWORD || 'xocqa3-nibbuq-gAdpyq',
  enabled: process.env.VITE_SCREENSHOT_SKIP_AUTH !== 'true',
};
