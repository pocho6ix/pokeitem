'use client'
import { useState } from 'react'
import type { BlocCardProgress } from '@/types/card'
import { BlocSerieCardList } from '@/components/cards/BlocSerieCardList'
import { BinderRarityView } from '@/components/cards/BinderRarityView'

interface Props {
  blocs: BlocCardProgress[]
  baseUrl: string
}

export function BinderCartesWrapper({ blocs, baseUrl }: Props) {
  const [viewMode, setViewMode] = useState<'extensions' | 'rarities'>('extensions')

  return (
    <div>
      {/* View mode toggle */}
      <div className="mb-5 flex justify-end">
        <div
          style={{
            display: 'flex',
            gap: 4,
            backgroundColor: '#111B27',
            borderRadius: 10,
            padding: 3,
          }}
        >
          <button
            onClick={() => setViewMode('extensions')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
              backgroundColor: viewMode === 'extensions' ? '#1E2D3D' : 'transparent',
              color: viewMode === 'extensions' ? '#FFFFFF' : '#6B7F95',
            }}
          >
            Extensions
          </button>
          <button
            onClick={() => setViewMode('rarities')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
              backgroundColor: viewMode === 'rarities' ? '#1E2D3D' : 'transparent',
              color: viewMode === 'rarities' ? '#FFFFFF' : '#6B7F95',
            }}
          >
            Raretés
          </button>
        </div>
      </div>

      {viewMode === 'extensions' ? (
        <BlocSerieCardList blocs={blocs} baseUrl={baseUrl} />
      ) : (
        <BinderRarityView />
      )}
    </div>
  )
}
