import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { checkFeature, incrementScanCount } from "@/lib/subscription";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaudeCandidate {
  name: string;
  number: string;
  setCode: string;
  confidence: number;
}

interface ClaudeResponse {
  candidates: ClaudeCandidate[];
}

export interface CardCandidate {
  cardId: string;
  confidence: number;
  card: {
    id: string;
    name: string;
    number: string;
    imageUrl: string | null;
    price: number | null;
    rarity: string;
  };
  serie: {
    id: string;
    slug: string;
    name: string;
    blocSlug: string;
  };
}

export interface IdentifyResponse {
  level: "high" | "medium" | "low";
  topConfidence: number;
  candidates: CardCandidate[];
  raw: { name: string; number: string; setCode: string } | null;
  scanId: string;
}

// ─── Mapping : code imprimé sur la carte → slug série ────────────────────────
const PRINTED_CODE_TO_SLUG: Record<string, string> = {
  // ── Méga-Évolution (codes FR imprimés tels quels) ──────────────────────────
  "me01": "mega-evolution",
  "me02": "flammes-fantasmagoriques",
  "me02.5": "heros-transcendants",
  "me2.5":  "heros-transcendants",
  "me03": "equilibre-parfait",
  "me3":  "equilibre-parfait",
  // ── Écarlate & Violet ──────────────────────────────────────────────────────
  "sv1": "ecarlate-et-violet",
  "sv2": "evolutions-a-paldea",
  "sv3": "flammes-obsidiennes",
  "sv3pt5": "pokemon-151",  "sv3.5": "pokemon-151",
  "sv4": "faille-paradoxe",
  "sv4pt5": "destinees-de-paldea", "sv4.5": "destinees-de-paldea",
  "sv5": "forces-temporelles",
  "sv6": "mascarade-crepusculaire",
  "sv6pt5": "fable-nebuleuse",    "sv6.5": "fable-nebuleuse",
  "sv7": "couronne-stellaire",
  "sv8": "etincelles-deferlantes",
  "sv8pt5": "evolutions-prismatiques", "sv8.5": "evolutions-prismatiques",
  "sv9": "aventures-ensemble",
  "sv10": "rivalites-destinees",
  "sv10.5b": "foudre-noire",
  "sv10.5w": "flamme-blanche",
  // ── Épée & Bouclier ────────────────────────────────────────────────────────
  "swsh1": "epee-et-bouclier",
  "swsh2": "clash-des-rebelles",
  "swsh3": "tenebres-embrasees",
  "swsh3pt5": "la-voie-du-maitre",  "swsh3.5": "la-voie-du-maitre",
  "swsh4": "voltage-eclatant",
  "swsh4pt5": "destinees-radieuses", "swsh4.5": "destinees-radieuses",
  "swsh5": "styles-de-combat",
  "swsh6": "regne-de-glace",
  "swsh7": "evolution-celeste",
  "cel25": "celebrations",
  "swsh8": "poing-de-fusion",
  "swsh9": "stars-etincelantes",
  "swsh10": "astres-radieux",
  "swsh10pt5": "pokemon-go",        "swsh10.5": "pokemon-go",
  "pgo": "pokemon-go",
  "swsh11": "origine-perdue",
  "swsh12": "tempete-argentee",
  "swsh12pt5": "zenith-supreme",    "swsh12.5": "zenith-supreme",
  // ── Soleil & Lune ──────────────────────────────────────────────────────────
  "sm1": "soleil-et-lune",
  "sm2": "gardiens-ascendants",
  "sm3": "ombres-ardentes",
  "sm3pt5": "legendes-brillantes",  "sm3.5": "legendes-brillantes",
  "sm4": "invasion-carmin",
  "sm5": "ultra-prisme",
  "sm6": "lumiere-interdite",
  "sm7": "tempete-celeste",
  "sm7pt5": "majeste-des-dragons",  "sm7.5": "majeste-des-dragons",
  "sm8": "tonnerre-perdu",
  "sm9": "duo-de-choc",
  "sm10": "alliance-infaillible",
  "sm11": "harmonie-des-esprits",
  "sm115": "destinees-occultes",
  "sm12": "eclipse-cosmique",
  // ── XY ─────────────────────────────────────────────────────────────────────
  "xy1": "xy-base",    "xy2": "etincelles-xy",
  "xy3": "poings-furieux",    "xy4": "vigueur-spectrale",
  "xy5": "primo-choc",        "xy6": "ciel-rugissant",
  "xy7": "origines-antiques", "xy8": "impulsion-turbo",
  "xy9": "rupture-turbo",     "xy10": "impact-des-destins",
  "xy11": "offensive-vapeur", "xy12": "evolutions-xy",
  "g1": "generations",        "dc1": "double-danger",
  // ── Noir & Blanc ───────────────────────────────────────────────────────────
  "bw1": "noir-et-blanc",     "bw2": "pouvoirs-emergents",
  "bw3": "nobles-victoires",  "bw4": "destinees-futures",
  "bw5": "explorateurs-obscurs", "bw6": "dragons-exaltes",
  "bw7": "frontieres-franchies", "bw8": "tempete-plasma",
  "bw9": "glaciation-plasma", "bw10": "explosion-plasma",
  // ── HGSS ───────────────────────────────────────────────────────────────────
  "hgss1": "heartgold-soulsilver-base", "hgss2": "dechainement",
  "hgss3": "indomptable",               "hgss4": "triomphe",
  // ── Platine ────────────────────────────────────────────────────────────────
  "pl1": "platine-base", "pl2": "rivaux-emergeants",
  "pl3": "vainqueurs-supremes",
  // ── Diamant & Perle ────────────────────────────────────────────────────────
  "dp1": "diamant-et-perle",   "dp2": "tresors-mysterieux",
  "dp3": "merveilles-secretes", "dp4": "grands-envols",
  "dp5": "aube-majestueuse",   "dp6": "eveil-des-legendes",
  "dp7": "tempete-dp",
  // ── EX ─────────────────────────────────────────────────────────────────────
  "ex1": "rubis-et-saphir",      "ex2": "tempete-de-sable",
  "ex3": "dragon-ex",            "ex4": "team-magma-vs-team-aqua",
  "ex5": "legendes-oubliees",    "ex6": "fire-red-leaf-green",
  "ex8": "deoxys",
  "ex9": "emeraude",             "ex10": "forces-cachees",
  "ex11": "especes-delta",       "ex12": "createurs-de-legendes",
  "ex13": "fantomes-holon",      "ex14": "gardiens-de-cristal",
  "ex16": "gardiens-du-pouvoir",
  // ── Wizards of the Coast ───────────────────────────────────────────────────
  "base1": "set-de-base",  "base2": "jungle",
  "base3": "fossile",
  "base5": "team-rocket",  "ecard1": "expedition",
  "ecard2": "aquapolis",
};

