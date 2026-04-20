# PokeItem — Technical Report (iOS / Capacitor migration prep)

Stack: Next.js 16.2.1 App Router · React 19.2 · Prisma 5.22 · PostgreSQL (Neon) · NextAuth 4.24 (JWT strategy) · Tailwind 4.
Hosted on Vercel. Domain: `app.pokeitem.fr`.

---

## 1. STRUCTURE DU PROJET

### 1.1 Arborescence (2 niveaux)

```
.
./.vercel
./prisma
./.claude
./.claude/worktrees
./docs
./public
./public/types
./public/images
./public/cards
./public/rarities
./public/contest
./scripts
./scripts/ivan
./backups
./src
./src/types
./src/app
./src/config
./src/stores
./src/content
./src/components
./src/hooks
./src/scripts
./src/lib
./src/data
```

### 1.2 Fichiers `src/app/api/` (exhaustif)

```
src/app/api/admin/revalidate-cards/route.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/register/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/auth/verify/route.ts
src/app/api/avatar/[userId]/route.ts
src/app/api/beta/activate/route.ts
src/app/api/binder/cards-by-rarity/route.ts
src/app/api/blog/route.ts
src/app/api/cards/[cardId]/owned/route.ts
src/app/api/cards/[cardId]/price-history/route.ts
src/app/api/cards/collection/route.ts
src/app/api/cards/doubles/route.ts
src/app/api/cards/search/route.ts
src/app/api/feedback/route.ts
src/app/api/items/[id]/price/route.ts
src/app/api/items/[id]/route.ts
src/app/api/items/route.ts
src/app/api/items/search/route.ts
src/app/api/leaderboard/route.ts
src/app/api/market/route.ts
src/app/api/portfolio/[id]/route.ts
src/app/api/portfolio/chart/route.ts
src/app/api/portfolio/rarities/route.ts
src/app/api/portfolio/route.ts
src/app/api/portfolio/stats/route.ts
src/app/api/portfolio/valuation/route.ts
src/app/api/prices/route.ts
src/app/api/profil/avatar/route.ts
src/app/api/profil/route.ts
src/app/api/proxy-image/route.ts
src/app/api/quests/daily-login/claim/route.ts
src/app/api/quests/daily-login/status/route.ts
src/app/api/referral/apply/route.ts
src/app/api/referral/leaderboard/route.ts
src/app/api/referral/stats/route.ts
src/app/api/scanner/correction/route.ts
src/app/api/scanner/identify/route.ts
src/app/api/scanner/search/route.ts
src/app/api/scraper/route.ts
src/app/api/share/settings/route.ts
src/app/api/subscription/cancel/route.ts
src/app/api/subscription/checkout/route.ts
src/app/api/subscription/portal/route.ts
src/app/api/subscription/status/route.ts
src/app/api/u/[slug]/route.ts
src/app/api/unsubscribe/route.ts
src/app/api/user/delete/route.ts
src/app/api/user/me/route.ts
src/app/api/user/points/route.ts
src/app/api/user/quests/[questId]/complete/route.ts
src/app/api/user/share-data/route.ts
src/app/api/user/username/route.ts
src/app/api/users/[slug]/trade-calculator/route.ts
src/app/api/users/search/route.ts
src/app/api/users/suggested/route.ts
src/app/api/webhooks/brevo/route.ts
src/app/api/webhooks/revenuecat/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/api/wishlist/cards/[cardId]/route.ts
src/app/api/wishlist/cards/bulk/route.ts
src/app/api/wishlist/cards/ids/route.ts
src/app/api/wishlist/cards/mark-acquired/[cardId]/route.ts
src/app/api/wishlist/cards/route.ts
```

---

## 2. BASE DE DONNÉES

### 2.1 Hosting

**Neon PostgreSQL** (serverless Postgres) — région AWS `eu-central-1`, endpoint "pooler".

