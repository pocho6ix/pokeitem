export const CONTEST_CONFIG = {
  active:       true,
  endDate:      "2026-05-31T17:00:00+02:00", // 31 mai 2026, 17h heure de Paris
  title:        "Concours",
  prizeMain:    "une UPC Flammes Fantasmagoriques",
  prizeDetails: "cartes et/ou item scellé",
  prizeImageUrl: null as string | null, // set to "/contest/prize.jpg" when ready
} as const
