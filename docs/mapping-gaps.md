# Rapport de couverture — Mapping Cardmarket pour les items Pokeitem

> Phase 1 — généré automatiquement par [scripts/audit-cardmarket-coverage.ts](../scripts/audit-cardmarket-coverage.ts)
> Snapshot : 2026-04-24T22:30:46.477Z
> Sources : 138 épisodes CM · 1896 produits scellés CM · 35 séries DB avec items · 90 items DB

---

## 1. Synthèse

| Indicateur | Valeur |
|---|---|
| Séries Pokeitem avec ≥1 item | 35 |
| Séries résolues vers une épisode CM | **34** (97 %) |
| Séries non résolues | **1** |
| Items Pokeitem au total | 90 |
| Items avec **1 seul candidat CM** (auto-high) | **59** (66 %) |
| Items avec plusieurs candidats (auto-low) | 20 (22 %) |
| Items sans candidat CM (type absent) | 10 (11 %) |
| Items dont la série n'est pas résolue | 1 (1 %) |

## 2. Couverture par type de produit

| Type | Total | Single | Multiple | Sans candidat | Série non résolue |
|---|---:|---:|---:|---:|---:|
| ETB | 26 | 21 | 5 | 0 | 0 |
| BOOSTER | 17 | 17 | 0 | 0 | 0 |
| BOOSTER_BOX | 10 | 9 | 1 | 0 | 0 |
| TRIPACK | 9 | 1 | 6 | 2 | 0 |
| BUNDLE | 9 | 8 | 0 | 1 | 0 |
| UPC | 5 | 1 | 0 | 4 | 0 |
| BOX_SET | 5 | 0 | 2 | 2 | 1 |
| MINI_TIN | 4 | 0 | 4 | 0 | 0 |
| TRAINER_KIT | 2 | 1 | 0 | 1 | 0 |
| DUOPACK | 2 | 1 | 1 | 0 | 0 |
| TIN | 1 | 0 | 1 | 0 | 0 |

## 3. Séries non résolues (à compléter dans `KNOWN_EPISODE_OVERRIDES`)

| DB `slug` (FR) | DB `nameEn` | Candidats suggérés (CM) |
|---|---|---|
| `promos-mega-evolution` | MEP Black Star Promos | `black-bolt` (Black Bolt) · `black-white` (Black & White) |

**Action** : ajouter une entrée dans `SERIE_SLUG_FR_TO_CM_EPISODE_SLUG` ou laisser unmatched si aucun équivalent CM n'existe.

## 4. Items sans candidat (`no-candidates`)

Soit le type n'a pas d'équivalent CM pour cette série, soit les règles `TYPE_RULES` ratent le pattern. À inspecter un par un.