```
DATABASE_URL=postgresql://neondb_owner:****@ep-red-breeze-alit4e08-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 2.2 Variables d'environnement liées à la DB

Seule variable utilisée :

- `DATABASE_URL`

Aucune `DIRECT_URL`, `SHADOW_DATABASE_URL`, `POSTGRES_*`, ou autre `NEON_*` n'est définie. Prisma pointe directement sur le pooler Neon.

### 2.3 `prisma/schema.prisma` (contenu complet)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTHENTIFICATION ────────────────────────────────────────

enum Plan {
  FREE
  PRO
}

model User {
  id            String          @id @default(cuid())
  name          String?
  email         String          @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  plan                 Plan      @default(FREE)
  planExpiresAt        DateTime?
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  revenueCatId         String?   @unique
  scanCount            Int       @default(0)
  scanCountResetAt     DateTime  @default(now())

  username               String?   @unique
  trialEndsAt            DateTime?
  betaTrialActivatedAt   DateTime?
  deletedAt              DateTime?

  subscribedNewsletter Boolean   @default(true)
  unsubscribedAt       DateTime?

  referralCode        String    @unique @default(cuid())
  referredById        String?
  referredBy          User?     @relation("Referrals", fields: [referredById], references: [id])
  referrals           User[]    @relation("Referrals")
  referralRewardGiven Boolean   @default(false)
  referralWeeksGiven  Int       @default(0)

  accounts          Account[]
  sessions          Session[]
  portfolio         PortfolioItem[]
  wishlist          WishlistItem[]
  cardWishlist      CardWishlistItem[]
  manualValuations  ManualValuation[]
  userCards         UserCard[]
  userCardDoubles   UserCardDouble[]
  subscription      Subscription?
  pointEvents       PointEvent[]
  userQuests        UserQuest[]
  userPoints        UserPoints?
  feedbacks         Feedback[]
  dailyQuestClaims  DailyQuestClaim[]
  classeurShare     ClasseurShare?

  @@map("users")
}

model Subscription {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id])
  plan             Plan
  source           String
  status           String
  currentPeriodEnd DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ─── CATALOGUE POKÉMON ───────────────────────────────────────

model Bloc {
  id           String    @id @default(cuid())
  name         String
  nameEn       String?
  slug         String    @unique
  abbreviation String?
  logoUrl      String?
  imageUrl     String?
  startDate    DateTime?
  endDate      DateTime?
  order        Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  series Serie[]

  @@map("blocs")
}

model Serie {
  id           String    @id @default(cuid())
  blocId       String
  name         String
  nameEn       String?
  slug         String    @unique
  abbreviation String?
  imageUrl     String?
  bannerUrl    String?
  releaseDate  DateTime?
  cardCount    Int?
  order        Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  bloc  Bloc   @relation(fields: [blocId], references: [id])
  items Item[]
  cards Card[]

  @@map("series")
}

model Item {
  id               String     @id @default(cuid())
  serieId          String
  name             String
  slug             String     @unique
  type             ItemType
  description      String?    @db.Text
  imageUrl         String?
  images           String[]
  ean              String?
  releaseDate      DateTime?
  retailPrice      Float?
  currentPrice     Float?
  priceUpdatedAt   DateTime?
  boosterCount     Int?
  promoCards       String[]
  contents         String?    @db.Text
  isExclusive      Boolean    @default(false)
  exclusiveStore   String?
  language         Language   @default(FR)
  order            Int        @default(0)
  cardmarketUrl    String?    @db.Text
  cardmarketId     String?
  priceFrom        Float?
  priceTrend       Float?
  availableSellers Int?
  lastScrapedAt    DateTime?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  serie            Serie            @relation(fields: [serieId], references: [id])
  prices           PriceHistory[]
  portfolioItems   PortfolioItem[]
  wishlistItems    WishlistItem[]
  marketListings   MarketListing[]

  @@index([type])
  @@index([serieId])
  @@map("items")
}

enum ItemType {
  BOOSTER
  DUOPACK
  TRIPACK
  BOOSTER_BOX
  ETB
  BOX_SET
  UPC
  TIN
  MINI_TIN
  POKEBALL_TIN
  BLISTER
  THEME_DECK
  BUNDLE
  TRAINER_KIT
  OTHER
}

enum Language {
  FR
  EN
  JP
  DE
  ES
  IT
  PT
  KO
  ZH
}

// ─── HISTORIQUE DES PRIX ─────────────────────────────────────

model PriceHistory {
  id        String   @id @default(cuid())
  itemId    String
  price     Float
  priceFrom Float?
  source    String   @default("cardmarket")
  currency  String   @default("EUR")
  date      DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([itemId, date])
  @@map("price_history")
}

// ─── PORTFOLIO UTILISATEUR ─────────────────────────────────

model PortfolioItem {
  id                    String        @id @default(cuid())
  userId                String
  itemId                String
  quantity              Int           @default(1)
  purchasePrice         Float?
  currentPrice          Float?
  currentPriceUpdatedAt DateTime?
  priceType             PriceType     @default(CUSTOM)
  purchaseDate          DateTime?
  condition             ItemCondition @default(SEALED)
  notes                 String?       @db.Text
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  item             Item              @relation(fields: [itemId], references: [id])

  @@index([userId])
  @@index([itemId])
  @@map("portfolio_items")
}

enum PriceType {
  RETAIL
  CUSTOM
}

enum ItemCondition {
  SEALED
  OPENED
  DAMAGED
  GRADED
}

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  itemId    String
  maxPrice  Float?
  notify    Boolean  @default(true)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  item Item @relation(fields: [itemId], references: [id])

  @@unique([userId, itemId])
  @@map("wishlist_items")
}

// ─── MARKET (ANNONCES SCRAPPÉES) ─────────────────────────────

model MarketListing {
  id          String   @id @default(cuid())
  itemId      String?
  title       String
  price       Float
  currency    String   @default("EUR")
  source      String
  sourceUrl   String   @db.Text
  imageUrl    String?
  seller      String?
  condition   String?
  isAvailable Boolean  @default(true)
  scrapedAt   DateTime @default(now())
  createdAt   DateTime @default(now())

  item Item? @relation(fields: [itemId], references: [id])

  @@index([itemId])
  @@index([source])
  @@index([scrapedAt])
  @@map("market_listings")
}

// ─── VALORISATIONS MANUELLES ─────────────────────────────────

model ManualValuation {
  id     String   @id @default(cuid())
  userId String
  itemId String
  price  Float
  date   DateTime @default(now())
  note   String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, itemId])
  @@map("manual_valuations")
}

// ─── CARTES ──────────────────────────────────────────────────

model Card {
  id         String     @id @default(cuid())
  serieId    String
  number     String
  name       String
  rarity     CardRarity @default(COMMON)
  imageUrl   String?
  tcgdexId       String?
  cardmarketId   String?
  cardmarketUrl  String?
  price          Float?
  priceReverse   Float?
  priceFr        Float?
  priceFrUpdatedAt DateTime?
  priceUpdatedAt DateTime?
  priceFirstEdition          Float?
  priceFirstEditionUpdatedAt DateTime?
  types          String[]
  category       String?
  trainerType    String?
  energyType     String?
  isSpecial    Boolean   @default(false)
  isFirstEdition Boolean @default(false)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  serie             Serie              @relation(fields: [serieId], references: [id])
  userCards         UserCard[]
  userDoubles       UserCardDouble[]
  priceHistory      CardPriceHistory[]
  cardWishlistItems CardWishlistItem[]

  @@unique([serieId, number])
  @@index([serieId])
  @@map("cards")
}

model CardPriceHistory {
  id           String   @id @default(cuid())
  cardId       String
  price        Float
  priceFr      Float?
  priceReverse Float?
  source       String
  recordedAt   DateTime
  createdAt    DateTime @default(now())

  card Card @relation(fields: [cardId], references: [id])

  @@unique([cardId, recordedAt])
  @@index([cardId, recordedAt])
  @@map("card_price_history")
}

enum CardRarity {
  NO_RARITY
  COMMON
  UNCOMMON
  RARE
  HOLO_RARE
  DOUBLE_RARE
  NOIR_BLANC_RARE
  ULTRA_RARE
  ILLUSTRATION_RARE
  SPECIAL_ILLUSTRATION_RARE
  HYPER_RARE
  MEGA_HYPER_RARE
  MEGA_ATTAQUE_RARE
  SECRET_RARE
  ACE_SPEC_RARE
  PROMO
}

model UserCard {
  id            String        @id @default(cuid())
  userId        String
  cardId        String
  quantity      Int           @default(1)
  foil          Boolean       @default(false)
  condition     CardCondition @default(NEAR_MINT)
  language      Language      @default(FR)
  version       CardVersion   @default(NORMAL)
  purchasePrice Float?
  gradeValue    Float?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id])

  @@unique([userId, cardId, version])
  @@index([userId])
  @@index([cardId])
  @@index([userId, cardId])
  @@map("user_cards")
}

model UserCardDouble {
  id           String             @id @default(cuid())
  userId       String
  cardId       String
  quantity     Int                @default(1)
  condition    CardCondition      @default(NEAR_MINT)
  language     Language           @default(FR)
  version      CardVersion        @default(NORMAL)
  availability DoubleAvailability @default(TRADE)
  price        Float?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id])

  @@unique([userId, cardId, version])
  @@index([userId])
  @@index([cardId])
  @@index([userId, cardId])
  @@map("user_card_doubles")
}

enum CardVersion {
  NORMAL
  REVERSE
  REVERSE_POKEBALL
  REVERSE_MASTERBALL
  FIRST_EDITION
}

enum DoubleAvailability {
  TRADE
  SELL
  BOTH
}

enum CardCondition {
  MINT
  NEAR_MINT
  EXCELLENT
  GOOD
  LIGHT_PLAYED
  PLAYED
  POOR
  GRADED
}

// ─── FEEDBACK UTILISATEUR ────────────────────────────────────

model Feedback {
  id        String   @id @default(cuid())
  userId    String
  message   String   @db.Text
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("feedbacks")
}

// ─── SCANNER FEEDBACK ─────────────────────────────────────────

model ScanCorrection {
  id                 String   @id @default(cuid())
  createdAt          DateTime @default(now())
  userId             String

  aiTopCardId        String?
  aiTopConfidence    Int?

  userSelectedCardId String
  selectionSource    String

  ocrName            String?
  ocrNumber          String?
  ocrSetCode         String?

  @@index([userId])
  @@index([userSelectedCardId])
  @@map("scan_corrections")
}

// ─── BLOG ────────────────────────────────────────────────────

model BlogPost {
  id              String    @id @default(cuid())
  title           String
  slug            String    @unique
  excerpt         String?   @db.Text
  content         String    @db.Text
  coverImage      String?
  author          String    @default("PokeItem")
  tags            String[]
  category        String?
  published       Boolean   @default(false)
  publishedAt     DateTime?
  metaTitle       String?
  metaDescription String?   @db.Text
  keywords        String[]
  readingTime     Int?
  viewCount       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([published, publishedAt])
  @@map("blog_posts")
}

// ─── GAMIFICATION ────────────────────────────────────────────

model PointEvent {
  id        String   @id @default(cuid())
  userId    String
  points    Int
  source    String
  questId   String?
  metadata  Json?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, source])
  @@map("point_events")
}

model UserQuest {
  id          String    @id @default(cuid())
  userId      String
  questId     String
  completed   Boolean   @default(false)
  progress    Int       @default(0)
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, questId])
  @@index([userId])
  @@map("user_quests")
}

model UserPoints {
  userId    String   @id
  total     Int      @default(0)
  updatedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([total])
  @@map("user_points")
}

model DailyQuestClaim {
  id            String   @id @default(cuid())
  userId        String
  questId       String   @default("daily_login")
  claimedAt     DateTime @default(now())
  pointsAwarded Int      @default(250)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, questId])
  @@map("daily_quest_claims")
}

// ─── LISTE DE SOUHAITS (CARTES) ──────────────────────────────

model CardWishlistItem {
  id       String   @id @default(cuid())
  userId   String
  cardId   String
  setId    String
  priority Int      @default(1)
  maxPrice Float?
  note     String?
  addedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Card @relation(fields: [cardId], references: [id])

  @@unique([userId, cardId])
  @@index([userId])
  @@index([userId, setId])
  @@index([userId, addedAt(sort: Desc)])
  @@map("card_wishlist_items")
}

// ─── PHASE 2 — SHARING & TRADE MATCHING ────────────────────

model ClasseurShare {
  id             String   @id @default(cuid())
  userId         String   @unique
  slug           String   @unique
  visibility     String   @default("private")
  isActive       Boolean  @default(false)
  shareCards     Boolean  @default(true)
  shareDoubles   Boolean  @default(true)
  shareItems     Boolean  @default(false)
  shareWishlist  Boolean  @default(true)
  contactDiscord String?
  contactEmail   String?
  contactTwitter String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("classeur_shares")
}
```

