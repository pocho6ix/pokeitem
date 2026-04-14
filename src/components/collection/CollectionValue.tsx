interface CollectionValueProps {
  value: number
  className?: string
}

// Deterministic fr-FR currency formatter — avoids the Intl.NumberFormat
// hydration mismatch (Node's ICU uses U+202F narrow NBSP as the grouping
// separator while V8's ICU sometimes uses U+00A0, which makes React trash
// the whole subtree on hydration).
function formatEuroFr(value: number): string {
  const negative = value < 0
  const cents = Math.round(Math.abs(value) * 100)
  const intPart = Math.floor(cents / 100).toString()
  const decPart = (cents % 100).toString().padStart(2, '0')
  // Group thousands with a regular space (matches what users typically see)
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${negative ? '-' : ''}${grouped},${decPart}\u00a0€`
}

export function CollectionValue({ value, className }: CollectionValueProps) {
  return <span className={className}>{formatEuroFr(value)}</span>
}
