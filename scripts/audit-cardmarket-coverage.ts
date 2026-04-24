/**
 * Phase 1 coverage audit — Cardmarket items matching.
 *
 * Paginates the CM RapidAPI catalog (~100 calls the first time, cached
 * afterwards), cross-references with Pokeitem series + items, and writes
 * `docs/mapping-gaps.md` — a human-readable gap report listing what the
 * automatic matcher couldn't resolve.
 *
 * Read-only. Safe to run repeatedly. Does NOT touch the DB or the mapping
 * file — `src/data/cardmarket-mapping.ts` is hand-maintained; edit it there.
 *
 *   npx tsx scripts/audit-cardmarket-coverage.ts
 *   npx tsx scripts/audit-cardmarket-coverage.ts --no-fetch     # reuse /tmp cache
 *   npx tsx scripts/audit-cardmarket-coverage.ts --verbose
 */

import { PrismaClient, ItemType } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"
import {
  fetchAllCMProducts,
  extractEpisodes,
  groupProductsByEpisode,
  matchSerieToEpisode,
  matchItemToProducts,
  type CMEpisode,
  type CMProduct,
  type ItemMatch,
  type SerieMatch,
} from "../src/lib/cardmarket-items-matching"

dotenv.config({ path: ".env" })
dotenv.config({ path: ".env.local", override: true })

const prisma = new PrismaClient()
const VERBOSE = process.argv.includes("--verbose")
const NO_FETCH = process.argv.includes("--no-fetch")
const CACHE_FILE = "/tmp/cm-products-cache.json"

// ─── Gap report output ──────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (total === 0) return "0 %"
  return `${Math.round((n / total) * 100)} %`
}

