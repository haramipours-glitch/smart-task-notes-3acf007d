import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "robots.txt", "pwa-512x512.png"],
      manifest: {
        name: "ARSHNAZ — آرشناز · مدیریت تسک با عشق",
        short_name: "ARSHNAZ",
        description: "آرشناز — مدیریت وظایف، یادداشت‌ها و سلامت روان با AI. تقدیم با عشق.",
        theme_color: "#ec4899",
        background_color: "#0F172A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app/today",
        scope: "/",
        lang: "fa",
        dir: "rtl",
        icons: [
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // Home-screen shortcuts (Android long-press menu) — closest thing PWA has to widgets
        shortcuts: [
          {
            name: "تسک امروز",
            short_name: "امروز",
            description: "تسک‌های امروز را ببین",
            url: "/app/today",
            icons: [{ src: "/pwa-512x512.png", sizes: "512x512" }],
          },
          {
            name: "Check-in روزانه",
            short_name: "Check-in",
            description: "حال‌وهوای امروز را ثبت کن",
            url: "/app/checkin",
            icons: [{ src: "/pwa-512x512.png", sizes: "512x512" }],
          },
          {
            name: "Pomodoro",
            short_name: "تمرکز",
            description: "شروع جلسه تمرکز",
            url: "/app/pomodoro",
            icons: [{ src: "/pwa-512x512.png", sizes: "512x512" }],
          },
          {
            name: "SOS / بحران",
            short_name: "SOS",
            description: "دسترسی سریع به ابزارهای بحران",
            url: "/app/crisis",
            icons: [{ src: "/pwa-512x512.png", sizes: "512x512" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") && url.pathname.includes("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") && url.pathname.includes("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