// ─── DB lookup helper ─────────────────────────────────────────────────────────

async function lookupCard(name: string, number: string, setCode: string) {
  const normalizedNumber = (number ?? "").replace(/^0+/, "") || "0";
  const normalizedSetCode = (setCode ?? "").toLowerCase().trim();

  const slugFromMap = PRINTED_CODE_TO_SLUG[normalizedSetCode];
  let serie = slugFromMap
    ? await prisma.serie.findUnique({
        where: { slug: slugFromMap },
        include: { bloc: { select: { slug: true } } },
      })
    : null;

  if (!serie && normalizedSetCode) {
    serie = await prisma.serie.findFirst({
      where: { abbreviation: { equals: normalizedSetCode, mode: "insensitive" } },
      include: { bloc: { select: { slug: true } } },
    });
  }

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

  if (!card && name && normalizedNumber !== "0") {
    card = await prisma.card.findFirst({
      where: {
        name: { contains: name, mode: "insensitive" },
        number: { in: [normalizedNumber, normalizedNumber.padStart(3, "0")] },
      },
    });
  }

  if (!card && name) {
    card = await prisma.card.findFirst({
      where: { name: { contains: name, mode: "insensitive" } },
      orderBy: { serieId: "asc" },
    });
  }

  if (!card) return null;

  const cardSerie =
    serie && serie.id === card.serieId
      ? serie
      : await prisma.serie.findUnique({
          where: { id: card.serieId },
          include: { bloc: { select: { slug: true } } },
        });

  if (!cardSerie) return null;

  return { card, serie: cardSerie };
}

