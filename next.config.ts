import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack(config) {
    // Work around a lost-ping bug in the bundled React DOM that can leave server-action and navigation
    // transitions pending forever (see scripts/react-ping-fix-loader.cjs).
    config.module.rules.push({
      test: /next[\\/]dist[\\/]compiled[\\/]react-dom[\\/]cjs[\\/]react-dom-client\.production\.js$/,
      use: [{ loader: path.resolve(process.cwd(), "scripts/react-ping-fix-loader.cjs") }],
    });
    return config;
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Stock product photos and static art are named by content id and never change in place:
      // let browsers and Caddy keep them for 30 days instead of revalidating on every page view.
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
      { source: "/:file(favicon.svg|og-default.svg)", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
