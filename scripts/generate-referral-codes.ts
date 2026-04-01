import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
const prisma = new PrismaClient()

async function main() {
  // Find all users with null referralCode and assign one based on their id
  const users = await prisma.user.findMany({ where: { referralCode: null } })
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: user.id }
    })
  }
  console.log(`Updated ${users.length} users with referral codes`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
