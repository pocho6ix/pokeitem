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

// ─── Mapping : code imprimé sur la carte → slug série ────────────────────────
// Les cartes françaises impriment le code international (sv9, swsh1…) en bas,
// mais notre DB stocke des abréviations françaises (EV09, EB01…).
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
  "sv10.5": "foudre-noire-flamme-blanche",
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
  "bw11": "legendary-treasures",
  // ── HGSS ───────────────────────────────────────────────────────────────────
  "hgss1": "heartgold-soulsilver-base", "hgss2": "dechainement",
  "hgss3": "indomptable",               "hgss4": "triomphe",
  "col1": "arceus",
  // ── Platine ────────────────────────────────────────────────────────────────
  "pl1": "platine-base", "pl2": "rivaux-emergeants",
  "pl3": "vainqueurs-supremes", "pl4": "arceus",
  // ── Diamant & Perle ────────────────────────────────────────────────────────
  "dp1": "diamant-et-perle",   "dp2": "tresors-mysterieux",
  "dp3": "merveilles-secretes", "dp4": "grands-envols",
  "dp5": "aube-majestueuse",   "dp6": "eveil-des-legendes",
  "dp7": "tempete-dp",
  // ── EX ─────────────────────────────────────────────────────────────────────
  "ex1": "rubis-et-saphir",      "ex2": "tempete-de-sable",
  "ex3": "dragon-ex",            "ex4": "groudon-vs-kyogre",
  "ex5": "legendes-oubliees",    "ex6": "fire-red-leaf-green",
  "ex7": "team-rocket-returns",  "ex8": "deoxys",
  "ex9": "emeraude",             "ex10": "forces-cachees",
  "ex11": "especes-delta",       "ex12": "createurs-de-legendes",
  "ex13": "fantomes-holon",      "ex14": "gardiens-de-cristal",
  "ex16": "gardiens-du-pouvoir",
  // ── Wizards of the Coast ───────────────────────────────────────────────────
  "base1": "set-de-base",  "base2": "jungle",
  "base3": "fossile",      "base4": "set-de-base-2",
  "base5": "team-rocket",  "gym1": "gym-heroes",
  "gym2": "gym-challenge", "ecard1": "expedition",
  "ecard2": "aquapolis",   "ecard3": "skyridge",
};

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
              text: `You are analyzing a Pokémon TCG card photo. Look at the bottom of the card for the set code and card number (e.g. "sv9 · 177/159" or "SV9 177/159").

Extract ONLY these fields and respond with valid JSON:
{
  "name": "<exact card name as printed on card>",
  "number": "<card number WITHOUT the total, e.g. '177' from '177/159', no leading zeros>",
  "setCode": "<set code printed on bottom of card in lowercase, e.g. 'sv9', 'sv8.5', 'sv8pt5', 'me01', 'swsh1', 'xy1'>",
  "confidence": <0-100, be conservative — lower if the card number or set code is not clearly visible>
}
IMPORTANT: The set code is usually printed at the very bottom of the card (e.g. 'sv9', 'swsh12pt5', 'xy6', 'dp4'). Do NOT confuse it with the card number.
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
    const normalizedSetCode = (setCode ?? "").toLowerCase().trim();

    // Try to find serie: 1st by printed-code map, 2nd by abbreviation
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

    // Fallback: search by name + number (more precise than name alone)
    if (!card && name && normalizedNumber !== "0") {
      card = await prisma.card.findFirst({
        where: {
          name: { contains: name, mode: "insensitive" },
          number: { in: [normalizedNumber, normalizedNumber.padStart(3, "0")] },
        },
      });
    }

    // Last resort: name only (least precise)
    if (!card && name) {
      card = await prisma.card.findFirst({
        where: { name: { contains: name, mode: "insensitive" } },
        orderBy: { serieId: "asc" }, // stable order
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
