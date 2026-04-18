/**
 * One-off : répare la seule carte restée en 404 après le mirror vers Vercel Blob.
 * HGSS18 "Raz-de-marée tropical" — source images.pokemontcg.io/hsp/HGSS18_hires.png morte.
 *
 * Source de remplacement trouvée : assets.pokemon.com (site officiel Pokemon.com).
 *
 * Usage : npx tsx scripts/fix-hgss18-tropical-tidal-wave.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import sharp from "sharp";

const CARD_ID = "cmnrytpc1025b1tdlrsgo80a7";
const SOURCE_URL = "https://assets.pokemon.com/static-assets/content-assets/cms2/img/cards/web/HSP/HSP_EN_HGSS18.png";
const BLOB_KEY = "cards/promos-heartgold-soulsilver/raz-de-maree-tropical-hgss18-promos-heartgold-soulsilver-pokeitem.webp";
const BLOB_TOKEN = process.env.BLOBBIS_READ_WRITE_TOKEN;

async function main() {
  if (!BLOB_TOKEN) {
    console.error("❌ BLOBBIS_READ_WRITE_TOKEN manquant.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const card = await prisma.card.findUnique({
    where: { id: CARD_ID },
    select: { id: true, name: true, number: true, imageUrl: true, serie: { select: { slug: true } } },
  });
  if (!card) throw new Error(`Card ${CARD_ID} introuvable`);
  console.log(`Card : ${card.name} (${card.number}) — serie ${card.serie.slug}`);
  console.log(`Old  : ${card.imageUrl}`);

  console.log(`\n⇣ Fetch : ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 pokeitem-mirror/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  console.log(`   ${(input.length / 1024).toFixed(1)} KB in`);

  const webp = await sharp(input)
    .resize(1000, 1400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  console.log(`   ${(webp.length / 1024).toFixed(1)} KB out`);

  console.log(`\n⇡ Upload : ${BLOB_KEY}`);
  const uploaded = await put(BLOB_KEY, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: BLOB_TOKEN,
  });
  console.log(`   → ${uploaded.url}`);

  await prisma.card.update({ where: { id: CARD_ID }, data: { imageUrl: uploaded.url } });
  const after = await prisma.card.findUnique({ where: { id: CARD_ID }, select: { imageUrl: true } });
  console.log(`\n✅ DB update OK — imageUrl now = ${after?.imageUrl}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
