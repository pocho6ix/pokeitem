# Audit — Section "Produits scellés"

> Phase 1 du projet de refonte. Généré le 2026-04-24.
> Sources : lecture statique du code + requête de comptage sur la DB de prod via [scripts/audit-items-report.ts](../scripts/audit-items-report.ts).

---

## 1. Synthèse exécutive

**Ce que l'audit a révélé d'inattendu :**

1. **La grille "items d'une série" ne lit PAS la DB comme source primaire.** Elle parcourt une liste statique de *types de produits* ([src/data/item-types.ts](../src/data/item-types.ts)) et, pour chaque type, affiche une carte. Les données DB (prix, nom réel, slug canonique) ne sont que des *décorations* — si un enregistrement existe pour ce (serie, type), on s'en sert, sinon on fallback sur le MSRP typique et un nom construit.
2. **La DB d'items est quasi vide en prod : 87 items au total, dont 0 avec URL Cardmarket, 0 avec prix courant, 0 avec date de scrape.** Les 22 lignes de `price_history` sont des vestiges. L'intégration Cardmarket annoncée dans le schéma n'a jamais été alimentée pour les items scellés.
3. **Une route API est cassée :** [src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/SerieProduitsClient.tsx](../src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/SerieProduitsClient.tsx) appelle `/api/items?serieSlug=…`, mais [src/app/api/items/route.ts](../src/app/api/items/route.ts) ne supporte pas ce paramètre (il accepte `serieId`, `blocId`, `type`, `search`). Résultat : le client reçoit une liste non filtrée ou vide.
4. **Pas de sélecteur de langue dans l'UI "Produits scellés".** L'enum `Language` existe en base mais aucun filtre UI ne l'expose. Aucune action de retrait à prévoir, mais à confirmer : il y a peut-être un sélecteur global ailleurs dans l'app (header, settings).
5. **Pas de filtre par type** dans la vue Collection (seule la vue Portfolio en a un — voir [ItemsToolbar](../src/components/portfolio/ItemsToolbar.tsx)).

