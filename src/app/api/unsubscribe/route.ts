import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unsubscribeContact } from "@/lib/email";

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://app.pokeitem.fr";

// GET /api/unsubscribe?email=xxx
// Called from the unsubscribe link in Brevo email templates.
// Use {{ contact.EMAIL }} in the Brevo template:
//   https://app.pokeitem.fr/api/unsubscribe?email={{ contact.EMAIL }}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return NextResponse.redirect(`${BASE_URL}/desabonnement?status=error`);
  }

  try {
    // Update DB
    await prisma.user.updateMany({
      where: { email },
      data: { subscribedNewsletter: false, unsubscribedAt: new Date() },
    });

    // Remove from Brevo newsletter list
    await unsubscribeContact(email).catch(() => {});

    return NextResponse.redirect(`${BASE_URL}/desabonnement?status=success`);
  } catch {
    return NextResponse.redirect(`${BASE_URL}/desabonnement?status=error`);
  }
}
