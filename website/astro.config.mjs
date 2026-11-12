import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://YOUR_USERNAME.github.io',
  base: '/YesYouTube',
  output: 'static',
  build: {
    format: 'directory'
  },
  trailingSlash: 'always'
});
