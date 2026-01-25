import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react/jsx-runtime', 
      'react-dom/client',
      'lucide-react',
      'recharts'
    ],
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild'
  }
});