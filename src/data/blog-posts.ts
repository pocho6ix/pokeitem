// ---------------------------------------------------------------------------
// Blog posts content — Static data + auto-generated articles
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

export interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  author: string;
  tags: string[];
  category: string;
  published: boolean;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  readingTime: number;
  viewCount: number;
  tableOfContents: { id: string; label: string }[];
  contentHtml: string;
  relatedSlugs: string[];
}

// ---------------------------------------------------------------------------
// Article: Guide débuter collection Pokémon TCG
// ---------------------------------------------------------------------------

const guideDebuterCollection: BlogPostData = {
  id: "1",
  title: "Guide complet : bien débuter sa collection Pokémon TCG",
  slug: "guide-debuter-collection-pokemon-tcg",
  excerpt:
    "Tout ce qu'il faut savoir pour commencer à collectionner les produits scellés Pokémon TCG en 2026 : types de produits, budget, conservation et erreurs à éviter.",
  coverImage: "/images/blog/guide-debuter-collection-pokemon-tcg.webp",
  author: "PokeItem",
  tags: ["guide", "débutant", "collection", "produits scellés", "Pokémon TCG"],
  category: "guide",
  published: true,
  publishedAt: "2026-03-20",
  metaTitle:
    "Guide Débuter Collection Pokémon TCG 2026 | Produits Scellés, Budget & Conseils",
  metaDescription:
    "Découvrez comment bien débuter votre collection de produits scellés Pokémon TCG en 2026. Types de produits (displays, ETB, coffrets), budget recommandé, conservation et erreurs à éviter.",
  keywords: [
    "collection Pokémon TCG",
    "débuter collection Pokémon",
    "produits scellés Pokémon",
    "display Pokémon",
    "ETB Pokémon",
    "investissement Pokémon TCG",
    "booster box Pokémon",
    "coffret Pokémon",
    "collection cartes Pokémon",
    "guide Pokémon TCG 2026",
  ],
  readingTime: 8,
  viewCount: 1240,
  tableOfContents: [
    { id: "introduction", label: "Introduction" },
    { id: "pourquoi-collectionner", label: "Pourquoi collectionner les produits scellés ?" },
    { id: "types-de-produits", label: "Les types de produits scellés" },
    { id: "par-ou-commencer", label: "Par où commencer ?" },
    { id: "budget", label: "Quel budget prévoir ?" },
    { id: "ou-acheter", label: "Où acheter ses produits ?" },
    { id: "conservation", label: "Conservation et stockage" },
    { id: "erreurs-a-eviter", label: "Les erreurs à éviter" },
    { id: "suivre-sa-collection", label: "Suivre et valoriser sa collection" },
    { id: "conclusion", label: "Conclusion" },
  ],
  relatedSlugs: [
    "top-10-produits-scelles-rentables-2025",
    "investir-etb-strategie-conseils",
    "reperer-faux-produits-scelles-pokemon",
  ],
  contentHtml: `
    <section id="introduction">
      <h2>Introduction</h2>
      <p>
        Le marché des <strong>produits scellés Pokémon TCG</strong> n'a jamais été aussi dynamique. Avec des extensions comme
        <strong>Équilibre Parfait</strong> (ME03) ou les dernières sorties <strong>Écarlate &amp; Violet</strong>,
        de plus en plus de collectionneurs et d'investisseurs se tournent vers les produits encore sous blister
        plutôt que vers les cartes individuelles.
      </p>
      <p>
        Que vous soyez un fan de la première heure ou un investisseur à la recherche de rendement,
        ce guide vous donne <strong>toutes les clés pour bien débuter votre collection de produits scellés
        Pokémon TCG en 2026</strong>.
      </p>
      <blockquote>
        <p>
          <strong>En bref :</strong> Dans ce guide, vous apprendrez à distinguer les différents types de produits,
          à définir votre budget, à acheter au bon endroit, à conserver vos produits et à éviter les pièges classiques du débutant.
        </p>
      </blockquote>
    </section>

    <hr />

    <section id="pourquoi-collectionner">
      <h2>Pourquoi collectionner les produits scellés Pokémon ?</h2>
      <p>
        Contrairement aux cartes individuelles dont la valeur dépend du grading et de l'état,
        les <strong>produits scellés</strong> présentent plusieurs avantages uniques :
      </p>
      <ul>
        <li>
          <strong>Conservation simplifiée</strong> — Un produit sous blister ne se dégrade pas
          s'il est bien stocké. Pas besoin de sleeve, toploader ou grading.
        </li>
        <li>
          <strong>Raréfaction naturelle</strong> — Chaque produit ouvert réduit le stock mondial.
          L'offre ne peut que diminuer avec le temps.
        </li>
        <li>
          <strong>Nostalgie et demande croissante</strong> — Le boom des années 2020 a prouvé que
          la demande pour les produits vintage explose quand une génération atteint le pouvoir d'achat.
        </li>
        <li>
          <strong>Potentiel d'investissement</strong> — Un Display Pokémon 151 acheté 150&euro; à sa sortie
          vaut aujourd'hui plus de 280&euro; en scellé. Des rendements que peu d'actifs offrent.
        </li>
      </ul>
      <p>
        En résumé, les produits scellés combinent <em>plaisir de collection</em> et <em>potentiel de valorisation</em>.
        C'est ce qui rend ce marché si attractif en 2026.
      </p>
    </section>

    <hr />

    <section id="types-de-produits">
      <h2>Les types de produits scellés Pokémon TCG</h2>
      <p>
        Avant de commencer, il est essentiel de comprendre les différents types de produits disponibles.
        Chacun a son prix, son public et son <strong>potentiel de valorisation</strong>.
      </p>

      <h3>Booster (unitaire) — à partir de 4&euro;</h3>
      <p>
        Le produit de base : un sachet contenant 10 cartes dont au moins une rare.
        Peu cher à l'unité, mais rarement conservé scellé seul sauf pour les extensions vintage.
      </p>

      <h3>Display / Booster Box — 140 à 160&euro;</h3>
      <p>
        La boîte de 36 boosters, <strong>le produit phare des collectionneurs et investisseurs</strong>.
        C'est le format le plus populaire car il offre le meilleur rapport volume/prix.
      </p>
      <p>
        Les displays des extensions populaires prennent rapidement de la valeur une fois en rupture de stock.
        C'est souvent le premier achat recommandé pour qui veut investir.
      </p>

      <h3>ETB (Coffret Dresseur d'Élite) — 50 à 60&euro;</h3>
      <p>
        Le Coffret Dresseur d'Élite contient 9 boosters, des sleeves, des dés et un guide du collectionneur.
        Son <strong>packaging premium</strong> en fait un objet de collection très apprécié.
      </p>
      <p>
        Les ETB des séries spéciales (comme Destinées Radieuses ou Évolutions Prismatiques) peuvent
        <strong>doubler de valeur en quelques mois</strong>.
      </p>

      <h3>Coffret / Box Set — 30 à 50&euro;</h3>
      <p>
        Les coffrets thématiques contiennent généralement 4 à 6 boosters et une carte promo exclusive.
        Accessibles et souvent exclusifs à certains revendeurs, ils constituent un bon point d'entrée.
      </p>

      <h3>UPC (Ultra Premium Collection) — 120 à 150&euro;</h3>
      <p>
        Le produit <strong>haut de gamme</strong> par excellence. Les UPC contiennent des cartes métal exclusives
        et de nombreux boosters. Leur production limitée en fait des pièces de collection très recherchées.
      </p>

      <h3>Tins, Blisters, Bundles et Theme Decks</h3>
      <p>
        Les <strong>Tins</strong> (boîtes métalliques, 15-25&euro;), les <strong>Blisters</strong> (packs de 1-3 boosters, 5-15&euro;),
        les <strong>Bundles</strong> (6 boosters + accessoires, 25-35&euro;) et les <strong>Theme Decks</strong>
        complètent la gamme. Chaque format a son public et son potentiel.
      </p>
    </section>

    <hr />

    <section id="par-ou-commencer">
      <h2>Par où commencer sa collection Pokémon TCG ?</h2>
      <p>
        Si vous débutez, voici notre <strong>recommandation en 4 étapes</strong> pour constituer
        une première collection solide :
      </p>
      <ol>
        <li>
          <p>
            <strong>Choisissez un bloc qui vous plaît.</strong>
            Commencez par les extensions actuelles (Méga-Évolution ou Écarlate &amp; Violet) car elles
            sont encore disponibles au prix éditeur. Inutile de se ruiner sur du vintage dès le départ.
          </p>
        </li>
        <li>
          <p>
            <strong>Commencez par un Display + un ETB.</strong>
            Ce duo constitue la base idéale : le display pour l'investissement à long terme,
            l'ETB pour le plaisir de collection.
          </p>
        </li>
        <li>
          <p>
            <strong>Achetez au prix éditeur (MSRP).</strong>
            Ne payez jamais le prix du marché secondaire pour un produit encore en production.
            La patience est votre meilleur allié.
          </p>
        </li>
        <li>
          <p>
            <strong>Diversifiez progressivement.</strong>
            Une fois à l'aise, explorez les coffrets, UPC et extensions plus anciennes selon votre budget.
          </p>
        </li>
      </ol>
      <blockquote>
        <p>
          <strong>Conseil PokeItem :</strong> Utilisez notre <a href="/collection">catalogue</a> pour explorer
          toutes les séries disponibles et identifier les produits qui vous intéressent avant d'acheter.
        </p>
      </blockquote>
    </section>

    <hr />

    <section id="budget">
      <h2>Quel budget prévoir pour collectionner ?</h2>
      <p>
        Le budget dépend de vos objectifs. Voici <strong>trois profils types</strong> avec des repères concrets :
      </p>

      <h3>Budget découverte : 50 à 100&euro; par mois</h3>
      <p>
        Suffisant pour acheter 1 ETB ou quelques coffrets par extension. Vous construirez une collection
        modeste mais diversifiée en quelques mois. <strong>Idéal pour tester sans engagement.</strong>
      </p>

      <h3>Budget collectionneur : 100 à 300&euro; par mois</h3>
      <p>
        Permet d'acheter 1-2 displays et un ETB par extension. Vous pourrez couvrir chaque nouvelle sortie
        et commencer à constituer un portfolio intéressant.
        <strong>C'est le sweet spot pour la plupart des collectionneurs.</strong>
      </p>

      <h3>Budget investisseur : 300&euro;+ par mois</h3>
      <p>
        Pour ceux qui veulent traiter la collection comme un investissement sérieux : multiples displays,
        UPC, et achats opportunistes sur le marché secondaire.
      </p>
      <blockquote>
        <p>
          <strong>Attention :</strong> Ceci n'est pas un conseil financier. Les produits scellés
          restent un marché spéculatif. N'investissez que ce que vous êtes prêt à perdre.
        </p>
      </blockquote>
    </section>

    <hr />

    <section id="ou-acheter">
      <h2>Où acheter ses produits scellés Pokémon ?</h2>
      <p>
        Le choix du vendeur est crucial pour obtenir les <strong>meilleurs prix</strong> et éviter les contrefaçons.
      </p>

      <h3>CardMarket — La référence européenne</h3>
      <p>
        La plateforme n°1 en Europe pour les produits Pokémon TCG. Des milliers de vendeurs vérifiés,
        des prix compétitifs et une protection acheteur solide.
        <strong>C'est la source de prix utilisée par PokeItem</strong> pour le suivi de votre collection.
      </p>

      <h3>Boutiques spécialisées</h3>
      <p>
        Les magasins de cartes locaux offrent souvent des prix proches du MSRP (prix éditeur) à la sortie
        et permettent de vérifier le produit avant achat. Un bon réflexe pour les achats day one.
      </p>

      <h3>Grandes surfaces</h3>
      <p>
        Leclerc, Carrefour, Fnac proposent parfois des prix très compétitifs, surtout en promotion.
        Surveillez les offres spéciales et les ventes flash.
      </p>

      <h3>Sites officiels</h3>
      <p>
        Le Pokémon Center et les distributeurs agréés garantissent l'authenticité mais sont souvent
        en rupture de stock rapide.
      </p>

      <blockquote>
        <p>
          <strong>À éviter :</strong> Les vendeurs non vérifiés sur les marketplaces, les prix
          "trop beaux pour être vrais" et les produits dont le blister semble retouché ou réemballé.
        </p>
      </blockquote>
    </section>

    <hr />

    <section id="conservation">
      <h2>Comment bien conserver ses produits scellés ?</h2>
      <p>
        Un produit scellé mal conservé peut <strong>perdre 20 à 50% de sa valeur</strong>.
        Voici les 5 règles essentielles du stockage :
      </p>

      <h3>1. Température stable (18-22°C)</h3>
      <p>
        Évitez les greniers (trop chaud en été) et les garages (humidité et variations de température).
        Une pièce de vie est idéale.
      </p>

      <h3>2. Humidité contrôlée (40-55%)</h3>
      <p>
        Investissez dans un hygromètre (moins de 15&euro;) pour surveiller le taux d'humidité.
        Un déshumidificateur peut être nécessaire dans les régions humides.
      </p>

      <h3>3. À l'abri de la lumière UV</h3>
      <p>
        Les UV décolorent les emballages et les illustrations. Rangez vos produits dans des placards
        fermés ou des boîtes de rangement opaques.
      </p>

      <h3>4. Protections adaptées</h3>
      <p>
        Utilisez des <strong>boîtiers acryliques</strong> pour les displays et les ETB.
        Les UPC méritent un boîtier sur mesure vu leur valeur. C'est un investissement qui se rentabilise.
      </p>

      <h3>5. Pas d'empilement excessif</h3>
      <p>
        Le poids peut écraser et déformer les boîtes du dessous.
        Limitez l'empilement à 2-3 produits maximum.
      </p>
    </section>

    <hr />

    <section id="erreurs-a-eviter">
      <h2>Les 5 erreurs à éviter quand on débute</h2>
      <p>
        Après avoir accompagné des centaines de collectionneurs, voici les <strong>pièges les plus courants</strong> :
      </p>

      <h3>1. Acheter sous la FOMO</h3>
      <p>
        Le "Fear Of Missing Out" pousse à acheter n'importe quoi au prix fort. Chaque extension
        a sa période de hype suivie d'une correction. <strong>Soyez patient :</strong> les prix baissent
        presque toujours après les premières semaines.
      </p>

      <h3>2. Négliger la conservation</h3>
      <p>
        Un display gondolé ou un ETB avec le blister abîmé perd immédiatement 20-40% de sa valeur.
        Investissez dans le stockage dès le premier achat.
      </p>

      <h3>3. Mettre tous ses &oelig;ufs dans le même panier</h3>
      <p>
        Ne misez pas tout sur une seule extension. Diversifiez entre les blocs, les types de produits
        et les gammes de prix pour <strong>réduire le risque</strong>.
      </p>

      <h3>4. Ignorer les frais cachés</h3>
      <p>
        Frais de port, protections acryliques, stockage... Le coût réel d'une collection
        dépasse souvent le prix d'achat des produits de 10 à 20%.
      </p>

      <h3>5. Ne pas tracker sa collection</h3>
      <p>
        Sans suivi, vous ne savez pas ce que vous possédez, combien vous avez investi,
        ni quelle est la valeur actuelle de votre collection.
        <strong>C'est exactement pour cela que nous avons créé PokeItem.</strong>
      </p>
    </section>

    <hr />

    <section id="suivre-sa-collection">
      <h2>Suivre et valoriser sa collection avec PokeItem</h2>
      <p>
        <strong>PokeItem</strong> est conçu pour être le <strong>Finary des produits scellés Pokémon</strong>.
        Notre plateforme vous permet de :
      </p>
      <ul>
        <li>
          <strong>Cataloguer</strong> chaque produit de votre collection avec son prix d'achat
          et sa date d'acquisition.
        </li>
        <li>
          <strong>Suivre la valeur en temps réel</strong> grâce aux prix CardMarket actualisés automatiquement.
        </li>
        <li>
          <strong>Visualiser votre performance</strong> avec des graphiques détaillés :
          P&amp;L, évolution de la valeur, répartition par type de produit.
        </li>
        <li>
          <strong>Explorer le catalogue complet</strong> des produits Pokémon TCG de toutes les générations,
          du Set de Base (1999) à Méga-Évolution (2025).
        </li>
      </ul>
      <p>
        <strong><a href="/inscription">Créez votre compte gratuitement</a></strong> et commencez à suivre
        votre collection dès aujourd'hui.
      </p>
    </section>

    <hr />

    <section id="conclusion">
      <h2>Conclusion</h2>
      <p>
        Collectionner les produits scellés Pokémon TCG est une passion accessible qui peut aussi
        devenir un <strong>investissement intelligent</strong>. Les clés du succès sont simples :
      </p>
      <ol>
        <li>Acheter au bon prix (MSRP ou en-dessous)</li>
        <li>Bien conserver ses produits</li>
        <li>Diversifier sa collection</li>
        <li>Suivre la valeur de son portfolio</li>
      </ol>
      <p>
        Le marché Pokémon TCG a traversé les décennies et continue de croître. Avec l'arrivée du bloc
        Méga-Évolution et la nostalgie des générations précédentes, <strong>2026 s'annonce comme une excellente
        année pour commencer</strong> ou renforcer sa collection.
      </p>
      <p>
        N'attendez plus : <a href="/collection">explorez notre catalogue</a>,
        <a href="/inscription">créez votre portfolio sur PokeItem</a> et rejoignez
        la communauté des collectionneurs avisés.
      </p>
    </section>
  `,
};