---

## 3. STOCKAGE IMAGES / ASSETS

### 3.1 Stratégie globale

Les images de **cartes Pokémon** sont toutes mirrorées sur **Vercel Blob Storage** avec des filenames SEO (`cards/{serie}/{name}-{num}-{serie}-pokeitem.webp`). Les images de **produits scellés** (items : boosters, ETB, displays) viennent directement de l'API **Cardmarket** (non mirrorées).

Configuré dans `next.config.ts` via `images.remotePatterns` :
- `*.public.blob.vercel-storage.com` (cartes mirrorées)
- `product-images.s3.cardmarket.com` (items Cardmarket)
- `*.cardmarket.com` (fallback)

### 3.2 Hostnames externes référencés (déduplication)

Hostnames dans `src/**/*.{ts,tsx}` :

- `app.pokeitem.fr` — domaine canonique (SEO, Open Graph, liens partage)
- `api.pokemontcg.io` — API tierce (prix historiques, métadonnées)
- `api.tcgdex.net` — API tierce FR (cartes, reverse prices, symboles)
- `www.cardmarket.com` — liens deep vers produits CM
- `product-images.s3.cardmarket.com` — images produits scellés (via `next.config.ts`)
- `*.public.blob.vercel-storage.com` — images cartes mirrorées (via `next.config.ts`)
- `schema.org` — JSON-LD SEO
- `www.w3.org` — SVG namespaces
- `twitter.com`, `www.instagram.com`, `www.tiktok.com`, `www.youtube.com`, `youtube.com`, `t.me`, `vercel.com` — liens sociaux / footer

Les images de cartes en DB (`Card.imageUrl`) sont toutes sur `*.public.blob.vercel-storage.com`.

### 3.3 Usage de `@vercel/blob`

Package version : `^2.3.2`.

Fichiers qui l'utilisent (tous côté serveur / scripts, jamais client) :

