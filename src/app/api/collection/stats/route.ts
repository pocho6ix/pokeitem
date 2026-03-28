import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userItems: any[] = await prisma.userItem.findMany({
      where: { userId },
      include: { item: true },
    });

    const totalItems = userItems.reduce((sum: number, ui: any) => sum + ui.quantity, 0);

    const totalValue = userItems.reduce(
      (sum: number, ui: any) => sum + (ui.item.currentPrice ?? 0) * ui.quantity,
      0
    );

    const totalInvested = userItems.reduce(
      (sum: number, ui: any) => sum + (ui.purchasePrice ?? 0) * ui.quantity,
      0
    );

    const profitLoss = totalValue - totalInvested;
    const profitLossPercent =
      totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    // Distribution by type
    const distributionMap = new Map<
      string,
      { count: number; value: number }
    >();
    for (const ui of userItems as any[]) {
      const type = ui.item.type;
      const existing = distributionMap.get(type) ?? { count: 0, value: 0 };
      existing.count += ui.quantity;
      existing.value += (ui.item.currentPrice ?? 0) * ui.quantity;
      distributionMap.set(type, existing);
    }
    const distributionByType = Array.from(distributionMap.entries()).map(
      ([type, data]) => ({ type, ...data })
    );

    // Top performers by ROI
    const topPerformers = (userItems as any[])
      .filter((ui: any) => ui.purchasePrice && ui.purchasePrice > 0 && ui.item.currentPrice)
      .map((ui: any) => ({
        id: ui.id,
        itemId: ui.item.id,
        name: ui.item.name,
        type: ui.item.type,
        purchasePrice: ui.purchasePrice!,
        currentPrice: ui.item.currentPrice!,
        roi:
          ((ui.item.currentPrice! - ui.purchasePrice!) / ui.purchasePrice!) *
          100,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10);

    return NextResponse.json({
      totalItems,
      totalValue: Math.round(totalValue * 100) / 100,
      totalInvested: Math.round(totalInvested * 100) / 100,
      profitLoss: Math.round(profitLoss * 100) / 100,
      profitLossPercent: Math.round(profitLossPercent * 100) / 100,
      distributionByType,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection stats" },
      { status: 500 }
    );
  }
}
