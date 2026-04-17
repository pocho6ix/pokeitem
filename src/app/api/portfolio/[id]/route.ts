import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_PRICE_EUR = 1_000_000;
const MAX_QUANTITY  = 10_000;

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    // Accept "12,50" and "12.50" and "12.50 €" — normalise to a number.
    const cleaned = v.replace(/[^\d,.-]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * PUT or PATCH the caller's PortfolioItem.
 *
 * Accepts partial updates for quantity / purchasePrice / currentPrice /
 * purchaseDate / notes / condition. All prices are clamped to [0, 1_000_000],
 * quantity to [1, 10_000]. Ownership is enforced by the `userId` filter.
 *
 * When `currentPrice` is touched, `currentPriceUpdatedAt` is stamped. When it's
 * set to null (blank-out), the timestamp is cleared too. The ManualValuation
 * ledger is written by the dedicated `/api/portfolio/valuation` endpoint — this
 * route is the minimal "edit my row" mutation.
 */
async function handleUpdate(request: NextRequest, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const existing = await prisma.portfolioItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item non trouvé" }, { status: 404 });
  }

  const body = await request.json() as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.quantity !== undefined) {
    const q = coerceNumber(body.quantity);
    if (q == null || q < 1) {
      return NextResponse.json(
        { error: "Quantité invalide. Utilisez « Retirer » pour supprimer l'item." },
        { status: 400 },
      );
    }
    data.quantity = Math.min(MAX_QUANTITY, Math.round(q));
  }

  if (body.purchasePrice !== undefined) {
    if (body.purchasePrice === null) {
      data.purchasePrice = null;
    } else {
      const p = coerceNumber(body.purchasePrice);
      if (p == null || p < 0 || p > MAX_PRICE_EUR) {
        return NextResponse.json({ error: "Prix d'achat invalide" }, { status: 400 });
      }
      data.purchasePrice = Math.round(p * 100) / 100;
    }
  }

  if (body.currentPrice !== undefined) {
    if (body.currentPrice === null) {
      data.currentPrice = null;
      data.currentPriceUpdatedAt = null;
    } else {
      const p = coerceNumber(body.currentPrice);
      if (p == null || p < 0 || p > MAX_PRICE_EUR) {
        return NextResponse.json({ error: "Prix actuel invalide" }, { status: 400 });
      }
      data.currentPrice = Math.round(p * 100) / 100;
      data.currentPriceUpdatedAt = new Date();
    }
  }

  if (body.purchaseDate) data.purchaseDate = new Date(body.purchaseDate as string);
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.condition !== undefined) data.condition = body.condition;

  try {
    const updated = await prisma.portfolioItem.update({
      where: { id },
      data,
      include: {
        item: { include: { serie: { include: { bloc: true } } } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating portfolio item:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleUpdate(request, id);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleUpdate(request, id);
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
