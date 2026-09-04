import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    dir: "./test",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    reporters: ["tree"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/**/index.ts",
        "src/**/*.{d,types,constants,queries}.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/api-client.ts",
        "src/**/query-client.ts",
      ],
    },
  },
  server: {
    allowedHosts: ["client", "client-e2e"],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
      },
      "/ws": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
