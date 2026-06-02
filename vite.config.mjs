import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, "src");

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
  resolve: {
    alias: {
      components: path.join(src, "components"),
      pages:      path.join(src, "pages"),
      utils:      path.join(src, "utils"),
      config:     path.join(src, "config"),
      context:    path.join(src, "context"),
      hooks:      path.join(src, "hooks"),
      assets:     path.join(src, "assets"),
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
        target: 'https://yxflncpuevwkvnhlavpy.supabase.co',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // For Netlify deployment - ensure correct output directory
  base: './'
});