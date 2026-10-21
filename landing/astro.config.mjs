import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ronda.repolite.link',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto' },
  // Permite compartir el preview por un túnel temporal de Cloudflare.
  vite: { preview: { allowedHosts: ['.trycloudflare.com'] } },
});
