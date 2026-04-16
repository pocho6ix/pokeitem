# Sharing Architecture — Phase 2

## Overview

Phase 2 adds classeur sharing and trade matchmaking. Users can make their collection public
via a unique slug URL, and the system automatically detects trade opportunities between users.

## Architecture

```
User enables sharing
        │
        ▼
PUT /api/share/settings
  - Validates contact info
  - Generates unique slug (if first activation)
  - Upserts ClasseurShare record
        │
        ▼
Profile live at /u/{slug}
  GET /api/u/[slug] or SSR page.tsx
  - Loads cards/doubles/wishlist based on visibility flags
  - If visitor is authenticated: triggers match computation
        │
        ▼
Match stored in trade_matches table
```

## Slug Generation

File: `src/lib/sharing/generateSlug.ts`

- Slugifies user's display name (strips accents, non-alphanumeric, lowercases)
- Appends 4 random chars to ensure uniqueness
- Max 10 attempts, then falls back to `dresseur-{8 random chars}`
- Slug is NEVER overwritten once set

## Match Computation Flow

```
Visitor opens /u/{slug}
        │
        ▼
getOrComputeMatch(visitorId, ownerId)
        │
        ├── Cache hit (< 24h old)? → return cached, normalized to visitor's perspective
        │
        └── Cache miss → computeTradeMatch(visitor, owner)
                │
                ├── Load visitor doubles + wishlist
                ├── Load owner doubles + wishlist
                ├── Compute intersection both ways
                ├── Fetch prices (batch, priceFr preferred)
                ├── Compute balanceScore
                ├── Upsert trade_matches (even if not viable)
                └── Return match (null if not viable)
```

## Cache Strategy

- Cache TTL: 24 hours
- Always cached (even non-viable matches) to avoid repeated DB hits
- Query checks BOTH `(A=visitor, B=owner)` and `(A=owner, B=visitor)` directions
- Recompute rate limit: 10 min per user (enforced via `computedAt` on TradeMatch)

## Share Settings Page

File: `src/app/(main)/settings/sharing/SharingSettingsClient.tsx`

- Toggle: activate/deactivate public profile
- Slug displayed when active with copy + share buttons
- 4 visibility toggles: cards, doubles (recommended), wishlist (recommended), items
- Contact fields: Discord, Email (with RGPD warning), Twitter
- Validation: at least one contact required when active, email format checked
- Save = PUT /api/share/settings

## Public Profile Page

File: `src/app/(main)/u/[slug]/`

- SSR: fetches all data server-side including match computation
- Shows: avatar, name, member since, stats chips
- Match block (if viable): gold gradient, give/receive counts + values, balance bar, contact button, detail modal
- Unauthenticated CTA: gold banner to connect
- Tabs: Cartes / Doubles / Souhaits (only visible sections shown)
- Read-only card grid with visitor's wishlist cards marked with a purple heart overlay

## Share Helper

File: `src/lib/share/shareProfile.ts`

Priority order:
1. `@capacitor/share` (if native app, dynamic import)
2. `navigator.share` (Web Share API)
3. `navigator.clipboard.writeText` + `onCopied()` callback
