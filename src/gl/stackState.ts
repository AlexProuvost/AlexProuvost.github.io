/**
 * Avancement de la page éclatée, écrit par GSAP / ScrollTrigger (motion/heroFx.ts, motion/approachFx.ts)
 * et lu chaque frame par la scène WebGL (gl/ExplodedStack.ts). Objet mutable : aucun re-render.
 */
export const stackState = {
  /** Ouverture : les plaques tombent en place (0 → 1) */
  intro: 0,
  /** Ouverture : le logotype ALEX (WebGL) monte depuis son masque (0 → 1) */
  word: 0,
  /** Ouverture cinématique : le pinceau d'encre traverse l'écran (0 → 1 ; 1 = terminée) */
  cine: 1,
  /** Ouverture cinématique : ALEX, d'abord visible seulement dans l'encre, apparaît en entier (0 → 1) */
  reveal: 1,
  /** Trajet du hero vers la scène de la méthode (0 = dans le hero, 1 = dans la scène épinglée) */
  travel: 0,
  /** Progression dans la méthode, épinglée (0 → 1 ; 4 étapes) */
  approach: 0,
  /** Retour de la carte dans le contact (0 → 1) */
  contact: 0,
};
