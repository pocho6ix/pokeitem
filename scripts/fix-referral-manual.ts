/**
 * Admin script: manually link referrals and backfill points for a specific referrer.
 *
 * Usage:
 *   npx tsx scripts/fix-referral-manual.ts \
 *     --referrer <email_or_username_du_parrain> \
 *     --referees <email1> <email2> <email3>
 *
 * Example:
 *   npx tsx scripts/fix-referral-manual.ts \
 *     --referrer jean@example.com \
 *     --referees ami1@example.com ami2@example.com ami3@example.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const REFERRAL_POINTS = 1000

async function main() {
  const args = process.argv.slice(2)
  const referrerIdx = args.indexOf('--referrer')
  const refereesIdx = args.indexOf('--referees')

  if (referrerIdx === -1 || refereesIdx === -1) {
    console.error('Usage: npx tsx scripts/fix-referral-manual.ts --referrer <email_ou_username> --referees <email1> [email2] ...')
    process.exit(1)
  }

  const referrerArg = args[referrerIdx + 1]
  // Collect all referee emails (everything after --referees until next -- flag)
  const refereeEmails: string[] = []
  for (let i = refereesIdx + 1; i < args.length; i++) {
    if (args[i].startsWith('--')) break
    refereeEmails.push(args[i])
  }

  if (!referrerArg || refereeEmails.length === 0) {
    console.error('Referrer and at least one referee are required.')
    process.exit(1)
  }

  // Find referrer
  const referrer = await prisma.user.findFirst({
    where: {
      OR: [
        { email: referrerArg },
        { username: { equals: referrerArg, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, referralWeeksGiven: true, plan: true, planExpiresAt: true },
  })

  if (!referrer) {
    console.error(`Referrer not found: ${referrerArg}`)
    process.exit(1)
  }

  console.log(`\nReferrer: ${referrer.name} (${referrer.email}) — id=${referrer.id}`)
  console.log(`Referees à lier: ${refereeEmails.join(', ')}\n`)

  for (const refereeEmail of refereeEmails) {
    const referee = await prisma.user.findUnique({
      where: { email: refereeEmail },
      select: { id: true, name: true, email: true, referredById: true, emailVerified: true },
    })

    if (!referee) {
      console.warn(`  ⚠️  Referee not found: ${refereeEmail} — skipped`)
      continue
    }

    if (referee.referredById && referee.referredById !== referrer.id) {
      console.warn(`  ⚠️  ${refereeEmail} is already referred by a different user (${referee.referredById}) — skipped`)
      continue
    }

    // Link referral if not already set
    if (!referee.referredById) {
      await prisma.user.update({
        where: { id: referee.id },
        data: { referredById: referrer.id },
      })
      console.log(`  ✅ Linked ${refereeEmail} → referrer`)
    } else {
      console.log(`  ℹ️  ${refereeEmail} already linked to this referrer`)
    }

    // Award points if email verified and not already awarded
    if (!referee.emailVerified) {
      console.log(`  ℹ️  ${refereeEmail} email not yet verified — points will be awarded on verification`)
      continue
    }

    const existing = await prisma.pointEvent.findFirst({
      where: {
        userId: referrer.id,
        source: 'referral',
        metadata: { path: ['referredUserId'], equals: referee.id },
      },
    })

    if (existing) {
      console.log(`  ℹ️  Points already awarded for ${refereeEmail}`)
      continue
    }

    await prisma.pointEvent.create({
      data: {
        userId: referrer.id,
        points: REFERRAL_POINTS,
        source: 'referral',
        metadata: { referredUserId: referee.id },
        createdAt: referee.emailVerified,
      },
    })
    console.log(`  ✅ Awarded ${REFERRAL_POINTS} points for ${refereeEmail}`)
  }

  // Recalculate referrer's total points
  const sum = await prisma.pointEvent.aggregate({
    where: { userId: referrer.id },
    _sum: { points: true },
  })
  const total = sum._sum.points ?? 0

  await prisma.userPoints.upsert({
    where: { userId: referrer.id },
    update: { total, updatedAt: new Date() },
    create: { userId: referrer.id, total },
  })

  console.log(`\n✅ Total points recalculated: ${total}`)

  // Also award Pro weeks if applicable
  const validatedCount = await prisma.user.count({
    where: { referredById: referrer.id, emailVerified: { not: null } },
  })
  const weeksToGive = Math.min(validatedCount, 3) - referrer.referralWeeksGiven

  if (weeksToGive > 0) {
    const now = new Date()
    const baseDate = (referrer.plan === 'PRO' && referrer.planExpiresAt && referrer.planExpiresAt > now)
      ? referrer.planExpiresAt
      : now
    const newEnd = new Date(baseDate.getTime() + weeksToGive * 7 * 24 * 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        plan: 'PRO',
        planExpiresAt: newEnd,
        referralWeeksGiven: referrer.referralWeeksGiven + weeksToGive,
      },
    })
    console.log(`✅ Awarded ${weeksToGive} Pro week(s) (expires ${newEnd.toLocaleDateString('fr-FR')})`)
  } else {
    console.log(`ℹ️  No additional Pro weeks to award (${referrer.referralWeeksGiven}/3 already given)`)
  }

  console.log('\nDone.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
