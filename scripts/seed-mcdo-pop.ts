/**
 * seed-mcdo-pop.ts
 *
 * Importe en DB les deux nouveaux blocs + leurs extensions :
 *   - Collection McDonald's (13 sets, 2011–2024 sans 2020)
 *   - Pokémon Organized Play — POP 1 à 9
 *
 * Pour chaque série :
 *   1. Crée/met à jour le Bloc en DB
 *   2. Crée/met à jour la Serie en DB
 *   3. Importe les cartes depuis TCGdex (FR de préférence, EN fallback pour POP 5/6/8)
 *
 * Toutes les cartes sont taguées PROMO (pas de rarity normale/reverse).
 *
 * Usage :
 *   npx tsx scripts/seed-mcdo-pop.ts
 *   npx tsx scripts/seed-mcdo-pop.ts --dry-run
 *   npx tsx scripts/seed-mcdo-pop.ts --bloc=mcdo
 *   npx tsx scripts/seed-mcdo-pop.ts --bloc=pop
 *   npx tsx scripts/seed-mcdo-pop.ts --set=promo-mcdo-2024
 */

import { PrismaClient, CardRarity, type Prisma } from "@prisma/client"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const BLOC_FILTER = process.argv.find((a) => a.startsWith("--bloc="))?.split("=")[1]
const SET_FILTER  = process.argv.find((a) => a.startsWith("--set="))?.split("=")[1]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetDef {
  tcgdexId: string      // TCGdex FR set ID (e.g. "2024sv")
  tcgdexIdEn?: string   // fallback EN ID if FR 404s (POP 5/6/8)
  slug: string
  name: string
  nameEn: string
  abbreviation: string
  blocSlug: string
  releaseDate: string
  order: number
}

interface TcgCard {
  id: string
  localId: string
  name: string
  image?: string
  rarity?: string
  types?: string[]
  category?: string
  trainerType?: string
  energyType?: string
}

interface TcgSet {
  id: string
  name: string
  cards: TcgCard[]
  cardCount: { official: number; total: number }
}

// ─── Bloc definitions ─────────────────────────────────────────────────────────

const MCDO_SETS: SetDef[] = [
  { tcgdexId: "2024sv",    slug: "promo-mcdo-2024", name: "Collection McDonald's 2024", nameEn: "McDonald's Collection 2024", abbreviation: "MC24", blocSlug: "collection-mcdo", releaseDate: "2024-12-04", order: 0  },
  { tcgdexId: "2023sv",    slug: "promo-mcdo-2023", name: "Collection McDonald's 2023", nameEn: "McDonald's Collection 2023", abbreviation: "MC23", blocSlug: "collection-mcdo", releaseDate: "2023-08-01", order: 1  },
  { tcgdexId: "2022swsh",  slug: "promo-mcdo-2022", name: "Collection McDonald's 2022", nameEn: "McDonald's Collection 2022", abbreviation: "MC22", blocSlug: "collection-mcdo", releaseDate: "2022-08-03", order: 2  },
  { tcgdexId: "2021swsh",  slug: "promo-mcdo-2021", name: "Collection McDonald's 2021", nameEn: "McDonald's Collection 2021", abbreviation: "MC21", blocSlug: "collection-mcdo", releaseDate: "2021-02-09", order: 3  },
  { tcgdexId: "2019sm-fr", slug: "promo-mcdo-2019", name: "Collection McDonald's 2019", nameEn: "McDonald's Collection 2019", abbreviation: "MC19", blocSlug: "collection-mcdo", releaseDate: "2019-10-30", order: 4  },
  { tcgdexId: "2018sm-fr", slug: "promo-mcdo-2018", name: "Collection McDonald's 2018", nameEn: "McDonald's Collection 2018", abbreviation: "MC18", blocSlug: "collection-mcdo", releaseDate: "2018-06-13", order: 5  },
  { tcgdexId: "2017sm",    slug: "promo-mcdo-2017", name: "Collection McDonald's 2017", nameEn: "McDonald's Collection 2017", abbreviation: "MC17", blocSlug: "collection-mcdo", releaseDate: "2017-08-03", order: 6  },
  { tcgdexId: "2016xy",    slug: "promo-mcdo-2016", name: "Collection McDonald's 2016", nameEn: "McDonald's Collection 2016", abbreviation: "MC16", blocSlug: "collection-mcdo", releaseDate: "2016-08-20", order: 7  },
  { tcgdexId: "2015xy",    slug: "promo-mcdo-2015", name: "Collection McDonald's 2015", nameEn: "McDonald's Collection 2015", abbreviation: "MC15", blocSlug: "collection-mcdo", releaseDate: "2015-11-27", order: 8  },
  { tcgdexId: "2014xy",    slug: "promo-mcdo-2014", name: "Collection McDonald's 2014", nameEn: "McDonald's Collection 2014", abbreviation: "MC14", blocSlug: "collection-mcdo", releaseDate: "2014-05-23", order: 9  },
  { tcgdexId: "2013bw",    slug: "promo-mcdo-2013", name: "Collection McDonald's 2013", nameEn: "McDonald's Collection 2013", abbreviation: "MC13", blocSlug: "collection-mcdo", releaseDate: "2013-11-01", order: 10 },
  { tcgdexId: "2012bw",    slug: "promo-mcdo-2012", name: "Collection McDonald's 2012", nameEn: "McDonald's Collection 2012", abbreviation: "MC12", blocSlug: "collection-mcdo", releaseDate: "2012-06-15", order: 11 },
  { tcgdexId: "2011bw",    slug: "promo-mcdo-2011", name: "Collection McDonald's 2011", nameEn: "McDonald's Collection 2011", abbreviation: "MC11", blocSlug: "collection-mcdo", releaseDate: "2011-06-17", order: 12 },
]

