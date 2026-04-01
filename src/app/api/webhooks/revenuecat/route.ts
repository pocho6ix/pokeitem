import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const event = await req.json()
  const userId = event.event?.app_user_id
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  switch (event.event?.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'PRO',
          revenueCatId: userId,
          planExpiresAt: event.event.expiration_at_ms ? new Date(event.event.expiration_at_ms) : null,
        },
      })
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, plan: 'PRO', source: 'revenuecat', status: 'active', currentPeriodEnd: new Date(event.event.expiration_at_ms) },
        update: { plan: 'PRO', status: 'active', currentPeriodEnd: new Date(event.event.expiration_at_ms) },
      })
      break
    case 'CANCELLATION':
    case 'EXPIRATION':
      await prisma.user.update({ where: { id: userId }, data: { plan: 'FREE', planExpiresAt: null } })
      await prisma.subscription.updateMany({ where: { userId }, data: { status: 'canceled' } })
      break
  }

  return NextResponse.json({ received: true })
}
