import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
const prisma = new PrismaClient();

(async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const eligible = await prisma.card.count({
    where: {
      cardmarketId: { not: null },
      priceHistory: { none: { recordedAt: { lte: cutoff } } },
    },
  });
  const totalWithCmId = await prisma.card.count({
    where: { cardmarketId: { not: null } },
  });
  console.log(`Cartes avec cardmarketId : ${totalWithCmId}`);
  console.log(`Éligibles au backfill (>30j cutoff) : ${eligible}`);
  console.log(`Déjà backfillées (ont ≥1 point >30j) : ${totalWithCmId - eligible}`);
  await prisma.$disconnect();
})();
