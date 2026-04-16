# Trade Matching — Architecture Notes (Phase 2)

> Status: **not implemented** — DB schema and API stubs exist. This document describes the intended algorithm for when the feature is built.

## Goal

Suggest trade partners: user A has doubles that user B wants (in their wishlist), and vice versa. Each match is scored by balance — how close the two sides are in value.

## Data Model

### ClasseurShare (`classeur_shares`)

Controls which parts of a user's classeur are publicly visible.

| Field          | Type    | Default     | Notes                              |
|----------------|---------|-------------|------------------------------------|
| `userId`       | String  | —           | Unique FK → User                   |
| `slug`         | String  | —           | Unique URL slug (e.g. `trainer42`) |
| `visibility`   | String  | `"private"` | `"private"` / `"link"` / `"public"` |
| `shareCards`   | Boolean | `true`      | Share owned cards                  |
| `shareDoubles` | Boolean | `true`      | Share doubles list                 |
| `shareItems`   | Boolean | `false`     | Share sealed item portfolio        |
| `shareWishlist`| Boolean | `true`      | Share wishlist                     |

### TradeMatch (`trade_matches`)

Pre-computed trade suggestions between two users.

| Field            | Type      | Notes                                         |
|------------------|-----------|-----------------------------------------------|
| `userAId`        | String    | FK → User                                     |
| `userBId`        | String    | FK → User                                     |
| `aGivesCardIds`  | String[]  | Cards from A's doubles that B wants           |
| `bGivesCardIds`  | String[]  | Cards from B's doubles that A wants           |
| `aValueCents`    | Int       | Total value of A's side (in euro cents)       |
| `bValueCents`    | Int       | Total value of B's side (in euro cents)       |
| `balanceScore`   | Float     | 0–1, higher = more balanced trade             |
| `computedAt`     | DateTime  | When this match was last computed             |

Unique: `(userAId, userBId)` — always stored with `userAId < userBId` alphabetically to avoid duplicates.

## Matching Algorithm (planned)

```
For each pair (A, B) where both have shareDoubles=true and shareWishlist=true:

  A_offers = intersection(A.doubles.cardIds, B.wishlist.cardIds)
  B_offers = intersection(B.doubles.cardIds, A.wishlist.cardIds)

  If A_offers is empty OR B_offers is empty → skip (no mutual interest)

  aValue = sum of getDisplayPrice(card) for cards in A_offers
  bValue = sum of getDisplayPrice(card) for cards in B_offers

  balanceScore = 1 - |aValue - bValue| / max(aValue, bValue)
  // Score of 1.0 = perfectly balanced, 0.0 = completely one-sided

  Store TradeMatch { aGivesCardIds, bGivesCardIds, aValueCents, bValueCents, balanceScore }
```

## Recomputation

`POST /api/trade-matches/recompute` (stub) — intended to be called:
- After a user updates their doubles or wishlist
- By a background cron job (e.g. nightly for all users with `visibility != "private"`)

Only users who opt-in to sharing (`visibility = "link"` or `"public"`) should be included in the matching pool.

## API Surface (Phase 2)

| Method | Route                           | Description                          |
|--------|---------------------------------|--------------------------------------|
| `GET`  | `/api/share/settings`           | Get current user's share settings    |
| `PUT`  | `/api/share/settings`           | Update share settings                |
| `GET`  | `/api/u/[slug]`                 | Public classeur view by slug         |
| `GET`  | `/api/trade-matches`            | List trade matches for current user  |
| `POST` | `/api/trade-matches/recompute`  | Trigger match recomputation          |

All are currently stubs returning `501 Not Implemented`.
