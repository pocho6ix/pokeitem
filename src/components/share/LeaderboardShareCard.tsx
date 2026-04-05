'use client'

import { forwardRef, useEffect, useState } from 'react'
import { CONTEST_CONFIG } from '@/config/contest'

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

// ─── Medal circle ─────────────────────────────────────────────────────────────

function Medal({ rank }: { rank: number }) {
  const styles = {
    1: { bg: 'linear-gradient(135deg, #F5D060 0%, #D4A020 100%)', border: '#F5E6A0', glow: 'rgba(245,208,96,0.4)', text: '#7C5A00' },
    2: { bg: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)', border: '#E5E7EB', glow: 'rgba(0,0,0,0.3)', text: '#4B5563' },
    3: { bg: 'linear-gradient(135deg, #D4A574 0%, #A0724A 100%)', border: '#D4A574', glow: 'rgba(0,0,0,0.3)', text: '#5C3A1A' },
  } as Record<number, { bg: string; border: string; glow: string; text: string }>
  const s = styles[rank]

  if (!s) {
    return (
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: '#1C2C3C', border: '2px solid #2A3A4A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#6B7F95' }}>{rank}</span>
      </div>
    )
  }

  return (
    <div style={{
      width: 64, height: 64, borderRadius: '50%',
      background: s.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 4px 20px ${s.glow}`,
      border: `2px solid ${s.border}`,
    }}>
      <span style={{ fontSize: 28, fontWeight: 900, color: s.text }}>{rank}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LeaderboardShareCard = forwardRef<HTMLDivElement, LeaderboardShareCardProps>(
  function LeaderboardShareCard(props, ref) {
    const {
      rank, totalParticipants, username, avatarUrl, totalPoints,
      cardCount, referralCount, questsCompleted, questsTotal,
    } = props

    // Pre-fetch avatar as data URL so html2canvas doesn't need to fetch
    // relative URLs (which fail silently on mobile)
    const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
    useEffect(() => {
      if (!avatarUrl) return
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(avatarUrl)}`
      fetch(proxyUrl)
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader()
          reader.onload = () => setAvatarDataUrl(reader.result as string)
          reader.readAsDataURL(blob)
        })
        .catch(() => {/* fallback to initials */})
    }, [avatarUrl])

    // Pre-fetch contest prize image as data URL
    const [contestImageDataUrl, setContestImageDataUrl] = useState<string | null>(null)
    useEffect(() => {
      if (!CONTEST_CONFIG.active || !CONTEST_CONFIG.prizeImageUrl) return
      fetch(CONTEST_CONFIG.prizeImageUrl)
        .then(r => r.blob())
        .then(blob => {
          const reader = new FileReader()
          reader.onload = () => setContestImageDataUrl(reader.result as string)
          reader.readAsDataURL(blob)
        })
        .catch(() => {/* fallback: don't show image, keep layout */})
    }, [])

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
            opacity: 0.14,
            filter: 'saturate(0.4) brightness(0.7)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Radial dark overlay ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(8,12,18,0.1) 0%, rgba(8,12,18,0.7) 100%)',
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{
                  fontSize: 100,
                  fontWeight: 900,
                  color: '#D4A853',
                  lineHeight: 1,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  #{rank ?? '—'}
                </span>
                {totalParticipants > 0 && (
                  <span style={{ fontSize: 32, fontWeight: 600, color: '#6B7F95', lineHeight: 1 }}>
                    / {totalParticipants}
                  </span>
                )}
              </div>
              <Medal rank={rank ?? 0} />
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
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarDataUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

          {/* Contest prize image */}
          {CONTEST_CONFIG.active && contestImageDataUrl && (
            <div style={{
              width: '100%',
              marginBottom: 32,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 0 0 2px rgba(212,168,83,0.5), 0 8px 32px rgba(212,168,83,0.2)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contestImageDataUrl}
                alt="À gagner"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          )}

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
