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

// ─── Modern medal SVG ─────────────────────────────────────────────────────────

function MedalSvg({ rank }: { rank: number }) {
  const themes: Record<number, {
    ringOuter: string; ringInner: string
    fill1: string; fill2: string
    textColor: string; glowColor: string
  }> = {
    1: { ringOuter: '#FFE066', ringInner: '#D4A853', fill1: '#FFF5C0', fill2: '#C8861A', textColor: '#6B3A00', glowColor: 'rgba(255,215,0,0.35)' },
    2: { ringOuter: '#E2E8F0', ringInner: '#94A3B8', fill1: '#F8FAFC', fill2: '#718096', textColor: '#2D3748', glowColor: 'rgba(192,192,192,0.3)' },
    3: { ringOuter: '#FBBF24', ringInner: '#B45309', fill1: '#FDE68A', fill2: '#92400E', textColor: '#451A03', glowColor: 'rgba(180,83,9,0.3)' },
  }
  const t = themes[rank]

  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <defs>
        <radialGradient id={`mf${rank}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={t.fill1} />
          <stop offset="100%" stopColor={t.fill2} />
        </radialGradient>
        <radialGradient id={`mglow${rank}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={t.glowColor} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {/* Glow */}
      <circle cx="55" cy="58" r="48" fill={`url(#mglow${rank})`} />
      {/* Outer ring */}
      <circle cx="55" cy="58" r="42" fill="none" stroke={t.ringOuter} strokeWidth="3" opacity="0.6" />
      {/* Thin ring */}
      <circle cx="55" cy="58" r="36" fill="none" stroke={t.ringInner} strokeWidth="1.5" opacity="0.8" />
      {/* Fill */}
      <circle cx="55" cy="58" r="33" fill={`url(#mf${rank})`} />
      {/* Number */}
      <text x="55" y="70" textAnchor="middle" fill={t.textColor} fontSize="36" fontWeight="900"
        fontFamily="Inter, system-ui, sans-serif">{rank}</text>
      {/* Crown / stars for #1 */}
      {rank === 1 && (
        <>
          <polygon points="55,8 58,17 67,17 60,23 63,32 55,26 47,32 50,23 43,17 52,17"
            fill="#FFD700" opacity="0.9" />
        </>
      )}
      {/* Small dots decoration for #2 and #3 */}
      {rank !== 1 && [0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        return (
          <circle key={i}
            cx={55 + 45 * Math.cos(rad)}
            cy={58 + 45 * Math.sin(rad)}
            r="2.5"
            fill={t.ringOuter}
            opacity="0.5"
          />
        )
      })}
    </svg>
  )
}

// ─── Trophy SVG ───────────────────────────────────────────────────────────────

