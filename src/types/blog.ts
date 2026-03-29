// ---------------------------------------------------------------------------
// Blog / content types
// ---------------------------------------------------------------------------

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  coverImageAlt: string | null;
  author: string;
  tags: string[];
  category: string;
  published: boolean;
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  readingTime: number;
  viewCount: number;
}
