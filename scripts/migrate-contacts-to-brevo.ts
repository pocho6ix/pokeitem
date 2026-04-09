/**
 * One-shot script: sync all existing verified users to Brevo CRM.
 *
 * Usage:
 *   npx tsx scripts/migrate-contacts-to-brevo.ts
 *
 * Required env vars: DATABASE_URL, BREVO_API_KEY, BREVO_LIST_ID
 */

import { PrismaClient } from "@prisma/client"
import { BrevoClient } from "@getbrevo/brevo"

const prisma = new PrismaClient()

function getBrevoClient(): BrevoClient {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error("BREVO_API_KEY is not set")
  return new BrevoClient({ apiKey: key })
}

const BATCH_SIZE = 20
const DELAY_MS = 500

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const listId = parseInt(process.env.BREVO_LIST_ID ?? "2", 10)
  const client = getBrevoClient()

  const users = await prisma.user.findMany({
    where: { emailVerified: { not: null } },
    select: {
      email: true,
      name: true,
      subscribedNewsletter: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Found ${users.length} verified users to sync`)

  let created = 0
  let errors = 0

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (user) => {
        try {
          await client.contacts.createContact({
            email: user.email,
            attributes: {
              FIRSTNAME: user.name ?? undefined,
              POKEITEM_USER: true,
            } as Record<string, string | number | boolean | string[]>,
            listIds: user.subscribedNewsletter ? [listId] : [],
            updateEnabled: true, // upsert
          })
          created++
        } catch (err) {
          console.error(`  ✗ Failed for ${user.email}:`, err)
          errors++
        }
      })
    )

    const processed = Math.min(i + BATCH_SIZE, users.length)
    console.log(`  [${processed}/${users.length}] upserted=${created} errors=${errors}`)

    if (i + BATCH_SIZE < users.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\nDone. upserted=${created} errors=${errors}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
