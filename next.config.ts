import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  // sharp uses native binaries — must be treated as external in serverless
  serverExternalPackages: ['sharp'],
  images: {
    formats: ["image/avif", "image/webp"],
    // Cache images optimisées 7 jours côté CDN (elles ne changent jamais)
    minimumCacheTTL: 604800,
    remotePatterns: [
      { protocol: "https", hostname: "product-images.s3.cardmarket.com" },
      { protocol: "https", hostname: "*.cardmarket.com" },
      { protocol: "https", hostname: "www.pokecardex.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.tcggo.com" },
    ],
  },
  async headers() {
    return [
      // Security headers sur toutes les pages
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Assets statiques Next.js (JS/CSS avec hash) — cache 1 an immuable
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Routes API lourdes en lecture — cache privé 5 min
      // "private" = pas de cache CDN (données user-specific), mais le browser garde 5 min
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
      // Historique de prix — cache court (60s) pour que les corrections
      // de prix (backfills, scraper quotidien) deviennent visibles vite.
      // stale-while-revalidate=300 garde un cache serveur de 5 min pour
      // amortir les pics de trafic tout en ravitaillant en arrière-plan.
      {
        source: "/api/cards/:cardId/price-history",
        headers: [
          { key: "Cache-Control", value: "private, max-age=60, stale-while-revalidate=300" },
        ],
      },
      // Catalogue items publics — cache 5 min (mis à jour par le scraper toutes les 6h)
      {
        source: "/api/items",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=60" },
        ],
      },
      // Collection & doubles — données user-specific, cache browser 5 min
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
      // Points utilisateur — cache browser 2 min
      {
        source: "/api/user/points",
        headers: [
          { key: "Cache-Control", value: "private, max-age=120, stale-while-revalidate=30" },
        ],
      },
    ];
  },
};

export default nextConfig;
