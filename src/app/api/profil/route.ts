import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body as { name?: string };

  if (name !== undefined && (typeof name !== "string" || name.length > 50)) {
    return NextResponse.json({ error: "Nom invalide (50 caractères max)" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: { name: name?.trim() || null },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(user);
}
