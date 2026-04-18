import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCardBlobKey } from "@/lib/seo/card-image";

/**
 * GET /telecharger/{cardId}
 *
 * Proxy l'image d'une carte depuis Vercel Blob vers le navigateur en
 * forçant un téléchargement avec un nom de fichier SEO-friendly :
 *
 *   pikachu-5-promo-mcdo-2013-pokeitem.webp
 *
 * Pourquoi un proxy plutôt qu'un `<a href={blobUrl} download>` ?
 * L'attribut HTML `download` est ignoré cross-origin (Blob est sur
 * `*.public.blob.vercel-storage.com`, pas sur `app.pokeitem.fr`), donc
 * le seul moyen fiable de dicter le filename au download est d'émettre
 * un header `Content-Disposition: attachment; filename="…"`.
 *
 * Le corps de la réponse est streamé (pas de buffering) ; le coût
 * bandwidth est négligeable puisque Vercel Blob → Vercel Runtime est
 * même infrastructure. On garde le cache agressif (30 jours) pour
 * éviter de refetcher la carte si un user clique plusieurs fois.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      name:     true,
      number:   true,
      imageUrl: true,
      serie:    { select: { slug: true } },
    },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }
  if (!card.imageUrl) {
    return NextResponse.json({ error: "Image indisponible" }, { status: 404 });
  }

  const upstream = await fetch(card.imageUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Échec du chargement de l'image source" },
      { status: 502 },
    );
  }

  const blobKey  = buildCardBlobKey(card, card.serie.slug);
  const filename = blobKey.split("/").pop() ?? `${cardId}.webp`;

  // RFC 5987 : `filename*` UTF-8 pour les browsers modernes, `filename`
  // ASCII fallback pour les plus anciens. Notre slug est déjà ASCII-safe
  // (strip diacritiques) donc les deux valeurs sont identiques ici.
  const disposition =
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

  const headers: Record<string, string> = {
    "Content-Type":        upstream.headers.get("content-type") ?? "image/webp",
    "Content-Disposition": disposition,
    "Cache-Control":       "public, max-age=2592000, immutable",
  };
  const len = upstream.headers.get("content-length");
  if (len) headers["Content-Length"] = len;

  return new Response(upstream.body, { status: 200, headers });
}