function TrophySvg() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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

    // BG_SOLID: opaque dark used behind all text/content areas
    const BG_SOLID  = 'rgba(7, 13, 22, 0.92)'
    const BG_INNER  = 'rgba(5, 10, 18, 0.96)'

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          position: 'fixed',
          left: -9999,
          top: 0,
          background: 'radial-gradient(ellipse at 50% 30%, #152238 0%, #0F1923 40%, #0A0E14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'white',
          overflow: 'hidden',
          gap: 44,
          padding: '60px',
          zIndex: -1,
          boxSizing: 'border-box',
        }}
      >
        {/* ─── Pokémon background ─── */}
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
            opacity: 0.32,
            filter: 'saturate(0.55) brightness(0.65)',
            pointerEvents: 'none',
          }}
        />
        {/* Very light overlay — just enough to ensure readability at edges */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(7,13,22,0.45) 0%, rgba(7,13,22,0.05) 20%, rgba(7,13,22,0.05) 80%, rgba(7,13,22,0.45) 100%)',
          pointerEvents: 'none',
        }} />

        {/* ─── Decorative particles ─── */}
        {[
          { top: 90,   left: 130,  size: 5, opacity: 0.5 },
          { top: 175,  left: 960,  size: 4, opacity: 0.4 },
          { top: 310,  left: 60,   size: 4, opacity: 0.35 },
          { top: 490,  left: 1010, size: 6, opacity: 0.4 },
          { top: 820,  left: 40,   size: 5, opacity: 0.3 },
          { top: 860,  left: 1020, size: 4, opacity: 0.35 },
          { top: 1100, left: 80,   size: 4, opacity: 0.28 },
          { top: 1200, left: 970,  size: 3, opacity: 0.3 },
          { top: 1580, left: 100,  size: 5, opacity: 0.4 },
          { top: 1700, left: 950,  size: 4, opacity: 0.32 },
          { top: 1800, left: 200,  size: 3, opacity: 0.25 },
        ].map((dot, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background: '#D4A853',
            opacity: dot.opacity,
          }} />
        ))}

        {/* ─── LOGO — opaque background ─── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          background: BG_SOLID,
          borderRadius: 28,
          padding: '36px 80px 28px',
        }}>
          <div style={{ position: 'relative', width: 140, height: 140 }}>
            <div style={{
              position: 'absolute',
              top: -50, left: -50, right: -50, bottom: -50,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,168,83,0.45) 0%, rgba(212,168,83,0.1) 45%, transparent 70%)',
            }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt=""
              style={{ width: 140, height: 140, position: 'relative', zIndex: 1, objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: 2 }}>
            <span style={{ color: '#FFFFFF' }}>POKE</span>
            <span style={{ color: '#D4A853' }}>ITEM</span>
          </div>
        </div>

        {/* ─── MAIN BLOCK — fully opaque ─── */}
        <div style={{
          width: '100%',
          background: BG_SOLID,
          border: '1px solid rgba(231,186,118,0.15)',
          borderRadius: 36,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          boxSizing: 'border-box',
        }}>

          {/* Rang + Médaille */}
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Rang */}
            <div style={{
              flex: 1,
              background: BG_INNER,
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '44px 20px',
            }}>
              <svg width="280" height="130" viewBox="0 0 280 130" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="rankGold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F5DEB3" />
                    <stop offset="100%" stopColor="#D4A853" />
                  </linearGradient>
                </defs>
                <text x="140" y="115" textAnchor="middle" fill="url(#rankGold)"
                  fontSize="120" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
                  {rank != null ? `#${rank}/${totalParticipants}` : '—'}
                </text>
              </svg>
            </div>

            {/* Médaille */}
            <div style={{
              width: 220,
              background: BG_INNER,
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '44px 20px',
            }}>
              {rank != null && rank <= 3 ? (
                <MedalSvg rank={rank} />
              ) : (
                <span style={{ fontSize: 44, fontWeight: 700, color: '#4B5563' }}>
                  {rank != null ? `#${rank}` : '—'}
                </span>
              )}
            </div>
          </div>

          {/* Avatar + Username/Points */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {/* Avatar */}
            <div style={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              border: '4px solid #D4A853',
              boxShadow: '0 0 24px rgba(212,168,83,0.4)',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#2A3A4A',
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
                <span style={{ fontSize: 56, fontWeight: 700, color: '#D4A853' }}>
                  {username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Username + Points */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 42,
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: 18,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {username}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(245,197,66,0.12)',
                border: '1px solid rgba(245,197,66,0.3)',
                borderRadius: 16,
                padding: '10px 22px',
              }}>
                <TrophySvg />
                <span style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color: '#F5C542',
                  textShadow: '0 0 20px rgba(245,197,66,0.5), 0 2px 6px rgba(0,0,0,0.5)',
                  letterSpacing: 0.5,
                }}>
                  {totalPoints.toLocaleString('fr-FR')} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── STATS CAPSULES — opaque ─── */}
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          {[
            { value: cardCount.toLocaleString('fr-FR'), label: 'cartes' },
            { value: referralCount.toString(), label: 'parrainages' },
            { value: `${questsCompleted}/${questsTotal}`, label: 'quêtes' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              background: BG_SOLID,
              border: '1px solid rgba(231,186,118,0.12)',
              borderRadius: 24,
              padding: '36px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 19, color: '#9CA3AF' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ─── FOOTER — opaque, lien visible ─── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          background: BG_SOLID,
          borderRadius: 20,
          padding: '20px 60px',
        }}>
          <div style={{ width: 400, height: 1, background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }} />
          <span style={{
            fontSize: 26,
            fontWeight: 600,
            color: '#D4A853',
            letterSpacing: 1.5,
          }}>
            app.pokeitem.fr
          </span>
        </div>
      </div>
    )
  }
)
