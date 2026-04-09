import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, upsertBrevoContact } from "@/lib/email";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    // Clean up expired token
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Token expiré" }, { status: 400 });
  }

  // Mark user as verified
  const user = await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
    select: { name: true, email: true, subscribedNewsletter: true },
  });

  // Delete used token
  await prisma.verificationToken.delete({ where: { token } });

  // Send welcome email + sync Brevo contact as verified (fire-and-forget)
  Promise.all([
    sendWelcomeEmail(user.email, user.name).catch((err) =>
      console.error("[email] welcome email failed:", err)
    ),
    upsertBrevoContact(user.email, {
      name: user.name,
      subscribed: user.subscribedNewsletter,
    }).catch((err) => console.error("[Brevo] verify upsert failed:", err)),
  ]);

  return NextResponse.json({ message: "Email vérifié avec succès" });
}
