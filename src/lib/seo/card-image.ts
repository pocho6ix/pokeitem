/**
 * Helpers SEO pour les images de cartes.
 *
 * Tous les composants qui rendent une carte DOIVENT utiliser ces fonctions
 * plutôt que de composer leur propre `alt=` ou leur propre URL :
 *
 *   <Image
 *     src={card.imageUrl}               // URL mirror Vercel Blob, filename SEO
 *     alt={getCardImageAlt(card, serie)} // "Carte Pokémon Pikachu #5 — Promo McDonald's 2013"
 *   />
 *
 * Pour le filename : c'est déjà la dernière partie de `card.imageUrl` depuis
 * le mirror Blob (`cards/{serieSlug}/{name}-{num}-{serieSlug}-pokeitem.webp`),
 * donc Google Images l'indexe tel quel. Rien à faire côté code.
 *
 * `buildCardBlobKey` est utilisé par `scripts/mirror-card-images-to-blob.ts`
 * et doit rester en sync avec les filenames déjà uploadés.
 */

/** Normalise une chaîne en slug ASCII (strip diacritiques, lowercase, kebab-case). */
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CardForImage = { name: string; number?: string | null };

/**
 * Alt text SEO optimisé pour une carte. Format :
 *   `Carte Pokémon {Nom} #{numéro} — {Nom série}`
 *
 * Ex. `Carte Pokémon Pikachu #5 — Promo McDonald's 2013`
 *
 * Lisible, naturel, pas de keyword stuffing. Google valorise les alt texts
 * descriptifs courts. On garde le nom FR de la série (ce qui matche ce que
 * l'utilisateur FR tape dans la recherche).
 *
 * `serie` est optionnel : si absent (composants "minimal data" comme le
 * HomeCardPreview ou le BinderRarityView où on n'a pas le contexte série),
 * on tombe sur `Carte Pokémon {Nom} #{numéro}` — moins riche mais reste
 * correct. Pour les 13 composants qui ont la série dispo, on passe string
 * ou objet indifféremment.
 */
export function getCardImageAlt(
  card: CardForImage,
  serie?: { name: string } | string | null,
): string {
  const base = card.number
    ? `Carte Pokémon ${card.name} #${card.number}`
    : `Carte Pokémon ${card.name}`;
  if (!serie) return base;
  const serieName = typeof serie === "string" ? serie : serie.name;
  return serieName ? `${base} — ${serieName}` : base;
}

/**
 * Blob key SEO pour le mirror. Format :
 *   `cards/{serieSlug}/{nameSlug}-{numSlug}-{serieSlug}-pokeitem.webp`
 *
 * Ex. `cards/promo-mcdo-2013/pikachu-5-promo-mcdo-2013-pokeitem.webp`
 *
 * ⚠️ Ce format est l'identifiant stable dans le store Blob. Ne pas changer
 * sans re-mirror (sinon les URLs en DB deviennent 404).
 */
export function buildCardBlobKey(card: CardForImage, serieSlug: string): string {
  const name = slugify(card.name) || "card";
  const num = slugify(card.number ?? "") || "0";
  return `cards/${serieSlug}/${name}-${num}-${serieSlug}-pokeitem.webp`;
}
