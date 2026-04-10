'use client'
import { useRouter } from 'next/navigation'

interface ProButtonProps {
  size?: 'sm' | 'md'
  className?: string
}

const GOLD_GRADIENT = 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)'
const GOLD_SHADOW = '0 2px 8px rgba(191, 149, 63, 0.35)'

export function ProButton({ size = 'sm', className = '' }: ProButtonProps) {
  const router = useRouter()

  const sizeClasses =
    size === 'sm'
      ? 'px-3 py-0.5 text-[11px]'
      : 'px-4 py-1.5 text-sm'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); router.push('/pricing') }}
      style={{
        background: GOLD_GRADIENT,
        boxShadow: GOLD_SHADOW,
        color: '#1A1A1A',
      }}
      className={`inline-flex items-center gap-1 rounded-full font-bold tracking-wide transition-all hover:brightness-110 active:scale-95 ${sizeClasses} ${className}`}
    >
      ★ PREMIUM
    </button>
  )
}
