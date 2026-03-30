import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaudeCardResult {
  name: string;
  number: string;
  setCode: string;
  confidence: number;
}

interface IdentifyResponse {
  found: boolean;
  confidence: number;
  card?: {
    id: string;
    name: string;
    number: string;
    imageUrl: string | null;
    price: number | null;
    rarity: string;
  };
  serie?: {
    id: string;
    slug: string;
    name: string;
    blocSlug: string;
  };
  raw?: {
    name: string;
    number: string;
    setCode: string;
  };
}

// ─── POST /api/scanner/identify ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json().catch(() => null);
    if (!body?.image || typeof body.image !== "string") {
      return NextResponse.json({ error: "image requis (base64 data URL)" }, { status: 400 });
    }

    // 3. Extract base64 from data URL (e.g. "data:image/jpeg;base64,/9j/...")
    const dataUrl: string = body.image;
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) {
      return NextResponse.json({ error: "Format d'image invalide" }, { status: 400 });
    }
    const base64Data = dataUrl.slice(commaIdx + 1);

    // 4. Call Claude claude-haiku-4-5 with vision
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY_SCANNER ?? process.env.ANTHROPIC_API_KEY });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `You are analyzing a Pokémon TCG card photo. Extract ONLY these fields and respond with valid JSON:
{
  "name": "<card name in French if visible, else English>",
  "number": "<card number without leading zeros, e.g. '1' not '001'>",
  "setCode": "<set abbreviation printed on bottom of card, e.g. 'ME2.5', 'EV01', 'EB01'>",
  "confidence": <0-100>
}
If you cannot identify the card clearly, return { "confidence": 0 }.
Respond with JSON only, no other text.`,
            },
          ],
        },
      ],
    });

    // 5. Parse Claude's JSON response
    const rawText =
      claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text.trim()
        : "";

    let parsed: ClaudeCardResult;
    try {
      // Strip potential markdown code fences
      const jsonStr = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      parsed = JSON.parse(jsonStr) as ClaudeCardResult;
    } catch {
      return NextResponse.json<IdentifyResponse>({ found: false, confidence: 0 });
    }

    const { name, number, setCode, confidence } = parsed;

    // 6. Low-confidence early exit
    if (!confidence || confidence < 40) {
      return NextResponse.json<IdentifyResponse>({
        found: false,
        confidence: confidence ?? 0,
        raw: { name, number, setCode },
      });
    }

    // 7. Search DB
    // Normalize number (strip leading zeros)
    const normalizedNumber = (number ?? "").replace(/^0+/, "") || "0";

    // Try to find serie by abbreviation (case insensitive)
    const serie = setCode
      ? await prisma.serie.findFirst({
          where: { abbreviation: { equals: setCode, mode: "insensitive" } },
          include: { bloc: { select: { slug: true } } },
        })
      : null;

    let card = serie
      ? await prisma.card.findFirst({
          where: {
            serieId: serie.id,
            OR: [
              { number: normalizedNumber },
              { number: normalizedNumber.padStart(3, "0") },
            ],
          },
        })
      : null;

    // Fallback: search by name across all cards
    if (!card && name) {
      card = await prisma.card.findFirst({
        where: { name: { contains: name, mode: "insensitive" } },
      });
    }

    if (!card) {
      return NextResponse.json<IdentifyResponse>({
        found: false,
        confidence,
        raw: { name, number, setCode },
      });
    }

    // Fetch serie for found card (may differ from serie found by setCode above)
    const cardSerie =
      serie && serie.id === card.serieId
        ? serie
        : await prisma.serie.findUnique({
            where: { id: card.serieId },
            include: { bloc: { select: { slug: true } } },
          });

    if (!cardSerie) {
      return NextResponse.json<IdentifyResponse>({ found: false, confidence });
    }

    return NextResponse.json<IdentifyResponse>({
      found: true,
      confidence,
      card: {
        id: card.id,
        name: card.name,
        number: card.number,
        imageUrl: card.imageUrl,
        price: card.price,
        rarity: card.rarity,
      },
      serie: {
        id: cardSerie.id,
        slug: cardSerie.slug,
        name: cardSerie.name,
        blocSlug: cardSerie.bloc.slug,
      },
      raw: { name, number, setCode },
    });
  } catch (err) {
    console.error("[scanner/identify]", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
