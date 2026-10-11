import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
const supabaseHost = new URL(supabaseUrl).hostname;
const isDev = process.env.NODE_ENV !== "production";

// Inline scripts are needed for the no-flash theme script, JSON-LD and Next's bootstrap on
// statically prerendered pages (nonces would force every page to render per request).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://app.cal.com https://www.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHost}`,
  "font-src 'self'",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://app.cal.com https://api.cal.com https://www.google.com`,
  "frame-src https://app.cal.com https://cal.com https://www.google.com https://recaptcha.google.com",
  "worker-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The *.vercel.app addresses are for testing only: keep them out of search results so
      // www.layothedeveloper.com is the only address search engines list.
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?<host>.+)\\.vercel\\.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