// ─── POST /api/scanner/identify ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const scanCheck = await checkFeature(userId, "SCAN_CARD");
    if (!scanCheck.allowed) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", reason: scanCheck.reason, limit: scanCheck.limit, current: scanCheck.current },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body?.image || typeof body.image !== "string") {
      return NextResponse.json({ error: "image requis (base64 data URL)" }, { status: 400 });
    }

    const dataUrl: string = body.image;
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx === -1) {
      return NextResponse.json({ error: "Format d'image invalide" }, { status: 400 });
    }
    const base64Data = dataUrl.slice(commaIdx + 1);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY_SCANNER ?? process.env.ANTHROPIC_API_KEY,
    });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 768,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64Data },
            },
            {
              type: "text",
              text: `You are analyzing a Pokémon TCG card photo. Look at the bottom of the card for the set code and card number (e.g. "sv9 · 177/159" or "SV9 177/159").

Return a JSON object with "candidates": an array of up to 5 possible card matches, sorted by confidence (highest first).

For each candidate:
- "name": card name as printed on the card
- "number": card number WITHOUT the total (e.g. "177" from "177/159", no leading zeros)
- "setCode": set code printed at the bottom (e.g. "sv9", "sv10", "swsh1", "xy1") in lowercase
- "confidence": 0-100 integer (how sure you are about this specific candidate)

Rules:
- If top candidate is ≥85% confident, 1-2 candidates is fine
- If 50-84%, return 3-5 alternatives (same Pokémon in different sets, or similar-looking Pokémon)
- If <50%, return whatever you can partially read, with low confidence
- If image is unreadable, return {"candidates": [{"name":"","number":"","setCode":"","confidence":0}]}
- The set code is usually at the very bottom (e.g. "sv9", "swsh12pt5"). Do NOT confuse it with the card number.

Respond with JSON only, no other text.`,
            },
          ],
        },
      ],
    });

    const rawText =
      claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text.trim()
        : "";

    let parsed: ClaudeResponse;
    try {
      const jsonStr = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      parsed = JSON.parse(jsonStr) as ClaudeResponse;
    } catch {
      const scanId = crypto.randomUUID();
      return NextResponse.json<IdentifyResponse>({ level: "low", topConfidence: 0, candidates: [], raw: null, scanId });
    }

    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    const top = candidates[0];

    if (!top || (top.confidence ?? 0) < 10) {
      const scanId = crypto.randomUUID();
      return NextResponse.json<IdentifyResponse>({ level: "low", topConfidence: 0, candidates: [], raw: null, scanId });
    }

    // DB lookup for each candidate in parallel
    const lookupResults = await Promise.all(
      candidates.slice(0, 5).map(async (c) => {
        const found = await lookupCard(c.name ?? "", c.number ?? "", c.setCode ?? "");
        if (!found) return null;
        return {
          cardId: found.card.id,
          confidence: Math.min(100, Math.max(0, Math.round(c.confidence ?? 0))),
          card: {
            id: found.card.id,
            name: found.card.name,
            number: found.card.number,
            imageUrl: found.card.imageUrl,
            // Prefer the cheapest FR NM listing when available (PokeItem is 100 % FR)
            price: found.card.priceFr ?? found.card.price,
            rarity: found.card.rarity,
          },
          serie: {
            id: found.serie.id,
            slug: found.serie.slug,
            name: found.serie.name,
            blocSlug: found.serie.bloc.slug,
          },
        } satisfies CardCandidate;
      })
    );

    // Deduplicate by cardId, preserve order (highest confidence first)
    const seenCardIds = new Set<string>();
    const finalCandidates: CardCandidate[] = [];
    for (const r of lookupResults) {
      if (!r || seenCardIds.has(r.cardId)) continue;
      seenCardIds.add(r.cardId);
      finalCandidates.push(r);
    }

    const topConfidence = finalCandidates[0]?.confidence ?? 0;
    const level: IdentifyResponse["level"] =
      topConfidence >= 85 ? "high" : topConfidence >= 50 ? "medium" : "low";

    if (finalCandidates.length > 0) {
      await incrementScanCount(userId);
    }

    const scanId = crypto.randomUUID();

    return NextResponse.json<IdentifyResponse>({
      level,
      topConfidence,
      candidates: finalCandidates,
      raw: top ? { name: top.name, number: top.number, setCode: top.setCode } : null,
      scanId,
    });
  } catch (err) {
    console.error("[scanner/identify]", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
