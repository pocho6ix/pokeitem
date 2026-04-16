import { prisma } from "@/lib/prisma";

const RESERVED = new Set(["admin", "api", "login", "settings", "u", "portfolio", "collection", "pricing", "profil", "scanner"]);

function slugify(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 12);
}

function randomChars(n = 4): string {
  return Math.random().toString(36).slice(2, 2 + n);
}

export async function generateUniqueSlug(displayName?: string | null): Promise<string> {
  const base = displayName ? slugify(displayName) : "";
  const prefix = base && !RESERVED.has(base) ? base : "dresseur";

  for (let attempt = 0; attempt < 10; attempt++) {
    const slug = `${prefix}-${randomChars(4)}`;
    const existing = await prisma.classeurShare.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  // Fallback with longer random suffix
  return `dresseur-${randomChars(8)}`;
}
