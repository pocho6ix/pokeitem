# Audit — Récupération des URLs Cardmarket pour les items Pokeitem

> Phase 0 — **audit seul, aucune modification de code.**
> Généré le 2026-04-25.
> Complémentaire à [docs/audit-items.md](audit-items.md) (audit UI/catalogue items du 2026-04-24).

---

## 1. Stack & environnement

| Dimension | Valeur |
|---|---|
| Framework | **Next.js 16.2.1** (App Router, React 19.2) |
| Langage | TypeScript |
| DB | **PostgreSQL** (Neon — cf. codes d'erreur `P1017/P1001` gérés dans les scripts) |
| ORM | **Prisma 5.22** |
| Tâches planifiées | **Vercel Cron** (voir `vercel.json` + [src/app/api/scraper/route.ts](../src/app/api/scraper/route.ts)) |
| Tâches ad-hoc | Répertoire `scripts/` avec `tsx` (ex. `scripts/backfill-cm-history.ts`) |
| HTTP sortant | ✅ fetch natif + `axios` dispo |
| Scraping | ✅ `cheerio`, `puppeteer-core` (utilisé pour passer Cloudflare, cf. `scripts/scrape-cm-celebrations-classic.ts`) |
| Variables d'env | `.env` + `.env.local` — `CARDMARKET_API_KEY` **déjà présente** (RapidAPI pour cartes) |

**Concrètement** : l'infrastructure Cardmarket pour les **cartes** existe déjà et tourne en prod :
- route cron `/api/scraper` (cf. lignes 306-429) → appelle `fetchCMCardsForEpisode` / `fetchCardHistory` sur `cardmarket-api-tcg.p.rapidapi.com`
- [src/lib/cardmarket-fr.ts](../src/lib/cardmarket-fr.ts) centralise l'accès RapidAPI pour les cartes
- [src/lib/scraper/cardmarket.ts](../src/lib/scraper/cardmarket.ts) — scraper HTML historique pour les **items** (regex fragile, jamais utilisé en prod, cf. §5).

---

## 2. Schéma items — ce qui existe déjà

L'infrastructure DB pour les items est **déjà en place** dans [prisma/schema.prisma](../prisma/schema.prisma). Extrait du modèle `Item` (lignes 168-207) :

```prisma
model Item {
  id               String     @id @default(cuid())
  serieId          String
  name             String
  slug             String     @unique
  type             ItemType          // BOOSTER | BOOSTER_BOX | ETB | UPC | BUNDLE | TRIPACK | BOX_SET | TIN | MINI_TIN | POKEBALL_TIN | BLISTER | THEME_DECK | TRAINER_KIT | OTHER
  language         Language   @default(FR)
  cardmarketUrl    String?    @db.Text      // ← prêt à recevoir
  cardmarketId     String?                  //   idem
  priceFrom        Float?                   // cheapest FR listing
  priceTrend       Float?                   // 30d average
  currentPrice     Float?
  priceUpdatedAt   DateTime?
  availableSellers Int?
  lastScrapedAt    DateTime?
  // …
}
```

Table liée `PriceHistory` (lignes 241-254) — un historique par `(itemId, date)`, champ `source` libre (actuellement jamais rempli pour des items).

### ⚠️ État prod (source : `docs/audit-items.md` + `scripts/audit-items-report.ts`)

| Indicateur | Valeur |
|---|---|
| Items en DB | **87** |
| Items avec `cardmarketUrl` | **0** |
| Items avec `cardmarketId` | **0** |
| Items avec `currentPrice` | **0** |
| Items avec `priceFrom` | **0** |
| Lignes de `price_history` pour des items | 22 (vestiges sans source identifiée) |

**Conclusion DB** : la table est équipée mais vide côté Cardmarket. Pas besoin de migration — tous les champs nécessaires existent. La proposition du brief de créer une table dédiée `cardmarket_mapping` est **redondante** : les colonnes `cardmarketUrl`, `cardmarketId`, `priceFrom`, `priceTrend`, `lastScrapedAt` sont déjà sur `Item`.

La seule chose qui manque est un champ `matchConfidence` / `matchCandidates` pour tracer la qualité du matching automatique et permettre la revue manuelle. Cela peut s'ajouter :
- soit via 2 colonnes légères sur `Item` (`cardmarketMatchConfidence String?`, `cardmarketCandidates Json?`)
- soit via une table `CardmarketMatchReview` séparée qui ne contient QUE les lignes à re-vérifier (plus propre).

### Data sample (DB prod)

Extrait représentatif (via `scripts/audit-items-report.ts` qui a déjà tourné — voir §8 de `audit-items.md` pour l'analyse complète) :

```json
[
  { "name": "Display Rivalités Destinées", "type": "BOOSTER_BOX", "serie": "Rivalités Destinées", "language": "FR" },
  { "name": "ETB Héros Transcendants",    "type": "ETB",         "serie": "Héros Transcendants", "language": "FR" },
  { "name": "Bundle Pokémon 151",         "type": "BUNDLE",      "serie": "Pokémon 151",         "language": "FR" },
  { "name": "UPC Évolutions Prismatiques","type": "UPC",         "serie": "Évolutions Prismatiques", "language": "FR" },
  { "name": "Tripack Fable Nébuleuse",    "type": "TRIPACK",     "serie": "Fable Nébuleuse",     "language": "FR" },
  { "name": "Mini Tin Couronne Stellaire","type": "MINI_TIN",    "serie": "Couronne Stellaire",  "language": "FR" },
  { "name": "Coffret Flammes Fantasmagoriques", "type": "BOX_SET", "serie": "Flammes Fantasmagoriques", "language": "FR" },
  { "name": "Booster Équilibre Parfait",  "type": "BOOSTER",     "serie": "Équilibre Parfait",   "language": "FR" }
]
```

Toutes les séries Pokeitem ont une **nomenclature française** (`Écarlate et Violet`, `Mascarade Crépusculaire`, …). Les noms d'items suivent le pattern `{Type FR} {Serie FR}`. Il existe déjà dans [scripts/backfill-cm-history.ts](../scripts/backfill-cm-history.ts) une map `SLUG_TO_PTCG` qui relie les slugs Pokeitem FR aux IDs PTCGIO (= les mêmes slugs EN que Cardmarket utilise). Cette map est **directement réutilisable** pour le matching items → CM.

---

## 3. Cardmarket — ce qui est possible

Trois canaux ont été testés en live ce jour :

### 3.1 — API officielle MKM (api.cardmarket.com)

**Verdict : ❌ Non viable à court terme.**

- Documentation : https://api.cardmarket.com/ws/documentation
- Nécessite **compte vendeur Pro + OAuth 1.0a signé HMAC-SHA1** (clé dédiée app par utilisateur).
- Endpoints "Products" disponibles mais **limités aux singles** dans le périmètre testable sans être commerçant.
- Coût : gratuit au niveau Pro, mais onboarding long (KYC vendeur).
- **Rejet** : overhead admin disproportionné pour 87 items.

### 3.2 — RapidAPI `cardmarket-api-tcg.p.rapidapi.com`

**Verdict : ✅ STRONGLY VIABLE. C'est la bonne piste.**

L'abonnement est **déjà actif et utilisé en prod pour les cartes** (cf. `scripts/backfill-cm-history.ts`, route `/api/scraper`). Testé aujourd'hui avec la clé prod :

```bash
GET /pokemon/products?page=1&per_page=100
→ 200 OK · 1896 produits scellés au total · 95 pages × 20
```

Chaque produit renvoie :

```json
{
  "id": 31748,
  "name": "Chaos Rising 24 Sleeved Booster Case",
  "slug": "chaos-rising-24-sleeved-booster-case",
  "cardmarket_id": 877280,                        // ← ID stable CM
  "tcgplayer_id": null,
  "image": "https://images.tcggo.com/.../chaos-rising-24-sleeved-booster-case.png",
  "prices": {
    "cardmarket": {
      "currency": "EUR",
      "lowest_FR": 170,                           // ← prix FR "from" (exact)
      "lowest_FR_EU_only": 170,
      "30d_average": 1440.91,                     // ← priceTrend
      "7d_average":  1604.44
    }
  },
  "episode": {
    "id": 413,
    "name": "Chaos Rising",                       // ← nom EN officiel
    "slug": "chaos-rising",                       // ← slug EN (= SLUG_TO_PTCG)
    "code": "CRI",
    "released_at": "2026-05-22"
  },
  "links": { "cardmarket": "https://www.tcggo.com/external/cm/31748" },
  "tcggo_url": "https://www.tcggo.com/pokemon/chaos-rising/chaos-rising-24-sleeved-booster-case"
}
```

Endpoints utiles :

| Endpoint | Rôle |
|---|---|
| `GET /pokemon/products?page=&per_page=` | Liste paginée **de tous les produits scellés** (1896 entrées aujourd'hui) |
| `GET /pokemon/products/{id}` | Détail produit (mêmes champs que dans la liste) |
| `GET /pokemon/episodes` | Liste des séries EN (réutilise ce qui est déjà en place) |
| `GET /pokemon/cards/{id}/history-prices` | Historique — **à tester pour voir s'il existe pour les products** (non confirmé) |

**Contraintes** :
- Quota partagé avec le job cards : **15 000 appels/jour** (plafond RapidAPI).
- Un "backfill products" complet coûte ~100 appels (95 pages × 1) → négligeable.
- Un refresh quotidien coûte idem → 100 appels/j, soit <1 % du quota.
- Pas de Cloudflare, pas de parsing HTML, pas de risque de casse à la prochaine refonte CM.

**Point d'attention** : `links.cardmarket` pointe vers un **redirect TCGGO** (`tcggo.com/external/cm/{id}`), pas directement `cardmarket.com`. Deux options :
1. Stocker ce redirect tel quel — les users arrivent sur CM via TCGGO (1 hop transparent).
2. Harvester l'URL canonique CM une seule fois via puppeteer-core (déjà utilisé ailleurs) et la stocker en dur.

Option 1 suffit pour les prix (déjà dans l'API). Option 2 utile uniquement si on veut afficher un deep-link direct CM pour le SEO / partage.

### 3.3 — Scraping public HTML (cardmarket.com)

**Verdict : ⚠️ Viable mais sous-optimal.**

Test live effectué :

```bash
curl -I "https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes"
→ HTTP/2 403 — cf-mitigated: challenge   (Cloudflare managed)
```

- Cardmarket est derrière **Cloudflare avec challenge actif**. `fetch`/`axios`/`cheerio` simple → 403 systématique.
- Le robots.txt **autorise l'accès** (Allow: /, content-signal `search=yes`) mais Cloudflare filtre les UA sans challenge solve.
- Les scripts existants `scripts/scrape-cm-celebrations-*.ts` passent le challenge via **puppeteer-core + Chrome local** (macOS only). Fonctionne sur le poste dev, pas en edge Vercel.
- Le regex parser `src/lib/scraper/cardmarket.ts` (regex `/Price Trend[\s\S]*?(\d+[.,]\d{2})/`) est fragile — à rejeter pour un flux prod.

Endpoint de recherche trouvé : `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=...` (même résultat HTML, même blocage CF). Pas d'endpoint XHR ajax exploitable sans session cookie.

**À ne conserver que comme fallback manuel** pour les 1 ou 2 items que le RapidAPI ne couvrirait pas.

### 3.4 — Sources alternatives

| Source | Verdict |
|---|---|
| PokemonTCG.io | ❌ couvre les cartes uniquement, pas les scellés. |
| PriceCharting | ⚠️ couvre les scellés mais pas de mapping croisé vers CM. |
| TCGPlayer | ⚠️ idem, US-centric, peu utile pour un prix FR. |
| GitHub / communauté | ❌ rien de maintenu pour le mapping FR ↔ CM products. |

---

## 4. Stratégie recommandée

Vu l'état des lieux :
- 87 items en DB, tous FR
- `SLUG_TO_PTCG` (slug FR → slug EN) existe déjà et couvre la majorité des séries modernes
- L'endpoint RapidAPI `/pokemon/products` retourne nom EN, `cardmarket_id`, prix FR et slug série **dans une seule réponse**

Le brief initial (§1.1 du prompt) propose de construire un dictionnaire de traduction FR → EN manuel + un scraper HTML. **C'est un chemin plus long et plus fragile que nécessaire.** Trois approches à comparer :

### Option A — **API-first, matching auto, sans scraping** *(recommandée)*

Flux :
1. Un script `scripts/match-cardmarket-items.ts` paginé sur `/pokemon/products` (≈100 appels API, <30 s).
2. Enrichit la map FR→EN existante (`SLUG_TO_PTCG` dans `scripts/backfill-cm-history.ts`) pour les quelques séries manquantes (bloc ME, BLW anciens…). Étendre si besoin — pas d'extraction "d'un dictionnaire de 200 lignes à la main".
3. Pour chaque item Pokeitem :
   - Résoudre `episode.slug` EN attendu (ex. `evolutions-prismatiques` → `sv8pt5` → ensuite filtrer sur `episode.slug == "prismatic-evolutions"` dans la liste CM).
   - Filtrer les produits de cette série côté client (in-memory, pas d'appel réseau).
   - Scorer les candidats par similarité sur `(type Pokeitem → mot-clé attendu CM)` : `BOOSTER_BOX` → regex `/booster box/i`, `ETB` → `/elite trainer box/i`, `UPC` → `/ultra premium/i`, `BUNDLE` → `/booster bundle/i`, etc.
   - Éliminer les variantes case (`24 Sleeved Booster Case`, `10 Elite Trainer Box Case`, `Pokémon Center Elite Trainer Box`) selon règles explicites (mot-clé `Case` ou `Pokémon Center` = variante, pas le produit "standard").
4. Décision :
   - 1 candidat fort + 0 ambiguïté → auto-valider, stocker `cardmarketId`, `cardmarketUrl` (= `links.cardmarket`), `priceFrom`, `priceTrend`, `lastScrapedAt`.
   - 2+ candidats proches → flagguer `matchConfidence = 'auto_low'`, stocker les top 3 en `candidates` pour revue.
   - 0 candidat → `matchConfidence = 'unmatched'`.
5. Une fois le matching validé, un **cron** quotidien (réutilise `/api/scraper`) refresh `priceFrom`/`priceTrend` + insert une ligne `PriceHistory`. Coût : 100 appels / 24 h → <1 % du quota.

**Risque** : minimal (pas de HTML, pas de CF, pas de regex).
**Coût dev** : ~1 j (script + dashboard minimal + tests).
**Coût API** : ≈100 appels initiaux + 100/j.

### Option B — Scraping HTML via puppeteer

- Utilise les scripts existants `scrape-cm-*` comme base.
- Construit un dictionnaire FR → EN comme décrit dans le brief initial.
- Lance Chrome headless, contourne CF, parse HTML avec cheerio.

**Risque** : élevé (CF durcit régulièrement, regex fragile).
**Coût dev** : 3-4 j.
**Coût runtime** : Chrome headless ne tourne pas en edge Vercel → nécessite un worker externe ou run manuel.
**Verdict** : à garder uniquement comme **fallback manuel** pour items non résolus par l'Option A.

### Option C — API officielle MKM

- Créer un compte vendeur Pro → OAuth 1.0a.
- Endpoints Products officiels.

**Risque** : KYC vendeur commerce français, temps admin.
**Coût dev** : 1 semaine (OAuth 1.0a signé + gestion refresh) avant même la première requête.
**Verdict** : disproportionné pour 87 items. À reconsidérer uniquement si on veut aller plus loin (ex. publier des annonces, pas juste lire des prix).

---

## 5. Risques & TOS

- **TOS RapidAPI** : l'abonnement est déjà signé pour l'usage cards, aucun article ne limite l'usage à une catégorie de produits (cards uniquement). L'endpoint `/pokemon/products` est public dans le plan actuel.
- **TOS Cardmarket** : le `robots.txt` accepte le signal `search=yes` mais refuse `ai-train=no`. Scraping HTML toléré à basse cadence ; pas d'attaque contre les TOS si on passe par le RapidAPI (qui est leur partenaire, pas nous directement).
- **Rate limiting** : 15 000 appels/j partagés, on en consomme déjà ~2 000/j avec les cartes (estimé à partir de `backfill-cm-history.ts` + cron). Reste >12 000/j. Largement suffisant.
- **Confidentialité** : aucun token utilisateur manipulé. Pas de RGPD additionnel.
- **Dépendance single-vendor** : si RapidAPI ou TCGGO ferment l'endpoint, on bascule sur option B. Risque à noter dans la roadmap.

---

## 6. Ce que le brief demandait vs ce qu'on propose

Le brief initial (envoyé dans le prompt) prévoyait :
- 🔴 Construction manuelle d'un dictionnaire `SERIES_FR_TO_EN` → **partiellement inutile**, l'API nous donne le nom EN directement. Une mini-map FR-slug → EN-slug suffit pour accélérer le matching.
- 🔴 `PRODUCT_TYPE_FR_TO_EN` → **utile** mais sous la forme de patterns regex/keywords, pas d'une table 1:1 (CM a plusieurs variantes par type : ETB standard / Pokémon Center ETB / Case).
- 🔴 `CARDMARKET_SLUGS` (mapping type → URL slug) → **inutile**, l'URL vient de l'API.
- 🔴 Nouvelle table `cardmarket_mapping` → **inutile**, les colonnes existent déjà sur `items`.
- 🟡 Scraping HTML avec rate limit + UA + retry exponentiel → **à réserver** au fallback manuel Option B.
- 🟢 Dashboard `/admin/cardmarket-matching` pour les `auto_low`/`unmatched` → **pertinent, à conserver**.
- 🟢 Cron de réconciliation hebdomadaire → **pertinent, à greffer sur `/api/scraper`**.
- 🟢 Script `--dry-run` / `--limit` / idempotent → **pertinent**.

On gagne en simplicité sans perdre en rigueur.

---

## 7. Questions ouvertes avant la Phase 1

1. **Stratégie retenue** : Option A / B / C ? (Reco : A.)
2. **Structure revue manuelle** : 2 colonnes sur `Item` (`cardmarketMatchConfidence`, `cardmarketCandidates Json`) ou table séparée `CardmarketMatchReview` ?
3. **URL canonique vs redirect TCGGO** : on stocke `links.cardmarket` (= redirect TCGGO) tel quel, ou on harvest une fois l'URL directe CM via puppeteer pour l'avoir en dur ?
4. **Branche** : le brief propose `feat/cardmarket-url-matching`. Mais `feat/items-cardmarket-prices` est plus parlant (l'URL n'est qu'un moyen, le but est le prix). À trancher.

---

**Audit terminé. Prêt à lancer la Phase 1 dès validation. Quelle stratégie Cardmarket souhaitez-vous retenir : [A] (API-first via RapidAPI, recommandée), [B] (scraping HTML via puppeteer) ou [C] (API officielle MKM / OAuth Pro) ?**
