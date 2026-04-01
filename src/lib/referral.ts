import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
}

export async function getReferralLink(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, referralCode: true }
  })
  const code = user?.username ?? user?.referralCode ?? ''
  return `https://www.pokeitem.fr/inscription?ref=${encodeURIComponent(code)}`
}

export async function validateReferralCode(code: string) {
  return prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, name: true, plan: true }
  })
}

export async function rewardReferrer(referrerId: string) {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { stripeCustomerId: true, referralRewardGiven: true }
  })
  if (!referrer || referrer.referralRewardGiven) return
  if (!referrer.stripeCustomerId) return

  const stripe = getStripe()
  await stripe.customers.createBalanceTransaction(referrer.stripeCustomerId, {
    amount: -350,
    currency: 'eur',
    description: 'Récompense parrainage — 1 mois offert',
  })

  await prisma.user.update({
    where: { id: referrerId },
    data: { referralRewardGiven: true }
  })
}

export async function getReferralStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      username: true,
      referrals: {
        select: { id: true, name: true, plan: true, createdAt: true }
      },
      referralRewardGiven: true,
    }
  })
  if (!user) return null

  return {
    referralCode: user.referralCode,
    referralLink: await getReferralLink(userId),
    totalReferrals: user.referrals.length,
    convertedReferrals: user.referrals.filter(r => r.plan === 'PRO').length,
    rewardEarned: user.referralRewardGiven,
  }
}