function buildGapReport(
  serieMatches: SerieMatch[],
  itemMatches: ItemMatch[],
  episodes: CMEpisode[],
  products: CMProduct[]
): string {
  const totalSeries = serieMatches.length
  const matched = serieMatches.filter((m) => m.resolvedEpisodeSlug)
  const unmatched = serieMatches.filter((m) => !m.resolvedEpisodeSlug)

  const total = itemMatches.length
  const single = itemMatches.filter((m) => m.verdict === "single").length
  const multi = itemMatches.filter((m) => m.verdict === "multiple").length
  const noCand = itemMatches.filter((m) => m.verdict === "no-candidates").length
  const noEp = itemMatches.filter((m) => m.verdict === "no-episode").length

  const byType = new Map<ItemType, { total: number; single: number; multiple: number; noCand: number; noEp: number }>()
  for (const m of itemMatches) {
    const s = byType.get(m.item.type) ?? { total: 0, single: 0, multiple: 0, noCand: 0, noEp: 0 }
    s.total++
    if (m.verdict === "single") s.single++
    else if (m.verdict === "multiple") s.multiple++
    else if (m.verdict === "no-candidates") s.noCand++
    else s.noEp++
    byType.set(m.item.type, s)
  }

  const byEpisode = new Map<string, CMProduct[]>()
  for (const p of products) {
    const arr = byEpisode.get(p.episode.slug) ?? []
    arr.push(p)
    byEpisode.set(p.episode.slug, arr)
  }

  const lines: string[] = []
  lines.push("# Rapport de couverture — Mapping Cardmarket pour les items Pokeitem")
  lines.push("")
  lines.push("> Phase 1 — généré automatiquement par [scripts/audit-cardmarket-coverage.ts](../scripts/audit-cardmarket-coverage.ts)")
  lines.push(`> Snapshot : ${new Date().toISOString()}`)
  lines.push(`> Sources : ${episodes.length} épisodes CM · ${products.length} produits scellés CM · ${totalSeries} séries DB avec items · ${total} items DB`)
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## 1. Synthèse")
  lines.push("")
  lines.push("| Indicateur | Valeur |")
  lines.push("|---|---|")
  lines.push(`| Séries Pokeitem avec ≥1 item | ${totalSeries} |`)
  lines.push(`| Séries résolues vers une épisode CM | **${matched.length}** (${pct(matched.length, totalSeries)}) |`)
  lines.push(`| Séries non résolues | **${unmatched.length}** |`)
  lines.push(`| Items Pokeitem au total | ${total} |`)
  lines.push(`| Items avec **1 seul candidat CM** (auto-high) | **${single}** (${pct(single, total)}) |`)
  lines.push(`| Items avec plusieurs candidats (auto-low) | ${multi} (${pct(multi, total)}) |`)
  lines.push(`| Items sans candidat CM (type absent) | ${noCand} (${pct(noCand, total)}) |`)
  lines.push(`| Items dont la série n'est pas résolue | ${noEp} (${pct(noEp, total)}) |`)
  lines.push("")
  lines.push("## 2. Couverture par type de produit")
  lines.push("")
  lines.push("| Type | Total | Single | Multiple | Sans candidat | Série non résolue |")
  lines.push("|---|---:|---:|---:|---:|---:|")
  for (const [type, s] of [...byType.entries()].sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${type} | ${s.total} | ${s.single} | ${s.multiple} | ${s.noCand} | ${s.noEp} |`)
  }
  lines.push("")
  lines.push("## 3. Séries non résolues (à compléter dans `KNOWN_EPISODE_OVERRIDES`)")
  lines.push("")
  if (unmatched.length === 0) {
    lines.push("✅ Toutes les séries Pokeitem ayant des items sont résolues vers une épisode CM.")
  } else {
    lines.push("| DB `slug` (FR) | DB `nameEn` | Candidats suggérés (CM) |")
    lines.push("|---|---|---|")
    for (const m of unmatched) {
      const cands = m.candidates.length
        ? m.candidates.map((c) => `\`${c.slug}\` (${c.name})`).join(" · ")
        : "_aucun — épisode probablement absent du catalogue CM_"
      lines.push(`| \`${m.serieSlug}\` | ${m.nameEn ?? "—"} | ${cands} |`)
    }
    lines.push("")
    lines.push("**Action** : ajouter une entrée dans `SERIE_SLUG_FR_TO_CM_EPISODE_SLUG` ou laisser unmatched si aucun équivalent CM n'existe.")
  }
  lines.push("")
  lines.push("## 4. Items sans candidat (`no-candidates`)")
  lines.push("")
  const noCands = itemMatches.filter((m) => m.verdict === "no-candidates")
  if (noCands.length === 0) {
    lines.push("✅ Aucun item sans candidat.")
  } else {
    lines.push("Soit le type n'a pas d'équivalent CM pour cette série, soit les règles `TYPE_RULES` ratent le pattern. À inspecter un par un.")
    lines.push("")
    lines.push("| DB item | DB série | Type | CM episode | Produits CM de la série |")
    lines.push("|---|---|---|---|---|")
    for (const m of noCands.sort((a, b) => a.item.serieName.localeCompare(b.item.serieName))) {
      const ep = m.episodeSlug ? episodes.find((e) => e.slug === m.episodeSlug) : null
      const others = (byEpisode.get(m.episodeSlug!) ?? []).map((p) => p.name).slice(0, 5).join(" · ")
      lines.push(`| ${m.item.name} | ${m.item.serieName} | ${m.item.type} | \`${m.episodeSlug}\` (${ep?.name ?? "?"}) | ${others || "_vide_"} |`)
    }
  }
  lines.push("")
  lines.push("## 5. Items avec candidats multiples (`multiple` — à départager)")
  lines.push("")
  const multis = itemMatches.filter((m) => m.verdict === "multiple")
  if (multis.length === 0) {
    lines.push("✅ Aucun item ambigu — tous les matches automatiques sont uniques.")
  } else {
    lines.push("| DB item | DB série | Type | Candidats CM |")
    lines.push("|---|---|---|---|")
    for (const m of multis.sort((a, b) => a.item.serieName.localeCompare(b.item.serieName))) {
      const cands = m.candidates.map((c) => `#${c.cardmarket_id ?? c.id} ${c.name}`).join(" ║ ")
      lines.push(`| ${m.item.name} | ${m.item.serieName} | ${m.item.type} | ${cands} |`)
    }
    lines.push("")
    lines.push("**Action** : affiner `TYPE_RULES` ou laisser le dashboard admin (Phase 3) trancher chaque cas.")
  }
  lines.push("")
  lines.push("## 6. Matches auto-high — échantillon")
  lines.push("")
  const singles = itemMatches.filter((m) => m.verdict === "single").slice(0, 15)
  if (singles.length > 0) {
    lines.push("| DB item | Type | CM product | `cardmarket_id` |")
    lines.push("|---|---|---|---|")
    for (const m of singles) {
      const c = m.candidates[0]
      lines.push(`| ${m.item.name} | ${m.item.type} | ${c.name} | ${c.cardmarket_id ?? "—"} |`)
    }
  }
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push("## 7. Prochaines étapes")
  lines.push("")
  lines.push("1. Séries non résolues (§3) : override dans `SERIE_SLUG_FR_TO_CM_EPISODE_SLUG` + relance.")
  lines.push("2. Items `no-candidates` (§4) : ajuster `TYPE_RULES` ou marquer OTHER en DB.")
  lines.push("3. Items `multiple` (§5) : acceptable — Phase 2 les écrit en `auto_low`, Phase 3 dashboard tranche.")
  lines.push("4. Une fois ce rapport validé : lancer `scripts/match-cardmarket-items.ts` pour écrire en DB.")
  lines.push("")
  return lines.join("\n")
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Audit de couverture Cardmarket — Phase 1\n")

  const apiKey = process.env.CARDMARKET_API_KEY
  if (!apiKey && !NO_FETCH) {
    console.error("❌ CARDMARKET_API_KEY missing. Add it to .env.local.")
    process.exit(1)
  }

  if (NO_FETCH) console.log(`📦 Lecture du cache ${CACHE_FILE}\n`)
  const products = await fetchAllCMProducts({
    apiKey: apiKey ?? "",
    cacheFile: CACHE_FILE,
    useCache: NO_FETCH,
    verbose: VERBOSE,
  })
  const episodes = extractEpisodes(products)
  console.log(`  → ${products.length} produits CM · ${episodes.length} épisodes distincts\n`)

  const series = await prisma.serie.findMany({
    where: { items: { some: {} } },
    select: {
      id: true,
      slug: true,
      name: true,
      nameEn: true,
      items: { select: { id: true, name: true, slug: true, type: true } },
    },
    orderBy: { name: "asc" },
  })

  const serieMatches: SerieMatch[] = series.map((s) =>
    matchSerieToEpisode(
      { id: s.id, slug: s.slug, name: s.name, nameEn: s.nameEn },
      episodes
    )
  )

  const episodeBySerie = new Map(serieMatches.map((m) => [m.serieId, m.resolvedEpisodeSlug]))
  const productsByEpisode = groupProductsByEpisode(products)

  const itemMatches: ItemMatch[] = series.flatMap((s) =>
    s.items.map((i) =>
      matchItemToProducts(
        {
          id: i.id,
          name: i.name,
          slug: i.slug,
          type: i.type,
          serieId: s.id,
          serieSlug: s.slug,
          serieName: s.name,
        },
        episodeBySerie.get(s.id) ?? null,
        productsByEpisode
      )
    )
  )

  const reportPath = path.join("docs/mapping-gaps.md")
  fs.writeFileSync(reportPath, buildGapReport(serieMatches, itemMatches, episodes, products))
  console.log(`✍️  Gap report  → ${reportPath}`)

  const matched = serieMatches.filter((m) => m.resolvedEpisodeSlug).length
  const single = itemMatches.filter((m) => m.verdict === "single").length
  const multi = itemMatches.filter((m) => m.verdict === "multiple").length
  const noCand = itemMatches.filter((m) => m.verdict === "no-candidates").length
  const noEp = itemMatches.filter((m) => m.verdict === "no-episode").length
  console.log()
  console.log(`📊 Séries : ${matched}/${serieMatches.length} résolues`)
  console.log(`📊 Items  : ${single} single · ${multi} multiple · ${noCand} no-candidate · ${noEp} no-episode`)
  console.log(`   → voir ${reportPath} pour le détail`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
