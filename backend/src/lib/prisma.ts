/**
 * Prisma Client singleton.
 *
 * In dev we cache the client on `globalThis` to survive `tsx watch` hot-reloads
 * (without this, every restart leaks a new Postgres pool). In prod the module
 * is loaded once so the cache is a no-op.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