| DB item | DB série | Type | CM episode | Produits CM de la série |
|---|---|---|---|---|
| Couronne Stellaire — UPC | Couronne Stellaire | UPC | `stellar-crown` (Stellar Crown) | Stellar Crown Elite Trainer Box · Stellar Crown Pokémon Center Elite Trainer Box · Stellar Crown 10 Elite Trainer Box Case · Stellar Crown Booster · Stellar Crown Sleeved Booster |
| Équilibre Parfait — Trainer Kit | Équilibre Parfait | TRAINER_KIT | `perfect-order` (Perfect Order) | Perfect Order 10 Elite Trainer Box Case · Perfect Order Pokémon Center Elite Trainer Box · Perfect Order Elite Trainer Box · Perfect Order: Chikorita 3-Pack Blister · Perfect Order: Makuhita 1-Pack Blister |
| Évolutions Prismatiques — UPC | Évolutions Prismatiques | UPC | `prismatic-evolutions` (Prismatic Evolutions) | Prismatic Evolutions Elite Trainer Box · Prismatic Evolutions 10 Elite Trainer Box Case · Prismatic Evolutions Booster · Prismatic Evolutions Booster Bundle · Prismatic Evolutions Booster Bundle Display |
| Fable Nébuleuse — Coffret Collection | Fable Nébuleuse | BOX_SET | `shrouded-fable` (Shrouded Fable) | Shrouded Fable Elite Trainer Box · Shrouded Fable Pokémon Center Elite Trainer Box · Shrouded Fable 10 Elite Trainer Box Case · Shrouded Fable Booster · Shrouded Fable Booster Bundle Version 1 |
| Fable Nébuleuse — Bundle | Fable Nébuleuse | BUNDLE | `shrouded-fable` (Shrouded Fable) | Shrouded Fable Elite Trainer Box · Shrouded Fable Pokémon Center Elite Trainer Box · Shrouded Fable 10 Elite Trainer Box Case · Shrouded Fable Booster · Shrouded Fable Booster Bundle Version 1 |
| Flammes Fantasmagoriques — Ultra Premium Collection | Flammes Fantasmagoriques | UPC | `phantasmal-flames` (Phantasmal Flames) | Phantasmal Flames 10 Elite Trainer Box Case · Phantasmal Flames Pokémon Center Elite Trainer Box · Phantasmal Flames Elite Trainer Box · Phantasmal Flames Booster · Phantasmal Flames Sleeved Booster |
| Foudre Noire — Tripack | Foudre Noire | TRIPACK | `black-bolt` (Black Bolt) | Black Bolt: Reuniclus Tech Sticker Collection · Black Bolt Binder Collection · Black Bolt Booster · Black Bolt Booster Bundle · Black Bolt Booster Bundle Display |
| Héros Transcendants — Tripack | Héros Transcendants | TRIPACK | `ascended-heroes` (Ascended Heroes) | Ascended Heroes 10 Elite Trainer Box Case · Ascended Heroes Elite Trainer Box · Ascended Heroes Pokémon Center Elite Trainer Box · Ascended Heroes: Larry's Komala 2-Pack Blister · Ascended Heroes: Tech Sticker Collection Display |
| Rivalités Destinées — Ultra Premium Collection | Rivalités Destinées | UPC | `destined-rivals` (Destined Rivals) | Destined Rivals Elite Trainer Box · Destined Rivals 10 Elite Trainer Box Case · Destined Rivals Pokémon Center Elite Trainer Box · Destined Rivals Booster · Destined Rivals Booster (6 Cards) |
| Rivalités Destinées — Coffret Collection | Rivalités Destinées | BOX_SET | `destined-rivals` (Destined Rivals) | Destined Rivals Elite Trainer Box · Destined Rivals 10 Elite Trainer Box Case · Destined Rivals Pokémon Center Elite Trainer Box · Destined Rivals Booster · Destined Rivals Booster (6 Cards) |

## 5. Items avec candidats multiples (`multiple` — à départager)

