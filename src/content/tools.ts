import {
  siCss,
  siDart,
  siFlutter,
  siGsap,
  siHtml5,
  siNextdotjs,
  siReact,
  siThreedotjs,
  siTypescript,
  siWebgl,
  type SimpleIcon,
} from 'simple-icons';

/**
 * Logos des outils (À propos › « Mes outils »), d'après les noms de messages/*.json › about.tools.
 * Logos : Simple Icons (CC0). Un outil sans logo connu s'affiche en texte seul.
 */
const icons: Record<string, SimpleIcon[]> = {
  React: [siReact],
  'Next.js': [siNextdotjs],
  TypeScript: [siTypescript],
  GSAP: [siGsap],
  'Three.js · WebGL': [siThreedotjs, siWebgl],
  Flutter: [siFlutter],
  Dart: [siDart],
  'HTML & CSS': [siHtml5, siCss],
};

export type ToolBadge = {
  name: string;
  paths: string[];
  /** Couleur de la marque, pour le survol (les marques noires prennent la crème du site) */
  brand: string;
  /** Texte lisible sur cette couleur */
  onBrand: string;
};

/** Luminance relative (WCAG) d'une couleur « RRGGBB » */
function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function toolBadge(name: string): ToolBadge {
  const list = icons[name] ?? [];
  const hex = list[0]?.hex ?? 'F0EBE2';
  const l = luminance(hex);
  // Trop sombre pour se voir sur le fond noir : on passe à la crème du site
  const brand = l < 0.04 ? '#f0ebe2' : `#${hex}`;
  const onBrand = l < 0.04 || l > 0.35 ? '#0f0e0d' : '#ffffff';
  return { name, paths: list.map((i) => i.path), brand, onBrand };
}
