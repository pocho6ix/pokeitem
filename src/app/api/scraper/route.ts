import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");

    if (!apiKey || apiKey !== process.env.SCRAPER_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Placeholder - actual scraping logic will be implemented later
    return NextResponse.json({
      message: "Scraping triggered",
      status: "pending",
    });
  } catch (error) {
    console.error("Error triggering scraper:", error);
    return NextResponse.json(
      { error: "Failed to trigger scraper" },
      { status: 500 }
    );
  }
}
