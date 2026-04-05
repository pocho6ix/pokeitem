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

export const LeaderboardShareCard = forwardRef<HTMLDivElement, LeaderboardShareCardProps>(
  function LeaderboardShareCard(props, ref) {
    const { rank, username, avatarUrl, totalPoints, cardCount, referralCount, questsCompleted, questsTotal } = props

    const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
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
          fontFamily: "'Inter', system-ui, sans-serif",
          color: 'white',
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        {/* Decorative dots */}
        {[
          { top: 120, left: 80, size: 6, opacity: 0.4 },
          { top: 200, left: 940, size: 4, opacity: 0.3 },
          { top: 320, left: 160, size: 5, opacity: 0.25 },
          { top: 500, left: 980, size: 6, opacity: 0.35 },
          { top: 1600, left: 100, size: 5, opacity: 0.3 },
          { top: 1700, left: 960, size: 4, opacity: 0.25 },
        ].map((dot, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              borderRadius: '50%',
              background: '#D4A853',
              opacity: dot.opacity,
            }}
          />
        ))}

        {/* ═══ LOGO ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 120, marginBottom: 70 }}>
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <div style={{
              position: 'absolute',
              inset: -50,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,168,83,0.25) 0%, transparent 70%)',
            }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              style={{ width: 160, height: 160, position: 'relative', zIndex: 1, objectFit: 'contain' }}
            />
          </div>
          <div style={{ marginTop: 24, fontSize: 44, fontWeight: 800, letterSpacing: 6 }}>
            <span style={{ color: '#FFFFFF' }}>POKE</span>
            <span style={{ color: '#D4A853' }}>ITEM</span>
          </div>
        </div>

        {/* ═══ BLOC PRINCIPAL ═══ */}
        <div style={{
          width: 920,
          background: 'rgba(26, 40, 60, 0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 32,
          padding: 44,
          marginBottom: 36,
        }}>
          {/* Haut : RANG + MÉDAILLE */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 40 }}>
            {/* Rang */}
            <div style={{
              flex: 1,
              background: '#111B29',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
            }}>
              <span style={{
                fontSize: 110,
                fontWeight: 900,
                background: 'linear-gradient(180deg, #F5DEB3 0%, #D4A853 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
              }}>
                {rank != null ? `#${rank}` : '—'}
              </span>
            </div>

            {/* Médaille */}
            <div style={{
              width: 220,
              background: '#111B29',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
            }}>
              {medalEmoji ? (
                <span style={{ fontSize: 90 }}>{medalEmoji}</span>
              ) : (
                <span style={{ fontSize: 70, opacity: 0.3 }}>🏅</span>
              )}
            </div>
          </div>

          {/* Bas : AVATAR + USERNAME/POINTS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            {/* Avatar */}
            <div style={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              border: '3px solid #D4A853',
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
                <span style={{ fontSize: 56, fontWeight: 700, color: '#D4A853' }}>
                  {username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Username + points */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 38,
                fontWeight: 600,
                color: '#FFFFFF',
                marginBottom: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>🏆</span>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#E7BA76' }}>
                  {totalPoints.toLocaleString('fr-FR')} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ STATS (3 capsules) ═══ */}
        <div style={{ display: 'flex', gap: 20, width: 920 }}>
          {[
            { value: cardCount.toLocaleString('fr-FR'), label: 'cartes' },
            { value: referralCount.toString(), label: 'parrainages' },
            { value: `${questsCompleted}/${questsTotal}`, label: 'quêtes' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              background: 'rgba(17, 27, 41, 0.85)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20,
              padding: '32px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#FFFFFF' }}>{stat.value}</span>
              <span style={{ fontSize: 20, color: '#9CA3AF' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          position: 'absolute',
          bottom: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          width: '100%',
        }}>
          <div style={{ width: 520, height: 1, background: 'linear-gradient(90deg, transparent, #D4A853, transparent)' }} />
          <span style={{ fontSize: 22, color: '#4B5563', letterSpacing: 1 }}>app.pokeitem.fr</span>
        </div>
      </div>
    )
  }
)
