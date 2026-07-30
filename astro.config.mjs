// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://superkilat.ai',
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // drizzle-orm imports are server-only; keep them external
      noExternal: [],
    },
  },
  build: {
    rolldownOptions: {
      external: ['drizzle-orm', 'drizzle-orm/*', 'pg', 'groq-sdk'],
    },
  },
});