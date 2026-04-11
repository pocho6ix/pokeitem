/**
 * Utilities for Europe/Paris timezone handling.
 * Used by the daily login quest to determine "today" in Paris time.
 */

const TZ = "Europe/Paris"

/** Returns the Paris date string for a given UTC date, format "YYYY-MM-DD" */
export function getParisDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("sv-SE", { timeZone: TZ })
}

/**
 * Returns the UTC Date corresponding to midnight (00:00:00) today in Europe/Paris.
 * Works correctly for both UTC+1 (winter) and UTC+2 (summer/DST).
 */
export function getParisStartOfDay(date: Date = new Date()): Date {
  const parisDate = getParisDateString(date) // "YYYY-MM-DD"
  const [year, month, day] = parisDate.split("-").map(Number)

  // Try UTC+2 first (CEST, summer), then UTC+1 (CET, winter)
  for (const offsetHours of [2, 1]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0))
    if (getParisDateString(candidate) === parisDate) return candidate
  }

  // Should never reach here, but safe fallback
  return new Date(Date.UTC(year, month - 1, day, -1, 0, 0))
}

/**
 * Returns the UTC Date corresponding to midnight (00:00:00) tomorrow in Europe/Paris.
 * This is when the next daily claim becomes available.
 */
export function getParisNextMidnight(date: Date = new Date()): Date {
  const parisDate = getParisDateString(date) // "YYYY-MM-DD"
  const [year, month, day] = parisDate.split("-").map(Number)
  // Midnight tomorrow in Paris = start of (today+1) in Paris
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1))
  return getParisStartOfDay(tomorrow)
}