**Conséquence pour la refonte :** la Phase 2 (UI) doit décider si on reste sur un modèle "série × types statiques" (rapide, peu de données nécessaires) ou si on passe à un vrai catalogue DB-driven (plus propre, mais nécessite d'abord de peupler la table `items`). Ce choix conditionne tout le reste.

---

## 2. Comptages en base (prod)

Source : [scripts/audit-items-report.ts](../scripts/audit-items-report.ts) (ré-exécutable via `npx tsx scripts/audit-items-report.ts`).

| Indicateur | Valeur |
|---|---|
| Items en DB | **87** |
| Séries en DB | 146 |
| Blocs en DB | 13 |
| Lignes de `price_history` | 22 |
| Items avec `imageUrl` | 9 (10 %) |
| Items avec `cardmarketUrl` | **0** |
| Items avec `cardmarketId` | **0** |
| Items avec `currentPrice` | **0** |
| Items avec `priceFrom` | **0** |
| Items avec `lastScrapedAt` | **0** |
| Images présentes sur disque (`public/images/items/*.jpg`) | **590** |

**Interprétation :** le catalogue visible à l'utilisateur repose essentiellement sur :
- la liste statique des **séries** ([src/data/series.ts](../src/data/series.ts), 296 lignes)
- la liste statique des **types de produits** ([src/data/item-types.ts](../src/data/item-types.ts))
- les **590 images détourées** du disque (naming `{serie-slug}-{type-slug}.jpg`)
- une **map d'images générée** ([src/data/item-images-map.generated.ts](../src/data/item-images-map.generated.ts)) qui dit quelles combinaisons (série, type) ont une image disponible.

### Répartition DB par type

| Type | Items |
|---|---|
| ETB | 25 |
| BOOSTER | 16 |
| BOOSTER_BOX (Display) | 10 |
| TRIPACK | 9 |
| BUNDLE | 8 |
| UPC | 5 |
| BOX_SET (Coffret) | 5 |
| MINI_TIN | 4 |
| TRAINER_KIT | 2 |
| DUOPACK | 2 |
| TIN | 1 |

Types *définis en enum mais absents de la DB* : `POKEBALL_TIN`, `BLISTER`, `THEME_DECK`, `OTHER`.

### Répartition DB par bloc

| Bloc | Items |
|---|---|
| Écarlate & Violet | 47 |
| Méga-Évolution | 23 |
| Épée & Bouclier | 14 |
| HeartGold SoulSilver | 1 |
| EX | 1 |
| Wizards | 1 |

(7 blocs de la table `blocs` n'ont **aucun** item en DB.)

---

## 3. Structure de données

### Schéma Prisma ([prisma/schema.prisma](../prisma/schema.prisma))

Modèle `Item` (lignes ~168-207) — champs pertinents :

| Champ | Type | Présence prod |
|---|---|---|
| `id`, `serieId`, `name`, `slug`, `type` | obligatoires | ✅ 87/87 |
| `imageUrl` | `String?` | 9/87 |
| `images` | `String[]` | — |
| `ean`, `releaseDate`, `retailPrice` | `*?` | partiel |
| `currentPrice`, `priceFrom`, `priceTrend`, `availableSellers` | `Float?`/`Int?` | **0/87** |
| `cardmarketUrl`, `cardmarketId` | `String?` | **0/87** |
| `lastScrapedAt` | `DateTime?` | **0/87** |
| `language` | `Language` enum | défaut `FR` |
| `isExclusive`, `exclusiveStore` | pour boîtes magasin | partiel |

Modèles liés : `Serie` (1:N), `Bloc` (via Serie), `PriceHistory`, `PortfolioItem`, `WishlistItem`, `MarketListing`.

Enum `ItemType` (14 valeurs) : `BOOSTER`, `DUOPACK`, `TRIPACK`, `BOOSTER_BOX`, `ETB`, `BOX_SET`, `UPC`, `TIN`, `MINI_TIN`, `POKEBALL_TIN`, `BLISTER`, `THEME_DECK`, `BUNDLE`, `TRAINER_KIT`, `OTHER`.

---

## 4. Code existant

### Pages & routes

| Chemin | Rôle |
|---|---|
| [src/app/(main)/collection/produits/page.tsx](../src/app/(main)/collection/produits/page.tsx) | Liste des blocs |
| [src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/page.tsx](../src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/page.tsx) | Page série (serveur) |
| [src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/SerieProduitsClient.tsx](../src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/SerieProduitsClient.tsx) | ⚠️ Appel API cassé (`serieSlug` non géré) |
| [src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/[itemSlug]/page.tsx](../src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/[itemSlug]/page.tsx) | Fiche item — placeholder "en construction", `noindex` |
| [src/app/(main)/portfolio/items/page.tsx](../src/app/(main)/portfolio/items/page.tsx) | Portfolio utilisateur (items scellés) |
| [src/app/(main)/portfolio/items/[id]/page.tsx](../src/app/(main)/portfolio/items/[id]/page.tsx) | Édition d'une ligne de portfolio |

### Composants clés

- Collection : [SerieItemsGrid](../src/components/collection/SerieItemsGrid.tsx) — **iter statique** sur `itemTypes`, grille `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Pas de filtre par type.
- Portfolio : [PortfolioItemsSection](../src/components/portfolio/PortfolioItemsSection.tsx), [ItemsToolbar](../src/components/portfolio/ItemsToolbar.tsx) (a déjà un filtre de type), [ItemCardGrid](../src/components/portfolio/ItemCardGrid.tsx), [ItemCard](../src/components/portfolio/ItemCard.tsx).
- Image : [ItemImage](../src/components/shared/ItemImage.tsx) — fallback en icône, **fond `bg-white`** explicite (c'est là qu'est le fond blanc à retirer).

### API

| Endpoint | Méthode | Commentaire |
|---|---|---|
| `/api/items` | GET | ⚠️ **ne supporte pas `serieSlug`** — accepte `serieId`, `blocId`, `type`, `search`, `page`, `limit` |
| `/api/items/search` | GET | recherche full-text (`q`, `type`) |
| `/api/items/[id]` | GET | détail + historique de prix |
| `/api/items/[id]/price` | GET/POST | scrape manuel d'un item isolé |

### Stack UI

- Tailwind + CSS custom props (`--text-primary`, `--bg-card`, `--border-default`…) définies dans [src/lib/theme.ts](../src/lib/theme.ts) / [src/lib/theme.tsx](../src/lib/theme.tsx)
- Lucide React (icônes)
- Zustand (state UI global, [src/stores/](../src/stores/))
- **Pas de React Query** — fetch via wrapper [src/lib/api.ts](../src/lib/api.ts)
- **Pas de sélecteur de langue** détecté dans la section "Produits scellés"

---

## 5. Intégration Cardmarket existante

### Ce qui existe déjà (cartes uniques, pas items scellés)

- [src/lib/cardmarket-fr.ts](../src/lib/cardmarket-fr.ts) — fetch RapidAPI `cardmarket-api-tcg`, lit `lowest_near_mint_FR`
- [src/lib/scraper/cardmarket.ts](../src/lib/scraper/cardmarket.ts) — scraper HTML (regex, fragile) pour l'URL de recherche publique
- [src/app/api/scraper/route.ts](../src/app/api/scraper/route.ts) — route pour scraper une série entière de **cartes** (pas items)
- [scripts/backfill-cm-history.ts](../scripts/backfill-cm-history.ts) — backfill historique des prix de **cartes**, avec gestion de quota RapidAPI (15k/j)

### Ce qui manque pour les items scellés

- ❌ Aucun item en DB n'a d'URL ni d'ID Cardmarket (0/87)
- ❌ Pas de table/mapping FR ↔ EN (noms de séries, noms de produits)
- ❌ Pas de scraper dédié aux produits scellés — `scraper/cardmarket.ts` vise les cartes
- ❌ Pas de job/cron de scraping planifié pour les items
- ❌ Pas de dashboard admin pour valider manuellement un matching

**Conclusion :** l'intégration Cardmarket pour les items scellés est à construire **from scratch**. Les briques cartes peuvent servir de référence (structure du fetcher, gestion de quota), pas de réutilisation directe.

---

## 6. Problèmes identifiés à corriger

### Critiques (bloquants fonctionnels)

1. **API `/api/items` ne filtre pas par `serieSlug`** → la page série charge des données incorrectes. À corriger avant la refonte UI, sinon on ne sait pas ce qu'on teste.
2. **Fiche détail item est un placeholder `noindex`** ([…]/[itemSlug]/page.tsx) — les URLs sont dans le sitemap mais servent du contenu vide.

### Majeurs (objets de la refonte)

3. **Fond blanc derrière les images** — [ItemImage.tsx:31](../src/components/shared/ItemImage.tsx) `bg-white` à remplacer par le fond card.
4. **Pas de filtre par type** dans [SerieItemsGrid](../src/components/collection/SerieItemsGrid.tsx).
5. **Pas de vue cross-séries par type** — actuellement nav en 2 étapes (bloc → série → items).
6. **Grille à 1/2/3/4 colonnes selon breakpoint** — le brief vise **3 colonnes mobile + desktop**.
7. **Catalogue UI = statique** — conséquence : si on veut afficher prix Cardmarket temps réel dans la grille, il faut peupler la DB items ou enrichir le flux statique. Décision d'architecture à prendre.

### Mineurs

8. 7 blocs sur 13 en DB n'ont aucun item associé (legacy ? à purger ou à remplir ?).
9. 78/87 items en DB sans `imageUrl` — mais les 590 fichiers images du disque couvrent manifestement plus de cas que ce que la DB reflète (source : naming `{serie}-{type}.jpg`). Incohérence DB ↔ FS à clarifier.
10. La regex du scraper `cardmarket.ts` est fragile (ira casser à la prochaine refonte CM).

---

## 7. Inventaire des séries (extrait pour le mapping FR→EN à venir)

Séries FR présentes dans la DB (prod, classées par nombre d'items décroissant — 20 premières) :

| Série FR | Items DB | Nom EN probable |
|---|---|---|
| Rivalités Destinées | 7 | Destined Rivals |
| Héros Transcendants | 6 | Mega Evolution Ascended Heroes |
| Flammes Fantasmagoriques | 6 | Phantasmal Flames |
| Équilibre Parfait | 6 | Mega Evolution Perfect Order |
| Pokémon 151 | 5 | Pokémon 151 (identique) |
| Évolutions Prismatiques | 5 | Prismatic Evolutions |
| Aventures Ensemble | 4 | Journey Together |
| Étincelles Déferlantes | 4 | Surging Sparks |
| Méga-Évolution | 4 | Mega Evolution (symbole) |
| Fable Nébuleuse | 3 | Shrouded Fable |
| Flammes Obsidiennes | 3 | Obsidian Flames |
| Destinées de Paldea | 3 | Paldean Fates |
| Origine Perdue | 3 | Lost Origin |
| Faille Paradoxe | 3 | Paradox Rift |
| Tempête Argentée | 2 | Silver Tempest |
| Célébrations | 2 | Celebrations |
| Foudre Noire | 2 | Black Bolt |
| Mascarade Crépusculaire | 2 | Twilight Masquerade |
| Couronne Stellaire | 2 | Stellar Crown |
| Triomphant | 1 | Triumphant (HGSS) |

Liste complète des 146 séries : voir [src/data/series.ts](../src/data/series.ts) + requête DB (`SELECT name FROM series`).

---

## 8. Questions ouvertes à trancher avec l'utilisateur

Avant de passer en Phase 2 (refonte UI), trois décisions d'architecture à valider :

### Q1 — Source de vérité du catalogue items

La grille actuelle est **statique-first** (itère sur `item-types.ts`, décorée avec la DB quand dispo). Trois options :

- **A — Garder statique** : rapide, mais limite les features (ex. afficher un prix CM par item devient complexe). Les données CM seraient jointes par clé (`serie-slug`, `type`).
- **B — Tout migrer en DB** : plus propre, mais demande un *seed* massif avant la refonte UI (87 → plusieurs centaines d'items, avec images et metadata).
- **C — Hybride explicite** : liste statique des *SKUs théoriques*, mais enrichie en DB pour les items effectivement mis sur le marché. Le filtre "Tous / ETB / Display…" opère côté client sur la liste fusionnée.

**Reco :** C, mais on peut discuter.

### Q2 — Périmètre de la Phase 2 (UI)

Le brief parle de "Produits scellés" au sens **Collection** (catalogue navigable par tous). Est-ce qu'on refond aussi :
- la vue **Portfolio → items** ([PortfolioItemsSection](../src/components/portfolio/PortfolioItemsSection.tsx)) pour cohérence visuelle ?
- ou on se limite à `/collection/produits/...` ?

### Q3 — Fond d'image

Pour retirer le fond blanc derrière les boosters : deux voies :
- **Pré-traiter les 590 images** (détourage offline, canal alpha) — propre, lourd (~1 session de batch)
- **`mix-blend-mode: multiply`** côté CSS — instantané, mais imparfait si l'image a déjà un filet ou un reflet clair

**Reco :** pré-traitement image car 590 est gérable d'un coup avec `rembg` ou équivalent.

---

## 9. Livrables à l'issue de cet audit

- ✅ Ce rapport ([docs/audit-items.md](audit-items.md))
- ✅ Script réutilisable de comptage DB ([scripts/audit-items-report.ts](../scripts/audit-items-report.ts))
- ⏳ Validation utilisateur avant Phase 2

---

**Prochaine étape** : trancher les 3 questions ouvertes (§8), puis ouvrir une branche `feat/items-ui-refresh` pour la Phase 2.
