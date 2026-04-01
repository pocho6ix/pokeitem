import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public route — serves a user's avatar image
// New: image is a Vercel Blob URL → redirect to it
// Legacy: image is stored as "data:<mime>;base64,<data>" → decode and serve
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

  // New format: Vercel Blob URL — redirect permanently
  if (user.image.startsWith("https://")) {
    return NextResponse.redirect(user.image, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Legacy format: "data:<mime>;base64,<data>" — decode and serve
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
