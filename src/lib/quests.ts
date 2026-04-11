// ─── Quest definitions ────────────────────────────────────────────────────────

export interface QuestDefinition {
  id: string
  title: string
  description: string
  points: number
  icon: string
  type: "progressive" | "action"
  target?: number
  actionUrl?: string
  actionLabel?: string
  verifiable: boolean
  active: boolean
}

export const QUESTS: QuestDefinition[] = [
  // 0 — Connexion quotidienne (daily recurring — handled separately)
  {
    id: "daily_login",
    title: "Connexion quotidienne",
    description: "Reviens chaque jour pour gagner tes points !",
    points: 250,
    icon: "🌟",
    type: "action",
    verifiable: false,
    active: true,
  },
  // 1 — Rejoindre la communauté Telegram
  {
    id: "join_telegram",
    title: "Rejoindre la communauté",
    description: "Rejoins notre groupe Telegram officiel",
    points: 2000,
    icon: "✈️",
    type: "action",
    actionUrl: "https://t.me/pokeitem",
    actionLabel: "Rejoindre",
    verifiable: false,
    active: true,
  },
  // 2 — Follow Instagram
  {
    id: "follow_instagram",
    title: "Follow Instagram",
    description: "Suis-nous sur Instagram",
    points: 500,
    icon: "📸",
    type: "action",
    actionUrl: "https://www.instagram.com/pokeitemfr",
    actionLabel: "S'abonner",
    verifiable: false,
    active: true,
  },
  // 3 — Follow TikTok
  {
    id: "follow_tiktok",
    title: "Follow TikTok",
    description: "Suis-nous sur TikTok",
    points: 500,
    icon: "🎵",
    type: "action",
    actionUrl: "https://www.tiktok.com/@pokeitemfr",
    actionLabel: "S'abonner",
    verifiable: false,
    active: true,
  },
  // 4 — Follow YouTube
  {
    id: "follow_youtube",
    title: "S'abonner sur Youtube",
    description: "Abonne-toi à notre chaîne YouTube",
    points: 500,
    icon: "▶️",
    type: "action",
    actionUrl: "https://youtube.com/@pokeitem",
    actionLabel: "S'abonner",
    verifiable: false,
    active: true,
  },
  // 5 — Installer l'app
  {
    id: "install_pwa",
    title: "Installer l'app",
    description: "Ajoute PokeItem à ton écran d'accueil",
    points: 1000,
    icon: "📲",
    type: "action",
    verifiable: false,
    active: true,
  },
  // 5 — Partager mon classement
  {
    id: "share_leaderboard",
    title: "Partager mon classement",
    description: "Partage ta carte de classement",
    points: 1000,
    icon: "🏆",
    type: "action",
    actionLabel: "Télécharger l'image",
    verifiable: false,
    active: true,
  },
  // 6 — Collectionneur aguerri
  {
    id: "add_500_cards",
    title: "Collectionneur aguerri",
    description: "Ajoute 500 cartes à ton classeur",
    points: 1000,
    icon: "🃏",
    type: "progressive",
    target: 500,
    verifiable: true,
    active: true,
  },
  // 7 — Explorateur
  {
    id: "three_extensions",
    title: "Explorateur",
    description: "Possède au moins une carte de 3 extensions différentes",
    points: 500,
    icon: "🗺️",
    type: "progressive",
    target: 3,
    verifiable: true,
    active: true,
  },
  // 8 — Collection 1 000 €
  {
    id: "collection_1000",
    title: "Collection 1 000 €",
    description: "Atteins 1 000 € de valeur de collection",
    points: 500,
    icon: "💰",
    type: "progressive",
    target: 1000,
    verifiable: true,
    active: true,
  },
]

export const ACTIVE_QUESTS = QUESTS.filter(q => q.active)

export const QUEST_MAP = Object.fromEntries(QUESTS.map(q => [q.id, q]))

// Points awarded per validated referral
export const REFERRAL_POINTS = 1000
