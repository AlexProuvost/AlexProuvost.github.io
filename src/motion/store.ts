/**
 * État de mouvement partagé, mis à jour une fois par frame par le ticker GSAP.
 * Objet mutable (pas de state React) : le lire ne déclenche aucun re-render.
 * Il alimentera les shaders (vitesse, souris) dans les étapes suivantes.
 */
export const motion = {
  /** Position de scroll (px) */
  scroll: 0,
  /** Scroll maximum (px) */
  limit: 1,
  /** Progression globale de la page (0 → 1) */
  progress: 0,
  /** Vitesse brute (px / frame, fournie par Lenis) */
  velocity: 0,
  /** Vitesse lissée, indépendante de la fréquence d'écran */
  smoothVelocity: 0,
  /** 1 = vers le bas, -1 = vers le haut */
  direction: 1 as 1 | -1,
  mouse: {
    /** Position en px */
    x: 0,
    y: 0,
    /** false tant que la souris n'a pas bougé (ou si elle a quitté la fenêtre) */
    active: false,
    /** Position normalisée (-1 → 1), lissée */
    nx: 0,
    ny: 0,
  },
  /** Temps écoulé (s) et durée de la dernière frame (s) */
  time: 0,
  dt: 1 / 60,
  reducedMotion: false,
};

/**
 * Interpolation exponentielle corrigée par le delta-time :
 * donne le même résultat à 60 Hz et à 120 Hz.
 * `lerp60` = facteur qu'on aurait appliqué par frame à 60 Hz.
 */
export function damp(current: number, target: number, lerp60: number, dt: number) {
  const lambda = -Math.log(1 - Math.min(Math.max(lerp60, 0.0001), 0.9999)) * 60;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
