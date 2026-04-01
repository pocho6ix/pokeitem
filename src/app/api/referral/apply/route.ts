import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateReferralCode } from '@/lib/referral'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const body = await req.json().catch(() => ({}))
  const { referralCode } = body
  if (!referralCode) return NextResponse.json({ error: 'No referral code' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true, createdAt: true }
  })

  if (user?.referredById) return NextResponse.json({ error: 'Already referred' }, { status: 400 })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (user?.createdAt && user.createdAt < sevenDaysAgo) {
    return NextResponse.json({ error: 'Too late to apply referral' }, { status: 400 })
  }

  const referrer = await validateReferralCode(referralCode)
  if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  if (referrer.id === userId) return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data: { referredById: referrer.id }
  })

  return NextResponse.json({ success: true, referrerName: referrer.name })
}
