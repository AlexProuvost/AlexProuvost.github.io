/**
 * Projets (la « tracklist »).
 * Les textes vivent dans messages/{fr,en}.json sous `projects.<id>` (dont `screens` : textes alternatifs des captures) ;
 * ici : identité visuelle, captures d'écran et métadonnées non traduites.
 *
 * Ajouter un Track 03 = ajouter une entrée ici + ses textes dans les deux fichiers de messages.
 */

export type ProjectTheme = {
  /** Fond de la diapositive (dessiné en WebGL sur grand écran) */
  bg: string;
  /** Texte principal */
  fg: string;
  /** Couleur d'accent */
  accent: string;
  /** Texte secondaire (contraste vérifié ≥ 4.5:1 sur bg) */
  muted: string;
  /** Lignes / bordures */
  line: string;
};

/** Une capture d'écran, chemin depuis /public, avec ses dimensions réelles */
export type Screen = { src: string; w: number; h: number };

export type ProjectMedia = {
  /** Mise en scène : trois téléphones, ou un navigateur + un téléphone */
  layout: 'phones' | 'desktop';
  /** Captures ordinateur (1900 × 1000) : fondu de l'une à l'autre pendant le scroll */
  desktop?: Screen[];
  /** Captures téléphone (393 × 850) */
  phones: Screen[];
};

/**
 * Point d'intérêt sur une capture : un repère numéroté posé sur l'écran 3D, relié à sa légende par un trait.
 * `target` : l'appareil (« main » = le téléphone central, « laptop », « phone » = le téléphone à côté du MacBook) ;
 * `screen` : l'index de la capture dans la séquence de cet appareil ; `u`, `v` : position dans la capture
 * (0 → 1, depuis le coin haut gauche). Les légendes sont dans messages/*.json › projects.<id>.hotspots.
 */
export type Hotspot = { target: 'main' | 'laptop' | 'phone'; screen: number; u: number; v: number };

export type Project = {
  id: 'nuance' | 'hybrid';
  /** Adresse de l'étude de cas : /fr/projets/<slug> */
  slug: string;
  /** Projet concept (marque fictive) : signalé comme tel partout */
  concept?: boolean;
  track: string;
  status: 'live' | 'soon' | 'concept';
  url?: string;
  /** Typo du titre : serif italique (Nuance) ou sans (Hybrid) */
  titleStyle: 'serif' | 'display';
  theme: ProjectTheme;
  media: ProjectMedia;
  /** Technologies (texte, jamais de logos) */
  stack: string[];
  /** Points d'intérêt sur les écrans (même ordre que les légendes) */
  hotspots: Hotspot[];
  /** Couverture (rendu 3D des vrais appareils, 2000 × 1250) et sa version légère (1000 × 625) */
  cover: { src: string; small: string };
};

const phone = (src: string): Screen => ({ src, w: 393, h: 850 });
const desktop = (src: string): Screen => ({ src, w: 1900, h: 1000 });

export const projects: Project[] = [
  {
    id: 'nuance',
    cover: { src: '/contenu/covers/nuance.webp', small: '/contenu/covers/nuance-s.webp' },
    slug: 'nuance-vegetale',
    track: '01',
    status: 'live',
    url: 'https://nuance-vegetal.github.io',
    titleStyle: 'serif',
    theme: {
      bg: '#F3EADF', // crème du site
      fg: '#3A2A20', // brun chocolat
      accent: '#5C4639', // brun des boutons
      muted: '#6E5B4E',
      line: '#DED0BF',
    },
    media: {
      layout: 'phones',
      phones: [
        phone('/contenu/nuance-vegetale/accueil.webp'),
        phone('/contenu/nuance-vegetale/parti-pris.webp'),
        phone('/contenu/nuance-vegetale/decodeur.webp'),
      ],
    },
    stack: ['React', 'Open Food Facts API', 'PDF'],
    hotspots: [
      { target: 'main', screen: 0, u: 0.5, v: 0.36 },
      { target: 'main', screen: 0, u: 0.76, v: 0.575 },
      { target: 'main', screen: 1, u: 0.42, v: 0.26 },
      { target: 'main', screen: 2, u: 0.36, v: 0.305 },
    ],
  },
  {
    id: 'hybrid',
    cover: { src: '/contenu/covers/hybrid.webp', small: '/contenu/covers/hybrid-s.webp' },
    slug: 'hybrid-timing',
    track: '02',
    status: 'soon',
    titleStyle: 'display',
    theme: {
      bg: '#171717', // noir du site, un ton au-dessus du fond du portfolio
      fg: '#F5F5F3',
      accent: '#FFC700', // jaune Hybrid
      muted: '#A3A3A0',
      line: '#2C2C2C',
    },
    media: {
      layout: 'desktop',
      desktop: [desktop('/contenu/hybrid-timing/competitions.webp'), desktop('/contenu/hybrid-timing/accueil.webp')],
      phones: [phone('/contenu/hybrid-timing/mobile.webp')],
    },
    stack: ['React', 'Dart', 'Flutter'],
    hotspots: [
      { target: 'laptop', screen: 0, u: 0.8, v: 0.45 },
      { target: 'laptop', screen: 0, u: 0.21, v: 0.33 },
      { target: 'laptop', screen: 1, u: 0.22, v: 0.83 },
      { target: 'phone', screen: 0, u: 0.5, v: 0.233 },
    ],
  },
];