// ---------------------------------------------------------------------------
// Placeholder posts (other articles — content to come)
// ---------------------------------------------------------------------------

const equilibreParfait: BlogPostData = {
  id: "2",
  title: "Équilibre Parfait : tout savoir sur la nouvelle extension ME03",
  slug: "equilibre-parfait-nouvelle-extension-me03",
  excerpt:
    "Analyse complète de l'extension Équilibre Parfait : produits, prix et potentiel d'investissement.",
  coverImage: null,
  author: "PokeItem",
  tags: ["actualité", "Méga-Évolution"],
  category: "actualite",
  published: true,
  publishedAt: "2026-03-15",
  metaTitle: "Équilibre Parfait ME03 : Analyse, Prix & Investissement | PokeItem",
  metaDescription:
    "Tout savoir sur l'extension Équilibre Parfait (ME03) : liste des produits, prix CardMarket et potentiel d'investissement.",
  keywords: ["Équilibre Parfait", "ME03", "Méga-Évolution", "Pokémon TCG"],
  readingTime: 6,
  viewCount: 890,
  tableOfContents: [],
  relatedSlugs: ["guide-debuter-collection-pokemon-tcg", "top-10-produits-scelles-rentables-2025"],
  contentHtml: "",
};

const top10Rentables: BlogPostData = {
  id: "3",
  title: "Top 10 des produits scellés les plus rentables en 2025",
  slug: "top-10-produits-scelles-rentables-2025",
  excerpt:
    "Découvrez les 10 produits scellés Pokémon qui ont le mieux performé en valeur cette année.",
  coverImage: null,
  author: "PokeItem",
  tags: ["investissement", "top"],
  category: "top",
  published: true,
  publishedAt: "2026-03-10",
  metaTitle: "Top 10 Produits Scellés Pokémon Rentables 2025 | PokeItem",
  metaDescription:
    "Les 10 produits scellés Pokémon TCG les plus rentables de 2025 : displays, ETB et coffrets qui ont explosé en valeur.",
  keywords: ["produits scellés rentables", "investissement Pokémon", "top Pokémon TCG"],
  readingTime: 5,
  viewCount: 2100,
  tableOfContents: [],
  relatedSlugs: ["guide-debuter-collection-pokemon-tcg", "investir-etb-strategie-conseils"],
  contentHtml: "",
};

