import { revalidateTag } from "next/cache"
import { NextResponse }  from "next/server"
import { getServerSession } from "next-auth"
import { authOptions }   from "@/lib/auth"
import { prisma }        from "@/lib/prisma"

/**
 * POST /api/admin/revalidate-cards
 * Clears the Next.js data cache for serie-cards (used after DB rarity fixes, scraper runs, etc.)
 * Only accessible to admin users.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  revalidateTag("serie-cards")
  revalidateTag("series-list")

  return NextResponse.json({ ok: true, message: "Cache série-cards invalidé" })
}
