import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  plugins: [
    react({
      // React Compiler — auto-memoises components/hooks at build time.
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Catacombs & Starspawns",
        short_name: "C&S Hunters",
        description:
          "Companion app for our Catacombs & Starspawns campaign — sessions, hunter cards and the player's handbook.",
        theme_color: "#0a0a0c",
        background_color: "#0a0a0c",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["games", "entertainment"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}", "pwa-*.png", "apple-touch-icon.png", "favicon.svg"],
        // Don't precache the large handbook PDF or the iOS splash images.
        globIgnores: ["**/splash/**", "**/handbook/**"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__/, /\.pdf$/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