const POP_SETS: SetDef[] = [
  { tcgdexId: "pop9", slug: "pop-9", name: "POP Série 9", nameEn: "POP Series 9", abbreviation: "POP9", blocSlug: "pokemon-organized-play", releaseDate: "2009-03-01", order: 0 },
  { tcgdexId: "pop8", tcgdexIdEn: "pop8", slug: "pop-8", name: "POP Série 8", nameEn: "POP Series 8", abbreviation: "POP8", blocSlug: "pokemon-organized-play", releaseDate: "2008-09-01", order: 1 },
  { tcgdexId: "pop7", slug: "pop-7", name: "POP Série 7", nameEn: "POP Series 7", abbreviation: "POP7", blocSlug: "pokemon-organized-play", releaseDate: "2008-03-01", order: 2 },
  { tcgdexId: "pop6", tcgdexIdEn: "pop6", slug: "pop-6", name: "POP Série 6", nameEn: "POP Series 6", abbreviation: "POP6", blocSlug: "pokemon-organized-play", releaseDate: "2007-09-01", order: 3 },
  { tcgdexId: "pop5", tcgdexIdEn: "pop5", slug: "pop-5", name: "POP Série 5", nameEn: "POP Series 5", abbreviation: "POP5", blocSlug: "pokemon-organized-play", releaseDate: "2007-03-01", order: 4 },
  { tcgdexId: "pop4", slug: "pop-4", name: "POP Série 4", nameEn: "POP Series 4", abbreviation: "POP4", blocSlug: "pokemon-organized-play", releaseDate: "2006-08-01", order: 5 },
  { tcgdexId: "pop3", slug: "pop-3", name: "POP Série 3", nameEn: "POP Series 3", abbreviation: "POP3", blocSlug: "pokemon-organized-play", releaseDate: "2006-04-01", order: 6 },
  { tcgdexId: "pop2", slug: "pop-2", name: "POP Série 2", nameEn: "POP Series 2", abbreviation: "POP2", blocSlug: "pokemon-organized-play", releaseDate: "2005-08-01", order: 7 },
  { tcgdexId: "pop1", slug: "pop-1", name: "POP Série 1", nameEn: "POP Series 1", abbreviation: "POP1", blocSlug: "pokemon-organized-play", releaseDate: "2004-09-01", order: 8 },
]

// ─── TCGdex helpers ───────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function fetchTcgSet(id: string, lang: "fr" | "en" = "fr"): Promise<TcgSet | null> {
  const url = `https://api.tcgdex.net/v2/${lang}/sets/${id}`
  const res = await fetch(url)
  if (!res.ok) {
    console.warn(`  ⚠ TCGdex [${lang}] ${id} → HTTP ${res.status}`)
    return null
  }
  return res.json() as Promise<TcgSet>
}

// ─── Bloc upsert ─────────────────────────────────────────────────────────────

