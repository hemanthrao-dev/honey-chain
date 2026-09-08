import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  root: 'frontend',
  base: process.env.NODE_ENV === 'production' ? '/honey-chain/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Disable source maps in production for security and cleaner bundle
    sourcemap: false,
    // Production optimizations
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('crypto-js')) return 'vendor-crypto';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('qrcode.react')) return 'vendor-qrcode';
            if (id.includes('react-hot-toast')) return 'vendor-toast';
          }
          return 'main'; // Default chunk
        },
      },
    },
  },
  server: {
    // Security headers for development
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  base: "/honey-chain",
});