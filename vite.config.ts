import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',         // Main app entry
        onboarding: './onboarding.html', // Onboarding entry
      },
      output: {
        entryFileNames: '[name].js', // This will output 'onboarding.js' and 'main.js'
      },
    },
  },
});
