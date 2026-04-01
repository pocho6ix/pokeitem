import { put, del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format non supporté. Utilisez JPG, PNG ou WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (2 Mo maximum)" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, image: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Compress: 400×400 center crop, WebP quality 80
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const compressedBuffer = await sharp(inputBuffer)
    .resize(400, 400, { fit: "cover", position: "center", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  // Delete old Vercel Blob image if one exists
  if (user.image?.includes("blob.vercel-storage.com")) {
    try {
      await del(user.image);
    } catch {
      // silencieux — ne pas bloquer l'upload si la suppression échoue
    }
  }

  // Upload to Vercel Blob
  const filename = `avatars/${user.id}-${Date.now()}.webp`;
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(filename, compressedBuffer, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
  } catch (err) {
    console.error("Vercel Blob upload error:", err);
    return NextResponse.json(
      { error: "Impossible d'uploader la photo. Vérifiez la configuration du stockage." },
      { status: 500 },
    );
  }

  // Save URL in DB
  await prisma.user.update({
    where: { id: user.id },
    data: { image: blob.url },
  });

  return NextResponse.json({ hasAvatar: true, url: blob.url });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, image: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Delete from Vercel Blob if applicable
  if (user.image?.includes("blob.vercel-storage.com")) {
    try {
      await del(user.image);
    } catch {
      // silencieux
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { image: null },
  });

  return NextResponse.json({ hasAvatar: false });
}
