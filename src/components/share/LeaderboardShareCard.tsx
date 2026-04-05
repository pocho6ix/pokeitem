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
  const themes: Record<number, {
    ringOuter: string; ringInner: string
    fill1: string; fill2: string
    textColor: string
  }> = {
    1: { ringOuter: '#FFE066', ringInner: '#D4A853', fill1: '#FFF5C0', fill2: '#C8861A', textColor: '#6B3A00' },
    2: { ringOuter: '#E2E8F0', ringInner: '#94A3B8', fill1: '#F8FAFC', fill2: '#718096', textColor: '#2D3748' },
    3: { ringOuter: '#FBBF24', ringInner: '#B45309', fill1: '#FDE68A', fill2: '#92400E', textColor: '#451A03' },
  }
  const t = themes[rank]

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <radialGradient id={`mf${rank}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={t.fill1} />
          <stop offset="100%" stopColor={t.fill2} />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="44" fill="none" stroke={t.ringOuter} strokeWidth="3" opacity="0.8" />
      <circle cx="60" cy="60" r="37" fill="none" stroke={t.ringInner} strokeWidth="1.5" opacity="0.9" />
      <circle cx="60" cy="60" r="33" fill={`url(#mf${rank})`} />
      <text x="60" y="75" textAnchor="middle" fill={t.textColor} fontSize="38" fontWeight="900"
        fontFamily="Inter, system-ui, sans-serif">{rank}</text>
      {rank === 1 && (
        <polygon points="60,4 63,14 73,14 65,20 68,30 60,24 52,30 55,20 47,14 57,14"
          fill="#FFD700" opacity="0.95" />
      )}
    </svg>
  )
}

// ─── Trophy SVG ───────────────────────────────────────────────────────────────

function TrophySvg() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4M7 4H5a2 2 0 00-2 2v1a4 4 0 004 4h1M17 4h2a2 2 0 012 2v1a4 4 0 01-4 4h-1"
        stroke="#F5C542" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 4h10v7a5 5 0 01-10 0V4z" fill="#F5C542" opacity="0.25"/>
      <path d="M7 4h10v7a5 5 0 01-10 0V4z" stroke="#F5C542" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LeaderboardShareCard = forwardRef<HTMLDivElement, LeaderboardShareCardProps>(
  function LeaderboardShareCard(props, ref) {
    const { rank, totalParticipants, username, avatarUrl, totalPoints, cardCount, referralCount, questsCompleted, questsTotal } = props

    const proxiedAvatar = avatarUrl
      ? `/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`
      : null

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          position: 'fixed',
          left: -9999,
          top: 0,
          backgroundColor: '#0C1219',
          overflow: 'hidden',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'white',
          zIndex: -1,
        }}
      >
        {/* ─── Pokémon background — visible only in margins ─── */}
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
            opacity: 0.18,
            filter: 'saturate(0.6) brightness(0.7)',
            pointerEvents: 'none',
          }}
        />

        {/* ─── All content — above the background ─── */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '60px 50px',
          boxSizing: 'border-box',
        }}>

          {/* ─── LOGO ─── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#0C1219',
            borderRadius: 24,
            padding: '30px 80px',
            border: '1px solid #1E2D3D',
          }}>
            <div style={{ position: 'relative', width: 130, height: 130 }}>
              <div style={{
                position: 'absolute',
                top: -40, left: -40, right: -40, bottom: -40,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)',
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt=""
                style={{ width: 130, height: 130, position: 'relative', zIndex: 1, objectFit: 'contain' }} />
            </div>
            <div style={{ marginTop: 14, fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>
              <span style={{ color: '#FFFFFF' }}>POKE</span>
              <span style={{ color: '#D4A853' }}>ITEM</span>
            </div>
          </div>

          {/* ─── MAIN BLOCK ─── */}
          <div style={{
            width: '100%',
            backgroundColor: '#111C2A',
            borderRadius: 28,
            padding: 40,
            border: '1px solid #1E2D3D',
            boxSizing: 'border-box',
          }}>

            {/* Rang + Médaille */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>

              {/* RANG */}
              <div style={{
                flex: 1,
                backgroundColor: '#0C1219',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
              }}>
                <svg width="100%" height="130" viewBox="0 0 560 130" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="rankGold" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F5DEB3" />
                      <stop offset="100%" stopColor="#D4A853" />
                    </linearGradient>
                  </defs>
                  <text x="280" y="115" textAnchor="middle" fill="url(#rankGold)"
                    fontSize="120" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
                    {rank != null ? `#${rank}/${totalParticipants}` : '—'}
                  </text>
                </svg>
              </div>

              {/* MÉDAILLE */}
              <div style={{
                width: 210,
                backgroundColor: '#0C1219',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '36px 20px',
              }}>
                {rank != null && rank <= 3 ? (
                  <MedalSvg rank={rank} />
                ) : (
                  <span style={{ fontSize: 40, fontWeight: 700, color: '#4B5563' }}>
                    {rank != null ? `#${rank}` : '—'}
                  </span>
                )}
              </div>
            </div>

            {/* Avatar + Username + Points */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>

              {/* AVATAR */}
              <div style={{
                width: 140,
                height: 140,
                borderRadius: '50%',
                border: '4px solid #D4A853',
                boxShadow: '0 0 20px rgba(212,168,83,0.3)',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#0C1219',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {proxiedAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proxiedAvatar} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    crossOrigin="anonymous" />
                ) : (
                  <span style={{ fontSize: 52, fontWeight: 700, color: '#D4A853' }}>
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* USERNAME + POINTS */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginBottom: 16,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {username}
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#0C1219',
                  border: '1px solid #2A3D4F',
                  borderRadius: 14,
                  padding: '10px 20px',
                }}>
                  <TrophySvg />
                  <span style={{
                    fontSize: 38,
                    fontWeight: 800,
                    color: '#F5C542',
                    letterSpacing: 0.5,
                  }}>
                    {totalPoints.toLocaleString('fr-FR')} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── STATS CAPSULES ─── */}
          <div style={{ display: 'flex', gap: 16, width: '100%' }}>
            {[
              { value: cardCount.toLocaleString('fr-FR'), label: 'cartes' },
              { value: referralCount.toString(), label: 'parrainages' },
              { value: `${questsCompleted}/${questsTotal}`, label: 'quêtes' },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1,
                backgroundColor: '#111C2A',
                border: '1px solid #1E2D3D',
                borderRadius: 20,
                padding: '28px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 18, color: '#8899AA' }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* ─── FOOTER ─── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#0C1219',
            borderRadius: 16,
            padding: '18px 60px',
            border: '1px solid #1E2D3D',
          }}>
            <div style={{
              width: 320,
              height: 1,
              background: 'linear-gradient(90deg, transparent, #D4A853, transparent)',
            }} />
            <span style={{ fontSize: 22, fontWeight: 600, color: '#D4A853', letterSpacing: 1.5 }}>
              app.pokeitem.fr
            </span>
          </div>

        </div>
      </div>
    )
  }
)
