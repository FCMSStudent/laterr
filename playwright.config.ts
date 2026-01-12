import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright configuration for screenshot automation
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  // Timeout for each test
  timeout: 60000,
  
  // Run tests in files in parallel
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: 1,
  
  // Reporter to use
  reporter: 'list',
  
  // Shared settings for all the projects below
  use: {
    // Base URL from environment variable with fallback to localhost
    baseURL: process.env.VITE_SCREENSHOT_BASE_URL || 'http://localhost:8080',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    
    // Video settings
    video: 'off',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
