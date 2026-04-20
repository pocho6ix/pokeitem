# Migration API Routes — Checklist

Ce fichier trace chaque route API de la PWA Next.js et son statut dans le backend Express.

**Légende :** ✅ Migré | 🔧 Stub (structure OK, logique métier à copier) | ❌ Pas encore créé

## Auth
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | `/api/auth/login` (nouveau) | ✅ Remplacé par login Bearer token |
| `/api/auth/register` | POST | `/api/auth/register` | ✅ |
| `/api/auth/verify` | POST | `/api/auth/verify` | ✅ |
| `/api/auth/forgot-password` | POST | `/api/auth/forgot-password` | ✅ |
| `/api/auth/reset-password` | POST | `/api/auth/reset-password` | ✅ |
| — (nouveau) | GET | `/api/auth/me` | ✅ Session check mobile |
| — (nouveau) | POST | `/api/auth/refresh` | ✅ Refresh token mobile |

## Cards
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/cards/search` | GET | `/api/cards/search` | ✅ |
| `/api/cards/collection` | GET/POST/DELETE | `/api/cards/collection` | ✅ |
| `/api/cards/[cardId]/owned` | GET | `/api/cards/:cardId/owned` | ✅ |
| `/api/cards/[cardId]/price-history` | GET | `/api/cards/:cardId/price-history` | ✅ |
| `/api/cards/doubles` | GET | `/api/cards/doubles` | ✅ |
| `/api/binder/cards-by-rarity` | GET | `/api/cards/cards-by-rarity` | ✅ |

## Portfolio
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/portfolio` | GET/POST | `/api/portfolio` | ✅ |
| `/api/portfolio/[id]` | PUT/DELETE | `/api/portfolio/:id` | ✅ |
| `/api/portfolio/stats` | GET | `/api/portfolio/stats` | ✅ |
| `/api/portfolio/chart` | GET | `/api/portfolio/chart` | ✅ |
| `/api/portfolio/rarities` | GET | `/api/portfolio/rarities` | ✅ |
| `/api/portfolio/valuation` | POST | `/api/portfolio/valuation` | ✅ |

## Items
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/items` | GET | `/api/items` | ✅ |
| `/api/items/search` | GET | `/api/items/search` | ✅ |
| `/api/items/[id]` | GET | `/api/items/:id` | ✅ |
| `/api/items/[id]/price` | GET | `/api/items/:id/price` | ✅ |

## Scanner
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/scanner/identify` | POST | `/api/scanner/identify` | ✅ |
| `/api/scanner/correction` | POST | `/api/scanner/correction` | ✅ |
| `/api/scanner/search` | GET | `/api/scanner/search` | ✅ |

## Subscription
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/subscription/checkout` | POST | `/api/subscription/checkout` | ✅ |
| `/api/subscription/status` | GET | `/api/subscription/status` | ✅ |
| `/api/subscription/cancel` | POST | `/api/subscription/cancel` | ✅ |
| `/api/subscription/portal` | POST | `/api/subscription/portal` | ✅ |

## User
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/user/me` | GET | `/api/user/me` | ✅ |
| `/api/user/username` | PUT | `/api/user/username` | ✅ |
| `/api/user/points` | GET | `/api/user/points` | ✅ |
| `/api/user/quests/[questId]/complete` | POST | `/api/user/quests/:questId/complete` | ✅ |
| `/api/user/delete` | DELETE | `/api/user/delete` | ✅ |
| `/api/user/share-data` | GET | `/api/user/share-data` | ✅ |

## Profil
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/profil` | GET/PUT | `/api/profil` | ✅ |
| `/api/profil/avatar` | POST/DELETE | `/api/profil/avatar` | ✅ |
| `/api/avatar/[userId]` | GET | `/api/avatar/:userId` | ✅ |

## Quests
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/quests/daily-login/claim` | POST | `/api/quests/daily-login/claim` | ✅ |
| `/api/quests/daily-login/status` | GET | `/api/quests/daily-login/status` | ✅ |

## Referral
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/referral/apply` | POST | `/api/referral/apply` | ✅ |
| `/api/referral/stats` | GET | `/api/referral/stats` | ✅ |
| `/api/referral/leaderboard` | GET | `/api/referral/leaderboard` | ✅ |

## Wishlist
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/wishlist/cards/ids` | GET | `/api/wishlist/cards/ids` | ✅ |
| `/api/wishlist/cards` | GET/POST | `/api/wishlist/cards` | ✅ |
| `/api/wishlist/cards/bulk` | POST | `/api/wishlist/cards/bulk` | ✅ |
| `/api/wishlist/cards/[cardId]` | DELETE | `/api/wishlist/cards/:cardId` | ✅ |
| `/api/wishlist/cards/mark-acquired/[cardId]` | POST | `/api/wishlist/cards/mark-acquired/:cardId` | ✅ |

## Share
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/share/settings` | GET/PUT | `/api/share/settings` | ✅ |

## Blog
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/blog` | GET | `/api/blog` | ✅ |

## Leaderboard
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/leaderboard` | GET | `/api/leaderboard` | ✅ |

## Market
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/market` | GET | `/api/market` | ✅ |

## Feedback
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/feedback` | POST | `/api/feedback` | ✅ |

## Webhooks
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/webhooks/stripe` | POST | `/api/webhooks/stripe` | ✅ |
| `/api/webhooks/brevo` | POST | `/api/webhooks/brevo` | ✅ |
| `/api/webhooks/revenuecat` | POST | `/api/webhooks/revenuecat` | 🔧 À implémenter (Phase 4) |

## Beta
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/beta/activate` | POST | `/api/beta/activate` | ✅ |

## Prix
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/prices` | GET | `/api/prices` | ✅ |

## Public profiles & Trade
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/u/[slug]` | GET | `/api/u/:slug` | ✅ |
| `/api/users/search` | GET | `/api/users/search` | ✅ |
| `/api/users/suggested` | GET | `/api/users/suggested` | ✅ |
| `/api/users/[slug]/trade-calculator` | GET | `/api/users/:slug/trade-calculator` | ✅ |

## Newsletter
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/unsubscribe` | GET | `/api/unsubscribe` | ✅ |

## Routes NON migrées (web-only, pas nécessaires pour iOS)
| Route PWA | Raison |
|---|---|
| `/api/admin/revalidate-cards` | Admin-only, pas besoin côté mobile |
| `/api/proxy-image` | Web-only (CORS proxy), pas besoin en natif |
| `/api/scraper` | Cron Vercel — reste sur Vercel, pas dans Express |

---

## Résumé

- **✅ Migrés complets** : ~58 routes
- **🔧 Restant** : 1 route (revenuecat — Phase 4 iOS)
- **Ignorés** : 3 routes (admin + proxy-image + scraper = restent sur Vercel)
