import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Extract package path after the final node_modules/ segment
              const packagePath = id.split('node_modules/').pop() || '';

              if (packagePath.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (packagePath.includes('@sentry')) {
                return 'vendor-sentry';
              }
              if (packagePath.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (packagePath.includes('motion')) {
                return 'vendor-motion';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});