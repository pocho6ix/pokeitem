import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — PokeItem",
  description: "Conditions générales d'utilisation de PokeItem, la plateforme de gestion de collection Pokémon TCG.",
};

export default function CguPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Conditions Générales d'Utilisation</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-10">Dernière mise à jour : mars 2026</p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">1. Acceptation des conditions</h2>
          <p className="text-sm">
            En accédant et en utilisant PokeItem (<strong>www.pokeitem.fr</strong>), vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">2. Description du service</h2>
          <p className="text-sm">PokeItem est une plateforme permettant aux collectionneurs de :</p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li>Référencer les items scellés Pokémon TCG existants (boosters, ETB, displays, UPC, etc.)</li>
            <li>Gérer leur portfolio personnel de collection</li>
            <li>Suivre la valeur de leur collection dans le temps</li>
            <li>Consulter les prix du marché secondaire (CardMarket, eBay, etc.)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">3. Création de compte</h2>
          <p className="text-sm">
            L'utilisation complète de PokeItem nécessite la création d'un compte. Vous vous engagez à :
          </p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li>Fournir des informations exactes lors de l'inscription</li>
            <li>Maintenir la confidentialité de votre mot de passe</li>
            <li>Notifier immédiatement PokeItem de toute utilisation non autorisée de votre compte</li>
            <li>N'utiliser qu'un seul compte par personne</li>
          </ul>
          <p className="mt-3 text-sm">
            PokeItem se réserve le droit de suspendre ou supprimer tout compte en cas de non-respect des présentes CGU.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">4. Utilisation du service</h2>
          <p className="text-sm">En utilisant PokeItem, vous vous engagez à ne pas :</p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li>Utiliser le service à des fins illégales ou frauduleuses</li>
            <li>Tenter de contourner les mesures de sécurité du service</li>
            <li>Collecter ou scraper des données du site de manière automatisée sans autorisation</li>
            <li>Usurper l'identité d'un autre utilisateur</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">5. Prix et valorisations</h2>
          <p className="text-sm">
            Les prix affichés sur PokeItem (prix retail, prix marché, tendances) sont fournis à titre purement indicatif. Ils ne constituent en aucun cas des conseils financiers ou d'investissement. PokeItem ne garantit pas l'exactitude, l'exhaustivité ou l'actualité des données de prix.
          </p>
          <p className="mt-3 text-sm">
            <strong>PokeItem décline toute responsabilité pour toute perte financière résultant de décisions prises sur la base des informations présentes sur la plateforme.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">6. Liens d'affiliation</h2>
          <p className="text-sm">
            PokeItem peut contenir des liens affiliés vers des plateformes tierces (CardMarket, eBay, etc.). En cliquant sur ces liens et en effectuant un achat, PokeItem peut percevoir une commission. Cela n'impacte pas le prix que vous payez et ne constitue pas une recommandation d'achat.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">7. Propriété intellectuelle</h2>
          <p className="text-sm">
            Le contenu éditorial de PokeItem (articles de blog, interface, logo) est la propriété de l'éditeur. Les noms, logos et images Pokémon sont des marques déposées de The Pokémon Company et Nintendo. PokeItem n'est pas affilié à ces entités.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">8. Modification des CGU</h2>
          <p className="text-sm">
            PokeItem se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications importantes par email. La poursuite de l'utilisation du service après modification vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">9. Droit applicable</h2>
          <p className="text-sm">
            Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>

      {/* FAQ SEO */}
      <div className="mt-16 border-t border-[var(--border-default)] pt-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "PokeItem est-il gratuit ?",
              a: "Oui, l'accès à PokeItem et la gestion de votre portfolio sont gratuits. Certaines fonctionnalités avancées pourront faire l'objet d'un abonnement premium dans le futur.",
            },
            {
              q: "Puis-je supprimer mon compte ?",
              a: "Oui, vous pouvez demander la suppression de votre compte à tout moment en contactant contact@pokeitem.fr. Toutes vos données seront effacées dans un délai de 30 jours.",
            },
            {
              q: "PokeItem conseille-t-il d'acheter ou de vendre des produits Pokémon ?",
              a: "Non. PokeItem est un outil de gestion et de suivi de collection. Les prix et valorisations affichés sont indicatifs et ne constituent pas des conseils d'investissement.",
            },
            {
              q: "Quelle est la politique vis-à-vis des comptes inactifs ?",
              a: "Les comptes inactifs depuis plus de 24 mois peuvent être supprimés après notification préalable par email. Votre portfolio et vos données seront conservés jusqu'à la suppression effective.",
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
