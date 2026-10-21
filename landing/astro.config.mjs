import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ronda.repolite.link',
  trailingSlash: 'never',
  build: { inlineStylesheets: 'auto' },
});
