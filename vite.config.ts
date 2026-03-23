import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
  const libraryScope = env.VITE_LIBRARY_SCOPE ?? process.env.VITE_LIBRARY_SCOPE ?? 'private';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [tailwindcss(), react()],
      define: {
        '__LIBRARY_SCOPE__': JSON.stringify(libraryScope),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;

              if (id.includes('/three/')) {
                return 'three-core';
              }

              if (id.includes('@react-three/fiber')) {
                return 'r3f-fiber';
              }

              if (id.includes('@react-three/drei') || id.includes('three-stdlib') || id.includes('@react-three/postprocessing') || id.includes('node_modules/postprocessing')) {
                return 'r3f-drei';
              }

              if (id.includes('maath') || id.includes('react-use-measure') || id.includes('debounce') || id.includes('its-fine') || id.includes('react-reconciler')) {
                return 'r3f-utils';
              }

              if (id.includes('react') || id.includes('scheduler') || id.includes('zustand')) {
                return 'react-vendor';
              }

              if (id.includes('lucide-react')) {
                return 'ui-vendor';
              }

              return 'vendor';
            },
          },
        },
      }
    };
});
