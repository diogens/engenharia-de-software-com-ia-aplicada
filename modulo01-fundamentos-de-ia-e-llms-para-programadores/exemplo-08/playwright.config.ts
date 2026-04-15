import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 5_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'https://erickwendel.github.io/vanilla-js-web-app-example/',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: [['html']],
});
