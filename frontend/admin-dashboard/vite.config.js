import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    proxy: {
      '/api': 'https://spgms-1-0.onrender.com',
      '/uploads': 'https://spgms-1-0.onrender.com'
    }
  }
});