import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/server': path.resolve(__dirname, './src/server'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/test': path.resolve(__dirname, './test'),
    },
  },
});
