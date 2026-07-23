// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        strategies: "generateSW",
        filename: "sw.js",
        devOptions: { enabled: false },
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
          "icon-maskable-192.png",
          "icon-maskable-512.png",
        ],
        manifest: {
          name: "South India Journal — Truth Beyond Headlines",
          short_name: "South India Journal",
          description:
            "Premium editorial journalism from Telangana, Hyderabad, India and the world — augmented with AI.",
          start_url: "/",
          scope: "/",
          id: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: "#c8102e",
          background_color: "#ffffff",
          lang: "en-IN",
          categories: ["news", "magazines", "lifestyle"],
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          shortcuts: [
            { name: "Breaking News", short_name: "Breaking", url: "/section/breaking", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
            { name: "Telangana", short_name: "Telangana", url: "/section/telangana", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
            { name: "Hyderabad", short_name: "Hyderabad", url: "/section/hyderabad", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
            { name: "Live TV", short_name: "Live TV", url: "/section/videos", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
            { name: "Search", short_name: "Search", url: "/search", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
          navigateFallback: "/",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/_serverFn\//,
            /^\/~oauth/,
            /^\/sitemap\.xml/,
            /^\/robots\.txt/,
          ],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              // HTML navigations — always try network first, fall back to cache offline.
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "nv-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Article images / remote media.
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "nv-images",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts stylesheets.
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
              handler: "StaleWhileRevalidate",
              options: { cacheName: "nv-google-fonts-css" },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "nv-google-fonts-webfonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Server function reads — light SWR so recent feed still shows offline.
              urlPattern: /\/_serverFn\/(getHomepageFeed|getBreaking|getSectionFeed|getArticleBySlug)/,
              handler: "NetworkFirst",
              options: {
                cacheName: "nv-feed",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
