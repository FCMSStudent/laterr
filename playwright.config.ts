import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile testing configurations for comprehensive mobile compatibility testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Override to simulate different network conditions on mobile
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13 Pro'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
