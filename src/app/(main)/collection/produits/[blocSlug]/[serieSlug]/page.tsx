import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as fs from "fs";
import * as path from "path";
import { BLOCS } from "@/data/blocs";
import { SERIES } from "@/data/series";
import { ITEM_TYPES } from "@/data/item-types";
import { ITEM_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { SerieItemsGrid } from "@/components/collection/SerieItemsGrid";
import { BackButton } from "@/components/ui/BackButton";
import { prisma } from "@/lib/prisma";
import {
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
} from "@/lib/seo/structured-data";

interface SeriePageProps {
  params: Promise<{ blocSlug: string; serieSlug: string }>;
}

const TYPE_SLUG_REVERSE: Record<string, string> = {
  booster: "BOOSTER", duopack: "DUOPACK", blister: "BLISTER",
  "mini-tin": "MINI_TIN", "pokeball-tin": "POKEBALL_TIN", bundle: "BUNDLE",
  "box-set": "BOX_SET", etb: "ETB", "booster-box": "BOOSTER_BOX",
  upc: "UPC", tin: "TIN", "theme-deck": "THEME_DECK", "trainer-kit": "TRAINER_KIT",
};

function getAvailableImageTypes(serieSlug: string): string[] {
  const dir = path.join(process.cwd(), "public", "images", "items");
  try {
    const files = fs.readdirSync(dir);
    const prefix = `${serieSlug}-`;
    return files
      .filter((f) => f.startsWith(prefix) && f.endsWith(".jpg"))
      .map((f) => {
        const typePart = f.slice(prefix.length, -4);
        return TYPE_SLUG_REVERSE[typePart] || typePart.toUpperCase();
      });
  } catch {
    return [];
  }
}

function findBloc(slug: string) {
  return BLOCS.find((b) => b.slug === slug);
}

function findSerie(blocSlug: string, serieSlug: string) {
  return SERIES.find((s) => s.blocSlug === blocSlug && s.slug === serieSlug);
}

export function generateStaticParams() {
  return SERIES.map((s) => ({ blocSlug: s.blocSlug, serieSlug: s.slug }));
}

export async function generateMetadata({ params }: SeriePageProps): Promise<Metadata> {
  const { blocSlug, serieSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);
  if (!bloc || !serie) return { title: "Extension introuvable | PokeItem" };

  const title = `${serie.name} — ${bloc.name} | PokeItem`;
  const description = `Tous les produits scellés de l'extension ${serie.name} (${serie.abbreviation}) de la série ${bloc.name}. Prix, disponibilité et détails sur PokeItem.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.pokeitem.fr/collection/produits/${blocSlug}/${serieSlug}`,
      images: serie.imageUrl ? [{ url: serie.imageUrl, alt: serie.name }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://www.pokeitem.fr/collection/produits/${blocSlug}/${serieSlug}`,
    },
  };
}

export default async function SeriePage({ params }: SeriePageProps) {
  const { blocSlug, serieSlug } = await params;
  const bloc = findBloc(blocSlug);
  const serie = findSerie(blocSlug, serieSlug);

  if (!bloc || !serie) {
    notFound();
  }

  let dbItems: Array<{
    id: string;
    name: string;
    type: string;
    imageUrl: string | null;
    currentPrice: number | null;
    priceTrend: number | null;
    retailPrice: number | null;
    serie: { name: string; abbreviation: string | null } | null;
  }> = [];

  try {
    const dbSerie = await prisma.serie.findFirst({
      where: { slug: serieSlug },
    });
    if (dbSerie) {
      dbItems = await prisma.item.findMany({
        where: { serieId: dbSerie.id },
        select: {
          id: true,
          name: true,
          type: true,
          imageUrl: true,
          currentPrice: true,
          priceTrend: true,
          retailPrice: true,
          serie: { select: { name: true, abbreviation: true } },
        },
      });
    }
  } catch {
    // DB not available, continue with static data
  }

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { name: "Accueil", url: "/" },
    { name: "Collection", url: "/collection/produits" },
    { name: bloc.name, url: `/collection/produits/${bloc.slug}` },
    { name: serie.name, url: `/collection/produits/${bloc.slug}/${serie.slug}` },
  ]);

  const itemListLd = generateItemListJsonLd(
    `Produits scellés — ${serie.name}`,
    ITEM_TYPES.filter((it) => it.typicalMsrp > 0).map((it) => ({
      name: ITEM_TYPE_LABELS[it.type] ?? it.label,
      url: `/collection/produits/${bloc.slug}/${serie.slug}#${it.type.toLowerCase()}`,
    }))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      {/* Back */}
      <div className="mb-4">
        <BackButton />
      </div>

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/collection/produits" className="hover:text-blue-600 transition-colors">
          Collection
        </Link>
        <span>/</span>
        <Link
          href={`/collection/produits/${bloc.slug}`}
          className="hover:text-blue-600 transition-colors"
        >
          {bloc.name}
        </Link>
        <span>/</span>
        <span className="font-medium text-[var(--text-primary)]">
          {serie.name}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            {serie.name}
          </h1>
          <Badge variant="default">{serie.abbreviation}</Badge>
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          {serie.releaseDate ? <>Sortie le{" "}{new Date(serie.releaseDate).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}</> : "Série promotionnelle"}
          {" "}&mdash; Série {bloc.name}
        </p>
      </div>

      {/* Item types grid */}
      <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
        Types de produits disponibles
      </h2>

      <SerieItemsGrid
        itemTypes={ITEM_TYPES}
        serieName={serie.name}
        serieSlug={serie.slug}
        serieAbbreviation={serie.abbreviation}
        dbItems={dbItems.map((i) => ({
          ...i,
          serie: i.serie ?? undefined,
        }))}
        availableImageTypes={getAvailableImageTypes(serie.slug)}
      />
    </div>
  );
}
