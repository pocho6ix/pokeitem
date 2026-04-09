/**
 * seed-promos.ts
 *
 * Importe en DB toutes les extensions promos + spéciales manquantes :
 *   - Promos Black Star (SV / SWSH / SM / XY / BW / HGSS / DP / Nintendo)
 *   - Énergies (Écarlate & Violet, Méga-Évolution)
 *   - Bienvenue à Kalos (xy0)
 *   - Coffre des Dragons (dv1)
 *
 * Pour chaque série :
 *   1. Crée ou met à jour la Serie en DB
 *   2. Importe les cartes depuis TCGdex FR
 *   3. Récupère les prix FR depuis l'API Cardmarket (si CM_EPISODE défini)
 *
 * Usage :
 *   npx tsx scripts/seed-promos.ts
 *   npx tsx scripts/seed-promos.ts --dry-run
 *   npx tsx scripts/seed-promos.ts --set=swshp
 */

import { PrismaClient, type Prisma } from "@prisma/client"
import { mapTcgdexRarity, isSpecialCard } from "../src/lib/pokemon/card-variants"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const SET_FILTER = process.argv.find((a) => a.startsWith("--set="))?.split("=")[1]
const CM_HOST = "cardmarket-api-tcg.p.rapidapi.com"
const CM_KEY = process.env.CARDMARKET_API_KEY ?? ""

// ─── Série definitions ────────────────────────────────────────────────────────
interface PromoSerie {
  tcgdexId: string           // ID pour l'API TCGdex FR
  slug: string               // slug unique en DB
  name: string               // nom français
  nameEn: string             // nom anglais
  abbreviation: string       // abréviation affichée
  blocSlug: string           // bloc parent
  releaseDate: string        // date sortie (approximative)
  order: number              // ordre d'affichage dans le bloc (après les sets normaux)
  cmEpisodeId?: number       // épisode Cardmarket pour les prix FR
  imageUrl?: string          // chemin image logo (à placer dans /public/images/series/)
}

const PROMO_SERIES: PromoSerie[] = [
  // ── Méga-Évolution ──────────────────────────────────────────────────────────
  {
    tcgdexId: "mee",
    slug: "energies-mega-evolution",
    name: "Énergies Méga-Évolution",
    nameEn: "Mega Evolution Energies",
    abbreviation: "MEE",
    blocSlug: "mega-evolution",
    releaseDate: "2025-09-26",
    order: 20,
    // pas d'épisode CM séparé pour les énergies
  },
  // ── Écarlate & Violet ───────────────────────────────────────────────────────
  {
    tcgdexId: "svp",
    slug: "promos-ecarlate-et-violet",
    name: "Promos Écarlate et Violet",
    nameEn: "SV Black Star Promos",
    abbreviation: "SVP",
    blocSlug: "ecarlate-violet",
    releaseDate: "2023-03-31",
    order: 20,
    cmEpisodeId: 23,
  },
  {
    tcgdexId: "sve",
    slug: "energies-ecarlate-et-violet",
    name: "Énergies Écarlate et Violet",
    nameEn: "Scarlet & Violet Energies",
    abbreviation: "SVE",
    blocSlug: "ecarlate-violet",
    releaseDate: "2023-03-31",
    order: 21,
    cmEpisodeId: 20,
  },
  // ── Épée & Bouclier ─────────────────────────────────────────────────────────
  {
    tcgdexId: "swshp",
    slug: "promos-epee-et-bouclier",
    name: "Promos Épée et Bouclier",
    nameEn: "SWSH Black Star Promos",
    abbreviation: "SWSHP",
    blocSlug: "epee-bouclier",
    releaseDate: "2020-02-07",
    order: 20,
    cmEpisodeId: 49,
  },
  // ── Soleil & Lune ───────────────────────────────────────────────────────────
  {
    tcgdexId: "smp",
    slug: "promos-soleil-et-lune",
    name: "Promos Soleil et Lune",
    nameEn: "SM Black Star Promos",
    abbreviation: "SMP",
    blocSlug: "soleil-lune",
    releaseDate: "2017-02-03",
    order: 20,
    cmEpisodeId: 70,
  },
  // ── XY ──────────────────────────────────────────────────────────────────────
  {
    tcgdexId: "xyp",
    slug: "promos-xy",
    name: "Promos X&Y",
    nameEn: "XY Black Star Promos",
    abbreviation: "XYP",
    blocSlug: "xy",
    releaseDate: "2014-02-05",
    order: 20,
    cmEpisodeId: 90,
  },
  {
    tcgdexId: "xy0",
    slug: "bienvenue-a-kalos",
    name: "Bienvenue à Kalos",
    nameEn: "Kalos Starter Set",
    abbreviation: "KSS",
    blocSlug: "xy",
    releaseDate: "2013-09-06",
    order: 21,
    cmEpisodeId: 88,
  },
  // ── Noir & Blanc ────────────────────────────────────────────────────────────
  {
    tcgdexId: "bwp",
    slug: "promos-noir-et-blanc",
    name: "Promos Noir et Blanc",
    nameEn: "BW Black Star Promos",
    abbreviation: "BWP",
    blocSlug: "noir-blanc",
    releaseDate: "2011-03-30",
    order: 20,
    cmEpisodeId: 104,
  },
  {
    tcgdexId: "dv1",
    slug: "coffre-des-dragons",
    name: "Coffre des Dragons",
    nameEn: "Dragon Vault",
    abbreviation: "DV1",
    blocSlug: "noir-blanc",
    releaseDate: "2012-10-05",
    order: 21,
    cmEpisodeId: 95,
  },
  // ── HeartGold SoulSilver ────────────────────────────────────────────────────
  {
    tcgdexId: "hgssp",
    slug: "promos-heartgold-soulsilver",
    name: "Promos HeartGold SoulSilver",
    nameEn: "HGSS Black Star Promos",
    abbreviation: "HGSSP",
    blocSlug: "heartgold-soulsilver",
    releaseDate: "2010-02-10",
    order: 20,
    cmEpisodeId: 110,
  },
  // ── Diamant & Perle ─────────────────────────────────────────────────────────
  {
    tcgdexId: "dpp",
    slug: "promos-diamant-et-perle",
    name: "Promos Diamant et Perle",
    nameEn: "DP Black Star Promos",
    abbreviation: "DPP",
    blocSlug: "diamant-perle",
    releaseDate: "2007-08-22",
    order: 20,
    cmEpisodeId: 127,
  },
  // ── WOTC / Nintendo ─────────────────────────────────────────────────────────
  {
    tcgdexId: "np",
    slug: "promos-nintendo",
    name: "Promos Nintendo",
    nameEn: "Nintendo Black Star Promos",
    abbreviation: "NP",
    blocSlug: "wotc",
    releaseDate: "2003-07-01",
    order: 20,
    cmEpisodeId: 151,
  },
]

