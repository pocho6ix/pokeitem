import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeSubscriptionId: true, trialEndsAt: true }
  })

  if (!user?.stripeSubscriptionId) {
    return Response.json({ error: 'Aucun abonnement actif' }, { status: 400 })
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  }) as unknown as Stripe.Subscription

  // In newer Stripe API versions, current_period_end moved to SubscriptionItem
  const item = subscription.items?.data?.[0]
  const periodEndTs = (item as Stripe.SubscriptionItem & { current_period_end?: number })?.current_period_end
    ?? (subscription.billing_cycle_anchor + 31 * 24 * 60 * 60)
  const endDate = new Date(periodEndTs * 1000)
  const isTrial = subscription.status === 'trialing'

  return Response.json({
    success: true,
    cancelAt: endDate.toISOString(),
    message: isTrial
      ? `Votre essai prend fin le ${endDate.toLocaleDateString('fr-FR')} — aucun prélèvement ne sera effectué`
      : `Votre abonnement prend fin le ${endDate.toLocaleDateString('fr-FR')} — aucun renouvellement`
  })
}
