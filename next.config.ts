import type { NextConfig } from "next";

/**
 * Build mode switch:
 * - `CAPACITOR_BUILD=true next build` → static export for the iOS/Capacitor bundle
 * - default → full SSR build for Vercel web (keeps API routes, headers, redirects)
 */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const baseImageConfig: NonNullable<NextConfig["images"]> = {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 604800,
  remotePatterns: [
    { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    { protocol: "https", hostname: "product-images.s3.cardmarket.com" },
    { protocol: "https", hostname: "*.cardmarket.com" },
  ],
};

const capacitorConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    ...baseImageConfig,
    unoptimized: true,
  },
  // `headers`/`redirects`/`rewrites` are not supported in static export — they're
  // enforced by the Vercel edge on the web build only. Webview requests on iOS
  // go straight to api.pokeitem.fr so these never apply.
};

const webConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: baseImageConfig,
  async redirects() {
    const ED1_PAIRS = [
      ["set-de-base-1ed", "set-de-base"],
      ["jungle-1ed", "jungle"],
      ["fossile-1ed", "fossile"],
      ["team-rocket-1ed", "team-rocket"],
    ] as const;
    const rules: { source: string; destination: string; permanent: true }[] = [];
    for (const [from, to] of ED1_PAIRS) {
      rules.push({
        source: `/collection/cartes/wotc/${from}`,
        destination: `/collection/cartes/wotc/${to}`,
        permanent: true,
      });
      rules.push({
        source: `/portfolio/cartes/wotc/${from}`,
        destination: `/portfolio/cartes/wotc/${to}`,
        permanent: true,
      });
    }
    return rules;
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/binder/cards-by-rarity",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/portfolio/stats",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/portfolio/rarities",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/portfolio/chart",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/cards/:cardId/price-history",
        headers: [
          { key: "Cache-Control", value: "private, max-age=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/items",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/cards/collection",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/cards/doubles",
        headers: [
          { key: "Cache-Control", value: "private, max-age=300, stale-while-revalidate=60" },
        ],
      },
      {
        source: "/api/user/points",
        headers: [
          { key: "Cache-Control", value: "private, max-age=120, stale-while-revalidate=30" },
        ],
      },
    ];
  },
};

const nextConfig: NextConfig = isCapacitorBuild ? capacitorConfig : webConfig;

export default nextConfig;
