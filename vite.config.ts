import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(Date.now()),
  },
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
      // "prompt": a new build installs and waits; the app shows a passive
      // top notice and waits for Refresh or a sustained idle/background period.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Catacombs & Starspawns",
        short_name: "C&S Hunters",
        description:
          "Companion app for Catacombs & Starspawns — current sources, Hunter sheets, sessions and battles.",
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
        // Source PDFs are intentionally absent from globPatterns; fetch them on
        // demand so an installed app keeps enough room for its application shell.
        globIgnores: ["**/splash/**"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/__/, /\.pdf$/],
        cleanupOutdatedCaches: true,
        // Large PDFs are fetched fresh on demand; iOS installed apps have a
        // small quota and must not lose the app-shell cache to source files.
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
