// vite preview for local E2E: serves the built dist/ and forwards /api to the
// disposable API container started by e2e/stack.mjs (port in E2E_API_PORT).
import { defineConfig } from 'vite';

const apiPort = process.env.E2E_API_PORT;
if (!/^\d+$/.test(apiPort || '')) throw new Error('E2E_API_PORT must be the port printed by e2e/stack.mjs start');

export default defineConfig({
  root: new URL('..', import.meta.url).pathname,
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } } },
});
