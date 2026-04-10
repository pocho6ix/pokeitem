import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail, upsertBrevoContact } from "@/lib/email";
import { onReferralEmailVerified } from "@/lib/referral";

export async function GET(request: NextRequest) {
  console.log("[verify] Handler appelé")

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
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Token expiré" }, { status: 400 });
  }

  // Mark user as verified
  const user = await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
    select: { id: true, name: true, email: true, subscribedNewsletter: true },
  });
  console.log("[verify] emailVerified mis à jour en DB pour:", user.email)

  // Delete used token
  await prisma.verificationToken.delete({ where: { token } });

  // ── Award referral points if this user was referred ───────────────────────
  // Handles the case where referredById was set at registration time
  onReferralEmailVerified(user.id).catch((err) => {
    console.error("[verify] onReferralEmailVerified failed:", err)
  })

  // ── Send welcome email + sync Brevo ──────────────────────────────────────
  // IMPORTANT: must be awaited — Vercel kills un-awaited promises on return
  console.log("[verify] Envoi email de bienvenue à:", user.email)
  await Promise.all([
    sendWelcomeEmail(user.email, user.name).then(() => {
      console.log("[verify] ✅ Email de bienvenue envoyé à:", user.email)
    }).catch((err) => {
      console.error("[verify] ❌ Échec email de bienvenue:", err)
    }),
    upsertBrevoContact(user.email, {
      name: user.name,
      subscribed: user.subscribedNewsletter,
    }).then(() => {
      console.log("[verify] ✅ Contact Brevo mis à jour pour:", user.email)
    }).catch((err) => {
      console.error("[verify] ❌ Échec upsert Brevo:", err)
    }),
  ]);

  // Generate a short-lived auto-login token (5 min, single-use by design)
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "");
  const autoLoginToken = await new SignJWT({ type: "autologin", userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .setIssuedAt()
    .sign(secret);

  console.log("[verify] ✅ Flow complet pour:", user.email)
  return NextResponse.json({ message: "Email vérifié avec succès", autoLoginToken });
}
