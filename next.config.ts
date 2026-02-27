import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Service worker is disabled in development to avoid conflicts with hot-reload
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  // start_url is /app/dashboard but unauthenticated users are redirected to /login,
  // so we use dynamic mode to avoid caching a stale redirect response.
  cacheStartUrl: true,
  dynamicStartUrl: true,
  dynamicStartUrlRedirect: "/login",
  // Cache navigated pages for faster repeat visits and partial offline support
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  // Offline fallback page (app/~offline/page.tsx)
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanUpOutdatedCaches: true,
    runtimeCaching: [
      // ── Next.js static assets (JS/CSS chunks) ── Cache First, 1 year
      {
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: {
            maxEntries: 256,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Next.js image optimizer ── Stale While Revalidate, 7 days
      {
        urlPattern: /^\/_next\/image\?.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── PWA icons + static public assets ── Cache First, 30 days
      {
        urlPattern: /^\/icons\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-icons",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Google Fonts stylesheets ── Stale While Revalidate
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-stylesheets",
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Google Fonts files ── Cache First, 1 year
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── App shell pages ── Network First, fall back to cache; 24 h TTL
      // This ensures authenticated app pages are available offline once visited.
      {
        urlPattern: /^\/app\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "app-shell-pages",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Public pages (/, /login, /signup) ── Network First, 24 h TTL
      {
        urlPattern: /^\/(login|signup|forgot-password)?$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "public-pages",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── API routes ── Network Only (never serve stale API data offline)
      {
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default withPWA(nextConfig);
