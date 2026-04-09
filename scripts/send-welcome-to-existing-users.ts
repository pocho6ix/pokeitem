/**
 * One-shot script: send Brevo welcome template (ID 2) to all verified users.
 *
 * Usage:
 *   npx tsx scripts/send-welcome-to-existing-users.ts
 *
 * Required env vars: DATABASE_URL, BREVO_API_KEY, BREVO_SENDER_EMAIL,
 *                    BREVO_SENDER_NAME, BREVO_TEMPLATE_WELCOME
 *
 * Add --dry-run to preview without sending any emails.
 */

import { PrismaClient } from "@prisma/client"
import { BrevoClient } from "@getbrevo/brevo"

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const BATCH_SIZE = 20
const DELAY_MS = 500

function getClient(): BrevoClient {
  const key = process.env.BREVO_API_KEY
  if (!key) throw new Error("BREVO_API_KEY is not set")
  return new BrevoClient({ apiKey: key })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const templateId = parseInt(process.env.BREVO_TEMPLATE_WELCOME ?? "2", 10)
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL ?? "contact@pokeitem.fr",
    name: process.env.BREVO_SENDER_NAME ?? "PokeItem",
  }

  const users = await prisma.user.findMany({
    where: { emailVerified: { not: null } },
    select: { email: true, name: true },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Found ${users.length} verified users`)
  if (DRY_RUN) console.log("DRY RUN — no emails will be sent\n")

  const client = getClient()
  let sent = 0
  let errors = 0

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (user) => {
        const pseudo = user.name?.split(" ")[0] ?? "Dresseur"
        if (DRY_RUN) {
          console.log(`  [dry] → ${user.email} (PSEUDO=${pseudo})`)
          sent++
          return
        }
        try {
          await client.transactionalEmails.sendTransacEmail({
            templateId,
            sender,
            to: [{ email: user.email }],
            params: {
              PSEUDO: pseudo,
              APP_URL: "https://app.pokeitem.fr/portfolio",
            },
          })
          sent++
        } catch (err) {
          console.error(`  ✗ ${user.email}:`, err)
          errors++
        }
      })
    )

    const processed = Math.min(i + BATCH_SIZE, users.length)
    console.log(`  [${processed}/${users.length}] sent=${sent} errors=${errors}`)

    if (i + BATCH_SIZE < users.length) await sleep(DELAY_MS)
  }

  console.log(`\nDone. sent=${sent} errors=${errors}`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