const investirETB: BlogPostData = {
  id: "4",
  title: "Investir dans les ETB : stratégie et conseils",
  slug: "investir-etb-strategie-conseils",
  excerpt:
    "Les Coffrets Dresseur d'Élite sont-ils un bon investissement ? Notre analyse détaillée.",
  coverImage: null,
  author: "PokeItem",
  tags: ["investissement", "ETB"],
  category: "investissement",
  published: true,
  publishedAt: "2026-03-05",
  metaTitle: "Investir dans les ETB Pokémon : Stratégie & Conseils | PokeItem",
  metaDescription:
    "Les Coffrets Dresseur d'Élite (ETB) Pokémon sont-ils un bon investissement ? Analyse des rendements et stratégie d'achat.",
  keywords: ["ETB Pokémon", "investissement ETB", "Coffret Dresseur d'Élite"],
  readingTime: 10,
  viewCount: 1560,
  tableOfContents: [],
  relatedSlugs: ["guide-debuter-collection-pokemon-tcg", "top-10-produits-scelles-rentables-2025"],
  contentHtml: "",
};

const calendrierSorties: BlogPostData = {
  id: "5",
  title: "Calendrier des sorties Pokémon TCG 2026",
  slug: "calendrier-sorties-pokemon-tcg-2026",
  excerpt:
    "Toutes les dates de sortie confirmées et rumeurs pour les produits Pokémon TCG en 2026.",
  coverImage: null,
  author: "PokeItem",
  tags: ["actualité", "calendrier"],
  category: "actualite",
  published: true,
  publishedAt: "2026-02-28",
  metaTitle: "Calendrier Sorties Pokémon TCG 2026 : Dates & Extensions | PokeItem",
  metaDescription:
    "Toutes les dates de sortie confirmées des extensions Pokémon TCG en 2026 : Méga-Évolution, Écarlate & Violet et plus.",
  keywords: ["sorties Pokémon TCG 2026", "calendrier Pokémon", "nouvelles extensions"],
  readingTime: 4,
  viewCount: 3200,
  tableOfContents: [],
  relatedSlugs: ["equilibre-parfait-nouvelle-extension-me03", "guide-debuter-collection-pokemon-tcg"],
  contentHtml: "",
};

