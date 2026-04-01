import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })

function getPeriodEnd(sub: Stripe.Subscription): Date {
  // In newer Stripe API versions, current_period_end moved to SubscriptionItem
  const item = sub.items?.data?.[0]
  if (item && (item as Stripe.SubscriptionItem & { current_period_end?: number }).current_period_end) {
    return new Date((item as Stripe.SubscriptionItem & { current_period_end: number }).current_period_end * 1000)
  }
  // Fallback: billing_cycle_anchor + ~1 month
  return new Date((sub.billing_cycle_anchor + 31 * 24 * 60 * 60) * 1000)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (!userId || !session.subscription) break
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const periodEnd = getPeriodEnd(sub)
      await prisma.user.update({
        where: { id: userId },
        data: {
          plan: 'PRO',
          stripeSubscriptionId: sub.id,
          planExpiresAt: periodEnd,
        },
      })
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, plan: 'PRO', source: 'stripe', status: 'active', currentPeriodEnd: periodEnd },
        update: { plan: 'PRO', status: 'active', currentPeriodEnd: periodEnd },
      })
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } })
      if (!user) break
      await prisma.user.update({ where: { id: user.id }, data: { plan: 'FREE', planExpiresAt: null, stripeSubscriptionId: null } })
      await prisma.subscription.updateMany({ where: { userId: user.id }, data: { status: 'canceled' } })
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } })
      if (!user) break
      const periodEnd = getPeriodEnd(sub)
      await prisma.user.update({ where: { id: user.id }, data: { planExpiresAt: periodEnd } })
      break
    }
  }

  return NextResponse.json({ received: true })
}
