import type { Metadata } from "next";
import Link from "next/link";
import MarketItemContent from "./MarketItemContent";

interface PageProps {
  params: Promise<{ itemSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { itemSlug } = await params;
  const title = itemSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: `${title} — Market | PokeItem`,
    description: `Meilleures offres du marche pour ${title}. Comparez les prix sur CardMarket, eBay, LeBonCoin et plus.`,
  };
}

export default async function MarketItemPage({ params }: PageProps) {
  const { itemSlug } = await params;
  const displayName = itemSlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/market" className="hover:text-[var(--text-primary)] transition-colors">
          Market
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)] font-medium">{displayName}</span>
      </nav>

      <MarketItemContent itemSlug={itemSlug} displayName={displayName} />
    </div>
  );
}
