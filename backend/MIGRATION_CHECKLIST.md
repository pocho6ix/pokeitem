# Migration API Routes — Checklist

Ce fichier trace chaque route API de la PWA Next.js et son statut dans le backend Express.

**Légende :** ✅ Migré | 🔧 Stub (structure OK, logique métier à copier) | ❌ Pas encore créé

## Auth
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | `/api/auth/login` (nouveau) | ✅ Remplacé par login Bearer token |
| `/api/auth/register` | POST | `/api/auth/register` | 🔧 Manque: emails Brevo, referral points |
| `/api/auth/verify` | POST | `/api/auth/verify` | ✅ |
| `/api/auth/forgot-password` | POST | `/api/auth/forgot-password` | 🔧 Manque: envoi email Brevo |
| `/api/auth/reset-password` | POST | `/api/auth/reset-password` | ✅ |
| — (nouveau) | GET | `/api/auth/me` | ✅ Session check mobile |
| — (nouveau) | POST | `/api/auth/refresh` | ✅ Refresh token mobile |

## Cards
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/cards/search` | GET | `/api/cards/search` | ✅ |
| `/api/cards/collection` | GET/POST/DELETE | `/api/cards/collection` | 🔧 Manque: check limites FREE |
| `/api/cards/[cardId]/owned` | GET | `/api/cards/:cardId/owned` | ✅ |
| `/api/cards/[cardId]/price-history` | GET | `/api/cards/:cardId/price-history` | ✅ |
| `/api/cards/doubles` | GET | `/api/cards/doubles` | ✅ |

## Portfolio
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/portfolio` | GET/POST | `/api/portfolio` | 🔧 Manque: check limites FREE |
| `/api/portfolio/[id]` | PUT/DELETE | `/api/portfolio/:id` | ✅ |
| `/api/portfolio/stats` | GET | `/api/portfolio/stats` | ✅ |
| `/api/portfolio/chart` | GET | `/api/portfolio/chart` | 🔧 Logique à copier |
| `/api/portfolio/rarities` | GET | `/api/portfolio/rarities` | 🔧 Logique à copier |
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
| `/api/scanner/identify` | POST | `/api/scanner/identify` | 🔧 Manque: appel Anthropic API |
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
| `/api/user/quests/[questId]/complete` | POST | `/api/user/quests/:questId/complete` | 🔧 Validation conditions |
| `/api/user/delete` | DELETE | `/api/user/delete` | 🔧 Manque: cleanup Stripe |
| `/api/user/share-data` | GET | `/api/user/share-data` | ✅ |

## Profil
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/profil` | GET/PUT | `/api/profil` | ✅ |
| `/api/profil/avatar` | POST/DELETE | `/api/profil/avatar` | 🔧 Manque: upload Vercel Blob |

## Quests
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/quests/daily-login/claim` | POST | `/api/quests/daily-login/claim` | ✅ |
| `/api/quests/daily-login/status` | GET | `/api/quests/daily-login/status` | ✅ |

## Referral
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/referral/apply` | POST | `/api/referral/apply` | 🔧 Manque: reward logic |
| `/api/referral/stats` | GET | `/api/referral/stats` | ✅ |
| `/api/referral/leaderboard` | GET | `/api/referral/leaderboard` | 🔧 Logique à copier |

## Wishlist
| Route PWA | Méthode | Express | Statut |
|---|---|---|---|
| `/api/wishlist/cards/ids` | GET | `/api/wishlist/cards/ids` | ✅ |
| `/api/wishlist/cards` | GET/POST | `/api/wishlist/cards` | ✅ |
| `/api/wishlist/cards/bulk` | POST | `/api/wishlist/cards/bulk` | 🔧 Logique à copier |
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
| `/api/webhooks/stripe` | POST | `/api/webhooks/stripe` | 🔧 Manque: logique complète subscription.updated/deleted |
| `/api/webhooks/brevo` | POST | `/api/webhooks/brevo` | 🔧 Logique à copier |
| `/api/webhooks/revenuecat` | POST | `/api/webhooks/revenuecat` | 🔧 À implémenter (Phase 4) |

## Routes NON migrées (web-only, pas nécessaires pour iOS)
| Route PWA | Raison |
|---|---|
| `/api/admin/revalidate-cards` | Admin-only, pas besoin côté mobile |
| `/api/avatar/[userId]` | ❌ À ajouter dans profil routes |
| `/api/beta/activate` | ❌ À ajouter si beta toujours active |
| `/api/binder/cards-by-rarity` | ❌ À ajouter dans cards routes |
| `/api/prices` | ❌ À ajouter (route prix globale) |
| `/api/proxy-image` | Web-only (CORS proxy), pas besoin en natif |
| `/api/u/[slug]` | ❌ Public profile — à ajouter |
| `/api/unsubscribe` | ❌ Newsletter opt-out — à ajouter |
| `/api/users/[slug]/trade-calculator` | ❌ À ajouter |
| `/api/users/search` | ❌ À ajouter |
| `/api/users/suggested` | ❌ À ajouter |
| `/api/scraper` | Cron Vercel — reste sur Vercel, pas dans Express |

---

## Résumé

- **✅ Migrés complets** : ~35 routes
- **🔧 Stubs à compléter** : ~15 routes (logique métier à copier depuis la PWA)
- **❌ À créer** : ~8 routes secondaires
- **Ignorés** : 2 routes (admin + scraper = restent sur Vercel)
