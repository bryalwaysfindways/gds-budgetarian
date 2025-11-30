import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/GDS-BUDGETARIAN-ZEBRA",
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
