import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const updated = await prisma.portfolioItem.update({
      where: { id },
      data: {
        ...(body.quantity !== undefined && {
          quantity: Math.max(1, body.quantity),
        }),
        ...(body.purchasePrice !== undefined && {
          purchasePrice: Math.max(0, body.purchasePrice),
        }),
        ...(body.purchaseDate && {
          purchaseDate: new Date(body.purchaseDate),
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.condition !== undefined && { condition: body.condition }),
      },
      include: {
        item: { include: { serie: { include: { bloc: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating portfolio item:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const existing = await prisma.portfolioItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
    }

    await prisma.portfolioItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting portfolio item:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
