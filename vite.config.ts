import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sunken-wuhan-university/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    host: true,
  },
});
