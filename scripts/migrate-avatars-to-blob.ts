/**
 * Migration script: move base64 avatars stored in DB → Vercel Blob
 *
 * Finds all users where image starts with "data:" (legacy base64 format),
 * compresses with sharp, uploads to Vercel Blob, and saves the URL back in DB.
 *
 * Usage:
 *   npx tsx scripts/migrate-avatars-to-blob.ts
 *
 * Requires BLOB_READ_WRITE_TOKEN and DATABASE_URL in env (or .env file).
 */

import "dotenv/config";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      image: { not: null },
    },
    select: { id: true, email: true, image: true },
  });

  const base64Users = users.filter((u) => u.image?.startsWith("data:"));
  console.log(`Found ${base64Users.length} user(s) with base64 avatars to migrate.`);

  let migrated = 0;
  let failed = 0;

  for (const user of base64Users) {
    try {
      const [header, data] = (user.image as string).split(",");
      if (!header || !data) {
        console.warn(`  [SKIP] ${user.email} — malformed data URL`);
        continue;
      }

      const inputBuffer = Buffer.from(data, "base64");

      // Compress to 400×400 WebP
      const compressedBuffer = await sharp(inputBuffer)
        .resize(400, 400, { fit: "cover", position: "center", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      const filename = `avatars/${user.id}-migrated-${Date.now()}.webp`;
      const blob = await put(filename, compressedBuffer, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { image: blob.url },
      });

      console.log(`  [OK] ${user.email} → ${blob.url}`);
      migrated++;
    } catch (err) {
      console.error(`  [ERROR] ${user.email}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
