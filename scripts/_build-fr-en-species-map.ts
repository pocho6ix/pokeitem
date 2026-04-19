/**
 * One-shot builder : construit un map FR→EN complet pour TOUTES les espèces
 * Pokémon via PokéAPI. Sort le JSON sur stdout. À redresser/copier dans
 * EXTRA_FR_EN du dry-run.
 *
 * Usage : npx tsx scripts/_build-fr-en-species-map.ts > /tmp/fr-en-map.json
 */
import { writeFileSync } from "node:fs";

const MAX = 1025; // Gen 9 Pokédex count

type SpeciesResponse = {
  names: { name: string; language: { name: string } }[];
};

async function main() {
  const map: Record<string, string> = {};
  const CONCURRENCY = 20;
  let done = 0;

  async function fetchOne(id: number): Promise<[string, string] | null> {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
      if (!r.ok) return null;
      const d = (await r.json()) as SpeciesResponse;
      const fr = d.names.find((n) => n.language.name === "fr")?.name;
      const en = d.names.find((n) => n.language.name === "en")?.name;
      if (!fr || !en) return null;
      return [fr, en];
    } catch {
      return null;
    }
  }

  const ids = Array.from({ length: MAX }, (_, i) => i + 1);
  while (ids.length) {
    const batch = ids.splice(0, CONCURRENCY);
    const results = await Promise.all(batch.map(fetchOne));
    for (const r of results) if (r) map[r[0]] = r[1];
    done += batch.length;
    if (done % 100 === 0) console.error(`  ${done}/${MAX}…`);
  }

  writeFileSync("/tmp/fr-en-map.json", JSON.stringify(map, null, 2));
  console.error(`✅  ${Object.keys(map).length} entries → /tmp/fr-en-map.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