// ─── TCGdex types ─────────────────────────────────────────────────────────────
interface TcgCard {
  id: string
  localId: string
  name: string
  image?: string
  rarity?: string
}

interface TcgSet {
  id: string
  name: string
  cards: TcgCard[]
  cardCount: { official: number; total: number }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function fetchTcgSet(id: string): Promise<TcgSet | null> {
  const res = await fetch(`https://api.tcgdex.net/v2/fr/sets/${id}`)
  if (!res.ok) { console.warn(`  ⚠ TCGdex ${id} → HTTP ${res.status}`); return null }
  return res.json() as Promise<TcgSet>
}

async function fetchCmEpisodeCards(epId: number): Promise<Map<string, number>> {
  // Returns map: normalized card_number → priceFr
  const priceMap = new Map<string, number>()
  if (!CM_KEY) return priceMap

  let page = 1
  while (true) {
    const res = await fetch(
      `https://${CM_HOST}/pokemon/episodes/${epId}/cards?per_page=100&page=${page}`,
      { headers: { "x-rapidapi-host": CM_HOST, "x-rapidapi-key": CM_KEY } }
    )
    if (!res.ok) break
    const body = (await res.json()) as {
      data?: Array<{ card_number: string | number; prices?: { cardmarket?: { lowest_near_mint_FR?: number | null } | null } | null }>
      paging?: { current: number; total: number }
    }
    for (const c of body.data ?? []) {
      const priceFr = c.prices?.cardmarket?.lowest_near_mint_FR ?? null
      if (priceFr && priceFr > 0) {
        const num = String(c.card_number).replace(/\/.*$/, "").replace(/^([A-Za-z]*)0+(\d+)$/, "$1$2")
        priceMap.set(num, priceFr)
      }
    }
    if (!body.paging || body.paging.current >= body.paging.total) break
    page++
    await sleep(200)
  }
  return priceMap
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) console.log("DRY RUN — aucune écriture\n")

  const toProcess = SET_FILTER
    ? PROMO_SERIES.filter((s) => s.tcgdexId === SET_FILTER)
    : PROMO_SERIES

  if (toProcess.length === 0) {
    console.error(`❌ Aucune série trouvée pour --set=${SET_FILTER}`)
    process.exit(1)
  }

  // Charger tous les blocs une seule fois
  const blocs = await prisma.bloc.findMany({ select: { id: true, slug: true } })
  const blocMap = new Map(blocs.map((b) => [b.slug, b.id]))

  const recap: Array<{ name: string; created: boolean; cards: number; withFr: number; skipped: number }> = []

