import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");
    const source = searchParams.get("source");
    const type = searchParams.get("type");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const itemId = searchParams.get("itemId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      isAvailable: true,
    };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (source) {
      where.source = source;
    }

    if (type) {
      where.item = { type };
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (itemId) {
      where.itemId = itemId;
    }

    const [listings, total] = await Promise.all([
      prisma.marketListing.findMany({
        where,
        include: { item: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scrapedAt: "desc" },
      }),
      prisma.marketListing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching market listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch market listings" },
      { status: 500 }
    );
  }
}
