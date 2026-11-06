// E2E against a running Ronda. CI points E2E_BASE_URL at the compose stack
// (nginx + API + PostgreSQL). Locally, `pnpm e2e:local` starts a disposable
// stack (e2e/stack.mjs) and serves dist/ with vite preview on :4173.
import { defineConfig, devices } from '@playwright/test';

const external = process.env.E2E_BASE_URL;
const baseURL = external || 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure', locale: 'es-CO' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: external ? undefined : {
    command: 'pnpm exec vite preview --config e2e/vite.e2e.config.js',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
