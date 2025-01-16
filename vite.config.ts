import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'background.js', dest: '' },
        { src: 'manifest.json', dest: '' },
        { src: 'icons', dest: '' }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',         // Main app entry
        onboarding: './onboarding.html', // Onboarding entry
        setting: './setting.html',
      },
      output: {
        entryFileNames: '[name].js', // This will output 'onboarding.js' and 'main.js'
      },
    },
  },
});
