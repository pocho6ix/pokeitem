'use client'
import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'

interface HomeCollectionWidgetProps {
  total: number
  cardsValue: number
  sealedValue: number
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function HomeCollectionWidget({ total, cardsValue, sealedValue }: HomeCollectionWidgetProps) {
  return (
    <Link
      href="/portfolio"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-5 py-4 hover:border-[#E7BA76]/40 hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-[#E7BA76]/10 p-2.5 shrink-0">
          <TrendingUp className="h-5 w-5 text-[#E7BA76]" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)]">Valeur de ma collection</p>
          <p className="text-xl font-bold text-[#E7BA76] font-data">{fmt(total)}</p>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Cartes&nbsp;
            <span className="font-medium text-[var(--text-secondary)]">{fmt(cardsValue, 0)}</span>
            &nbsp;·&nbsp;Scellés&nbsp;
            <span className="font-medium text-[var(--text-secondary)]">{fmt(sealedValue, 0)}</span>
          </p>
        </div>
      </div>
      <ArrowRight className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-[#E7BA76] transition-colors shrink-0" />
    </Link>
  )
}
