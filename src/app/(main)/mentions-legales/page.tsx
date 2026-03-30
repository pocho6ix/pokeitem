import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — PokeItem",
  description: "Mentions légales de PokeItem, plateforme de gestion de collection d'items scellés Pokémon TCG.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Mentions légales</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-10">Dernière mise à jour : mars 2026</p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Éditeur du site</h2>
          <p>Le site <strong>PokeItem</strong> (accessible à l'adresse <strong>www.pokeitem.fr</strong>) est édité à titre personnel.</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li><strong>Responsable de publication :</strong> Hugo Tribet</li>
            <li><strong>Email :</strong> contact@pokeitem.fr</li>
            <li><strong>Statut :</strong> Projet personnel</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Hébergement</h2>
          <p className="text-sm">Le site est hébergé par :</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li><strong>Vercel Inc.</strong></li>
            <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
            <li>Site : <a href="https://vercel.com" className="text-blue-600 hover:underline">vercel.com</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Propriété intellectuelle</h2>
          <p className="text-sm">
            Le site PokeItem et l'ensemble de son contenu (textes, articles de blog, interface, logo) sont la propriété de l'éditeur. Toute reproduction, même partielle, est interdite sans autorisation préalable.
          </p>
          <p className="mt-3 text-sm">
            <strong>Pokémon</strong> est une marque déposée de <strong>The Pokémon Company</strong>. Les images de produits Pokémon TCG sont la propriété de leurs auteurs respectifs. PokeItem n'est pas affilié à The Pokémon Company.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Limitation de responsabilité</h2>
          <p className="text-sm">
            Les informations présentes sur PokeItem, notamment les prix et valorisations d'items scellés Pokémon, sont fournies à titre indicatif. Elles ne constituent pas des conseils financiers ou d'investissement. L'éditeur décline toute responsabilité quant aux décisions prises sur la base de ces informations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Liens hypertextes</h2>
          <p className="text-sm">
            PokeItem peut contenir des liens vers des sites tiers (CardMarket, eBay, etc.). L'éditeur n'est pas responsable du contenu de ces sites externes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Droit applicable</h2>
          <p className="text-sm">
            Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>

      {/* FAQ SEO */}
      <div className="mt-16 border-t border-[var(--border-default)] pt-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "Qui est derrière PokeItem ?",
              a: "PokeItem est un projet personnel développé par Hugo Tribet, passionné de Pokémon TCG et de collectibles scellés.",
            },
            {
              q: "PokeItem est-il affilié à The Pokémon Company ?",
              a: "Non. PokeItem est un projet indépendant et n'est en aucun cas affilié, sponsorisé ou approuvé par The Pokémon Company ou Nintendo.",
            },
            {
              q: "Les prix affichés sur PokeItem sont-ils fiables ?",
              a: "Les prix sont des estimations basées sur les données disponibles sur les plateformes de marché. Ils sont fournis à titre indicatif et peuvent varier. PokeItem ne garantit pas l'exactitude des prix affichés.",
            },
            {
              q: "Comment contacter l'équipe PokeItem ?",
              a: "Vous pouvez nous contacter par email à contact@pokeitem.fr pour toute question relative au site.",
            },
          ].map((item, i) => (
            <div key={i}>
              <h3 className="font-medium text-[var(--text-primary)]">{item.q}</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
