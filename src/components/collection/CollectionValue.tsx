interface CollectionValueProps {
  value: number
  className?: string
}

export function CollectionValue({ value, className }: CollectionValueProps) {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)

  return <span className={className}>{formatted}</span>
}
