import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = {
  ...loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), ''),
  ...process.env
};

export default defineConfig({
  site: env.SITE_URL || 'https://YOUR_USERNAME.github.io',
  base: env.BASE_PATH || '/YesYouTube',
  output: 'static',
  build: {
    format: 'directory'
  },
  trailingSlash: 'always'
});
