import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Brevo sends a webhook when a contact unsubscribes.
// Configure this URL in Brevo → Settings → Webhooks → Transactional → unsubscribed
// Expected payload shape (simplified):
// { event: "unsubscribe", email: "...", ... }

export async function POST(req: NextRequest) {
  try {
    // Optional: verify the request comes from Brevo using a shared secret
    const secret = process.env.BREVO_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get("x-brevo-signature") ?? req.headers.get("x-sib-signature");
      if (signature !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();

    // Brevo can send batch payloads as an array
    const events: Array<{ event?: string; email?: string }> = Array.isArray(body) ? body : [body];

    for (const evt of events) {
      const { event, email } = evt;
      if (!email) continue;

      if (event === "unsubscribe" || event === "hard_bounce" || event === "invalid_email") {
        await prisma.user.updateMany({
          where: { email },
          data: {
            subscribedNewsletter: false,
            unsubscribedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Brevo webhook] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
