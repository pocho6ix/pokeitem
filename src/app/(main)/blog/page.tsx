import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardFooter,
  CardHeader,
} from "@/components/ui/Card";
import { BLOG_POSTS } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog — Actualités et guides Pokémon TCG",
  description:
    "Retrouvez nos articles, guides et actualités sur le Pokémon TCG : investissement, sorties, tops et analyses.",
};

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
  "serie-guide": "Guide Série",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage() {
  const publishedPosts = BLOG_POSTS.filter((p) => p.published);
  const pinnedPost = publishedPosts.find((p) => p.pinned);
  const otherPosts = publishedPosts.filter((p) => !p.pinned);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog PokeItem</h1>
        <p className="mt-3 text-lg text-[var(--text-secondary)]">
          Actualités, guides et analyses pour les collectionneurs Pokémon TCG
        </p>
      </div>

      {/* Pinned / Featured article */}
      {pinnedPost && (
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              À la une
            </span>
          </div>
          <Link href={`/blog/${pinnedPost.slug}`} className="group block focus-visible:outline-none">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 focus-visible:ring-2 focus-visible:ring-blue-500">
              {/* Image */}
              <div className="aspect-[21/9] w-full overflow-hidden sm:aspect-[3/1]">
                {pinnedPost.coverImage ? (
                  <Image
                    src={pinnedPost.coverImage}
                    alt={pinnedPost.coverImageAlt ?? pinnedPost.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    sizes="100vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-blue-300 dark:text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                )}
                {/* Gradient overlay for text readability */}
                {pinnedPost.coverImage && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                )}
              </div>

              {/* Title & meta overlaid at the bottom */}
              <div className={`${pinnedPost.coverImage ? "absolute bottom-0 left-0 right-0 p-6 text-white" : "p-6"}`}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={CATEGORY_VARIANTS[pinnedPost.category ?? ""] ?? "default"}>
                    {CATEGORY_LABELS[pinnedPost.category ?? ""] ?? pinnedPost.category}
                  </Badge>
                </div>
                <h2 className={`text-xl font-bold leading-snug sm:text-2xl lg:text-3xl ${pinnedPost.coverImage ? "text-white" : "text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400"}`}>
                  {pinnedPost.title}
                </h2>
                <p className={`mt-2 line-clamp-2 text-sm sm:text-base ${pinnedPost.coverImage ? "text-white/80" : "text-[var(--text-secondary)]"}`}>
                  {pinnedPost.excerpt}
                </p>
                <div className={`mt-3 flex items-center gap-3 text-xs ${pinnedPost.coverImage ? "text-white/70" : "text-[var(--text-secondary)]"}`}>
                  <span>{pinnedPost.author}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{pinnedPost.readingTime} min de lecture</span>
                  <span aria-hidden="true">&middot;</span>
                  <time dateTime={pinnedPost.publishedAt}>{formatDate(pinnedPost.publishedAt)}</time>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Regular articles grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {otherPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group focus-visible:outline-none">
            <Card className="flex h-full flex-col transition-shadow group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-500">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt={post.coverImageAlt ?? post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl text-blue-300 dark:text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <Badge variant={CATEGORY_VARIANTS[post.category ?? ""] ?? "default"}>
                    {CATEGORY_LABELS[post.category ?? ""] ?? post.category}
                  </Badge>
                </div>
              </div>
              <CardHeader className="flex-1">
                <h2 className="line-clamp-2 text-lg font-semibold leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {post.title}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">{post.excerpt}</p>
              </CardHeader>
              <CardFooter className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>{post.author}</span>
                <span className="flex items-center gap-2">
                  <span>{post.readingTime} min de lecture</span>
                  <span aria-hidden="true">&middot;</span>
                  <time dateTime={post.publishedAt}>
                    {formatDate(post.publishedAt)}
                  </time>
                </span>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
