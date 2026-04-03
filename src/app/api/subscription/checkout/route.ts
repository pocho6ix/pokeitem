import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function POST(req: Request) {
  const stripe = getStripe()
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      stripeCustomerId: true,
      referredById: true,
      betaTrialActivatedAt: true,
    }
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // period: 'monthly' | 'annual'
  const body = await req.json().catch(() => ({}))
  const period: 'monthly' | 'annual' = body.period === 'annual' ? 'annual' : 'monthly'
  const priceId =
    period === 'annual'
      ? process.env.STRIPE_PRO_PRICE_ID_ANNUAL!
      : process.env.STRIPE_PRO_PRICE_ID!

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { userId },
    })
    customerId = customer.id
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } })
  }

  // Determine discount: beta testeur (-10€) takes precedence over referral (-5€) on annual
  const betaDiscount = body.betaDiscount === true && period === 'annual' && !!user.betaTrialActivatedAt
  let discounts: { coupon: string }[] | undefined = undefined

  if (betaDiscount) {
    const coupon = await stripe.coupons.create({
      amount_off: 1000, // -10€ → 29,99€ instead of 39,99€
      currency: 'eur',
      duration: 'once',
      name: 'Offre bêta testeur -10€',
    })
    discounts = [{ coupon: coupon.id }]
  } else if (user.referredById && period === 'annual') {
    const coupon = await stripe.coupons.create({
      amount_off: 500,
      currency: 'eur',
      duration: 'once',
      name: 'Réduction parrainage',
    })
    discounts = [{ coupon: coupon.id }]
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId, referredById: user.referredById ?? '' },
    },
    success_url: `${process.env.NEXTAUTH_URL ?? 'https://app.pokeitem.fr'}/portfolio/cartes?success=1`,
    cancel_url: `${process.env.NEXTAUTH_URL ?? 'https://app.pokeitem.fr'}/pricing?canceled=1`,
    metadata: { userId, referredById: user.referredById ?? '' },
    ...(discounts ? { discounts } : {}),
  })

  return NextResponse.json({ url: checkoutSession.url })
}
