import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => null);
  if (!body?.userSelectedCardId || !body?.selectionSource) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.scanCorrection.create({
    data: {
      userId,
      aiTopCardId: body.aiTopCardId ?? null,
      aiTopConfidence: body.aiTopConfidence ?? null,
      userSelectedCardId: body.userSelectedCardId,
      selectionSource: body.selectionSource,
      ocrName: body.ocrName ?? null,
      ocrNumber: body.ocrNumber ?? null,
      ocrSetCode: body.ocrSetCode ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
