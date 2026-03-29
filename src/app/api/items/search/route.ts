import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ItemType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type");

    const items = await prisma.item.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                  {
                    serie: { name: { contains: q, mode: "insensitive" } },
                  },
                ],
              }
            : {},
          type ? { type: type as ItemType } : {},
        ],
      },
      include: {
        serie: { include: { bloc: true } },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ results: items });
  } catch (error) {
    console.error("Error searching items:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