- `scripts/mirror-card-images-to-blob.ts` — mirror TOUTES les images de cartes externes vers Vercel Blob avec filenames SEO (script de migration one-shot).
- `scripts/migrate-avatars-to-blob.ts` — migration des avatars base64 stockés en DB vers Vercel Blob.
- `scripts/fix-hgss18-tropical-tidal-wave.ts` — one-off, répare la seule carte restée en 404 après le mirror.

Les routes API qui écrivent sur Vercel Blob (upload d'avatars par l'utilisateur final) utilisent aussi `@vercel/blob` :
- `src/app/api/profil/avatar/route.ts` (upload / delete avatars)

Tokens d'accès : `BLOB_READ_WRITE_TOKEN` (+ variante `BLOBBIS_READ_WRITE_TOKEN`).

---

## 4. AUTHENTIFICATION

### 4.1 Contenu de `src/lib/auth.ts` (dump)

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
    newUser: "/inscription",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:          { label: "Email",    type: "email" },
        password:       { label: "Mot de passe", type: "password" },
        autoLoginToken: { label: "Auto-login token", type: "text" },
      },
      async authorize(credentials) {
        // Auto-login via signed JWT (after email verification)
        if (credentials?.autoLoginToken) {
          const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
          const { payload } = await jwtVerify(credentials.autoLoginToken, secret);
          // payload.type === "autologin", payload.userId: string
          ...
        }
        // Standard email + password: bcrypt.compare on User.passwordHash
        // Blocks: unverified email (throws EMAIL_NOT_VERIFIED) + deleted accounts (ACCOUNT_DELETED)
        // Returns { id, name, email, image: null }
      },
    }),
    GoogleProvider({ // only if GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET set
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  events: {
    signIn: auto-set emailVerified for google sign-ins,
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      // On sign-in: populate token.id, token.name, token.hasAvatar (boolean from DB)
      // Explicitly deletes token.picture / token.image to keep JWT cookie small
      // On trigger === "update": refresh hasAvatar / name from client session update
    },
    session({ session, token }) {
      // Injects id, name, hasAvatar onto session.user
    },
  },
};
```

**Key properties:**

- Session strategy: **JWT** (stored in HttpOnly cookie, NOT accessible from JS).
- Adapter: Prisma Adapter (writes Account/Session/VerificationToken rows in Neon).
- Providers: Credentials (email+password bcrypt) + Google OAuth (optional).
- Custom autologin flow: server issues a short-lived signed JWT after email verification; client POSTs it through the Credentials provider.
- Pages: `/connexion` (sign-in), `/inscription` (new user).

### 4.2 JWT exposure côté client

**No direct JWT exposure.** Grep for `session.accessToken` / `getToken()` in `src` returns **zero matches** in client code. The client only sees the sanitized session object with `{ id, name, email, hasAvatar }` via `useSession()`. The NextAuth cookie (`next-auth.session-token`) is HttpOnly.

**Capacitor implication:** the current cookie-based auth will NOT work out of the box in a native WebView across domains. For iOS, the migration will need either:
1. A custom header-token flow (e.g. issue a long-lived token via a new `/api/auth/mobile` endpoint), or
2. Capacitor's cookie plugin with a dedicated mobile subdomain, or
3. Switch to a bearer-token based SDK auth (e.g. NextAuth v5 or a custom JWT).

---

## 5. SERVER vs CLIENT COMPONENTS

### 5.1 Server Components / Routes avec Prisma direct

All files importing `@/lib/prisma` that are NOT `"use client"`. 71 files total — all API routes + RSC pages:

**API routes (server):**
```
src/app/api/admin/revalidate-cards/route.ts  (implicit — not in grep, assumed)
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/register/route.ts
src/app/api/auth/reset-password/route.ts
src/app/api/auth/verify/route.ts
src/app/api/avatar/[userId]/route.ts
src/app/api/beta/activate/route.ts
src/app/api/binder/cards-by-rarity/route.ts
src/app/api/blog/route.ts
src/app/api/cards/[cardId]/owned/route.ts
src/app/api/cards/[cardId]/price-history/route.ts
src/app/api/cards/collection/route.ts
src/app/api/cards/doubles/route.ts
src/app/api/cards/search/route.ts
src/app/api/feedback/route.ts
src/app/api/items/[id]/price/route.ts
src/app/api/items/[id]/route.ts
src/app/api/items/route.ts
src/app/api/items/search/route.ts
src/app/api/market/route.ts
src/app/api/portfolio/[id]/route.ts
src/app/api/portfolio/chart/route.ts
src/app/api/portfolio/rarities/route.ts
src/app/api/portfolio/route.ts
src/app/api/portfolio/stats/route.ts
src/app/api/portfolio/valuation/route.ts
src/app/api/prices/route.ts
src/app/api/profil/avatar/route.ts
src/app/api/profil/route.ts
src/app/api/quests/daily-login/claim/route.ts
src/app/api/quests/daily-login/status/route.ts
src/app/api/referral/apply/route.ts
src/app/api/scanner/correction/route.ts
src/app/api/scanner/identify/route.ts
src/app/api/scanner/search/route.ts
src/app/api/scraper/route.ts
src/app/api/share/settings/route.ts
src/app/api/subscription/cancel/route.ts
src/app/api/subscription/checkout/route.ts
src/app/api/subscription/portal/route.ts
src/app/api/subscription/status/route.ts
src/app/api/u/[slug]/route.ts
src/app/api/unsubscribe/route.ts
src/app/api/user/delete/route.ts
src/app/api/user/me/route.ts
src/app/api/user/points/route.ts
src/app/api/user/share-data/route.ts
src/app/api/user/username/route.ts
src/app/api/users/[slug]/trade-calculator/route.ts
src/app/api/users/search/route.ts
src/app/api/users/suggested/route.ts
src/app/api/webhooks/brevo/route.ts
src/app/api/webhooks/revenuecat/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/api/wishlist/cards/[cardId]/route.ts
src/app/api/wishlist/cards/bulk/route.ts
src/app/api/wishlist/cards/ids/route.ts
src/app/api/wishlist/cards/mark-acquired/[cardId]/route.ts
src/app/api/wishlist/cards/route.ts
```

**Non-API server files (RSC pages + special routes):**
```
src/app/page.tsx
src/app/telecharger/[cardId]/route.ts
src/app/(main)/carte/[cardId]/page.tsx
src/app/(main)/collection/cartes/page.tsx
src/app/(main)/collection/cartes/[blocSlug]/[serieSlug]/page.tsx
src/app/(main)/collection/produits/[blocSlug]/[serieSlug]/page.tsx
src/app/(main)/echanges/page.tsx
src/app/(main)/portfolio/cartes/page.tsx
src/app/(main)/portfolio/cartes/[blocSlug]/[serieSlug]/page.tsx
src/app/(main)/portfolio/doubles/page.tsx
src/app/(main)/portfolio/doubles/[blocSlug]/[serieSlug]/page.tsx
src/app/(main)/portfolio/items/[id]/page.tsx
src/app/(main)/portfolio/souhaits/page.tsx
src/app/(main)/u/[slug]/page.tsx
```

**iOS impact:** RSC pages query Prisma at render-time server-side. For Capacitor, the app still loads the hosted URL (or a shell) — but all data fetches must go through `/api/*` endpoints (no direct Prisma access in mobile bundle).

### 5.2 Client Components (`"use client"`)

Exhaustive list:

```
src/app/(auth)/connexion/ConnexionForm.tsx
src/app/(auth)/inscription/InscriptionForm.tsx
src/app/(auth)/mot-de-passe-oublie/page.tsx
src/app/(auth)/reinitialiser-mot-de-passe/page.tsx
src/app/(auth)/verification/page.tsx
src/app/(main)/echanges/EchangesPageClient.tsx
src/app/(main)/portfolio/PortfolioBackLink.tsx
src/app/(main)/portfolio/PortfolioTiles.tsx
src/app/(main)/portfolio/souhaits/WishlistPageClient.tsx
src/app/(main)/settings/sharing/SharingSettingsClient.tsx
src/app/(main)/u/[slug]/PublicProfileClient.tsx
src/components/Providers.tsx
src/components/beta/BetaBanner.tsx
src/components/beta/BetaPageContent.tsx
src/components/beta/ClasseurBetaOffer.tsx
src/components/cards/BlocSerieDoublesList.tsx
src/components/cards/CardCollectionGrid.tsx
src/components/cards/CardDetailModal.tsx
src/components/cards/ClasseurCardGrid.tsx
src/components/cards/FirstEditionStamp.tsx
src/components/cards/HomeCardPreview.tsx
src/components/cards/PriceHistoryChart.tsx
src/components/cards/ProfileCardSection.tsx
src/components/cards/ReadOnlyCardGrid.tsx
src/components/cards/RemoveCardButton.tsx
src/components/cards/VariantStack.tsx
src/components/collection/SerieItemsGrid.tsx
src/components/dashboard/CollectionHeroCard.tsx
src/components/dashboard/DashboardChartsSection.tsx
src/components/dashboard/DashboardContent.tsx
src/components/dashboard/PortfolioEvolutionChart.tsx
src/components/dashboard/PortfolioMiniStats.tsx
src/components/dashboard/PortfolioTabNav.tsx
src/components/layout/Header.tsx
src/components/layout/MobileNav.tsx
src/components/layout/ThemeToggle.tsx
src/components/portfolio/AddToPortfolioModal.tsx
src/components/portfolio/CollectionTile.tsx
src/components/portfolio/ItemBadge.tsx
src/components/portfolio/ItemCard.tsx
src/components/portfolio/ItemCardGrid.tsx
src/components/portfolio/ItemDetailForm.tsx
src/components/portfolio/ItemsToolbar.tsx
src/components/portfolio/PortfolioItemsSection.tsx
src/components/profil/ProfilForm.tsx
src/components/scanner/CardScanner.tsx
src/components/shared/CommandSearch.tsx
src/components/shared/Logo.tsx
src/components/shared/SearchBar.tsx
src/components/trade/ContactBlock.tsx
src/components/trade/SharingToggle.tsx
src/components/trade/SuggestedUsers.tsx
src/components/trade/TradeCalculator.tsx
src/components/trade/TradeProposalButton.tsx
src/components/trade/TradeProposalSheet.tsx
src/components/ui/Avatar.tsx
src/components/ui/BackButton.tsx
src/components/ui/BottomSheet.tsx
src/components/ui/Button.tsx
src/components/ui/DropdownMenu.tsx
src/components/ui/HeroCTAButtons.tsx
src/components/ui/HeroSearchBar.tsx
src/components/ui/HideValuesContext.tsx
src/components/ui/HomepageCTASection.tsx
src/components/ui/Input.tsx
src/components/ui/Modal.tsx
src/components/ui/Select.tsx
src/components/ui/Sheet.tsx
src/components/ui/Tabs.tsx
src/components/ui/TelegramBannerButton.tsx
src/components/ui/Toast.tsx
src/components/ui/Tooltip.tsx
src/components/wishlist/WishlistHeartButton.tsx
src/components/wishlist/WishlistHydrator.tsx
src/hooks/useDebounce.ts
src/hooks/useSearch.ts
src/lib/theme.ts
src/lib/theme.tsx
```

---

## 6. APPELS API INTERNES (`fetch('/api/...')`)

All client-side `fetch` calls to internal API routes:

```
src/stores/wishlistStore.ts:18           /api/wishlist/cards/ids
src/stores/collectionStore.ts:61         /api/portfolio
src/stores/collectionStore.ts:76         /api/portfolio (mutation)
src/stores/collectionStore.ts:83         /api/portfolio
src/stores/collectionStore.ts:129        /api/portfolio
src/hooks/useApplyReferral.ts:14         /api/referral/apply

src/app/(auth)/inscription/InscriptionForm.tsx:71              /api/auth/register
src/app/(auth)/mot-de-passe-oublie/page.tsx:21                 /api/auth/forgot-password
src/app/(auth)/reinitialiser-mot-de-passe/page.tsx:44          /api/auth/reset-password

src/app/(main)/pricing/page.tsx:35                             /api/subscription/checkout
src/app/(main)/portfolio/PortfolioTiles.tsx:32                 /api/portfolio/stats
src/app/(main)/portfolio/souhaits/WishlistPageClient.tsx:247   /api/wishlist/cards
src/app/(main)/portfolio/souhaits/WishlistPageClient.tsx:307   /api/cards/collection
src/app/(main)/settings/sharing/SharingSettingsClient.tsx:41   /api/share/settings
src/app/(main)/settings/sharing/SharingSettingsClient.tsx:72   /api/share/settings (PUT)

src/components/beta/BetaPageContent.tsx:224                    /api/beta/activate
src/components/beta/BetaBanner.tsx:30                          /api/subscription/checkout
src/components/ui/HeroCTAButtons.tsx:28                        /api/beta/activate

src/components/quests/QuestsBlock.tsx:237                      /api/user/quests/install_pwa/complete
src/components/quests/DailyLoginQuest.tsx:63                   /api/quests/daily-login/claim

src/components/profil/SettingsTab.tsx:21                       /api/user/me
src/components/profil/SettingsTab.tsx:50                       /api/user/username
src/components/profil/SettingsTab.tsx:70                       /api/subscription/cancel
src/components/profil/SettingsTab.tsx:80                       /api/user/delete
src/components/profil/SupportTab.tsx:17                        /api/feedback
src/components/profil/ProfilForm.tsx:36                        /api/profil
src/components/profil/ProfilForm.tsx:61                        /api/profil (mutation)
src/components/profil/ProfilForm.tsx:93                        /api/profil/avatar (upload)
src/components/profil/ProfilForm.tsx:123                       /api/profil/avatar (DELETE)

src/components/trade/SharingToggle.tsx:30                      /api/share/settings
src/components/trade/SharingToggle.tsx:59                      /api/share/settings (mutation)
src/components/trade/SuggestedUsers.tsx:46                     /api/users/suggested
src/components/trade/SuggestedUsers.tsx:50                     /api/wishlist/cards/ids
src/components/trade/TradeCalculator.tsx:155                   /api/share/settings

src/components/cards/BinderRarityView.tsx:160                  /api/binder/cards-by-rarity
src/components/cards/DoublesGrid.tsx:145                       /api/cards/collection
src/components/cards/ClasseurCardGrid.tsx:303                  /api/cards/collection
src/components/cards/CardCollectionGrid.tsx:717                /api/cards/collection
src/components/cards/CardCollectionGrid.tsx:761                /api/cards/collection
src/components/cards/CardCollectionGrid.tsx:786                /api/cards/collection
src/components/cards/CardCollectionGrid.tsx:806                /api/cards/collection
src/components/cards/CardCollectionGrid.tsx:828                /api/wishlist/cards/bulk
src/components/cards/RemoveCardButton.tsx:25                   /api/cards/collection
src/components/cards/CardDetailModal.tsx:281                   /api/cards/collection
src/components/cards/CardDetailModal.tsx:335                   /api/cards/collection

src/components/dashboard/DashboardContent.tsx:195              /api/portfolio
src/components/dashboard/BinderRarityFilter.tsx:27             /api/portfolio/rarities

src/components/portfolio/AddToPortfolioModal.tsx:67            /api/portfolio
src/components/portfolio/ItemDetailForm.tsx:136                /api/portfolio/valuation

src/components/scanner/CardScanner.tsx:311                     /api/scanner/identify
src/components/scanner/CardScanner.tsx:382                     /api/scanner/correction
src/components/scanner/CardScanner.tsx:401                     /api/cards/collection
src/components/scanner/CardScanner.tsx:432                     /api/cards/collection

src/components/wishlist/WishlistHeartButton.tsx:47             /api/wishlist/cards
src/components/wishlist/WishlistHeartButton.tsx:62             /api/wishlist/cards
```

**iOS implication:** every `fetch("/api/…")` must be rewritten as an absolute URL (`https://app.pokeitem.fr/api/…` or an env-driven base URL) once Capacitor serves the bundle from `capacitor://localhost`.

---

## 7. DÉPENDANCES

### 7.1 `package.json` (dump complet)

```json
{
  "name": "pokeitem",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "seed:series": "npx tsx scripts/seed-series.ts",
    "seed:series:dry": "npx tsx scripts/seed-series.ts --dry-run",
    "seed:cards": "npx tsx scripts/seed-cards.ts",
    "seed:cards:dry": "npx tsx scripts/seed-cards.ts --dry-run",
    "seed:prices": "npx tsx scripts/seed-card-prices.ts",
    "seed:prices:dry": "npx tsx scripts/seed-card-prices.ts --dry-run",
    "migrate-avatars": "tsx scripts/migrate-avatars-to-blob.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@getbrevo/brevo": "^5.0.3",
    "@hookform/resolvers": "^5.2.2",
    "@next-auth/prisma-adapter": "^1.0.7",
    "@prisma/client": "^5.22.0",
    "@stripe/stripe-js": "^9.0.1",
    "@tailwindcss/typography": "^0.5.19",
    "@tanstack/react-query": "^5.95.2",
    "@types/js-cookie": "^3.0.6",
    "@vercel/blob": "^2.3.2",
    "@vercel/og": "^0.11.1",
    "axios": "^1.14.0",
    "bcryptjs": "^3.0.3",
    "cheerio": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "dotenv": "^17.3.1",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "^12.38.0",
    "gray-matter": "^4.0.3",
    "html2canvas": "^1.4.1",
    "js-cookie": "^3.0.5",
    "lucide-react": "^1.7.0",
    "next": "16.2.1",
    "next-auth": "^4.24.13",
    "next-mdx-remote": "^6.0.0",
    "next-themes": "^0.4.6",
    "prisma": "^5.22.0",
    "puppeteer-core": "^24.40.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-hook-form": "^7.72.0",
    "reading-time": "^1.5.0",
    "recharts": "^3.8.1",
    "rehype-autolink-headings": "^7.1.0",
    "rehype-slug": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "stripe": "^21.0.1",
    "swr": "^2.4.1",
    "tailwind-merge": "^3.5.0",
    "zod": "^4.3.6",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "eslint-config-prettier": "^10.1.8",
    "prettier": "^3.8.1",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

---

## 8. VARIABLES D'ENVIRONNEMENT (noms uniquement)

Union `.env` + `.env.local` :

```
ANTHROPIC_API_KEY
ANTHROPIC_API_KEY_SCANNER
BLOBBIS_READ_WRITE_TOKEN
BLOB_READ_WRITE_TOKEN
BREVO_API_KEY
BREVO_LIST_ID_NEWSLETTER
BREVO_LIST_ID_USERS
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
BREVO_TEMPLATE_RESET_PASSWORD
BREVO_TEMPLATE_TRADE_REQUEST
BREVO_TEMPLATE_VERIFY_EMAIL
BREVO_TEMPLATE_WELCOME
BREVO_WEBHOOK_SECRET
CARDMARKET_API_KEY
DATABASE_URL
EMAIL_FROM
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
STRIPE_PRO_PRICE_ID
STRIPE_PRO_PRICE_ID_ANNUAL
STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

(Vercel/Turbo runtime vars — `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_*`, `VERCEL_OIDC_TOKEN`, `VERCEL_TARGET_ENV`, `VERCEL_URL`, `NX_DAEMON`, `TURBO_*` — injectées automatiquement par la plateforme, pas à configurer.)

No `.env.example` committed.

---

## 9. SERVICES EXTERNES

### 9.1 Stripe

Package : `stripe@^21.0.1` (SDK server) + `@stripe/stripe-js@^9.0.1` (client loader).

Fichiers :

- `src/lib/referral.ts` — logique parrainage (extension d'abonnement Stripe).
- `src/app/api/subscription/checkout/route.ts` — création Checkout Session.
- `src/app/api/subscription/portal/route.ts` — billing portal.
- `src/app/api/subscription/cancel/route.ts` — annulation abonnement.
- `src/app/api/subscription/status/route.ts` — lecture statut abonnement.
- `src/app/api/webhooks/stripe/route.ts` — webhook Stripe (signatures via `STRIPE_WEBHOOK_SECRET`).
- `src/app/api/user/delete/route.ts` — cleanup Stripe customer à la suppression.
- `src/app/api/user/me/route.ts` — lecture `stripeCustomerId` / `stripeSubscriptionId`.
- `src/app/(main)/pricing/page.tsx` — UI pricing + appel `/api/subscription/checkout`.

Env : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PRO_PRICE_ID_ANNUAL`.

### 9.2 Brevo (ex-Sendinblue)

Package : `@getbrevo/brevo@^5.0.3`. Utilisé pour transactional email + CRM sync.

Fichiers :

- `src/lib/brevo.ts` — client Brevo (ajout contacts, envoi templates).
- `src/lib/email.ts` — wrappers sendmail.
- `src/app/api/auth/register/route.ts` — welcome email + add contact.
- `src/app/api/auth/verify/route.ts` — email de vérification.
- `src/app/api/unsubscribe/route.ts` — opt-out newsletter.
- `src/app/api/webhooks/brevo/route.ts` — webhook Brevo (open/click tracking, signé via `BREVO_WEBHOOK_SECRET`).
- `scripts/send-welcome-to-existing-users.ts` — backfill welcome template.
- `scripts/migrate-contacts-to-brevo.ts` — sync initial CRM.

Env : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_LIST_ID_USERS`, `BREVO_LIST_ID_NEWSLETTER`, `BREVO_TEMPLATE_WELCOME`, `BREVO_TEMPLATE_VERIFY_EMAIL`, `BREVO_TEMPLATE_RESET_PASSWORD`, `BREVO_TEMPLATE_TRADE_REQUEST`, `BREVO_WEBHOOK_SECRET`, `EMAIL_FROM`.

### 9.3 RevenueCat

**No RevenueCat SDK installed.** The single reference is a webhook endpoint skeleton:

- `src/app/api/webhooks/revenuecat/route.ts` — stub webhook receiver (no client SDK, no app usage yet).

The `User.revenueCatId` column exists in Prisma schema (`@unique`) in anticipation of iOS in-app subscriptions via RevenueCat. **This must be wired up as part of the iOS migration** — current web flow uses Stripe only, iOS will need RevenueCat (since Apple requires StoreKit/IAP for digital subscriptions).

---

## 10. CRON / SCRIPTS

### 10.1 `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/scraper",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Single cron: `/api/scraper` fires every 6 hours (UTC). Implemented at `src/app/api/scraper/route.ts` — updates Cardmarket prices for items.

### 10.2 Fichiers `scripts/` (descriptions 1 ligne)

**Seed scripts:**
- `seed-series.ts` — seed series catalog.
- `seed-cards.ts` — seed cards catalog.
- `seed-card-prices.ts` — seed card prices.
- `seed-card-categories.ts` — seed card category metadata.
- `seed-card-types.ts` — seed card types.
- `seed-me-types.ts` — seed Mega-Evolution types.
- `seed-promos.ts` — seed promo cards.
- `seed-mcdo-pop.ts` — seed McDonald's promo sets.
- `seed-cl-cards.ts` — seed "L'Appel des Légendes" (Call of Legends, 106 cards).

**Cardmarket URL backfills (by bloc):**
- `backfill-cm-urls.ts` — backfill Cardmarket URL slugs into `Card.cardmarketUrl`.
- `backfill-cm-full.ts` — full CM refresh.
- `backfill-cm-history.ts` — backfill CM API price history into `CardPriceHistory`.
- `backfill-celebrations-cm-urls.ts` — Celebrations set URL backfill.
- `backfill-celebrations-fr-manual.ts` — one-shot backfill `priceFr` on 26 Celebrations cards.
- `apply-mcdo-cm-urls.ts` — apply proposed McDo CM URLs.
- `apply-neo-cm-urls.ts` — apply proposed Neo CM URLs.
- `apply-wotc-cm-urls.ts` — apply proposed Wizards CM URLs.
- `dry-run-mcdo-cm-urls.ts` / `dry-run-neo-cm-urls.ts` / `dry-run-wotc-cm-urls.ts` — dry-run CM URL proposals.
- `audit-missing-cm-urls.ts` — audit cards missing CM URLs.
- `audit-wotc-cm-urls.ts` — read-only audit of current CM URLs on Wizards bloc.
- `fix-cm-urls-black-white.ts` / `fix-cm-urls-diamond-pearl.ts` / `fix-cm-urls-ex.ts` / `fix-cm-urls-hgss.ts` / `fix-cm-urls-platinum.ts` / `fix-cm-urls-sun-moon.ts` / `fix-cm-urls-sword-shield.ts` / `fix-cm-urls-xy.ts` — per-bloc CM URL fixes.
- `probe-cm-ed1.ts` — probe CM for a single WOTC 1st-ed card.
- `sample-wotc-urls.ts` — pick 10 diverse Wizards URLs for manual verification.

**Price backfills:**
- `backfill-fr-prices-comprehensive.ts` — comprehensive FR price backfill for all remaining extensions.
- `backfill-fr-prices-newly-imaged.ts` — FR prices for newly-imaged cards.
- `backfill-fr-prices-targeted.ts` — targeted FR price backfill per serie.
- `backfill-french-prices.ts` — French prices from Cardmarket RapidAPI.
- `backfill-reverse-prices.ts` — reverse holo prices from tcgdex.net.
- `backfill-tcgdex-price-history.ts` — historical prices from TCGdex.
- `restore-pre-tcgdex-prices.ts` — rollback TCGdex migration.
- `audit-missing-fr-prices.ts` — audit missing FR prices.
- `scrape-cm-celebrations-classic.ts` — scrape Celebrations Classic Collection CM FR.
- `scrape-cm-celebrations-fr.ts` — scrape FR-language NM prices for Celebrations.
- `scrape-cm-celebrations-history.ts` — scrape CM 30-day price history chart.
- `scrape-cm-ed1-fr.ts` — scrape CM 1st Edition prices for the 4 WOTC sets.

**Image backfills / migration:**
- `backfill-missing-images.ts` — backfill missing card images.
- `backfill-mee-images-prices.ts` — Mega-Evolution Energy images + FR prices.
- `backfill-promo-images.ts` — promo series images.
- `fetch-tcgplayer-images.ts` / `fetch-all-tcgplayer-images.ts` — grab TCGplayer image URLs.
- `fetch-item-images-v2.ts` — item (sealed) image fetcher.
- `scrape-item-images.ts` — scrape item images.
- `fix-base-set-2-images.ts` — Base Set 2 image fix.
- `fix-energy-images.ts` — energy card images fix.
- `fix-mcdo-images.ts` / `fix-mcdo-images-part2.ts` — McDo images fix.
- `fix-mep-mee-images.ts` — backfill MEP images using ME equivalents.
- `fix-foudre-flamme.ts` — one-off image fix.
- `fix-hgss18-tropical-tidal-wave.ts` — fix last 404 post-mirror to Vercel Blob.
- `bulba-images-mcdo-old.ts` — replace watermarked Pokellector images for McDo series.
- `dry-run-mcdo-images.ts` — propose Pokellector imageUrls for McDo.
- `dry-run-mirror-card-images.ts` — analyze external imageUrls before mirror.
- `mirror-card-images-to-blob.ts` — mirror ALL card images to Vercel Blob with SEO filenames.
- `manual-image-urls.ts` — manual imageUrl overrides.
- `migrate-avatars-to-blob.ts` — migrate base64 avatars from DB to Vercel Blob.
- `download-set-symbols.ts` — download TCGdex set symbols to `public/images/symbols/`.
- `apply-mcdo-rebuild.ts` — apply McDo rebuild plan.
- `build-mcdo-rebuild.ts` — build full repair plan for the 6 McDo series.
- `build-tcgdex-symbol-mapping.ts` — build `serieSlug → tcgdexSetId` mapping from TCGdex FR API.

**Rarity / metadata fixes:**
- `fix-rarities.ts` — resync rarities from TCGDex.
- `fix-rarities-debug.ts` — debug variant.
- `fix-double-rare.ts` / `fix-double-rare-to-ultra.ts` — rarity fixes.
- `fix-me-rarities.ts` — Mega-Evolution rarities.
- `fix-old-bloc-rarities.ts` — legacy bloc rarities.
- `fix-promos-classification.ts` — reclassify Promos Nintendo / Wizards.
- `fix-ex-hgss-reorg.ts` — EX/HGSS reorganisation.
- `fix-mep-missing-cards.ts` — add missing MEP cards.
- `fix-series-data.ts` — series metadata fix.
- `sync-card-rarities.ts` — sync rarities.
- `sync-card-types.ts` — sync types.
- `check-rarities.ts` — rarity check.
- `report-backfilled-series.ts` — backfill report.
- `check-history.ts` / `check-history-dupes.ts` — history dedup audit.
- `count-backfill-eligible.ts` — count eligible cards.
- `check-backfill-status.ts` — backfill status.
- `audit-missing-cards.ts` — find missing cards.

**Data migrations:**
- `migrate-card-variants.ts` — add CardVersion variants.
- `migrate-portfolio-current-price.ts` — per-user `currentPrice` migration.
- `migrate-versions.ts` — versions migration.
- `migrate-referral-points.ts` — convert validated referrals to `point_events`.
- `migrate-contacts-to-brevo.ts` — one-shot Brevo CRM sync.
- `delete-ed1-series.ts` — cleanup 4 legacy ED1 series.
- `generate-referral-codes.ts` — backfill referralCode.
- `fix-referral-manual.ts` — manual referral link + points backfill.
- `send-welcome-to-existing-users.ts` — one-shot Brevo welcome template (ID 2).

**Blog tooling (JS):**
- `generate-blog-images.js` — auto-generate blog cover images.
- `generate-blog-post.js` — generate blog post drafts.
- `generate-series-article.js` — auto-article for a new serie.

**Ivan (agent interne):**
- `ivan-run.ts` — entry point for the Ivan agent.
- `ivan/` — Ivan agent source directory.

**Reference / helper data files (non-exécutables):**
- `_build-fr-en-species-map.ts` — FR→EN species map builder.
- `_bw-sample.ts`, `_hgss-sample.ts`, `_platinum-sample.ts` — sample data probes.
- `_check-progress.ts`, `_count-ptcgio.ts` — probes.
- `_cl-data.json`, `_fr-en-species.json`, `_tcgdex-symbol-mapping.json` — reference JSON.
- `series-queue.json` — queue of series to process.

---

## Summary of migration-relevant concerns

1. **Auth**: cookie-based NextAuth JWT — must be replaced or proxied for Capacitor WebView.
2. **Direct Prisma in RSC**: the hosted web app uses RSC + Prisma directly; the iOS shell will need to consume `/api/*` exclusively.
3. **Payments**: currently Stripe-only on web. iOS must route through RevenueCat (schema already has `User.revenueCatId`, webhook stub exists at `src/app/api/webhooks/revenuecat/route.ts`).
4. **Images**: all card images live on Vercel Blob (`*.public.blob.vercel-storage.com`); sealed item images come from Cardmarket's CDN. Both need to be whitelisted in `capacitor.config` allowlists.
5. **Cron `/api/scraper`** runs every 6h on Vercel — stays server-side, no iOS impact.
6. **Internal fetches** use relative `/api/...` paths — need an API base URL shim for Capacitor.
