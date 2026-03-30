import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/Card";
import { getBlogPostBySlug, BLOG_POSTS } from "@/data/blog-posts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_VARIANTS: Record<string, "default" | "success" | "warning" | "secondary"> = {
  guide: "default",
  actualite: "secondary",
  investissement: "success",
  top: "warning",
};

const CATEGORY_LABELS: Record<string, string> = {
  guide: "Guide",
  actualite: "Actualité",
  investissement: "Investissement",
  top: "Top",
};

// ---------------------------------------------------------------------------
// Static params for SSG
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return BLOG_POSTS.filter((p) => p.published).map((p) => ({ slug: p.slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return { title: "Article introuvable — Blog PokeItem" };
  }

  const title = post.metaTitle || `${post.title} — Blog PokeItem`;
  const description =
    post.metaDescription || post.excerpt || `Lisez "${post.title}" sur le blog PokeItem.`;

  return {
    title,
    description,
    keywords: post.keywords,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.pokeitem.fr/blog/${slug}`,
      ...(post.coverImage && {
        images: [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
  const post = getBlogPostBySlug(slug);

  if (!post) notFound();

  const relatedPosts = post.relatedSlugs
    .map((s) => getBlogPostBySlug(s))
    .filter(Boolean);

  const hasContent = post.contentHtml.trim().length > 0;

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
            {post.title}
          </li>
        </ol>
      </nav>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
        {/* Main content */}
        <article className="min-w-0">
          {/* Header */}
          <header className="mb-8">
            <Badge
              variant={CATEGORY_VARIANTS[post.category] ?? "default"}
              className="mb-3"
            >
              {CATEGORY_LABELS[post.category] ?? post.category}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span>{post.author}</span>
              <span aria-hidden="true">&middot;</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span aria-hidden="true">&middot;</span>
              <span>{post.readingTime} min de lecture</span>
            </div>
          </header>

          {/* Cover image */}
          <div className="mb-8 aspect-[2/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt ?? post.title}
                width={1200}
                height={600}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
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
            )}
          </div>

          {/* Article body */}
          {hasContent ? (
            <div
              className="prose prose-lg prose-slate max-w-none dark:prose-invert prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-li:text-[var(--text-secondary)] prose-headings:scroll-mt-24 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-h2:mt-12 prose-h2:mb-4 prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-hr:my-10"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          ) : (
            <div className="prose prose-lg prose-slate max-w-none dark:prose-invert prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)]">
              <section id="introduction">
                <h2>Introduction</h2>
                <p>
                  Cet article est en cours de rédaction. Le contenu complet sera
                  bientôt disponible. Revenez prochainement !
                </p>
              </section>
            </div>
          )}
        </article>

        {/* Sidebar: Table of contents (desktop only) */}
        {post.tableOfContents.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Sommaire
              </h3>
              <nav aria-label="Sommaire">
                <ul className="space-y-2 border-l border-[var(--border-default)] pl-4">
                  {post.tableOfContents.map((item) => (
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
        )}
      </div>

      {/* Related articles */}
      {relatedPosts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Articles liés</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related!.slug}
                href={`/blog/${related!.slug}`}
                className="group focus-visible:outline-none"
              >
                <Card className="flex h-full flex-col transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
                  <div className="aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                    {related!.coverImage ? (
                      <Image
                        src={related!.coverImage}
                        alt={related!.coverImageAlt ?? related!.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
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
                    )}
                  </div>
                  <CardHeader>
                    <h3 className="line-clamp-2 text-base font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {related!.title}
                    </h3>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[related!.category] ?? related!.category}
                      </Badge>
                      <span>{related!.readingTime} min de lecture</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.metaDescription || post.excerpt,
            author: {
              "@type": "Organization",
              name: post.author,
              url: "https://www.pokeitem.fr",
            },
            publisher: {
              "@type": "Organization",
              name: "PokeItem",
              url: "https://www.pokeitem.fr",
              logo: {
                "@type": "ImageObject",
                url: "https://www.pokeitem.fr/logo.png",
              },
            },
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            mainEntityOfPage: `https://www.pokeitem.fr/blog/${post.slug}`,
            ...(post.coverImage && {
              image: `https://www.pokeitem.fr${post.coverImage}`,
            }),
            keywords: post.keywords.join(", "),
            wordCount: post.readingTime * 200,
          }),
        }}
      />
    </div>
  );
}
