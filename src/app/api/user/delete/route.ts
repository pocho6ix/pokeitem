import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, deletedAt: true }
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.deletedAt) return NextResponse.json({ error: 'Already deleted' }, { status: 400 })

  // Cancel Stripe subscription at period end (keep access until end of billing cycle)
  if (user.stripeSubscriptionId) {
    try {
      const stripe = getStripe()
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
    } catch (err) {
      console.error('Stripe cancel error during account deletion:', err)
    }
  }

  // Soft-delete the account
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  })

  return NextResponse.json({ success: true })
}