  for (const serie of toProcess) {
    console.log(`\n── ${serie.name} (${serie.tcgdexId}) ──`)

    const blocId = blocMap.get(serie.blocSlug)
    if (!blocId) { console.warn(`  ⚠ Bloc '${serie.blocSlug}' introuvable — skip`); continue }

    // 1. Fetch TCGdex cards
    const tcgSet = await fetchTcgSet(serie.tcgdexId)
    if (!tcgSet || tcgSet.cards.length === 0) {
      console.warn(`  ⚠ TCGdex: aucune carte — skip`)
      continue
    }
    console.log(`  📦 TCGdex: ${tcgSet.cards.length} cartes`)

    // 2. Fetch CM prices (if episode defined)
    let priceMap = new Map<string, number>()
    if (serie.cmEpisodeId && CM_KEY) {
      console.log(`  💶 CM épisode ${serie.cmEpisodeId}…`)
      priceMap = await fetchCmEpisodeCards(serie.cmEpisodeId)
      console.log(`  💶 ${priceMap.size} cartes avec prix FR`)
      await sleep(300)
    }

    if (DRY_RUN) {
      console.log(`  ✅ (dry-run) Série créée, ${tcgSet.cards.length} cartes insérées`)
      recap.push({ name: serie.name, created: true, cards: tcgSet.cards.length, withFr: priceMap.size, skipped: 0 })
      continue
    }

    // 3. Upsert serie
    const dbSerie = await prisma.serie.upsert({
      where: { slug: serie.slug },
      create: {
        slug: serie.slug,
        name: serie.name,
        nameEn: serie.nameEn,
        abbreviation: serie.abbreviation,
        blocId,
        imageUrl: serie.imageUrl ?? `/images/series/${serie.slug}.png`,
        releaseDate: new Date(serie.releaseDate),
        cardCount: tcgSet.cards.length,
        order: serie.order,
      },
      update: {
        name: serie.name,
        nameEn: serie.nameEn,
        abbreviation: serie.abbreviation,
        cardCount: tcgSet.cards.length,
        order: serie.order,
      },
      select: { id: true },
    })

    const serieId = dbSerie.id
    const now = new Date()
    const recordedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 4. Upsert cards
    let inserted = 0
    let withFr = 0
    let skipped = 0
    const CHUNK = 50

    for (let i = 0; i < tcgSet.cards.length; i += CHUNK) {
      const chunk = tcgSet.cards.slice(i, i + CHUNK)

      await Promise.all(chunk.map(async (c) => {
        const number = c.localId
        const normNum = number.replace(/\/.*$/, "").replace(/^([A-Za-z]*)0+(\d+)$/, "$1$2")
        const priceFr = priceMap.get(normNum) ?? priceMap.get(number) ?? null
        const imageUrl = c.image ? `${c.image}/low.png` : null

        const cardData: Prisma.CardCreateInput = {
          serie: { connect: { id: serieId } },
          number,
          name: c.name ?? "—",
          rarity: mapTcgdexRarity(c.rarity ?? ""),
          isSpecial: isSpecialCard(c.rarity ?? ""),
          imageUrl,
          tcgdexId: c.id,
          ...(priceFr ? { priceFr, priceFrUpdatedAt: now } : {}),
        }

        try {
          await prisma.card.upsert({
            where: { serieId_number: { serieId, number } },
            create: cardData,
            update: {
              name: c.name ?? "—",
              rarity: mapTcgdexRarity(c.rarity ?? ""),
              imageUrl: imageUrl ?? undefined,
              tcgdexId: c.id,
              ...(priceFr ? { priceFr, priceFrUpdatedAt: now } : {}),
            },
          })
          inserted++
          if (priceFr) {
            withFr++
            // Add price history entry
            await prisma.cardPriceHistory.upsert({
              where: { cardId_recordedAt: {
                cardId: (await prisma.card.findUnique({ where: { serieId_number: { serieId, number } }, select: { id: true } }))!.id,
                recordedAt,
              }},
              create: {
                card: { connect: { serieId_number: { serieId, number } } },
                priceFr,
                source: "cardmarket-api",
                recordedAt,
              },
              update: { priceFr },
            }).catch(() => {}) // ignore if fails
          }
        } catch {
          skipped++
        }
      }))
    }

    // Update cardCount
    await prisma.serie.update({ where: { id: serieId }, data: { cardCount: inserted } })

    console.log(`  ✅ ${inserted} cartes insérées, ${withFr} avec prix FR, ${skipped} erreurs`)
    recap.push({ name: serie.name, created: true, cards: inserted, withFr, skipped })
    await sleep(300)
  }

  // ─── Recap ──────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`)
  console.log("RÉCAP\n")
  console.log("Série".padEnd(36) + "Cartes".padStart(8) + "Avec FR".padStart(10) + "Erreurs".padStart(9))
  console.log("─".repeat(63))
  let totalCards = 0, totalFr = 0
  for (const r of recap) {
    const icon = r.skipped > 0 ? "⚠ " : "✅"
    console.log(
      `${icon} ${r.name.padEnd(34)}${r.cards.toString().padStart(8)}${r.withFr.toString().padStart(10)}${r.skipped.toString().padStart(9)}`
    )
    totalCards += r.cards
    totalFr += r.withFr
  }
  console.log("─".repeat(63))
  console.log(`   ${"TOTAL".padEnd(33)}${totalCards.toString().padStart(8)}${totalFr.toString().padStart(10)}`)

  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
