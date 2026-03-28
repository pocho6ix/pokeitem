const fs = require("fs");
const path = require("path");

const TOPICS = [
  "Comment investir dans les items Pokémon TCG en 2026",
  "Les 10 displays Pokémon les plus rentables",
  "Guide complet : investir dans les ETB Pokémon",
  "Guide du débutant : commencer sa collection d'items Pokémon",
  "Comment bien conserver ses items Pokémon scellés",
  "Top 10 des meilleurs displays à acheter en 2026",
  "Display vs ETB : que choisir pour investir ?",
  "Comparatif des Coffrets Ultra Premium (UPC)",
  "Évolution des prix des displays : tendances 2023-2026",
  "Calendrier des sorties Pokémon TCG 2026",
];

async function generatePost() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(1);
  }

  const topic = process.env.TOPIC || TOPICS[Math.floor(Math.random() * TOPICS.length)];
  const slug = topic
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const outputPath = path.join(__dirname, "..", "content", "blog", `${slug}.mdx`);

  if (fs.existsSync(outputPath)) {
    console.log(`Article already exists: ${slug}`);
    return;
  }

  console.log(`Generating article: ${topic}`);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Écris un article de blog SEO-optimisé en français sur le sujet suivant : "${topic}".

L'article est pour le site PokeItem (www.pokeitem.fr), une plateforme de gestion de collection d'items scellés Pokémon TCG.

Format MDX avec frontmatter :
---
title: "..." (60 chars max)
excerpt: "..." (155 chars max)
category: "guide" | "actualite" | "investissement" | "top"
tags: [...]
author: "PokeItem"
publishedAt: "${new Date().toISOString().split("T")[0]}"
---

L'article doit faire 800-1200 mots, avec des titres H2 et H3, des listes, et des liens internes vers /collection et /market.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`Article saved: ${outputPath}`);
}

generatePost().catch((err) => {
  console.error(err);
  process.exit(1);
});
