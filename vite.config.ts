
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 这将允许我们在代码中通过 process.env.API_KEY 访问
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  server: {
    host: true
  },
  build: {
    outDir: 'dist',
  }
});
