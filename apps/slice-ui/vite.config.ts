import { defineConfig } from 'vite';

// phase1-slice.md §11.1: content is bundled as raw text from the repository; the Spike A grid, when it has been built
// (git-ignored), is served from map-spike's public folder for the optional terrain under the map.
export default defineConfig({
  publicDir: '../map-spike/public',
  server: { port: 5174, strictPort: true },
});
