/**
 * Informations personnelles.
 */
export type SiteLink = { id: string; label: string; href: string };

export const site = {
  name: 'Alex',
  city: 'Tournai',
  country: 'BE',
  /** Coordonnées de Tournai, affichées en clin d'œil dans le hero */
  coords: '50.61° N — 3.39° E',
  email: 'prouvostalex@gmail.com',
  /**
   * Liens « Ailleurs » (contact, menu). Vide = la rubrique est masquée.
   * Exemple : { id: 'github', label: 'GitHub', href: 'https://github.com/ton-nom' }
   */
  links: [{ id: 'github', label: 'GitHub', href: 'https://github.com/AlexProuvost' }] as SiteLink[],
  /**
   * URL finale du site (métadonnées, aperçus de partage). Ex. : 'https://ton-nom.github.io'
   * Laisser vide tant qu'elle n'est pas connue.
   */
  url: 'https://alexprouvost.github.io',
};

/** Ancres des sections (identiques en FR et EN pour garder des liens stables) */
export const sectionIds = {
  top: 'top',
  approach: 'approche',
  work: 'projets',
  services: 'services',
  about: 'a-propos',
  contact: 'contact',
} as const;
