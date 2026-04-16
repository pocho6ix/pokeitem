# Trade Matching — Architecture Notes (Phase 2)

> Status: **implemented** — DB schema, API, and UI all live.

## Goal

Suggest trade partners: user A has doubles that user B wants (in their wishlist), and vice versa. Each match is scored by balance — how close the two sides are in value.

## Data Model

### ClasseurShare (`classeur_shares`)

Controls which parts of a user's classeur are publicly visible.

| Field             | Type    | Default     | Notes                                        |
|-------------------|---------|-------------|----------------------------------------------|
| `userId`          | String  | —           | Unique FK → User                             |
| `slug`            | String  | —           | Unique URL slug (e.g. `trainer-ab3c`)        |
| `isActive`        | Boolean | `false`     | Must be true to be visible                   |
| `visibility`      | String  | `"link"`    | `"private"` / `"link"` / `"public"`         |
| `shareCards`      | Boolean | `true`      | Share owned cards                            |
| `shareDoubles`    | Boolean | `true`      | Share doubles list                           |
| `shareItems`      | Boolean | `false`     | Share sealed item portfolio                  |
| `shareWishlist`   | Boolean | `true`      | Share wishlist                               |
| `contactDiscord`  | String? | null        | Discord handle for trade contact             |
| `contactEmail`    | String? | null        | Email (shown publicly if set)                |
| `contactTwitter`  | String? | null        | Twitter/X handle                             |

### TradeMatch (`trade_matches`)

Pre-computed trade suggestions between two users.

| Field            | Type      | Notes                                         |
|------------------|-----------|-----------------------------------------------|
| `userAId`        | String    | FK → User (always the "initiator" direction)  |
| `userBId`        | String    | FK → User                                     |
| `aGivesCardIds`  | String[]  | Cards from A's doubles that B wants           |
| `bGivesCardIds`  | String[]  | Cards from B's doubles that A wants           |
| `aValueCents`    | Int       | Total value of A's side (in euro cents)       |
| `bValueCents`    | Int       | Total value of B's side (in euro cents)       |
| `balanceScore`   | Float     | 0–1, higher = more balanced trade             |
| `computedAt`     | DateTime  | When this match was last computed             |

Unique: `(userAId, userBId)` — stored in the order of computation (visitor = A).

## Matching Algorithm

```
A_offers = intersection(A.doubles.cardIds, B.wishlist.cardIds)
B_offers = intersection(B.doubles.cardIds, A.wishlist.cardIds)

If A_offers is empty OR B_offers is empty → not viable

aValueCents = sum of priceFr ?? price ?? 0 (in cents) for cards in A_offers
bValueCents = sum of priceFr ?? price ?? 0 (in cents) for cards in B_offers

balanceScore = min(aValue, bValue) / max(aValue, bValue)

isViable = balanceScore >= 0.7 AND min(aValue, bValue) >= 200 (2€)
```

Implemented in: `src/lib/matching/computeTradeMatch.ts`

## Cache Strategy

- Results cached in `trade_matches` table
- TTL: 24 hours (stale results served from cache)
- Recompute rate limit: 10 minutes per user
- Cache lookup: checks BOTH `(visitorId=A, ownerId=B)` AND `(visitorId=B, ownerId=A)` to handle both directions

Implemented in: `src/lib/matching/getOrComputeMatch.ts`

## Recomputation

`POST /api/trade-matches/recompute`:
- Rate limited: 1 recompute per 10 minutes per user
- Iterates all active public profiles (where `isActive=true`)
- Computes and upserts match for each
- Returns `{ matchesFound, totalChecked, nextRecomputeAt }`

## API Surface

| Method | Route                           | Description                          |
|--------|---------------------------------|--------------------------------------|
| `GET`  | `/api/share/settings`           | Get current user's share settings    |
| `PUT`  | `/api/share/settings`           | Update share settings                |
| `GET`  | `/api/u/[slug]`                 | Public classeur view by slug         |
| `GET`  | `/api/trade-matches`            | List viable matches for current user |
| `POST` | `/api/trade-matches/recompute`  | Trigger match recomputation          |

## UI Pages

| Route                  | Description                                    |
|------------------------|------------------------------------------------|
| `/settings/sharing`    | Share settings (toggle, slug, contact fields)  |
| `/u/[slug]`            | Public profile page with match block           |
| `/echanges`            | Match list with recompute button               |
