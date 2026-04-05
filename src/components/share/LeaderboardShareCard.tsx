'use client'

import { forwardRef } from 'react'

interface LeaderboardShareCardProps {
  rank: number | null
  username: string
  avatarUrl: string | null
  totalPoints: number
  cardCount: number
  referralCount: number
  questsCompleted: number
  questsTotal: number
}

// ─── Medal SVG (no emoji — consistent rendering in html2canvas) ───────────────

function MedalSvg({ rank }: { rank: number }) {
  const colors: Record<number, { ribbon1: string; ribbon2: string; circle: string; inner: string; text: string }> = {
    1: { ribbon1: '#1D4ED8', ribbon2: '#DC2626', circle: '#FFD700', inner: '#FFF176', text: '#92400E' },
    2: { ribbon1: '#475569', ribbon2: '#94A3B8', circle: '#C0C0C0', inner: '#E2E8F0', text: '#374151' },
    3: { ribbon1: '#92400E', ribbon2: '#B45309', circle: '#CD7F32', inner: '#F59E0B', text: '#451A03' },
  }
  const c = colors[rank] ?? colors[3]
  const num = rank <= 3 ? rank.toString() : `#${rank}`
  return (
    <svg width="100" height="120" viewBox="0 0 100 120">
      <defs>
        <radialGradient id={`medal${rank}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor={c.inner} />
          <stop offset="100%" stopColor={c.circle} />
        </radialGradient>
      </defs>
      {/* Ribbon */}
      <polygon points="30,0 50,38 70,0" fill={c.ribbon1} />
      <polygon points="30,0 50,38 10,38" fill={c.ribbon2} />
      <polygon points="70,0 50,38 90,38" fill={c.ribbon2} />
      {/* Circle */}
      <circle cx="50" cy="76" r="38" fill={`url(#medal${rank})`} stroke={c.circle} strokeWidth="2" />
      {/* Number */}
      <text x="50" y="87" textAnchor="middle" fill={c.text} fontSize="32" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
        {num}
      </text>
    </svg>
  )
}

// ─── Trophy SVG ───────────────────────────────────────────────────────────────

function TrophySvg() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4M7 4H5a2 2 0 00-2 2v1a4 4 0 004 4h1M17 4h2a2 2 0 012 2v1a4 4 0 01-4 4h-1" stroke="#E7BA76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 4h10v7a5 5 0 01-10 0V4z" fill="#E7BA76" opacity="0.3"/>
      <path d="M7 4h10v7a5 5 0 01-10 0V4z" stroke="#E7BA76" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LeaderboardShareCard = forwardRef<HTMLDivElement, LeaderboardShareCardProps>(
  function LeaderboardShareCard(props, ref) {
    const { rank, username, avatarUrl, totalPoints, cardCount, referralCount, questsCompleted, questsTotal } = props

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
        {/* ─── Decorative particles ─── */}
        {[
          { top: 90,  left: 130,  size: 5, opacity: 0.4 },
          { top: 175, left: 960,  size: 4, opacity: 0.3 },
          { top: 310, left: 60,   size: 4, opacity: 0.25 },
          { top: 490, left: 1010, size: 6, opacity: 0.3 },
          { top: 820, left: 40,   size: 5, opacity: 0.2 },
          { top: 860, left: 1020, size: 4, opacity: 0.25 },
          { top: 1100, left: 80,  size: 4, opacity: 0.18 },
          { top: 1200, left: 970, size: 3, opacity: 0.2 },
          { top: 1580, left: 100, size: 5, opacity: 0.3 },
          { top: 1700, left: 950, size: 4, opacity: 0.22 },
          { top: 1800, left: 200, size: 3, opacity: 0.15 },
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

        {/* ─── LOGO ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <div style={{
              position: 'absolute',
              top: -60, left: -60, right: -60, bottom: -60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,168,83,0.4) 0%, rgba(212,168,83,0.1) 40%, transparent 70%)',
            }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              style={{ width: 160, height: 160, position: 'relative', zIndex: 1, objectFit: 'contain' }}
            />
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: 2 }}>
            <span style={{ color: '#FFFFFF' }}>POKE</span>
            <span style={{ color: '#D4A853' }}>ITEM</span>
          </div>
        </div>

        {/* ─── MAIN BLOCK (glassmorphism) ─── */}
        <div style={{
          width: '100%',
          background: 'rgba(26, 40, 60, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 36,
          padding: '52px',
          display: 'flex',
          flexDirection: 'column',
          gap: 44,
          boxSizing: 'border-box',
        }}>

          {/* Rang + Médaille */}
          <div style={{ display: 'flex', gap: 28 }}>
            {/* Rang — SVG pour éviter background-clip:text */}
            <div style={{
              flex: 1,
              background: '#111B29',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '52px 20px',
            }}>
              <svg
                width="280"
                height="130"
                viewBox="0 0 280 130"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <linearGradient id="rankGold" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F5DEB3" />
                    <stop offset="100%" stopColor="#D4A853" />
                  </linearGradient>
                </defs>
                <text
                  x="140"
                  y="115"
                  textAnchor="middle"
                  fill="url(#rankGold)"
                  fontSize="120"
                  fontWeight="900"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {rank != null ? `#${rank}` : '—'}
                </text>
              </svg>
            </div>

            {/* Médaille */}
            <div style={{
              width: 230,
              background: '#111B29',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '52px 20px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* Avatar */}
            <div style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              border: '4px solid #D4A853',
              boxShadow: '0 0 24px rgba(212,168,83,0.35)',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#2A3A4A',
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
                <span style={{ fontSize: 62, fontWeight: 700, color: '#D4A853' }}>
                  {username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Username + Points */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 40,
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: 16,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrophySvg />
                <span style={{ fontSize: 32, fontWeight: 700, color: '#E7BA76' }}>
                  {totalPoints.toLocaleString('fr-FR')} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── STATS CAPSULES ─── */}
        <div style={{ display: 'flex', gap: 24, width: '100%' }}>
          {[
            { value: cardCount.toLocaleString('fr-FR'), label: 'cartes' },
            { value: referralCount.toString(), label: 'parrainages' },
            { value: `${questsCompleted}/${questsTotal}`, label: 'quêtes' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              background: 'rgba(17, 27, 41, 0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 24,
              padding: '38px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 20, color: '#9CA3AF' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ─── FOOTER ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 520, height: 1, background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }} />
          <span style={{ fontSize: 22, color: '#4B5563', letterSpacing: 1 }}>app.pokeitem.fr</span>
        </div>
      </div>
    )
  }
)
