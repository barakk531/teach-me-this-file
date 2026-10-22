import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In development the API runs on its own port; in production Express serves both.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
