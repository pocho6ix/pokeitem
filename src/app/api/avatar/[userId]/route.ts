import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public route — serves a user's avatar image from DB
// Cached privately for 1 hour; revalidated on upload via cache-busting query param
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true },
  });

  if (!user?.image) {
    return new NextResponse(null, { status: 404 });
  }

  // image is stored as "data:<mime>;base64,<data>"
  const [header, data] = user.image.split(",");
  const mimeMatch = header?.match(/data:([^;]+)/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=3600, must-revalidate",
    },
  });
}