const repererFaux: BlogPostData = {
  id: "6",
  title: "Comment repérer les faux produits scellés Pokémon",
  slug: "reperer-faux-produits-scelles-pokemon",
  excerpt:
    "Les contrefaçons sont de plus en plus répandues. Apprenez à les identifier pour protéger votre collection.",
  coverImage: null,
  author: "PokeItem",
  tags: ["guide", "sécurité"],
  category: "guide",
  published: true,
  publishedAt: "2026-02-20",
  metaTitle: "Repérer les Faux Produits Scellés Pokémon : Guide Anti-Contrefaçon | PokeItem",
  metaDescription:
    "Apprenez à repérer les contrefaçons de produits scellés Pokémon TCG. Guide complet pour protéger votre collection.",
  keywords: ["faux Pokémon", "contrefaçon Pokémon TCG", "identifier faux produits scellés"],
  readingTime: 7,
  viewCount: 1780,
  tableOfContents: [],
  relatedSlugs: ["guide-debuter-collection-pokemon-tcg", "investir-etb-strategie-conseils"],
  contentHtml: "",
};

// ---------------------------------------------------------------------------
// Auto-generated articles loader
// ---------------------------------------------------------------------------

function loadGeneratedArticles(): BlogPostData[] {
  const generatedDir = join(process.cwd(), "src", "data", "blog-posts-generated");
  if (!existsSync(generatedDir)) return [];

  try {
    const files = readdirSync(generatedDir).filter((f) => f.endsWith(".json"));
    return files.map((file) => {
      const raw = readFileSync(join(generatedDir, file), "utf-8");
      return JSON.parse(raw) as BlogPostData;
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const MANUAL_POSTS: BlogPostData[] = [
  guideDebuterCollection,
  equilibreParfait,
  top10Rentables,
  investirETB,
  calendrierSorties,
  repererFaux,
];

export const BLOG_POSTS: BlogPostData[] = [
  ...MANUAL_POSTS,
  ...loadGeneratedArticles(),
];

export function getBlogPostBySlug(slug: string): BlogPostData | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
