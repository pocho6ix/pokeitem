# Audit UI — page "Détail d'une extension" (ex. Équilibre Parfait)

> Étape 2 du brief **fix/ui-extension-detail-page** — audit avant toute modification de code.
> Généré le 2026-04-25.

---

## 1. Localisation des composants

Le même composant sert la page **web** (Vercel) et **iOS** (Capacitor static export), via les deux routes suivantes :

| Plateforme | Fichier route | Contenu |
|---|---|---|
| Web SSR | [`src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/page.tsx`](../src/app/(main)/collection/produits/%5BblocSlug%5D/%5BserieSlug%5D/page.tsx) | Server component, lit Prisma + static SERIES, rend `<SerieItemsGrid …/>` |
| iOS static | [`capacitor-overrides/src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/page.tsx`](../capacitor-overrides/src/app/(main)/collection/produits/%5BblocSlug%5D/%5BserieSlug%5D/page.tsx) | Wrapper qui rend `<SerieProduitsClient />` |
| Client (iOS) | [`src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/SerieProduitsClient.tsx`](../src/app/(main)/collection/produits/%5BblocSlug%5D/%5BserieSlug%5D/SerieProduitsClient.tsx) | `"use client"` — fetch `/api/items?serieSlug=…` + rend `<SerieItemsGrid …/>` |

**→ Tout le rendu des cards produit passe par un seul fichier partagé : [`src/components/collection/SerieItemsGrid.tsx`](../src/components/collection/SerieItemsGrid.tsx).**
Corriger ce composant fixe la page sur les deux plateformes en un seul diff.

### Composants enfants touchés

