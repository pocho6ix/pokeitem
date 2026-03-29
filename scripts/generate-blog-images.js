#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Generate blog cover images using Google Gemini Imagen
// ---------------------------------------------------------------------------
//
// Usage:
//   GEMINI_API_KEY=your_key node scripts/generate-blog-images.js
//   GEMINI_API_KEY=your_key node scripts/generate-blog-images.js guide-debuter-collection-pokemon-tcg
//
// Requirements:
//   - A Google AI Studio API key with Imagen access
//   - Node.js 18+
//
// The script generates a 1200x600 cover image (2:1 ratio) for each blog post
// and saves it as a WebP file in public/images/blog/.
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "..", "public", "images", "blog");

// ---------------------------------------------------------------------------
// Blog post image prompts — realistic, high-quality photography style
// ---------------------------------------------------------------------------

const IMAGE_PROMPTS = {
  "guide-debuter-collection-pokemon-tcg": {
    prompt:
      "A beautifully arranged collection of sealed Pokémon TCG products on a clean wooden desk. Include a sealed booster display box, an Elite Trainer Box, and several booster packs still in their original packaging. Soft warm lighting from the side, shallow depth of field. The products should look pristine and collectible. Professional product photography style, 4K quality, photorealistic.",
    filename: "guide-debuter-collection-pokemon-tcg.webp",
  },
  "equilibre-parfait-nouvelle-extension-me03": {
    prompt:
      "A dramatic close-up of a brand new sealed Pokémon TCG booster display box on a dark reflective surface. Vibrant holographic packaging catching colorful light reflections. Moody studio lighting with purple and blue accent lights. Professional product photography, ultra-realistic, 4K quality.",
    filename: "equilibre-parfait-nouvelle-extension-me03.webp",
  },
  "top-10-produits-scelles-rentables-2025": {
    prompt:
      "A luxurious flat lay arrangement of premium sealed Pokémon TCG products viewed from above: display boxes, Elite Trainer Boxes, and Ultra Premium Collections arranged in a grid pattern on a dark marble surface. Gold and silver accent lighting. Professional editorial photography style, ultra-realistic, 4K quality.",
    filename: "top-10-produits-scelles-rentables-2025.webp",
  },
  "investir-etb-strategie-conseils": {
    prompt:
      "A stack of sealed Pokémon TCG Elite Trainer Boxes arranged like an investment portfolio chart going upward, on a clean modern desk next to a laptop showing growth charts. Soft natural lighting from a window. Professional lifestyle photography, photorealistic, 4K quality.",
    filename: "investir-etb-strategie-conseils.webp",
  },
  "calendrier-sorties-pokemon-tcg-2026": {
    prompt:
      "A modern calendar planner open on a desk with Pokémon TCG booster packs and sealed products arranged around it. Colorful sticky notes marking release dates. Bright, clean workspace with natural lighting. Professional lifestyle photography, photorealistic, 4K quality.",
    filename: "calendrier-sorties-pokemon-tcg-2026.webp",
  },
  "reperer-faux-produits-scelles-pokemon": {
    prompt:
      "A magnifying glass examining the seal and packaging details of a Pokémon TCG booster box. Split composition: one side shows an authentic product with perfect packaging, the other shows subtle differences of a counterfeit. Dramatic side lighting, detective-style mood. Professional product photography, photorealistic, 4K quality.",
    filename: "reperer-faux-produits-scelles-pokemon.webp",
  },
};

// ---------------------------------------------------------------------------
// Gemini Imagen API
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is required.");
  console.error("Get your API key at: https://aistudio.google.com/apikey");
  process.exit(1);
}

async function generateImage(prompt, outputPath) {
  // Use Gemini's image generation endpoint (Imagen 3)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9",
      personGeneration: "DONT_ALLOW",
      safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
    },
  };

  console.log(`  Calling Gemini Imagen API...`);

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

  if (!data.predictions || data.predictions.length === 0) {
    throw new Error("No image generated. The prompt may have been blocked by safety filters.");
  }

  // The API returns base64-encoded image data
  const imageBase64 = data.predictions[0].bytesBase64Encoded;
  const imageBuffer = Buffer.from(imageBase64, "base64");

  writeFileSync(outputPath, imageBuffer);
  console.log(`  Saved: ${outputPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }

  // Determine which posts to generate images for
  const targetSlug = process.argv[2];
  const entries = targetSlug
    ? [[targetSlug, IMAGE_PROMPTS[targetSlug]]].filter(([, v]) => v)
    : Object.entries(IMAGE_PROMPTS);

  if (entries.length === 0) {
    console.error(`Unknown slug: ${targetSlug}`);
    console.error(`Available slugs:\n${Object.keys(IMAGE_PROMPTS).map((s) => `  - ${s}`).join("\n")}`);
    process.exit(1);
  }

  console.log(`\nGenerating ${entries.length} blog cover image(s)...\n`);

  for (const [slug, config] of entries) {
    const outputPath = join(OUTPUT_DIR, config.filename);

    // Skip if image already exists (use --force to regenerate)
    if (existsSync(outputPath) && !process.argv.includes("--force")) {
      console.log(`[SKIP] ${slug} — image already exists. Use --force to regenerate.`);
      continue;
    }

    console.log(`[GENERATING] ${slug}`);
    console.log(`  Prompt: "${config.prompt.substring(0, 80)}..."`);

    try {
      await generateImage(config.prompt, outputPath);
      console.log(`  Done!\n`);
    } catch (error) {
      console.error(`  FAILED: ${error.message}\n`);
    }
  }

  console.log("Image generation complete.");
}

main();
