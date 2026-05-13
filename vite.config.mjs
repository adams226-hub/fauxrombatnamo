import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 3000,
    sourcemap: false,
    commonjsOptions: {
      include: [/xlsx/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['xlsx'],
  },
  plugins: [tsconfigPaths(), react(), tagger()],
  server: {
    port: "4028",
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: ['.amazonaws.com', '.builtwithrocket.new'],
    cors: true,
    proxy: {
      '/api/': {
        target: 'https://mbpvkayzjrvtcelreffo.supabase.co',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // For Netlify deployment - ensure correct output directory
  base: './'
});