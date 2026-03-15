import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/wisp": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/api/alt-wisp-1": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/api/alt-wisp-2": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/api/alt-wisp-3": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/bare": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
