import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
const prisma = new PrismaClient();

async function main() {
  // Per-series: distinct CM codes + sample URL + padded/unpadded status
  const cards = await prisma.card.findMany({
    where: {
      serie: { bloc: { name: { contains: "Noir", mode: "insensitive" } } },
      cardmarketUrl: { not: null },
    },
    select: {
      number: true,
      cardmarketUrl: true,
      serie: { select: { slug: true } },
    },
    orderBy: [{ serie: { slug: "asc" } }, { number: "asc" }],
  });

  // Map: serie -> { episode, codes: Set, sampleUrls[] }
  const perSerie = new Map<string, {
    episode: Set<string>;
    codes: Set<string>;
    samples: string[];
    padded: number;
    unpadded: number;
    hasLang: number;
    noLang: number;
  }>();

  for (const c of cards) {
    const url = c.cardmarketUrl!;
    const [path, q] = url.split("?");
    const slash = path.indexOf("/");
    if (slash < 0) continue;
    const episode = path.slice(0, slash);
    const rest = path.slice(slash + 1);
    const m = rest.match(/^(.+?)(?:-V\d+)?-([A-Z]{2,})(\w+)$/);
    if (!m) continue;
    const code = m[2];
    const numDigits = m[3];

    const t = perSerie.get(c.serie.slug) ?? {
      episode: new Set(), codes: new Set(), samples: [], padded: 0, unpadded: 0, hasLang: 0, noLang: 0,
    };
    t.episode.add(episode);
    t.codes.add(code);
    if (t.samples.length < 2) t.samples.push(url);
    if (numDigits.startsWith("0")) t.padded++; else t.unpadded++;
    if (q === "language=2") t.hasLang++; else t.noLang++;
    perSerie.set(c.serie.slug, t);
  }

  console.log("Série                             Episode(s)               Code(s)          Pad  Unp  Lang  NoL  Sample");
  console.log("─".repeat(140));
  for (const [slug, t] of [...perSerie.entries()].sort()) {
    console.log(
      `  ${slug.padEnd(32)} ` +
      `${[...t.episode].join(",").padEnd(24)} ` +
      `${[...t.codes].join(",").padEnd(16)} ` +
      `${String(t.padded).padStart(4)} ${String(t.unpadded).padStart(4)} ` +
      `${String(t.hasLang).padStart(5)} ${String(t.noLang).padStart(4)}  ` +
      `${t.samples[0]}`
    );
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
