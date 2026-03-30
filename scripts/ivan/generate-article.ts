/**
 * Appelle l'API Claude pour générer un article SEO complet
 * sur une série Pokémon TCG.
 */

import Anthropic from "@anthropic-ai/sdk";
import { SerieEntry } from "./series-queue";
import { IVAN_CONFIG } from "./config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  mainKeyword: string;
  longTailKeywords: string[];
  content: string;
  excerpt: string;
  readingTime: number;
  tags: string[];
  geminiImagePrompt: string;
  tableOfContents: { id: string; label: string }[];
}

export async function generateArticle(serie: SerieEntry): Promise<GeneratedArticle> {
  const systemPrompt = `Tu es Ivan, un rédacteur SEO expert spécialisé dans le Pokémon TCG (Jeu de Cartes à Collectionner). Tu écris pour PokeItem.fr, la plateforme de gestion de collection d'items scellés Pokémon.

Tes articles sont :
- Riches, détaillés et passionnés (1500-2500 mots)
- Optimisés SEO avec un mot-clé principal et des mots-clés longue traîne naturellement intégrés
- Structurés avec des H2 et H3 clairs
- Informatifs ET engageants (pas de contenu générique)
- Orientés vers la collection et l'investissement dans les items scellés Pokémon

Tu connais parfaitement le marché des items scellés Pokémon : boosters, displays (booster boxes), ETB (Elite Trainer Box), coffrets, UPC (Ultra Premium Collection), tins, blisters, bundles, etc.

Tu parles en français, avec un ton expert mais accessible. Tu utilises le vocabulaire de la communauté Pokémon TCG francophone.

IMPORTANT : Le contenu que tu génères doit être du HTML valide (pas du Markdown). Utilise des balises <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a>, <blockquote>, <hr />, <section>, etc.
Chaque section H2 doit être enveloppée dans une balise <section id="...">.`;

  const userPrompt = `Écris un article de blog SEO complet pour PokeItem.fr sur la série "${serie.name}" (${serie.abbreviation}) du bloc ${serie.bloc}.

INFORMATIONS SUR LA SÉRIE :
- Nom FR : ${serie.name}
- Nom EN : ${serie.nameEn}
- Bloc : ${serie.bloc}
- Abréviation : ${serie.abbreviation}
- Date de sortie : ${serie.releaseDate}
${serie.cardCount ? `- Nombre de cartes : ${serie.cardCount}` : ""}
${serie.notableCards ? `- Cartes emblématiques : ${serie.notableCards.join(", ")}` : ""}
${serie.notableItems ? `- Items scellés notables : ${serie.notableItems.join(", ")}` : ""}
${serie.keyFacts ? `- Faits marquants : ${serie.keyFacts.join(" | ")}` : ""}

STRUCTURE DE L'ARTICLE (en HTML avec des <section id="..."> pour chaque H2) :

1. **Introduction** (<section id="introduction">) — accroche + contexte de la série dans le bloc

2. **Présentation de l'extension ${serie.name}** (<section id="presentation">) avec H2
   - Thème et univers visuel (H3)
   - Mécaniques de jeu (H3)
   - Place dans le bloc ${serie.bloc}

3. **Produits scellés disponibles** (<section id="produits-scelles">) avec H2
   - Liste des produits (ETB, Booster Box, coffrets, tins, etc.)
   - Contenu de chaque produit
   - Prix retail vs prix actuel du marché

4. **Prix du marché** (<section id="prix-marche">) avec H2
   - Analyse des prix actuels des items scellés
   - Évolution des prix depuis la sortie
   - Comparaison avec d'autres séries du même bloc

5. **Potentiel d'investissement** (<section id="potentiel-investissement">) avec H2
   - Items qui se vendent le mieux
   - Potentiel de plus-value court/moyen/long terme
   - Facteurs de valorisation

6. **Conseils d'achat** (<section id="conseils-achat">) avec H2
   - Meilleurs items à acheter maintenant
   - Conseils pour les collectionneurs-investisseurs
   - Pièges à éviter

7. **Conclusion** (<section id="conclusion">) — résumé + CTA vers PokeItem

Inclus une citation/blockquote pertinente dans l'introduction.
Inclus des liens internes : <a href="/collection">Explorer la collection sur PokeItem</a>

CONSIGNES SEO :
- Choisis un MOT-CLÉ PRINCIPAL pertinent (ex: "série ${serie.name} Pokémon TCG")
- Intègre naturellement 8-12 MOTS-CLÉS LONGUE TRAÎNE
- Le titre doit faire max 60 caractères
- La meta description max 155 caractères

FORMAT DE RÉPONSE (JSON strict) :
{
  "title": "Titre de l'article (max 60 chars)",
  "metaTitle": "Meta title SEO (max 60 chars)",
  "metaDescription": "Meta description (max 155 chars)",
  "mainKeyword": "mot-clé principal",
  "longTailKeywords": ["mot-clé 1", "mot-clé 2", ...],
  "excerpt": "Résumé court de 2-3 phrases pour la carte d'aperçu",
  "readingTime": 8,
  "tags": ["pokémon tcg", "${serie.bloc.toLowerCase()}", "${serie.name.toLowerCase()}", "collection", "investissement"],
  "tableOfContents": [
    { "id": "introduction", "label": "Introduction" },
    { "id": "presentation", "label": "Présentation de l'extension" },
    { "id": "produits-scelles", "label": "Produits scellés disponibles" },
    { "id": "prix-marche", "label": "Prix du marché" },
    { "id": "potentiel-investissement", "label": "Potentiel d'investissement" },
    { "id": "conseils-achat", "label": "Conseils d'achat" },
    { "id": "conclusion", "label": "Conclusion" }
  ],
  "content": "Le contenu HTML complet de l'article avec les <section>, <h2>, <h3>, <p>, etc.",
  "geminiImagePrompt": "Un prompt en anglais pour Google Gemini pour générer l'image de couverture. Style : photographie éditoriale premium de produits scellés Pokémon TCG. Format 1200x630. Pas de texte."
}

EXEMPLES DE PROMPTS GEMINI (adapte au thème de la série) :
- "A sleek flat-lay photography of Pokémon TCG sealed products from the '${serie.nameEn}' set arranged on a dark marble surface. Include a booster box, an ETB, and scattered booster packs. Soft studio lighting with dramatic shadows. No text overlay. Aspect ratio 1200x630, photorealistic style."
- "A premium collection display of Pokémon TCG sealed products from ${serie.nameEn} arranged in a pyramid formation on a luxurious dark velvet surface. Golden accent lighting. No text. Aspect ratio 1200x630."

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans markdown code blocks, sans texte avant ou après.`;

  // Attempt up to 2 times in case of JSON parse failure
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await client.messages.create({
      model: IVAN_CONFIG.model,
      max_tokens: IVAN_CONFIG.maxTokens,
      messages: [
        { role: "user", content: userPrompt },
        // Prefill to force Claude to start with valid JSON
        { role: "assistant", content: "{" },
      ],
      system: systemPrompt,
    });

    const text =
      "{" +
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

    // Clean up markdown fences if any
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      const article: GeneratedArticle = JSON.parse(cleaned);
      article.slug = `guide-${serie.slug}`;
      return article;
    } catch (err) {
      console.error(
        `  Tentative ${attempt}/2 — Erreur JSON: ${err instanceof Error ? err.message : err}`,
      );
      if (attempt === 2) {
        // Log first 1000 chars for debugging
        console.error("  Début de la réponse:", cleaned.slice(0, 1000));
        throw new Error(`Impossible de parser la réponse Claude après 2 tentatives`);
      }
      console.log("  Nouvelle tentative...");
    }
  }

  // Unreachable but TypeScript needs it
  throw new Error("Unexpected");
}
