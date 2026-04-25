import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          table: ['@tanstack/react-table'],
          spreadsheet: ['read-excel-file/universal', 'write-excel-file/universal'],
        },
      },
    },
  },
});
