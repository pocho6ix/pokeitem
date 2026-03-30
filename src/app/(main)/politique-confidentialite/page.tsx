import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — PokeItem",
  description: "Politique de confidentialité et traitement des données personnelles sur PokeItem.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-10">Dernière mise à jour : mars 2026</p>

      <div className="space-y-10 text-[var(--text-secondary)]">

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Données collectées</h2>
          <p className="text-sm">
            PokeItem collecte uniquement les données nécessaires au fonctionnement du service :
          </p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li><strong>Lors de l'inscription :</strong> adresse email, nom ou pseudo</li>
            <li><strong>Lors de l'utilisation :</strong> items ajoutés au portfolio, prix d'achat renseignés</li>
            <li><strong>Données techniques :</strong> adresse IP (logs serveur), préférences d'interface (thème clair/sombre, devise)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Finalité du traitement</h2>
          <p className="text-sm">Vos données sont utilisées pour :</p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li>Créer et gérer votre compte utilisateur</li>
            <li>Vous permettre de gérer votre portfolio de collection Pokémon TCG</li>
            <li>Vous envoyer les emails de vérification de compte</li>
            <li>Assurer la sécurité du service</li>
          </ul>
          <p className="mt-3 text-sm">
            Nous ne vendons, ne louons, et ne partageons pas vos données personnelles avec des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Base légale (RGPD)</h2>
          <p className="text-sm">
            Le traitement de vos données repose sur votre consentement lors de la création de compte, ainsi que sur l'exécution du contrat de service (gestion de votre portfolio).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Conservation des données</h2>
          <p className="text-sm">
            Vos données sont conservées tant que votre compte est actif. En cas de suppression de votre compte, toutes vos données personnelles et données de portfolio sont définitivement supprimées dans un délai de 30 jours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Hébergement des données</h2>
          <p className="text-sm">
            Vos données sont hébergées sur des serveurs sécurisés :
          </p>
          <ul className="mt-3 space-y-1 text-sm list-disc list-inside">
            <li><strong>Base de données :</strong> Neon (PostgreSQL) — région eu-west (Europe)</li>
            <li><strong>Fichiers (avatars) :</strong> Vercel Blob Storage — CDN mondial</li>
            <li><strong>Emails transactionnels :</strong> Resend</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Vos droits (RGPD)</h2>
          <p className="text-sm">Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
            <li><strong>Droit de rectification :</strong> corriger vos données depuis votre profil</li>
            <li><strong>Droit à l'effacement :</strong> supprimer votre compte et toutes vos données</li>
            <li><strong>Droit à la portabilité :</strong> exporter vos données de portfolio</li>
          </ul>
          <p className="mt-3 text-sm">
            Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@pokeitem.fr" className="text-blue-600 hover:underline">contact@pokeitem.fr</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Cookies</h2>
          <p className="text-sm">
            PokeItem utilise uniquement les cookies strictement nécessaires au fonctionnement du service : cookie de session d'authentification. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
          </p>
        </section>
      </div>

      {/* FAQ SEO */}
      <div className="mt-16 border-t border-[var(--border-default)] pt-10">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "Est-ce que PokeItem revend mes données ?",
              a: "Non. PokeItem ne vend ni ne partage vos données personnelles à des tiers. Vos données servent uniquement à faire fonctionner votre compte et votre portfolio.",
            },
            {
              q: "Comment supprimer mon compte et mes données ?",
              a: "Vous pouvez demander la suppression complète de votre compte et de toutes vos données en nous contactant à contact@pokeitem.fr. La suppression est effective sous 30 jours.",
            },
            {
              q: "Mes données de portfolio sont-elles sécurisées ?",
              a: "Oui. Votre portfolio est privé et accessible uniquement avec votre compte. Les données sont hébergées sur des bases de données sécurisées en Europe.",
            },
            {
              q: "PokeItem utilise-t-il Google Analytics ou des trackers publicitaires ?",
              a: "Non. PokeItem ne déploie aucun outil de tracking publicitaire ou d'analytics tiers. Seuls les cookies de session nécessaires au fonctionnement du service sont utilisés.",
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
