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
]

export const ACTIVE_QUESTS = QUESTS.filter(q => q.active)

export const QUEST_MAP = Object.fromEntries(QUESTS.map(q => [q.id, q]))

// Points awarded per validated referral
export const REFERRAL_POINTS = 1000
