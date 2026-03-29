#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Generate SEO-optimized blog articles about Pokémon TCG series
// Uses Google Gemini for article content + Imagen for cover images
// ---------------------------------------------------------------------------
//
// Usage:
//   GEMINI_API_KEY=xxx node scripts/generate-series-article.js
//   GEMINI_API_KEY=xxx node scripts/generate-series-article.js epee-et-bouclier
//   GEMINI_API_KEY=xxx node scripts/generate-series-article.js --next
//
// Environment:
//   GEMINI_API_KEY  — Required. Google AI Studio API key.
//   SKIP_IMAGE      — Set to "true" to skip image generation.
//
// The script:
//   1. Picks the next series from the queue (or a specific slug)
//   2. Generates a ~1500-word SEO article in French via Gemini
//   3. Generates a cover image via Imagen
//   4. Writes the article to src/data/blog-posts-generated/ as a JSON file
//   5. Updates the queue tracker
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const ARTICLES_DIR = join(ROOT, "src", "data", "blog-posts-generated");
const IMAGES_DIR = join(ROOT, "public", "images", "blog");
const QUEUE_FILE = join(ROOT, "scripts", "series-queue.json");

// ---------------------------------------------------------------------------
// Series queue — Épée & Bouclier → Méga-Évolution (chronological)
// ---------------------------------------------------------------------------

