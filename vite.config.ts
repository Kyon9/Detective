
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cast process to any to avoid "Property 'cwd' does not exist on type 'Process'" TS error
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || process.env.API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // 同时定义 process.env.API_KEY 和全局常量，增加兼容性
      'process.env.API_KEY': JSON.stringify(apiKey),
      '__API_KEY__': JSON.stringify(apiKey)
    },
    server: {
      host: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development'
    }
  };
});