| DB item | DB série | Type | Candidats CM |
|---|---|---|---|
| Aventures Ensemble — Display | Aventures Ensemble | BOOSTER_BOX | #805579 Journey Together Booster Box ║ #805580 Journey Together Enhanced Booster Display Box ║ #805580 Journey Together Enhanced Booster Box |
| Aventures Ensemble — Tripack | Aventures Ensemble | TRIPACK | #805585 Journey Together: Yanmega 3-Pack Blister ║ #277047 Journey Together: Scrafty 3-Pack Blister |
| Célébrations — Coffret Collection | Célébrations | BOX_SET | #570906 Celebrations Premium Figure Collection: Pikachu VMAX ║ #274841 Celebrations Special Collection: Pikachu V-UNION |
| Destinées de Paldea — Tin | Destinées de Paldea | TIN | #274789 Paldean Fates: Tera Charizard ex Tin ║ #750587 Paldean Fates: Great Tusk ex Tin ║ #750590 Paldean Fates: Iron Treads ex Tin |
| Écarlate et Violet — ETB | Écarlate et Violet | ETB | #279859 Scarlet & Violet Koraidon Elite Trainer Box ║ #692102 Scarlet & Violet Miraidon Elite Trainer Box |
| Étincelles Déferlantes — Tripack | Étincelles Déferlantes | TRIPACK | #784957 Surging Sparks: Quagsire 3-Pack Blister ║ #784958 Surging Sparks: Zapdos 3-Pack Blister |
| Évolution Céleste — ETB | Évolution Céleste | ETB | #568795 Evolving Skies Elite Trainer Box [SEGV] ║ #568794 Evolving Skies Elite Trainer Box [LUJF] |
| Évolutions Prismatiques — Mini Tin | Évolutions Prismatiques | MINI_TIN | #798935 Prismatic Evolutions: Vaporeon Mini Tin ║ #798936 Prismatic Evolutions: Jolteon Mini Tin ║ #798938 Prismatic Evolutions: Flareon Mini Tin ║ #798939 Prismatic Evolutions: Espeon Mini Tin ║ #798940 Prismatic Evolutions: Umbreon Mini Tin ║ #798941 Prismatic Evolutions: Leafeon Mini Tin ║ #798942 Prismatic Evolutions: Glaceon Mini Tin ║ #798943 Prismatic Evolutions: Sylveon Mini Tin |
| Faille Paradoxe — ETB | Faille Paradoxe | ETB | #728727 Paradox Rift Roaring Moon Elite Trainer Box ║ #728730 Paradox Rift Iron Valiant Elite Trainer Box |
| Flammes Fantasmagoriques — Tripack | Flammes Fantasmagoriques | TRIPACK | #846739 Phantasmal Flames: Sneasel 3-Pack Blister ║ #846740 Phantasmal Flames: Weavile 3-Pack Blister |
| Forces Temporelles — ETB | Forces Temporelles | ETB | #750410 Temporal Forces Iron Leaves Elite Trainer Box ║ #750412 Temporal Forces Walking Wake Elite Trainer Box |
| Héros Transcendants — Coffret Collection | Héros Transcendants | BOX_SET | #860565 Ascended Heroes: Charmander Tech Sticker Collection ║ #860566 Ascended Heroes: Gastly Tech Sticker Collection |
| Héros Transcendants — Mini Tin | Héros Transcendants | MINI_TIN | #860568 Ascended Heroes: Pikachu Mini Tin ║ #860569 Ascended Heroes: Riolu Mini Tin ║ #860570 Ascended Heroes: Clefairy Mini Tin ║ #860571 Ascended Heroes: Zorua Mini Tin ║ #860572 Ascended Heroes: Togepi Mini Tin |
| Héros Transcendants — Duopack | Héros Transcendants | DUOPACK | #860563 Ascended Heroes: Larry's Komala 2-Pack Blister ║ #864105 Ascended Heroes: Erika's Tangela 2-Pack Blister |
| Méga-Évolution — Coffret Dresseur d'Élite | Méga-Évolution | ETB | #834830 Mega Evolution: Mega Lucario Elite Trainer Box ║ #834831 Mega Evolution: Mega Gardevoir Elite Trainer Box |
| Méga-Évolution — Tripack | Méga-Évolution | TRIPACK | #834819 Mega Evolution: Psyduck 3-Pack Blister ║ #834820 Mega Evolution: Golduck 3-Pack Blister |
| Méga-Évolution — Mini Tin | Méga-Évolution | MINI_TIN | #834804 Mega Evolution: Mega Venusaur Mini Tin ║ #834805 Mega Evolution: Mega Kangaskhan Mini Tin ║ #834806 Mega Evolution: Mega Gardevoir Mini Tin ║ #834807 Mega Evolution: Mega Latios Mini Tin ║ #834808 Mega Evolution: Mega Lucario Mini Tin ║ #834804 Mega Heroes: Mega Venusaur Mini Tin ║ #834805 Mega Heroes: Mega Kangaskhan Mini Tin ║ #834806 Mega Heroes: Mega Gardevoir Mini Tin ║ #760627 Mega Heroes: Mega Latios Mini Tin ║ #834808 Mega Heroes: Mega Lucario Mini Tin ║ #878506 Lumiose City: Salamence Mini Tin ║ #878507 Lumiose City: Meganium Mini Tin ║ #878508 Lumiose City: Emboar Mini Tin ║ #878509 Lumiose City: Feraligatr Mini Tin ║ #878510 Lumiose City: Gallade Mini Tin |
| Origine Perdue — Tripack | Origine Perdue | TRIPACK | #666154 Lost Origin: Weavile 3-Pack Blister ║ #666155 Lost Origin: Regigigas 3-Pack Blister |
| Pokémon 151 — Mini Tin | Pokémon 151 | MINI_TIN | #719701 151: Arcanine Mini Tin ║ #719702 151: Dragonite Mini Tin ║ #719703 151: Electabuzz Mini Tin ║ #719704 151: Gengar Mini Tin ║ #719705 151: Kadabra Mini Tin ║ #719706 151: Machamp Mini Tin ║ #412284 151: Magneton Mini Tin ║ #719708 151: Meowth Mini Tin ║ #719709 151: Scyther Mini Tin ║ #719710 151: Slowpoke Mini Tin |
| Rivalités Destinées — Tripack | Rivalités Destinées | TRIPACK | #818579 Destined Rivals: Kangaskhan 3-Pack Blister ║ #818580 Destined Rivals: Zebstrika 3-Pack Blister |

