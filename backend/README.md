# PokeItem API — Express backend

REST API that powers the PokeItem iOS/Android apps (Capacitor) and, during the
transition, the existing Next.js PWA. Every route from the PWA's
`src/app/api/**/route.ts` that is needed on mobile has been migrated here.

Status per route: see [`MIGRATION_CHECKLIST.md`](./MIGRATION_CHECKLIST.md)
(✅ migrated · 🔧 stub, logic to port · ❌ not yet created).

## Architecture

```
backend/
├── prisma/
│   └── schema.prisma        ← synced from ../prisma/schema.prisma
├── src/
│   ├── server.ts            ← Express bootstrap (CORS, middleware, routes)
│   ├── lib/
│   │   └── prisma.ts        ← PrismaClient singleton
│   ├── middleware/
│   │   └── auth.ts          ← Bearer + NextAuth cookie → req.userId
│   └── routes/
│       ├── auth.ts          ← /api/auth/*
│       ├── cards.ts         ← /api/cards/*
│       ├── portfolio.ts     ← /api/portfolio/*
│       ├── items.ts         ← /api/items/*
│       ├── scanner.ts       ← /api/scanner/*
│       ├── subscription.ts  ← /api/subscription/*
│       ├── user.ts          ← /api/user/*
│       ├── profil.ts        ← /api/profil/*
│       ├── quests.ts        ← /api/quests/*
│       ├── referral.ts      ← /api/referral/*
│       ├── wishlist.ts      ← /api/wishlist/*
│       ├── share.ts         ← /api/share/*
│       ├── blog.ts          ← /api/blog
│       ├── leaderboard.ts   ← /api/leaderboard
│       ├── market.ts        ← /api/market
│       ├── feedback.ts      ← /api/feedback
│       └── webhooks.ts      ← /api/webhooks/* (raw body!)
├── Dockerfile
├── tsconfig.json
├── package.json
└── .env.example
```

## Auth model

Two token formats are accepted in parallel (see `src/middleware/auth.ts`):

1. **Bearer token** — `Authorization: Bearer <jwt>`, 90-day TTL, minted by
   `POST /api/auth/login`. Primary flow for Capacitor apps.
2. **NextAuth cookie** — `next-auth.session-token`, validated with the same
   `NEXTAUTH_SECRET`. Kept during the transition so the PWA still talks to
   this API without a re-login.

`authMiddleware` runs on every request and only populates `req.userId`;
use `requireAuth` per-route to return 401 when the user must be logged in.

## Running locally

```bash
cd backend
cp .env.example .env                  # fill in DATABASE_URL, secrets, etc.
npm install
npm run db:generate                   # prisma generate
npm run dev                           # tsx watch src/server.ts → :3001
curl http://localhost:3001/api/health # { status: "ok", ... }
```

Node ≥ 22 is required (the main PWA uses the same version).

## Building / deploying

```bash
npm run build        # prisma generate + tsc → dist/
npm start            # node dist/server.js

# Or with Docker:
docker build -t pokeitem-api .
docker run -p 3001:3001 --env-file .env pokeitem-api
```

`npm run db:migrate` runs `prisma migrate deploy` against the production DB —
call it once from CI before rolling out a new image.

## Adding a route

1. Check the checklist: is the PWA route already listed? If yes, open the
   matching `src/routes/*.ts` and replace the stub. If not, add it to the
   checklist too.
2. Source the real logic from `../src/app/api/<path>/route.ts` and adapt:
   - `NextResponse.json(…)` → `res.json(…)`
   - `getServerSession(authOptions)` → `req.userId` (via `requireAuth`)
   - `request.formData()` → `multer` (see `profil.ts` for the avatar
     upload pattern)
3. Flip the row from 🔧 to ✅ in `MIGRATION_CHECKLIST.md`.

## Schema sync

`backend/prisma/schema.prisma` is a **copy** of the root schema. When the
PWA team changes models, copy the file over:

```bash
cp ../prisma/schema.prisma prisma/schema.prisma
npm run db:generate
```

A small `scripts/sync-schema.sh` helper can automate that — TODO.
