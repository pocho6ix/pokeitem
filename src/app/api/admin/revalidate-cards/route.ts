import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean)

/**
 * POST /api/admin/revalidate-cards
 * Clears the Next.js data cache for serie-cards (used after DB rarity fixes, scraper runs, etc.)
 * Only accessible to users whose email is listed in ADMIN_EMAILS env var.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string } | undefined)?.email

  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  revalidateTag("serie-cards", "max")
  revalidateTag("series-list", "max")

  return NextResponse.json({ ok: true, message: "Cache série-cards invalidé" })
}
