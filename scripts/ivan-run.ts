/**
 * Point d'entrée de l'agent Ivan.
 * Appelé par GitHub Actions tous les jours à 9h.
 *
 * Flux :
 * 1. Scanner les articles déjà générés
 * 2. Récupérer la prochaine série non traitée
 * 3. Générer l'article via Claude API
 * 4. Sauvegarder en fichier JSON (chargé au build par Next.js)
 * 5. Sauvegarder le prompt Gemini
 * 6. Git commit + push (via GitHub Actions)
 */

import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { getNextSerie } from "./ivan/series-queue";
import { generateArticle } from "./ivan/generate-article";
import { publishArticle } from "./ivan/publish-article";
import { IVAN_CONFIG } from "./ivan/config";

async function main() {
  console.log("=".repeat(60));
  console.log("  Agent Ivan — Blog SEO Automatisé");
  console.log("=".repeat(60));
  console.log(
    `  ${new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`,
  );
  console.log(`  ${new Date().toLocaleTimeString("fr-FR")}`);
  console.log("=".repeat(60));
  console.log();

  // 1. Scanner les articles existants
  const outputDir = join(process.cwd(), IVAN_CONFIG.outputDir);
  const existingSlugs = new Set<string>();

  if (existsSync(outputDir)) {
    const files = readdirSync(outputDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      existingSlugs.add(file.replace(".json", ""));
    }
  }

  console.log(`  Articles existants : ${existingSlugs.size}`);

  // 2. Récupérer la prochaine série
  const serie = getNextSerie(existingSlugs);

  if (!serie) {
    console.log("\n  Toutes les séries ont été traitées ! Ivan se repose.");
    return;
  }

  console.log(`\n  Série du jour : ${serie.name} (${serie.abbreviation}) — Bloc ${serie.bloc}`);
  console.log();

  // 3. Générer l'article via Claude API
  console.log("  Génération de l'article via Claude API...");
  const article = await generateArticle(serie);
  console.log(`  Article généré : "${article.title}"`);
  console.log(`    Mot-clé principal : ${article.mainKeyword}`);
  console.log(`    Mots-clés longue traîne : ${article.longTailKeywords.length}`);
  console.log(`    Temps de lecture : ~${article.readingTime} min`);
  console.log();

  // 4. Publier (sauvegarder le JSON)
  console.log("  Publication...");
  publishArticle(article);
  console.log();

  // 5. Afficher le prompt Gemini
  console.log("-".repeat(60));
  console.log("  PROMPT GEMINI (pour l'image de couverture) :");
  console.log("-".repeat(60));
  console.log(article.geminiImagePrompt);
  console.log("-".repeat(60));
  console.log(`\n  Sauvegarder l'image dans : public/images/blog/${article.slug}.jpg`);
  console.log();
  console.log("  Agent Ivan — Terminé");
}

main().catch((error) => {
  console.error("  ERREUR Agent Ivan :", error);
  process.exit(1);
});
