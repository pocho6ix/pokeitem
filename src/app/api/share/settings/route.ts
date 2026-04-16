import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug } from "@/lib/sharing/generateSlug";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const share = await prisma.classeurShare.findUnique({ where: { userId } });
  if (!share) {
    return NextResponse.json({
      isActive: false, slug: null, shareCards: true, shareDoubles: true,
      shareWishlist: true, shareItems: false,
      contactDiscord: null, contactEmail: null, contactTwitter: null,
    });
  }
  return NextResponse.json({
    isActive: share.isActive, slug: share.slug,
    shareCards: share.shareCards, shareDoubles: share.shareDoubles,
    shareWishlist: share.shareWishlist, shareItems: share.shareItems,
    contactDiscord: share.contactDiscord, contactEmail: share.contactEmail,
    contactTwitter: share.contactTwitter,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { isActive, shareCards, shareDoubles, shareWishlist, shareItems, contactDiscord, contactEmail, contactTwitter } = body;

  // Validate: if activating, at least one contact required
  if (isActive && !contactDiscord && !contactEmail && !contactTwitter) {
    return NextResponse.json({ error: "contact_required" }, { status: 400 });
  }

  // Email format validation
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const existing = await prisma.classeurShare.findUnique({ where: { userId } });

  // Generate slug only on first activation, never overwrite
  let slug = existing?.slug ?? null;
  if (isActive && !slug) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    slug = await generateUniqueSlug(user?.name);
  }

  const data = {
    userId, isActive: !!isActive, slug: slug ?? "placeholder",
    shareCards: shareCards ?? true, shareDoubles: shareDoubles ?? true,
    shareWishlist: shareWishlist ?? true, shareItems: shareItems ?? false,
    contactDiscord: contactDiscord ?? null, contactEmail: contactEmail ?? null,
    contactTwitter: contactTwitter ?? null,
    visibility: "link", // keep existing field
  };

  const share = await prisma.classeurShare.upsert({
    where: { userId },
    create: data,
    update: { ...data, slug: existing?.slug ?? data.slug }, // never overwrite existing slug
  });

  return NextResponse.json({ ok: true, slug: share.slug });
}
