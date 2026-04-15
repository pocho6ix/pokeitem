/**
 * Build a mapping { serieSlug -> tcgdexSetId } by querying the TCGdex FR API.
 *
 * Strategy:
 *   1. Fetch every FR set (listing + detail for releaseDate).
 *   2. For each local series, pick the best match among TCGdex sets using:
 *      a. exact FR name match (normalized)
 *      b. exact EN name match (via EN API) as fallback
 *      c. release-date match (same day) as disambiguator
 *   3. Produce a JSON report at scripts/_tcgdex-symbol-mapping.json and a
 *      human-readable summary on stdout, so ambiguous entries can be
 *      reviewed manually before downloading.
 *
 * Run: npx tsx scripts/build-tcgdex-symbol-mapping.ts
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { SERIES } from '../src/data/series';

type TcgdexSetLite = {
  id: string;
  name: string;
  symbol?: string;
  logo?: string;
  cardCount: { total: number; official: number };
};

type TcgdexSetDetail = TcgdexSetLite & {
  releaseDate?: string;
  serie?: { id: string; name: string };
};

/**
 * Manual overrides for series that can't be matched automatically because
 * TCGdex uses different naming conventions (e.g. promo sub-sets, energies).
 */
const OVERRIDES: Record<string, string> = {
  'energies-mega-evolution':    'mep',    // grouped under MEP Black Star Promos
  'promos-mega-evolution':      'mep',
  'energies-ecarlate-et-violet':'svp',
  'promos-ecarlate-et-violet':  'svp',
  'promos-epee-et-bouclier':    'swshp',
  'promos-soleil-et-lune':      'smp',
  'promos-xy':                  'xyp',
  'promos-noir-et-blanc':       'bwp',
  'promos-heartgold-soulsilver':'hgssp',
  'promos-diamant-et-perle':    'dpp',
  'promos-nintendo':            'np',
  'groudon-vs-kyogre':          'ex4',
};

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function main() {
  console.log('Fetching TCGdex FR sets...');
  const frSets = await fetchJson<TcgdexSetLite[]>('https://api.tcgdex.net/v2/fr/sets');
  console.log(`  ${frSets.length} FR sets`);

  console.log('Fetching TCGdex EN sets (fallback for series without FR name match)...');
  const enSets = await fetchJson<TcgdexSetLite[]>('https://api.tcgdex.net/v2/en/sets');
  console.log(`  ${enSets.length} EN sets`);

  // Fetch set details in parallel batches (limit concurrency)
  console.log('Fetching FR set details (releaseDate)...');
  const detailByFrId = new Map<string, TcgdexSetDetail>();
  const BATCH = 20;
  for (let i = 0; i < frSets.length; i += BATCH) {
    const batch = frSets.slice(i, i + BATCH);
    const details = await Promise.all(
      batch.map((s) =>
        fetchJson<TcgdexSetDetail>(`https://api.tcgdex.net/v2/fr/sets/${s.id}`).catch(() => null)
      )
    );
    for (const d of details) if (d) detailByFrId.set(d.id, d);
    process.stdout.write(`  ${Math.min(i + BATCH, frSets.length)}/${frSets.length}\r`);
  }
  console.log();

  // Indexes
  const frByName = new Map<string, TcgdexSetLite[]>();
  for (const s of frSets) {
    const k = normalize(s.name);
    if (!frByName.has(k)) frByName.set(k, []);
    frByName.get(k)!.push(s);
  }
  const enByName = new Map<string, TcgdexSetLite[]>();
  for (const s of enSets) {
    const k = normalize(s.name);
    if (!enByName.has(k)) enByName.set(k, []);
    enByName.get(k)!.push(s);
  }
  const frByReleaseDate = new Map<string, TcgdexSetLite[]>();
  for (const [id, d] of detailByFrId) {
    if (!d.releaseDate) continue;
    if (!frByReleaseDate.has(d.releaseDate)) frByReleaseDate.set(d.releaseDate, []);
    frByReleaseDate.get(d.releaseDate)!.push({ id, name: d.name, symbol: d.symbol, logo: d.logo, cardCount: d.cardCount });
  }

  type Confidence = 'exact-fr' | 'exact-fr+date' | 'date-only' | 'exact-en' | 'override' | 'none';
  type Match = {
    serieSlug: string;
    serieName: string;
    serieNameEn: string;
    serieBlocSlug: string;
    serieReleaseDate: string | null;
    tcgdexSetId: string | null;
    tcgdexSetName: string | null;
    tcgdexReleaseDate: string | null;
    tcgdexParent: string | null;
    confidence: Confidence;
    symbolUrl: string | null;
  };

  const matches: Match[] = [];

  for (const serie of SERIES) {
    const nFr = normalize(serie.name);
    const nEn = normalize(serie.nameEn);

    let picked: TcgdexSetLite | null = null;
    let confidence: Match['confidence'] = 'none';

    // Manual override first — highest priority.
    const override = OVERRIDES[serie.slug];
    if (override) {
      const fromFr = frSets.find((s) => s.id === override);
      if (fromFr) {
        picked = fromFr;
        confidence = 'override';
      }
    }

    const candidates = picked ? [] : frByName.get(nFr) ?? [];

    if (candidates.length === 1) {
      picked = candidates[0];
      confidence = 'exact-fr';
      // Upgrade confidence if release dates also match
      const d = detailByFrId.get(picked.id);
      if (d?.releaseDate && d.releaseDate === serie.releaseDate) {
        confidence = 'exact-fr+date';
      }
    } else if (candidates.length > 1 && serie.releaseDate) {
      // Disambiguate by release date
      const byDate = candidates.find((c) => {
        const d = detailByFrId.get(c.id);
        return d?.releaseDate === serie.releaseDate;
      });
      if (byDate) {
        picked = byDate;
        confidence = 'exact-fr+date';
      }
    }

    // Fallback: release date alone (helpful for FR-renamed sets with EN name in TCGdex)
    if (!picked && serie.releaseDate) {
      const dateMatches = frByReleaseDate.get(serie.releaseDate) ?? [];
      if (dateMatches.length === 1) {
        picked = dateMatches[0];
        confidence = 'date-only';
      }
    }

    // Fallback: EN exact name
    if (!picked) {
      const enCands = enByName.get(nEn) ?? [];
      if (enCands.length === 1) {
        picked = enCands[0];
        confidence = 'exact-en';
      }
    }

    const detail = picked ? detailByFrId.get(picked.id) : null;
    const parent = detail?.serie?.id ?? null;
    const rawSymbol = picked?.symbol ?? detail?.symbol ?? null;
    const symbolUrl = rawSymbol ? `${rawSymbol}.png` : null;

    matches.push({
      serieSlug: serie.slug,
      serieName: serie.name,
      serieNameEn: serie.nameEn,
      serieBlocSlug: serie.blocSlug,
      serieReleaseDate: serie.releaseDate,
      tcgdexSetId: picked?.id ?? null,
      tcgdexSetName: picked?.name ?? null,
      tcgdexReleaseDate: detail?.releaseDate ?? null,
      tcgdexParent: parent,
      confidence,
      symbolUrl,
    });
  }

  // Summary
  const byConfidence = matches.reduce<Record<string, number>>((acc, m) => {
    acc[m.confidence] = (acc[m.confidence] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nResults:');
  for (const [k, v] of Object.entries(byConfidence)) console.log(`  ${k.padEnd(16)} ${v}`);

  const unmatched = matches.filter((m) => m.confidence === 'none');
  if (unmatched.length) {
    console.log('\nUnmatched series:');
    for (const m of unmatched) {
      console.log(`  ${m.serieBlocSlug}/${m.serieSlug}  (${m.serieName} / ${m.serieNameEn})`);
    }
  }

  const withoutSymbol = matches.filter((m) => m.tcgdexSetId && !m.symbolUrl);
  if (withoutSymbol.length) {
    console.log('\nMatched but no symbol URL:');
    for (const m of withoutSymbol) {
      console.log(`  ${m.serieSlug} -> ${m.tcgdexSetId} (${m.tcgdexSetName})`);
    }
  }

  const outPath = path.resolve('scripts/_tcgdex-symbol-mapping.json');
  writeFileSync(outPath, JSON.stringify(matches, null, 2));
  console.log(`\nWritten: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
