import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  await prisma.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  // Delete used token
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.json({ message: "Email vérifié avec succès" });
}
