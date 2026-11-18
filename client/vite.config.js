import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server forwards /api to the Express API, so the browser talks to
// one origin: no CORS setup, and the same relative URLs work in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // API_URL lets you point the client at an API on another port.
      '/api': process.env.API_URL || 'http://localhost:5050',
    },
  },
});
