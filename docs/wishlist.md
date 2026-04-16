# Wishlist Architecture

## Overview

The "Liste de souhaits" feature lets authenticated users bookmark Pokémon TCG cards they want to acquire. It is card-only (not sealed items) and lives under `/portfolio/souhaits`.

## Data Model

`CardWishlistItem` (table `card_wishlist_items`):

| Field      | Type      | Notes                                          |
|------------|-----------|------------------------------------------------|
| `id`       | cuid      | PK                                             |
| `userId`   | String    | FK → User (cascade delete)                    |
| `cardId`   | String    | FK → Card                                      |
| `setId`    | String    | Denormalized `card.serieId` — fast group-by    |
| `priority` | Int       | 1 = normal (reserved for future UX)            |
| `maxPrice` | Float?    | Optional price ceiling for future alerts       |
| `note`     | String?   | Free-text note                                 |
| `addedAt`  | DateTime  | Default now(), indexed DESC                    |

Unique constraint: `(userId, cardId)` — one entry per card per user.

## Client Store

`src/stores/wishlistStore.ts` — Zustand singleton, no provider needed.

- `ids: Set<string>` — in-memory set of wishlisted cardIds
- `hydrated: boolean` — prevents double-fetch
- `hydrate()` — fetches `/api/wishlist/cards/ids` once on authenticated session
- `add(cardId)` / `remove(cardId)` — optimistic mutations
- `useIsInWishlist(cardId)` — selector hook used by `WishlistHeartButton`

Hydration is triggered by `WishlistHydrator` (mounted in `Providers.tsx`) as soon as `useSession()` status becomes `"authenticated"`.

## API Routes

| Method   | Route                                          | Description                                  |
|----------|------------------------------------------------|----------------------------------------------|
| `GET`    | `/api/wishlist/cards`                          | Full items with card data (for wishlist page) |
| `POST`   | `/api/wishlist/cards`                          | Add card — body `{ cardId }`, idempotent      |
| `GET`    | `/api/wishlist/cards/ids`                      | Lightweight `{ ids: string[] }` for hydration |
| `DELETE` | `/api/wishlist/cards/[cardId]`                 | Remove card — idempotent (200 if not found)   |
| `POST`   | `/api/wishlist/cards/mark-acquired/[cardId]`   | Atomic: remove from wishlist + upsert UserCard|

All routes require auth (`getServerSession(authOptions)`). The `ids` GET returns an empty array for unauthenticated users (no 401) to avoid errors before session loads.

## UI Components

### WishlistHeartButton (`src/components/wishlist/WishlistHeartButton.tsx`)

- Reads `useIsInWishlist(cardId)` from store
- Optimistic toggle: updates store immediately, fires API in background, rolls back on failure
- Toast with "Annuler" action button for both add and remove
- `size` prop: `sm` (20px) / `md` (28px) / `lg` (36px)
- Redirects to `/connexion` if unauthenticated
- Calls `navigator.vibrate?.(10)` for haptic feedback

Integrated into `CardCollectionGrid` — replaces the former detail (ⓘ) button at top-left of each card vignette. Detail modal remains accessible via the sticky bottom bar.

### Wishlist Page (`/portfolio/souhaits`)

Server Component (`page.tsx`) fetches all wishlist items server-side and passes them to `WishlistPageClient`. Redirects to `/connexion` if unauthenticated.

Client features:
- Stats header: count / estimated value / number of extensions
- Tab: "Toutes" | "Par série" (default)
- Grid size toggle: Petit / Moyen / Grand
- Search by card name, number, or serie name
- Sort modal: date (recent/old), name A-Z, price desc/asc, rarity
- Rarity filter chips
- "Par série" mode: collapsible sections per serie
- Empty state with watermark heart and CTA

## Toast Action Buttons

`Toast.tsx` was extended to support an `action?: { label: string; onClick: () => void }` option. Pass it as the third argument to `toast()`:

```ts
toast("Message", "success", {
  action: { label: "Annuler", onClick: () => { /* rollback */ } },
});
```
