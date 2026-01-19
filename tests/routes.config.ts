/**
 * Central configuration for application routes to be tested
 * This ensures consistency between the application and screenshot tests
 */
export const routes = [
  {
    path: '/',
    name: 'home',
    description: 'Home page (Dashboard)',
    requiresAuth: false,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    description: 'Main dashboard',
    requiresAuth: false,
  },
  {
    path: '/app',
    name: 'app',
    description: 'Bookmarks app view',
    requiresAuth: false,
  },
  {
    path: '/bookmarks',
    name: 'bookmarks',
    description: 'Bookmarks page',
    requiresAuth: false,
  },
  {
    path: '/subscriptions',
    name: 'subscriptions',
    description: 'Subscriptions management',
    requiresAuth: false,
  },
  {
    path: '/health',
    name: 'health',
    description: 'Health check page',
    requiresAuth: false,
  },
  {
    path: '/landing',
    name: 'landing',
    description: 'Landing page',
    requiresAuth: false,
  },
  {
    path: '/auth',
    name: 'auth',
    description: 'Authentication page',
    requiresAuth: false,
  },
] as const;

export type Route = typeof routes[number];
