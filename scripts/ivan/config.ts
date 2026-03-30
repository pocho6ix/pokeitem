/**
 * Configuration de l'agent Ivan
 */

export const IVAN_CONFIG = {
  /** Modèle Claude à utiliser */
  model: "claude-sonnet-4-20250514" as const,

  /** Tokens max pour la génération */
  maxTokens: 8192,

  /** Auteur affiché sur les articles */
  author: "Ivan",

  /** Catégorie pour les articles générés */
  category: "serie-guide",

  /** Dossier de sortie des articles JSON */
  outputDir: "src/data/blog-posts-generated",

  /** Dossier des prompts Gemini */
  geminiPromptsDir: "scripts/ivan/gemini-prompts",

  /** Nombre de vues initial */
  initialViewCount: 0,
};
