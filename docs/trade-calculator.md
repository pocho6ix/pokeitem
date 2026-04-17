# Trade calculator

The Échanges section used to rely on a `TradeMatch` table refreshed by a
cron job. That design created stale, empty or flat-out wrong matches,
and the 10-minute recompute cooldown made the UX fragile. It's gone.

The replacement is **a per-profile calculator computed on the fly**.

## Mental model

Two users: **Me** (the authenticated caller) and **Them** (the profile I'm
viewing at `/u/:slug`). Three independent questions:

| Tab | Definition                                              |
| --- | ------------------------------------------------------- |
| 🛒 Acheter  | `Me.wishlist ∩ (Them.cards ∪ Them.doubles)`       |
| 💰 Vendre   | `Them.wishlist ∩ (Me.cards ∪ Me.doubles)`         |
| 🔄 Échange  | Both sides above, with a €-complement and balance |

A card present in both collection and doubles is flagged `"doubles"` — that's
the exemplar we'd actually trade. Cards with `priceFr` / `price` == 0 appear
in the lists but are excluded from the complement, so a missing price can't
poison the balance.

## Endpoints

### `GET /api/users/search?q=<text>&limit=<n>`

Searches active `ClasseurShare` owners by display name (case-insensitive).
Caller excluded. Rate-limited to 30 req/min per user.

### `GET /api/users/:slug/trade-calculator`

Returns the three sections and a `hiddenSections` array documenting what the
owner has hidden (`cards` / `doubles` / `wishlist`). Four Prisma reads + one
batched price lookup. O(n) Set intersections in memory. Comfortable well
under 500 ms at 2k-card collections.

### `GET /api/u/:slug`

Lightweight profile (identity + visibility flags + summary stats). No match
data, no embedded cards/doubles/wishlist arrays — those moved to the
calculator endpoint.

## Visibility enforcement

`ClasseurShare` flags are honoured by the calculator:

- `shareCards = false`   → `canBuy` cannot draw from their cards
- `shareDoubles = false` → `canBuy` cannot draw from their doubles
- `shareWishlist = false` → `canSell` is empty (we don't know what they want)

The owner always sees an empty calculator for themselves (`isSelf: true`); no
round trip is made for that case.

## Where the code lives

```
src/app/api/users/search/route.ts                       ← search
src/app/api/users/[slug]/trade-calculator/route.ts      ← calculator
src/app/api/u/[slug]/route.ts                           ← lightweight profile
src/lib/pricing/getCardValueCents.ts                    ← batched price helper (unchanged)

src/app/(main)/echanges/                                ← search-driven landing
src/app/(main)/u/[slug]/                                ← public profile page
src/components/trade/TradeCalculator.tsx                ← 3-tab component
src/components/trade/ContactBlock.tsx                   ← Discord / email / Twitter
```

No cron, no job, no cache, no `TradeMatch` table. Every lookup is live.
