'use client'

import { forwardRef } from 'react'

interface LeaderboardShareCardProps {
  rank: number | null
  totalParticipants: number
  username: string
  avatarUrl: string | null
  totalPoints: number
  cardCount: number
  referralCount: number
  questsCompleted: number
  questsTotal: number
}

// ─── Medal SVG ────────────────────────────────────────────────────────────────

function MedalSvg({ rank }: { rank: number }) {
  const gold   = { fill: '#F59E0B', stroke: '#D97706', text: '#92400E', ribbon1: '#3B82F6', ribbon2: '#2563EB' }
  const silver = { fill: '#94A3B8', stroke: '#64748B', text: '#1E293B', ribbon1: '#6B7280', ribbon2: '#4B5563' }
  const bronze = { fill: '#D97706', stroke: '#B45309', text: '#451A03', ribbon1: '#EF4444', ribbon2: '#DC2626' }
  const t = rank === 1 ? gold : rank === 2 ? silver : bronze

  return (
    <svg width="72" height="88" viewBox="0 0 72 88">
      {/* Ribbon top */}
      <polygon points="20,0 36,26 52,0" fill={t.ribbon1} />
      <polygon points="20,0 36,26 4,26" fill={t.ribbon2} />
      <polygon points="52,0 36,26 68,26" fill={t.ribbon2} />
      {/* Medal circle */}
      <circle cx="36" cy="57" r="28" fill={t.fill} stroke={t.stroke} strokeWidth="2.5" />
      <circle cx="36" cy="57" r="22" fill="none" stroke={t.stroke} strokeWidth="1" opacity="0.5" />
      <text x="36" y="65" textAnchor="middle" fill={t.text}
        fontSize="22" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">{rank}</text>
      {/* Crown for #1 */}
      {rank === 1 && (
        <polygon points="36,14 38.5,21 46,21 40,25.5 42.5,32.5 36,28 29.5,32.5 32,25.5 26,21 33.5,21"
          fill="#FFD700" opacity="0.95" />
      )}
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LeaderboardShareCard = forwardRef<HTMLDivElement, LeaderboardShareCardProps>(
  function LeaderboardShareCard(props, ref) {
    const {
      rank, username, avatarUrl, totalPoints,
      cardCount, referralCount, questsCompleted, questsTotal,
    } = props

    const proxiedAvatar = avatarUrl
      ? `/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`
      : null

    const stats = [
      { value: cardCount.toLocaleString('fr-FR'), label: 'cartes' },
      { value: referralCount.toString(),          label: 'parrainages' },
      { value: `${questsCompleted}/${questsTotal}`, label: 'quêtes' },
    ]

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          position: 'fixed',
          left: -9999,
          top: 0,
          backgroundColor: '#080C12',
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          color: 'white',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: -1,
        }}
      >
        {/* ── Pokémon background — very subtle texture ── */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/share-bg-pokemon.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.08,
            filter: 'saturate(0.3) brightness(0.6)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Radial dark overlay ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(8,12,18,0.3) 0%, rgba(8,12,18,0.85) 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Content ── */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          padding: '0 90px',
          boxSizing: 'border-box',
        }}>

          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            style={{ width: 110, height: 110, marginBottom: 10, objectFit: 'contain' }}
          />
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2, marginBottom: 44 }}>
            <span style={{ color: '#FFFFFF' }}>POKE</span>
            <span style={{ color: '#D4A853' }}>ITEM</span>
          </div>

          {/* ── MAIN CARD BLOCK ── */}
          <div style={{
            width: '100%',
            backgroundColor: '#111B27',
            borderRadius: 24,
            border: '1px solid #1C2C3C',
            padding: '44px 48px',
            marginBottom: 32,
            boxSizing: 'border-box',
          }}>

            {/* Rank + Medal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 36,
            }}>
              <span style={{
                fontSize: 100,
                fontWeight: 900,
                color: '#D4A853',
                lineHeight: 1,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                #{rank ?? '—'}
              </span>
              {rank != null && rank <= 3
                ? <MedalSvg rank={rank} />
                : <span style={{ fontSize: 40, fontWeight: 700, color: '#4B5563' }}>
                    {rank != null ? `#${rank}` : '—'}
                  </span>
              }
            </div>

            {/* Avatar + Username + Points */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 36,
            }}>
              {/* Avatar */}
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '3px solid #D4A853',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#1C2C3C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {proxiedAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proxiedAvatar}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <span style={{ fontSize: 40, fontWeight: 700, color: '#D4A853' }}>
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Username + Points */}
              <div>
                <div style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginBottom: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 580,
                }}>
                  {username}
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: '#F5C542',
                }}>
                  {'★ '}{totalPoints.toLocaleString('fr-FR')}{' pts'}
                </div>
              </div>
            </div>

            {/* Stats — inside the block, separated by border-top */}
            <div style={{
              borderTop: '1px solid #1C2C3C',
              paddingTop: 28,
              display: 'flex',
            }}>
              {stats.map((stat, i) => (
                <div key={i} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  borderRight: i < stats.length - 1 ? '1px solid #1C2C3C' : 'none',
                }}>
                  <span style={{ fontSize: 34, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 16, color: '#6B7F95' }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 200,
              height: 1,
              background: 'linear-gradient(90deg, transparent, #D4A853, transparent)',
            }} />
            <span style={{ fontSize: 18, fontWeight: 500, color: '#4A5568', letterSpacing: 1.5 }}>
              app.pokeitem.fr
            </span>
          </div>

        </div>
      </div>
    )
  }
)
