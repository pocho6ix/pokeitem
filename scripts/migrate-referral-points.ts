/**
 * Migration: Convert existing validated referrals to point_events
 * and recalculate user_points for all affected users.
 *
 * Run: npx tsx scripts/migrate-referral-points.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const REFERRAL_POINTS = 1000

async function main() {
  // Find all users who referred at least one validated user
  const referrers = await prisma.user.findMany({
    where: {
      referrals: { some: { emailVerified: { not: null } } },
    },
    select: {
      id: true,
      referrals: {
        where: { emailVerified: { not: null } },
        select: { id: true, emailVerified: true },
        orderBy: { emailVerified: 'asc' },
      },
    },
  })

  console.log(`Found ${referrers.length} referrers to migrate`)

  let totalEventsCreated = 0

  for (const referrer of referrers) {
    for (const referee of referrer.referrals) {
      // Check if already awarded
      const existing = await prisma.pointEvent.findFirst({
        where: {
          userId: referrer.id,
          source: 'referral',
          metadata: { path: ['referredUserId'], equals: referee.id },
        },
      })

      if (existing) {
        console.log(`  Skip referrer=${referrer.id} referee=${referee.id} (already awarded)`)
        continue
      }

      await prisma.pointEvent.create({
        data: {
          userId: referrer.id,
          points: REFERRAL_POINTS,
          source: 'referral',
          metadata: { referredUserId: referee.id },
          createdAt: referee.emailVerified ?? new Date(),
        },
      })

      console.log(`  Created point_event referrer=${referrer.id} referee=${referee.id}`)
      totalEventsCreated++
    }
  }

  console.log(`\nCreated ${totalEventsCreated} new point events`)

  // Recalculate user_points for all users with any point events
  const usersWithEvents = await prisma.pointEvent.groupBy({
    by: ['userId'],
    _sum: { points: true },
  })

  console.log(`\nRecalculating user_points for ${usersWithEvents.length} users...`)

  for (const row of usersWithEvents) {
    const total = row._sum.points ?? 0
    await prisma.userPoints.upsert({
      where: { userId: row.userId },
      update: { total, updatedAt: new Date() },
      create: { userId: row.userId, total },
    })
    console.log(`  userId=${row.userId} total=${total}`)
  }

  console.log('\nMigration complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
