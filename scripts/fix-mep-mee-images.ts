/**
 * Backfill missing MEP card images using ME set equivalents (matched by name)
 * and MEE energy card images.
 *
 * Sources: https://assets.tcgdex.net/fr/me/{setId}/{localId}/high.webp
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

// MEP cards 001-028 matched by name to ME sets
// Format: mepNumber → tcgdex image base URL
const MEP_MAPPINGS: Record<string, string> = {
  "001": "https://assets.tcgdex.net/fr/me/me01/010",   // Méganium
  "002": "https://assets.tcgdex.net/fr/me/me01/041",   // Lézargus
  "003": "https://assets.tcgdex.net/fr/me/me01/056",   // Alakazam
  "004": "https://assets.tcgdex.net/fr/me/me01/074",   // Séléroc
  // 005 Baudrive - not found
  // 006 Grodrive - not found
  "007": "https://assets.tcgdex.net/fr/me/me02.5/039", // Psykokwak
  "008": "https://assets.tcgdex.net/fr/me/me02.5/040", // Akwakwak
  "009": "https://assets.tcgdex.net/fr/me/me01/056",   // Alakazam (2nd version)
  "010": "https://assets.tcgdex.net/fr/me/me01/076",   // Riolu
  "011": "https://assets.tcgdex.net/fr/me/me01/100",   // Méga-Latias-ex
  "012": "https://assets.tcgdex.net/fr/me/me01/077",   // Méga-Lucario-ex
  "013": "https://assets.tcgdex.net/fr/me/me01/003",   // Méga-Florizarre-ex
  "014": "https://assets.tcgdex.net/fr/me/me02/020",   // Malvalame
  "015": "https://assets.tcgdex.net/fr/me/me02/045",   // Zacian
  "016": "https://assets.tcgdex.net/fr/me/me02/053",   // Libégon
  // 018 Doudouvet - not found
  // 019 Farfaduvet - not found
  "020": "https://assets.tcgdex.net/fr/me/me02.5/044", // Farfuret
  "021": "https://assets.tcgdex.net/fr/me/me02.5/045", // Dimoret
  "022": "https://assets.tcgdex.net/fr/me/me02/019",   // Charbambin
  "023": "https://assets.tcgdex.net/fr/me/me02/013",   // Méga-Dracaufeu X-ex
  "024": "https://assets.tcgdex.net/fr/me/me02/018",   // Plumeline-ex
  "025": "https://assets.tcgdex.net/fr/me/me01/104",   // Méga-Kangourex-ex
  "026": "https://assets.tcgdex.net/fr/me/me02/040",   // Meloetta
  "027": "https://assets.tcgdex.net/fr/me/me02/055",   // Spectrum
  // 028 Fanfare de Fête - not found
};

async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/high.webp`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const mep = await prisma.serie.findUnique({
    where: { slug: "promos-mega-evolution" },
    select: { id: true },
  });
  if (!mep) throw new Error("MEP serie not found");

  let updated = 0;
  let skipped = 0;

  for (const [number, imageBase] of Object.entries(MEP_MAPPINGS)) {
    const imageUrl = `${imageBase}/high.webp`;

    const card = await prisma.card.findUnique({
      where: { serieId_number: { serieId: mep.id, number } },
      select: { id: true, name: true, imageUrl: true },
    });

    if (!card) {
      console.log(`⚠ MEP ${number}: not found in DB`);
      continue;
    }

    if (card.imageUrl) {
      skipped++;
      continue;
    }

    // Verify URL exists before writing
    const ok = await verifyUrl(imageBase);
    if (!ok) {
      console.log(`✗ MEP ${number} ${card.name}: URL 404 → ${imageUrl}`);
      continue;
    }

    await prisma.card.update({
      where: { id: card.id },
      data: { imageUrl },
    });
    console.log(`✓ MEP ${number} ${card.name}`);
    updated++;
  }

  console.log(`\nMEP: ${updated} updated, ${skipped} already had images`);
  await prisma.$disconnect();
}

main().catch(console.error);
