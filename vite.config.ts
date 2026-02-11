import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  resolve: {
    alias: {
      'decisionapp/styles.css': resolve(__dirname, 'src/pugh-matrix.css'),
      'decisionapp': resolve(__dirname, 'src/index.ts'),
    },
  },
});
