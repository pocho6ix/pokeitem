/**
 * Publie l'article en créant un fichier JSON dans src/data/blog-posts-generated/
 * Ce fichier sera automatiquement chargé par loadGeneratedArticles() au build.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { GeneratedArticle } from "./generate-article";
import { IVAN_CONFIG } from "./config";

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  coverImageAlt: string | null;
  author: string;
  tags: string[];
  category: string;
  published: boolean;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  readingTime: number;
  viewCount: number;
  tableOfContents: { id: string; label: string }[];
  contentHtml: string;
  relatedSlugs: string[];
}

export function publishArticle(article: GeneratedArticle): string {
  const outputDir = join(process.cwd(), IVAN_CONFIG.outputDir);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Générer un ID unique basé sur le timestamp
  const id = `ivan-${Date.now()}`;

  const blogPost: BlogPostData = {
    id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: `/images/blog/${article.slug}.jpg`,
    coverImageAlt: `Produits scellés Pokémon TCG - ${article.title}`,
    author: IVAN_CONFIG.author,
    tags: article.tags,
    category: IVAN_CONFIG.category,
    published: true,
    publishedAt: new Date().toISOString(),
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    keywords: [article.mainKeyword, ...article.longTailKeywords],
    readingTime: article.readingTime,
    viewCount: IVAN_CONFIG.initialViewCount,
    tableOfContents: article.tableOfContents,
    contentHtml: article.content,
    relatedSlugs: [],
  };

  const filepath = join(outputDir, `${article.slug}.json`);
  writeFileSync(filepath, JSON.stringify(blogPost, null, 2), "utf-8");

  console.log(`  Article JSON : ${IVAN_CONFIG.outputDir}/${article.slug}.json`);

  // Sauvegarder le prompt Gemini
  const promptDir = join(process.cwd(), IVAN_CONFIG.geminiPromptsDir);
  if (!existsSync(promptDir)) mkdirSync(promptDir, { recursive: true });

  writeFileSync(
    join(promptDir, `${article.slug}.txt`),
    [
      `PROMPT GEMINI — Image de couverture pour "${article.title}"`,
      "",
      article.geminiImagePrompt,
      "",
      "Format: 1200x630",
      "Style: Photorealistic, editorial",
      "Pas de texte sur l'image",
      "",
      `Sauvegarder dans : public/images/blog/${article.slug}.jpg`,
    ].join("\n"),
  );

  console.log(`  Prompt Gemini : ${IVAN_CONFIG.geminiPromptsDir}/${article.slug}.txt`);

  return filepath;
}
