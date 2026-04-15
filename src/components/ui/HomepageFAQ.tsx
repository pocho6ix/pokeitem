/**
 * HomepageFAQ
 *
 * SEO-friendly FAQ section for the guest homepage. Uses native <details>/<summary>
 * so the full content is in the HTML on first paint (crawlable) and no JS is
 * shipped for the accordion behaviour. A schema.org FAQPage JSON-LD block is
 * injected so search engines can surface the Q&A as rich results.
 */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "PokéItem est-il gratuit ?",
    a: "Oui, PokéItem propose une version gratuite complète qui permet de cataloguer jusqu'à 500 cartes, 5 produits scellés et d'effectuer 10 scans par mois — largement suffisant pour démarrer. Pour aller plus loin, l'abonnement Premium (3,99€/mois ou 39,99€/an) débloque la collection de cartes illimitée, les items scellés illimités, les scans illimités et les statistiques avancées sur la valeur totale de votre portefeuille.",
  },
  {
    q: "D'où viennent les prix et à quelle fréquence sont-ils mis à jour ?",
    a: "Les prix sont récupérés automatiquement depuis Cardmarket, la plus grande place de marché européenne pour le Pokémon TCG. Chaque carte et chaque item scellé est mis à jour quotidiennement pour refléter les cours réels du marché.",
  },
  {
    q: "Quelles cartes et quelles extensions sont supportées ?",
    a: "PokéItem couvre l'intégralité des cartes Pokémon éditées en français, des premières séries Wizards of the Coast jusqu'aux dernières sorties comme Méga-Évolution. Chaque nouvelle extension est ajoutée dès sa sortie officielle, avec numéros, raretés et versions (Normale, Reverse, Holo).",
  },
  {
    q: "Puis-je suivre aussi mes items scellés (boosters, displays, ETBs) ?",
    a: "Oui. En plus des cartes à l'unité, PokéItem gère les produits scellés : boosters, displays, Elite Trainer Box, coffrets promotionnels, tins. Chaque item a sa propre cote suivie dans le temps, ce qui est idéal pour évaluer un investissement long terme.",
  },
  {
    q: "Comment scanner mes cartes pour les ajouter plus vite ?",
    a: "Le scanner intégré reconnaît automatiquement vos cartes via la caméra de votre téléphone. Vous pointez la carte, la reconnaissance détecte le nom, le numéro et la série, puis l'ajoute à votre collection en un clic. Aucune application à télécharger.",
  },
  {
    q: "Puis-je voir l'évolution de la valeur de ma collection dans le temps ?",
    a: "Oui. PokéItem conserve l'historique complet des prix et trace des graphiques d'évolution pour chaque carte, chaque item et pour votre collection globale (1 mois, 6 mois, 1 an). Vous identifiez immédiatement les plus-values et les cartes qui prennent de la valeur.",
  },
  {
    q: "Mes données de collection sont-elles privées et sécurisées ?",
    a: "Votre collection est privée par défaut, stockée sur des serveurs européens conformes au RGPD. Vous seul y avez accès tant que vous ne créez pas de lien de partage public. Aucune donnée n'est revendue à des tiers.",
  },
  {
    q: "Puis-je partager ma collection avec mes amis ou la communauté ?",
    a: "Oui, chaque classeur et chaque vue de collection peut être partagé via un lien public. Vos amis consultent votre collection sans avoir besoin d'un compte, et un classement communautaire permet de comparer les collections entre joueurs.",
  },
];

export function HomepageFAQ() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <section className="border-t border-[var(--border-default)] bg-[var(--bg-primary)] py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)] sm:text-base">
            Tout ce que vous devez savoir sur PokéItem avant de commencer.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 transition-colors open:border-[#E7BA76]/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                <span>{item.q}</span>
                <span
                  className="shrink-0 text-[#E7BA76] transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 4v12M4 10h12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      {/* JSON-LD for Google rich results (FAQPage schema) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
