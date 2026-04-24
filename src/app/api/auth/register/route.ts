import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, upsertBrevoContact } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { name, email, password, subscribeNewsletter, referralCode, tosAcceptedAt } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Pseudo, email et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 }
      );
    }

    const subscribed = subscribeNewsletter !== false; // default true
    const passwordHash = await bcrypt.hash(password, 12);

    // Resolve referrer from the code passed at registration time (more reliable than cookie-only)
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findFirst({
        where: {
          OR: [
            { referralCode: referralCode },
            { username: { equals: referralCode, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (referrer) referredById = referrer.id;
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        subscribedNewsletter: subscribed,
        tosAcceptedAt: tosAcceptedAt ? new Date(tosAcceptedAt) : new Date(),
        ...(referredById ? { referredById } : {}),
      },
    });

    // Generate verification token (expires in 24h)
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Account created but email failed — user can request a resend
    }

    // Upsert contact in Brevo CRM — only for users who consented to
    // marketing. Opt-outs are never pushed (GDPR / CNIL-friendly, and
    // keeps the Brevo contact count aligned with the newsletter audience).
    if (subscribed) {
      upsertBrevoContact(email, { name, subscribed: true }).catch((err) =>
        console.error("[Brevo] register upsert failed:", err)
      );
    }

    return NextResponse.json(
      { message: "Compte créé. Vérifiez votre email pour activer votre compte." },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Registration error:", message);
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}
