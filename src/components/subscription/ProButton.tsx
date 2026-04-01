'use client'
import { useRouter } from 'next/navigation'

interface ProButtonProps {
  /** Size variant */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Rainbow-gradient "★ Pro" pill button that redirects to /pricing.
 * Used wherever a feature is gated behind a Pro subscription.
 */
export function ProButton({ size = 'sm', className = '' }: ProButtonProps) {
  const router = useRouter()

  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-xs'
      : 'px-4 py-1.5 text-sm'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); router.push('/pricing') }}
      style={{
        background: 'linear-gradient(135deg, #ffd6e0 0%, #c8b6e2 25%, #b8d8f8 50%, #b8f0d0 75%, #f8f0b8 100%)',
      }}
      className={`inline-flex items-center gap-1 rounded-full font-bold text-black/80 transition-opacity hover:opacity-90 ${sizeClasses} ${className}`}
    >
      ★ Pro
    </button>
  )
}
