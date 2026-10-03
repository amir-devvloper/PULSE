import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Old vanilla files (monitors.js, incidents.js, login.js ...) still sit in the project root.
// Vite treats an extensionless URL like /monitors as a JS module request and serves monitors.js
// as the page. This makes every browser page navigation fall back to index.html (the React app).
const spaNavigationFallback = () => ({
  name: 'spa-navigation-fallback',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const isPageNavigation =
        req.method === 'GET' &&
        (req.headers.accept || '').includes('text/html') &&
        !req.url.startsWith('/api') &&
        !/\.[a-z0-9]+(\?|$)/i.test(req.url.split('?')[0]);
      if (isPageNavigation) req.url = '/index.html';
      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), spaNavigationFallback()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist'
  }
});