**Action** : affiner `TYPE_RULES` ou laisser le dashboard admin (Phase 3) trancher chaque cas.

## 6. Matches auto-high — échantillon

| DB item | Type | CM product | `cardmarket_id` |
|---|---|---|---|
| Astres Radieux — ETB | ETB | Astral Radiance Elite Trainer Box | 611359 |
| Aventures Ensemble — Coffret Dresseur d'Élite | ETB | Journey Together Elite Trainer Box | 805593 |
| Aventures Ensemble — Booster | BOOSTER | Journey Together Booster | 311862 |
| Couronne Stellaire — ETB | ETB | Stellar Crown Elite Trainer Box | 776336 |
| Célébrations — ETB | ETB | Celebrations Elite Trainer Box | 570895 |
| Destinées Radieuses — ETB | ETB | Shining Fates Elite Trainer Box | 526120 |
| Destinées de Paldea — Bundle | BUNDLE | Paldean Fates Booster Bundle | 745565 |
| Destinées de Paldea — ETB | ETB | Paldean Fates Elite Trainer Box | 745548 |
| Dragon — Booster | BOOSTER | EX Dragon Booster | — |
| Fable Nébuleuse — Coffret Dresseur d'Élite | ETB | Shrouded Fable Elite Trainer Box | 770958 |
| Faille Paradoxe — Booster | BOOSTER | Paradox Rift Booster | 728716 |
| Faille Paradoxe — Trainer Kit | TRAINER_KIT | Paradox Rift Build & Battle Kit | 728724 |
| Flamme Blanche — ETB | ETB | White Flare Elite Trainer Box | 824089 |
| Flammes Fantasmagoriques — Bundle | BUNDLE | Phantasmal Flames Booster Bundle | 846734 |
| Flammes Fantasmagoriques — Display | BOOSTER_BOX | Phantasmal Flames Booster Box | 846746 |

---

## 7. Prochaines étapes

1. Séries non résolues (§3) : override dans `SERIE_SLUG_FR_TO_CM_EPISODE_SLUG` + relance.
2. Items `no-candidates` (§4) : ajuster `TYPE_RULES` ou marquer OTHER en DB.
3. Items `multiple` (§5) : acceptable — Phase 2 les écrit en `auto_low`, Phase 3 dashboard tranche.
4. Une fois ce rapport validé : lancer `scripts/match-cardmarket-items.ts` pour écrire en DB.