const SERIES_QUEUE = [
  // Épée & Bouclier (oldest first)
  { slug: "epee-et-bouclier", name: "Épée et Bouclier", nameEn: "Sword & Shield", abbreviation: "EB01", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2020-02-07" },
  { slug: "clash-des-rebelles", name: "Clash des Rebelles", nameEn: "Rebel Clash", abbreviation: "EB02", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2020-05-01" },
  { slug: "tenebres-embrasees", name: "Ténèbres Embrasées", nameEn: "Darkness Ablaze", abbreviation: "EB03", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2020-08-14" },
  { slug: "la-voie-du-maitre", name: "La Voie du Maître", nameEn: "Champion's Path", abbreviation: "EB03.5", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2020-09-25" },
  { slug: "voltage-eclatant", name: "Voltage Éclatant", nameEn: "Vivid Voltage", abbreviation: "EB04", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2020-11-13" },
  { slug: "destinees-radieuses", name: "Destinées Radieuses", nameEn: "Shining Fates", abbreviation: "EB04.5", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-02-19" },
  { slug: "styles-de-combat", name: "Styles de Combat", nameEn: "Battle Styles", abbreviation: "EB05", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-03-19" },
  { slug: "regne-de-glace", name: "Règne de Glace", nameEn: "Chilling Reign", abbreviation: "EB06", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-06-18" },
  { slug: "evolution-celeste", name: "Évolution Céleste", nameEn: "Evolving Skies", abbreviation: "EB07", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-08-27" },
  { slug: "poing-de-fusion", name: "Poing de Fusion", nameEn: "Fusion Strike", abbreviation: "EB08", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-11-12" },
  { slug: "celebrations", name: "Célébrations", nameEn: "Celebrations", abbreviation: "EB-CEL", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-10-08" },
  { slug: "stars-etincelantes", name: "Stars Étincelantes", nameEn: "Shining Fates", abbreviation: "EB09", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2021-11-19" },
  { slug: "brillantes-etoiles", name: "Brillantes Étoiles", nameEn: "Brilliant Stars", abbreviation: "EB09.5", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2022-02-25" },
  { slug: "astres-radieux", name: "Astres Radieux", nameEn: "Astral Radiance", abbreviation: "EB10", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2022-05-27" },
  { slug: "pokemon-go", name: "Pokémon GO", nameEn: "Pokémon GO", abbreviation: "EB10.5", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2022-07-01" },
  { slug: "origine-perdue", name: "Origine Perdue", nameEn: "Lost Origin", abbreviation: "EB11", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2022-09-09" },
  { slug: "tempete-argentee", name: "Tempête Argentée", nameEn: "Silver Tempest", abbreviation: "EB12", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2022-11-11" },
  { slug: "zenith-supreme", name: "Zénith Suprême", nameEn: "Crown Zenith", abbreviation: "EB12.5", bloc: "Épée & Bouclier", blocSlug: "epee-bouclier", releaseDate: "2023-01-20" },
  // Écarlate & Violet
  { slug: "ecarlate-et-violet", name: "Écarlate et Violet", nameEn: "Scarlet & Violet", abbreviation: "EV01", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2023-03-31" },
  { slug: "evolutions-a-paldea", name: "Évolutions à Paldea", nameEn: "Paldea Evolved", abbreviation: "EV02", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2023-06-09" },
  { slug: "flammes-obsidiennes", name: "Flammes Obsidiennes", nameEn: "Obsidian Flames", abbreviation: "EV03", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2023-08-11" },
  { slug: "pokemon-151", name: "Pokémon 151", nameEn: "151", abbreviation: "EV3.5", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2023-09-22" },
  { slug: "faille-paradoxe", name: "Faille Paradoxe", nameEn: "Paradox Rift", abbreviation: "EV04", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2023-11-03" },
  { slug: "destinees-de-paldea", name: "Destinées de Paldea", nameEn: "Paldean Fates", abbreviation: "EV4.5", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-01-26" },
  { slug: "forces-temporelles", name: "Forces Temporelles", nameEn: "Temporal Forces", abbreviation: "EV05", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-03-22" },
  { slug: "mascarade-crepusculaire", name: "Mascarade Crépusculaire", nameEn: "Twilight Masquerade", abbreviation: "EV06", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-05-24" },
  { slug: "fable-nebuleuse", name: "Fable Nébuleuse", nameEn: "Shrouded Fable", abbreviation: "EV6.5", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-08-02" },
  { slug: "couronne-stellaire", name: "Couronne Stellaire", nameEn: "Stellar Crown", abbreviation: "EV07", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-09-13" },
  { slug: "etincelles-deferlantes", name: "Étincelles Déferlantes", nameEn: "Surging Sparks", abbreviation: "EV08", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2024-11-08" },
  { slug: "evolutions-prismatiques", name: "Évolutions Prismatiques", nameEn: "Prismatic Evolutions", abbreviation: "EV8.5", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2025-01-17" },
  { slug: "aventures-ensemble", name: "Aventures Ensemble", nameEn: "Adventures Together", abbreviation: "EV09", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2025-03-28" },
  { slug: "rivalites-destinees", name: "Rivalités Destinées", nameEn: "Destined Rivals", abbreviation: "EV10", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2025-05-30" },
  { slug: "foudre-noire-flamme-blanche", name: "Foudre Noire / Flamme Blanche", nameEn: "Black Lightning / White Flame", abbreviation: "EV10.5", bloc: "Écarlate & Violet", blocSlug: "ecarlate-violet", releaseDate: "2025-07-01" },
  // Méga-Évolution
  { slug: "mega-evolution", name: "Méga-Évolution", nameEn: "Mega Evolution", abbreviation: "ME01", bloc: "Méga-Évolution", blocSlug: "mega-evolution", releaseDate: "2025-09-26" },
  { slug: "flammes-fantasmagoriques", name: "Flammes Fantasmagoriques", nameEn: "Phantasmagoric Flames", abbreviation: "ME02", bloc: "Méga-Évolution", blocSlug: "mega-evolution", releaseDate: "2025-11-14" },
  { slug: "heros-transcendants", name: "Héros Transcendants", nameEn: "Transcendent Heroes", abbreviation: "ME2.5", bloc: "Méga-Évolution", blocSlug: "mega-evolution", releaseDate: "2026-01-30" },
  { slug: "equilibre-parfait", name: "Équilibre Parfait", nameEn: "Perfect Balance", abbreviation: "ME03", bloc: "Méga-Évolution", blocSlug: "mega-evolution", releaseDate: "2026-03-27" },
];

// ---------------------------------------------------------------------------
// Gemini API helpers
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

async function generateArticleContent(series) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Tu es Ivan Hasselin, rédacteur spécialisé dans le Pokémon TCG pour le site PokeItem.fr.

Rédige un article de blog complet et détaillé en français sur la série "${series.name}" (${series.nameEn}) du bloc ${series.bloc} du Pokémon TCG.

Informations sur la série :
- Nom français : ${series.name}
- Nom anglais : ${series.nameEn}
- Abréviation : ${series.abbreviation}
- Bloc : ${series.bloc}
- Date de sortie : ${series.releaseDate}

L'article doit couvrir :
1. **Présentation de la série** — Contexte de sortie, thème principal, Pokémon phares
2. **Les produits disponibles** — Display (Booster Box), ETB, Coffrets, produits spéciaux disponibles pour cette série
3. **Les cartes phares** — Les cartes les plus recherchées et précieuses de cette série (nommer des cartes réelles connues de cette extension)
4. **Prix et évolution du marché** — Prix moyen actuel des produits scellés sur CardMarket, tendance des prix (hausse/baisse/stable)
5. **Potentiel d'investissement** — Est-ce un bon investissement ? Pourquoi ? Comparaison avec d'autres séries
6. **Notre avis** — Recommandation pour collectionneurs et investisseurs

Format de sortie OBLIGATOIRE — Retourne un objet JSON valide (sans markdown, sans backticks) avec cette structure exacte :
{
  "title": "Titre SEO de l'article (50-70 caractères)",
  "slug": "serie-${series.slug}-guide-complet",
  "excerpt": "Description courte SEO (150-160 caractères)",
  "metaTitle": "Meta title SEO (50-60 caractères)",
  "metaDescription": "Meta description SEO (150-160 caractères)",
  "keywords": ["mot-clé 1", "mot-clé 2", "..."],
  "readingTime": 7,
  "tableOfContents": [
    {"id": "section-id", "label": "Label du sommaire"}
  ],
  "contentHtml": "<section id=\\"section-id\\"><h2>Titre</h2><p>Contenu...</p></section>"
}

Règles pour le contentHtml :
- Utilise des balises <section id="..."> avec des <h2> pour chaque grande section
- Utilise des <h3> pour les sous-sections
- Sépare les sections avec des <hr />
- Utilise des <blockquote><p><strong>Conseil PokeItem :</strong> ...</p></blockquote> pour les tips
- Utilise des <ul>/<ol> avec <li> pour les listes
- Mets en <strong> les mots-clés importants
- Ajoute des liens internes : <a href="/collection/${series.blocSlug}/${series.slug}">voir la série</a>
- L'article doit faire environ 1500-2000 mots
- Écris en français naturel, style expert passionné
- Inclus des vrais noms de cartes et de Pokémon de cette extension`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  console.log("  Calling Gemini for article content...");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("No content generated");

  return JSON.parse(text);
}

async function generateCoverImage(series, outputPath) {
  if (process.env.SKIP_IMAGE === "true") {
    console.log("  [SKIP] Image generation skipped (SKIP_IMAGE=true)");
    return false;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;

  const prompt = `Professional product photography of sealed Pokémon TCG "${series.nameEn}" products arranged on a clean wooden desk. Include a sealed booster display box and an Elite Trainer Box from the ${series.nameEn} series. Soft natural lighting, shallow depth of field. The products look pristine and collectible. High-end editorial style, photorealistic, 4K quality. No text overlay.`;

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9",
      personGeneration: "DONT_ALLOW",
      safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
    },
  };

  console.log("  Calling Gemini Imagen for cover image...");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  Image generation failed (${response.status}): ${errorText}`);
    return false;
  }

  const data = await response.json();
  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    console.error("  No image generated (possibly blocked by safety filters)");
    return false;
  }

  const imageBuffer = Buffer.from(data.predictions[0].bytesBase64Encoded, "base64");
  writeFileSync(outputPath, imageBuffer);
  console.log(`  Saved image: ${outputPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
  return true;
}

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

function loadQueue() {
  if (existsSync(QUEUE_FILE)) {
    return JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
  }
  return { completedSlugs: [], lastIndex: -1 };
}

function saveQueue(queue) {
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function getNextSeries(queue) {
  for (const series of SERIES_QUEUE) {
    if (!queue.completedSlugs.includes(series.slug)) {
      return series;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function generateArticle(series) {
  console.log(`\n[GENERATING] ${series.name} (${series.abbreviation})`);
  console.log(`  Bloc: ${series.bloc} | Date: ${series.releaseDate}\n`);

  // Ensure directories exist
  if (!existsSync(ARTICLES_DIR)) mkdirSync(ARTICLES_DIR, { recursive: true });
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  // 1. Generate article content
  const article = await generateArticleContent(series);

  // 2. Generate cover image
  const imageFilename = `serie-${series.slug}.webp`;
  const imagePath = join(IMAGES_DIR, imageFilename);
  const imageGenerated = await generateCoverImage(series, imagePath);

  // 3. Build the full blog post data
  const today = new Date().toISOString().split("T")[0];
  const blogPost = {
    id: `serie-${series.slug}`,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: imageGenerated ? `/images/blog/${imageFilename}` : null,
    author: "Ivan Hasselin",
    tags: ["série", series.bloc, series.name, "guide"],
    category: "guide",
    published: true,
    publishedAt: today,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    keywords: article.keywords || [],
    readingTime: article.readingTime || 7,
    viewCount: 0,
    tableOfContents: article.tableOfContents || [],
    contentHtml: article.contentHtml,
    relatedSlugs: ["guide-debuter-collection-pokemon-tcg"],
    seriesSlug: series.slug,
    seriesBlocSlug: series.blocSlug,
  };

  // 4. Save as JSON file
  const articlePath = join(ARTICLES_DIR, `${article.slug}.json`);
  writeFileSync(articlePath, JSON.stringify(blogPost, null, 2));
  console.log(`\n  Article saved: ${articlePath}`);

  return blogPost;
}

async function main() {
  const queue = loadQueue();
  const targetSlug = process.argv[2];

  let seriesToGenerate = [];

  if (targetSlug === "--next" || !targetSlug) {
    // Get next 1 (or 2 if called with --batch) from queue
    const count = process.argv.includes("--batch") ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const next = getNextSeries(queue);
      if (next) {
        seriesToGenerate.push(next);
        queue.completedSlugs.push(next.slug);
      }
    }
  } else {
    const series = SERIES_QUEUE.find((s) => s.slug === targetSlug);
    if (!series) {
      console.error(`Unknown series slug: ${targetSlug}`);
      console.error(`Available: ${SERIES_QUEUE.map((s) => s.slug).join(", ")}`);
      process.exit(1);
    }
    seriesToGenerate = [series];
    if (!queue.completedSlugs.includes(series.slug)) {
      queue.completedSlugs.push(series.slug);
    }
  }

  if (seriesToGenerate.length === 0) {
    console.log("All series articles have been generated!");
    process.exit(0);
  }

  console.log(`Generating ${seriesToGenerate.length} article(s)...`);

  for (const series of seriesToGenerate) {
    try {
      await generateArticle(series);
    } catch (error) {
      console.error(`\n  FAILED for ${series.name}: ${error.message}`);
      // Remove from completed if failed
      queue.completedSlugs = queue.completedSlugs.filter((s) => s !== series.slug);
    }
  }

  saveQueue(queue);
  console.log("\nDone! Queue updated.");
}

main();