const BLOCS_DEF = [
  {
    slug: "collection-mcdo",
    name: "Collection McDonald's",
    nameEn: "McDonald's Collection",
    abbreviation: "MC",
    startDate: new Date("2011-06-01"),
    endDate: null as Date | null,
    order: 11,
  },
  {
    slug: "pokemon-organized-play",
    name: "Pokémon Organized Play",
    nameEn: "Pokémon Organized Play",
    abbreviation: "POP",
    startDate: new Date("2004-09-01"),
    endDate: new Date("2009-03-01"),
    order: 12,
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) console.log("🔍 DRY RUN — aucune écriture\n")

  // ── 1. Upsert blocs ────────────────────────────────────────────────────────
  for (const b of BLOCS_DEF) {
    if (!DRY_RUN) {
      await prisma.bloc.upsert({
        where: { slug: b.slug },
        create: {
          slug: b.slug,
          name: b.name,
          nameEn: b.nameEn,
          abbreviation: b.abbreviation,
          startDate: b.startDate,
          endDate: b.endDate,
          order: b.order,
        },
        update: {
          name: b.name,
          nameEn: b.nameEn,
          abbreviation: b.abbreviation,
          startDate: b.startDate,
          endDate: b.endDate,
          order: b.order,
        },
      })
    }
    console.log(`✅ Bloc: ${b.name} (${b.slug})`)
  }

  // ── 2. Choose sets to process ──────────────────────────────────────────────
  let allSets = [...MCDO_SETS, ...POP_SETS]
  if (BLOC_FILTER === "mcdo") allSets = MCDO_SETS
  if (BLOC_FILTER === "pop")  allSets = POP_SETS
  if (SET_FILTER) allSets = allSets.filter((s) => s.slug === SET_FILTER)

  if (allSets.length === 0) {
    console.error(`❌ Aucune série correspondante`)
    process.exit(1)
  }

  // ── 3. Load bloc map ───────────────────────────────────────────────────────
  const blocs = await prisma.bloc.findMany({ select: { id: true, slug: true } })
  const blocMap = new Map(blocs.map((b) => [b.slug, b.id]))

  const recap: Array<{ name: string; cards: number; source: string }> = []

  for (const set of allSets) {
    console.log(`\n── ${set.name} (${set.tcgdexId}) ──`)

    const blocId = blocMap.get(set.blocSlug)
    if (!blocId) { console.warn(`  ⚠ Bloc '${set.blocSlug}' introuvable — skip`); continue }

    // Try FR first, fall back to EN
    let tcgSet = await fetchTcgSet(set.tcgdexId, "fr")
    let source = "fr"

    if (!tcgSet || tcgSet.cards.length === 0) {
      if (set.tcgdexIdEn) {
        console.log(`  ↩ FR introuvable, tentative EN (${set.tcgdexIdEn})…`)
        tcgSet = await fetchTcgSet(set.tcgdexIdEn, "en")
        source = "en"
      }
    }

    if (!tcgSet || tcgSet.cards.length === 0) {
      console.warn(`  ⚠ Aucune carte TCGdex — skip`)
      continue
    }

    console.log(`  📦 TCGdex [${source}]: ${tcgSet.cards.length} cartes`)

    if (DRY_RUN) {
      recap.push({ name: set.name, cards: tcgSet.cards.length, source })
      continue
    }

    // Upsert serie
    const dbSerie = await prisma.serie.upsert({
      where: { slug: set.slug },
      create: {
        slug: set.slug,
        name: set.name,
        nameEn: set.nameEn,
        abbreviation: set.abbreviation,
        blocId,
        imageUrl: `/images/series/${set.slug}.webp`,
        releaseDate: new Date(set.releaseDate),
        cardCount: tcgSet.cards.length,
        order: set.order,
      },
      update: {
        name: set.name,
        nameEn: set.nameEn,
        abbreviation: set.abbreviation,
        imageUrl: `/images/series/${set.slug}.webp`,
        releaseDate: new Date(set.releaseDate),
        cardCount: tcgSet.cards.length,
        order: set.order,
      },
      select: { id: true },
    })

    const serieId = dbSerie.id

    // Upsert cards
    let inserted = 0
    let skipped = 0

    await Promise.all(tcgSet.cards.map(async (c) => {
      const number = c.localId
      const imageUrl = c.image ? `${c.image}/low.png` : null

      const cardData: Prisma.CardCreateInput = {
        serie: { connect: { id: serieId } },
        number,
        name: c.name ?? "—",
        rarity: CardRarity.PROMO,
        isSpecial: true,
        imageUrl,
        tcgdexId: c.id,
      }

      try {
        await prisma.card.upsert({
          where: { serieId_number: { serieId, number } },
          create: cardData,
          update: {
            name: c.name ?? "—",
            rarity: CardRarity.PROMO,
            isSpecial: true,
            imageUrl: imageUrl ?? undefined,
            tcgdexId: c.id,
          },
        })
        inserted++
      } catch (e) {
        console.warn(`    ⚠ Carte ${number} (${c.name}) — ${e}`)
        skipped++
      }
    }))

    // Update cardCount
    await prisma.serie.update({ where: { id: serieId }, data: { cardCount: inserted } })

    console.log(`  ✅ ${inserted} cartes insérées${skipped ? `, ${skipped} erreurs` : ""}`)
    recap.push({ name: set.name, cards: inserted, source })

    await sleep(150)
  }

  console.log("\n────────────────────────────────")
  console.log("Récapitulatif :")
  for (const r of recap) {
    console.log(`  ${r.name.padEnd(40)} ${String(r.cards).padStart(3)} cartes [${r.source}]`)
  }
  console.log("────────────────────────────────")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