| Fichier | Rôle |
|---|---|
| [`src/components/shared/ItemImage.tsx`](../src/components/shared/ItemImage.tsx) | Wrapper image item (source du Bug #3, voir §2.3) |
| [`src/components/ui/Card.tsx`](../src/components/ui/Card.tsx) | Card de base — `rounded-xl border bg-[var(--bg-card)] shadow-…` |
| [`src/lib/items-catalog.ts`](../src/lib/items-catalog.ts) | `typeToBadgeLabel` — mappe ItemType → libellé court affiché dans le badge |
| [`src/app/globals.css`](../src/app/globals.css) | Classe `.btn-gold` (dégradé doré du bouton Portfolio) |

---

## 2. Cause racine — bug par bug

### Bug #1 — "+ Portfolio" chevauche le prix
### Bug #2 — Texte "+ Portfolio" tronqué ("Portfoli")

Ces deux bugs ont **la même cause** : ils sont les deux symptômes d'un même layout trop contraint.

**Fichier** : [`SerieItemsGrid.tsx:169–180`](../src/components/collection/SerieItemsGrid.tsx)

```tsx
<div className="mt-2 flex items-center justify-between">
  <span className="font-data text-sm font-bold text-[var(--text-primary)]">
    {formatPrice(displayPrice)}
  </span>
  <button
    type="button"
    onClick={() => handleAddToPortfolio(itemType)}
    className="inline-flex items-center gap-1 rounded-lg btn-gold px-2.5 py-1 text-[11px] font-semibold text-black"
  >
    + Portfolio
  </button>
</div>
```

Mécanique :
- Les deux enfants sont sur la **même ligne flex** avec `justify-between`, aucun `gap` entre eux, aucune contrainte de largeur.
- Le bouton "+ Portfolio" a une largeur intrinsèque ≈ 88 px (padding `px-2.5` + texte "+ Portfolio" à `text-[11px] font-semibold`). Le prix "259,99 €" fait ≈ 65 px en `text-sm font-bold`.
- Dans une grille `grid-cols-3` sur iOS (iPhone 12 mini = 360 px) avec `gap-3` et padding page `px-4` : largeur effective par card ≈ 100 px. Contenu utile après `p-3` ≈ 76 px. Insuffisant pour 88 + 65 + gap.
- Le parent `<Card>` a `overflow-hidden` → le bouton "+ Portfolio" qui dépasse se **fait tronquer**, d'où "Portfoli" (Bug #2).
- Quand il ne déborde pas assez pour être clipé mais n'a plus de place pour rester à droite via `justify-between`, il se rapproche jusqu'à **se superposer visuellement** au prix (Bug #1).

**Les deux bugs se résolvent en :**
- (a) Passant prix et action(s) sur deux lignes distinctes (design cible du brief), **OU**
- (b) Réduisant le bouton (icône seule `+` avec `aria-label`), **OU**
- (c) Les deux.

Reco : **(a)** — cohérent avec le layout demandé dans le brief (hiérarchie aérée, actions empilées en grid mobile).

### Bug #3 — Fond blanc derrière les images

**Fichier** : [`src/components/shared/ItemImage.tsx:41`](../src/components/shared/ItemImage.tsx)

```tsx
<div
  className={`bg-white flex items-center justify-center overflow-hidden ${className}`}
>
```

`bg-white` est **hard-codé** sur le wrapper externe du composant partagé, ce qui force un rectangle blanc derrière toutes les images — boosters, ETB, displays, tripacks, la fiche détail d'item (on le voit déjà sur la capture que tu m'avais envoyée plus tôt). Donc ce bug n'est **pas seulement** sur la grille série, il contamine **tous les endroits** où `ItemImage` est rendu :
- Grille série (Bug #3 du brief)
- Grille portfolio items
- Détail portfolio item (`ItemDetailForm`)
- Détail item publique (fiche `[itemSlug]/page.tsx`)

Le brief dit "ce bug avait été corrigé sur la page précédente". Ce n'est pas tout à fait exact : les commits récents (`items: swap product artwork from JPG to transparent PNG`, `items: fix broken rembg cutouts`, `items: revert to original JPGs`) concernent les **assets sur disque** (PNG transparent vs JPG) mais ne touchent pas le wrapper `ItemImage`. Avec un PNG transparent, le `bg-white` du wrapper reste visible derrière les zones transparentes de l'image → fond blanc.

**Fix** : supprimer `bg-white` du wrapper et laisser la card transparaître. Zéro effet de bord sur les JPG (le JPG occupe tout le conteneur sans alpha) ni sur les PNG (cas idéal).

### Bug #4 — Badges de type positionnés différemment selon le type

**Fichier** : [`SerieItemsGrid.tsx:151–162`](../src/components/collection/SerieItemsGrid.tsx)

```tsx
<div className="relative">
  <ItemImage
    …
    className="aspect-square w-full rounded-t-xl …"
  />
  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
    {typeToBadgeLabel(itemType.type, label)}
  </span>
</div>
```

Dans le code, **tous les badges sont positionnés à `top-2 right-2`** relativement au conteneur image (carré, `aspect-square`). La position en pixel est donc identique partout.

**Mais visuellement la position semble varier.** Cause : le conteneur est carré, mais les produits ont des ratios d'image différents :
- Un **booster pack** est grand et étroit → `object-contain` centre une image étroite → le badge fixé en haut-droite du carré tombe **à côté** de l'image (visuel "haut-centre-droit").
- Un **ETB / display** est plus carré → l'image remplit mieux le conteneur → le badge tombe **sur** l'image (visuel "sur le coin haut-droit du produit").
- Certains `.png` avec fond blanc visible (Bug #3) créent des rectangles blancs dont les limites font croire que le badge est mal placé.

Donc c'est un bug **perçu**, pas un bug **code**. Le vrai fix est double :
1. Corriger Bug #3 (fond blanc) → la position du badge devient visuellement cohérente.
2. Passer le badge dans la **zone contenu** sous l'image plutôt que sur l'image — évite toute collision future, simplifie l'accessibilité (pas de texte sur fond potentiellement hétérogène).

Reco : **(2)** — déplacer le badge dans la zone contenu, en haut-droite du bloc nom+prix OU juste sous l'image en pill au-dessus du nom. Bonus : supprime la dépendance à `backdrop-blur-sm` (coûteux sur mobile bas de gamme).

### Bug #5 — Hiérarchie visuelle

**Fichier** : [`SerieItemsGrid.tsx:146–193`](../src/components/collection/SerieItemsGrid.tsx)

État actuel (simplifié) :

```
Card
├── div.relative
│   ├── ItemImage (aspect-square, bg-white ← Bug #3)
│   └── span.absolute (badge type ← Bug #4)
└── div.p-3.flex-col
    ├── h3 (nom, line-clamp-2)
    ├── div.flex.justify-between         ← collision prix ⇄ bouton (Bugs #1/#2)
    │   ├── span (prix)
    │   └── button (+ Portfolio)
    └── Link ( → Détails, web only)
```

Points de friction :
- Pas de `gap` vertical entre les éléments du bloc contenu : `mt-2` sur la rangée prix, `mt-2` sur le lien Détails → rythme uniforme, aucune hiérarchie visuelle.
- Prix (`text-sm`) et bouton (`text-[11px]`) sont tous deux petits, s'écrasent l'un contre l'autre, ne se hiérarchisent pas.
- Le lien "Détails" est en gris discret, le bouton Portfolio est proéminent en doré : l'œil est attiré par Portfolio alors qu'en UX "Voir les détails" devrait être l'action par défaut d'une card produit et "+ Portfolio" l'action secondaire (conversion).
- La logique `isWeb && dbItem?.slug` masque le lien Détails sur iOS → la card iOS n'a qu'**un seul** CTA (Portfolio), ce qui laisse un vide visuel.

Ciblage brief : image → nom → prix → actions empilées. Impacte :
- Supprimer `justify-between` sur la ligne prix/bouton (il n'y a plus de bouton sur cette ligne).
- Descendre le bouton Portfolio dans une sous-zone `actions` avec gap vertical.
- Empiler Portfolio + Détails en mobile (grid serrée), passer côte-à-côte en `min-[480px]` ou via container query.
- Sur iOS (sans Détails), afficher Portfolio en largeur 100 %.

---

## 3. Bugs / observations supplémentaires détectés

| # | Fichier | Point | Sévérité |
|---|---|---|---|
| #6 | `SerieItemsGrid.tsx:165` | Le `h3` du nom a `line-clamp-2` mais avec un label court ("Booster", "ETB", "Display"), la deuxième ligne reste vide et prend de la hauteur. Réserver `min-h` uniquement si plusieurs cards ont des noms plus longs (ex. "Coffret Collection") — sinon passer à `line-clamp-1`. | mineur |
| #7 | `SerieItemsGrid.tsx:183` | Le CTA "Détails" est masqué sur iOS (`isNative()`) — du coup la card iOS a moins d'actions que la card web. C'est voulu (la page détail item publique est web-only), mais ça aggrave le déséquilibre visuel. À mentionner dans le futur roadmap iOS (post bug fix). | info |
| #8 | `SerieItemsGrid.tsx:199` | Breakpoint `min-[360px]:grid-cols-3` → sur iPhone 12 mini (360 px) on passe à 3 colonnes et les cards font ≈ 100 px — largeur critique qui déclenche Bugs #1/#2. Envisager de relever le breakpoint à `min-[390px]` ou retomber à 2 colonnes sur <400 px. | moyen |
| #9 | `ItemImage.tsx:38` | Le wrapper applique `p-1` via la classe de l'`<Image>` (`className="h-full w-full object-contain p-1"`) — avec un fond card uniforme (après fix Bug #3), ce padding devient négligeable visuellement. À conserver, mais tester. | mineur |
| #10 | `SerieItemsGrid.tsx:106–116` | `withImage` / `withoutImage` dédoublent la grille ("Autres items (7)" en bas). Le composant `renderItemCard` est rendu 2× si on coche. OK fonctionnellement mais si on ajoute un `<img loading="lazy">` il faut vérifier qu'on ne rend pas tout d'un coup. | mineur |
| #11 | `SerieProduitsClient.tsx:100–110` | Le header iOS a une vignette série (`<Image fill>`) dont le conteneur `relative h-14 w-24` est visible dans la capture ("POR" badge dans la capture est probablement l'abbreviation série rendue via un `<Image>` ou un badge). Esthétique à revoir en même temps que les cards, sinon dissonance. | moyen |

---

## 4. Plan d'implémentation (sera validé avant de toucher au code)

Ordre suggéré par le brief (je le suis tel quel) :

1. **Bug #3** — retirer `bg-white` dans `ItemImage.tsx`. Impact global (fiche publique + portfolio + grilles), 1 ligne. **Le tester en premier** car il éclaircit visuellement tous les autres fix à venir (badges, cards).
2. **Bugs #1 & #2** — réorganiser le bloc contenu de `renderItemCard` :
   - Séparer `Nom` / `Prix` / `Actions` en 3 sous-zones avec gap vertical.
   - Zone `Actions` empile Portfolio + Détails en mobile (`flex-col`), côte-à-côte en `sm:` (web desktop).
   - `overflow-hidden` reste sur la Card (pour les coins arrondis), mais le layout ne dépasse plus.
3. **Bug #4** — déplacer le badge type dans la zone contenu (pill en haut-gauche du bloc nom+prix) pour supprimer toute collision avec l'image.
4. **Bug #5** — passe de polish :
   - Uniformiser la typo (prix `text-base font-bold`, nom `text-sm font-semibold`).
   - `line-clamp-1` sur le nom.
   - Gap vertical `gap-2` sur la zone contenu.
   - Touch target ≥ 44 × 44 sur les boutons (bump `py-2`).

Tous les fixes restent dans **un seul fichier principal** : `SerieItemsGrid.tsx`, + 1 ligne dans `ItemImage.tsx`. Pas besoin de toucher Card.tsx ni globals.css (sauf si on veut extraire les tokens dans la palette, mais ce n'est pas requis pour le fix).

### Tests visuels à valider

- [ ] Card ≤ 110 px de large : pas de chevauchement ni de troncature.
- [ ] Prix "9 999,99 €" rendu complet.
- [ ] Aucun fond blanc sur les 14 types de produits (BOOSTER, DUOPACK, TRIPACK, BOOSTER_BOX, ETB, BOX_SET, UPC, TIN, MINI_TIN, POKEBALL_TIN, BLISTER, THEME_DECK, BUNDLE, TRAINER_KIT).
- [ ] Badge type tous au même endroit sans toucher l'image.
- [ ] Responsive : 360 / 390 / 768 / 1280 px.
- [ ] Build Capacitor (`npm run build:capacitor`) n'explose pas (le composant partagé est inclus dans les deux bundles).

---

**Audit terminé. 5 bugs confirmés / 6 bugs supplémentaires détectés (dont #6 à #10 mineurs ou informatifs, #11 à traiter en même temps que la card par cohérence). Prêt à implémenter dans l'ordre suggéré ?**
