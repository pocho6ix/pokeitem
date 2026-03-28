import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/Card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const RELATED_POSTS = [
  {
    slug: "guide-debuter-collection-pokemon-tcg",
    title: "Guide complet : bien d\u00e9buter sa collection Pok\u00e9mon TCG",
    category: "guide",
    readingTime: 8,
  },
  {
    slug: "top-10-produits-scelles-rentables-2025",
    title: "Top 10 des produits scell\u00e9s les plus rentables en 2025",
    category: "top",
    readingTime: 5,
  },
  {
    slug: "investir-etb-strategie-conseils",
    title: "Investir dans les ETB : strat\u00e9gie et conseils",
    category: "investissement",
    readingTime: 10,
  },
];

const TABLE_OF_CONTENTS = [
  { id: "introduction", label: "Introduction" },
  { id: "contexte", label: "Contexte" },
  { id: "analyse", label: "Analyse d\u00e9taill\u00e9e" },
  { id: "conseils", label: "Conseils pratiques" },
  { id: "conclusion", label: "Conclusion" },
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slugToTitle(slug);

  return {
    title: `${title} — Blog PokeItem`,
    description: `Lisez notre article "${title}" sur le blog PokeItem. Guides, actualit\u00e9s et analyses Pok\u00e9mon TCG.`,
    openGraph: {
      title: `${title} — Blog PokeItem`,
      description: `Lisez notre article "${title}" sur le blog PokeItem.`,
      type: "article",
      url: `https://www.pokeitem.fr/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Blog PokeItem`,
    },
    alternates: {
      canonical: `https://www.pokeitem.fr/blog/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const title = slugToTitle(slug);
  const publishedAt = "2026-03-20";
  const readingTime = 8;
  const author = "PokeItem";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-[var(--text-secondary)]">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/blog" className="hover:text-blue-600 dark:hover:text-blue-400">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="truncate font-medium text-[var(--text-primary)]">
            {title}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
        {/* Main content */}
        <article className="min-w-0">
          {/* Header */}
          <header className="mb-8">
            <Badge variant="default" className="mb-3">
              Guide
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span>{author}</span>
              <span aria-hidden="true">&middot;</span>
              <time dateTime={publishedAt}>
                {new Date(publishedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{readingTime} min de lecture</span>
            </div>
          </header>

          {/* Cover image placeholder */}
          <div className="mb-8 aspect-[2/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
            <div className="flex h-full items-center justify-center text-blue-300 dark:text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          </div>

          {/* Article body (placeholder) */}
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <section id="introduction">
              <h2>Introduction</h2>
              <p>
                Cet article est un espace r\u00e9serv\u00e9 en attendant l&apos;int\u00e9gration du
                contenu MDX. Le syst\u00e8me de blog PokeItem supportera bient\u00f4t les
                articles r\u00e9dig\u00e9s en Markdown avec des composants interactifs.
              </p>
            </section>

            <section id="contexte">
              <h2>Contexte</h2>
              <p>
                Le march\u00e9 Pok\u00e9mon TCG \u00e9volue rapidement. Les collectionneurs et
                investisseurs cherchent des informations fiables pour prendre
                les meilleures d\u00e9cisions.
              </p>
            </section>

            <section id="analyse">
              <h2>Analyse d\u00e9taill\u00e9e</h2>
              <p>
                Contenu \u00e0 venir. Cette section contiendra une analyse approfondie
                du sujet trait\u00e9 dans cet article.
              </p>
            </section>

            <section id="conseils">
              <h2>Conseils pratiques</h2>
              <p>
                Contenu \u00e0 venir. Des recommandations concr\u00e8tes seront
                pr\u00e9sent\u00e9es ici pour aider les lecteurs.
              </p>
            </section>

            <section id="conclusion">
              <h2>Conclusion</h2>
              <p>
                Contenu \u00e0 venir. Un r\u00e9sum\u00e9 des points cl\u00e9s et des prochaines
                \u00e9tapes sera disponible dans cette section.
              </p>
            </section>
          </div>
        </article>

        {/* Sidebar: Table of contents (desktop only) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Sommaire
            </h3>
            <nav aria-label="Sommaire">
              <ul className="space-y-2 border-l border-[var(--border-default)] pl-4">
                {TABLE_OF_CONTENTS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-[var(--text-secondary)] transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>

      {/* Related articles */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold">Articles li\u00e9s</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RELATED_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group focus-visible:outline-none"
            >
              <Card className="flex h-full flex-col transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
                <div className="aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                  <div className="flex h-full items-center justify-center text-blue-300 dark:text-blue-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                </div>
                <CardHeader>
                  <h3 className="line-clamp-2 text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {post.title}
                  </h3>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Badge variant="secondary" className="text-[10px]">
                      {post.category}
                    </Badge>
                    <span>{post.readingTime} min de lecture</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
