import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const posixPath = path.posix;
const __filename = fileURLToPath(import.meta.url);
const __dirname = posixPath.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": posixPath.resolve(__dirname, "client", "src"),
      "@shared": posixPath.resolve(__dirname, "shared"),
      "@assets": posixPath.resolve(__dirname, "attached_assets"),
    },
  },
  root: posixPath.resolve(__dirname, "client"),
  build: {
    outDir: posixPath.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: posixPath.resolve(__dirname, 'client/index.html'),
        widget: posixPath.resolve(__dirname, 'client/widget.html'),
        embed: posixPath.resolve(__dirname, 'client/embed.html'),
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        }
      }
    },
    assetsDir: 'assets',
    copyPublicDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
