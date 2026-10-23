/**
 * Paramètres d'animation — UNE seule source de vérité.
 * Valeurs par défaut utilisées en production ; en développement, Leva les modifie en direct
 * puis prévient les modules concernés via `emit(topic)`.
 */
export const params = {
  scroll: {
    /** Lissage Lenis : plus petit = plus doux / plus « glissant » (0.05 – 0.2) */
    lerp: 0.09,
    /** Distance parcourue par cran de molette (1 = natif) */
    wheelMultiplier: 1,
    /** Distance parcourue au doigt */
    touchMultiplier: 1.2,
  },
  text: {
    /** Retard de rattrapage du scrub en secondes (0 = collé au scroll, 2 = très lissé) */
    scrub: 0.8,
    /** Durée relative d'un élément dans sa timeline scrubée */
    duration: 1,
    /** Décalage entre deux lignes */
    stagger: 0.1,
    /** Courbe d'arrivée */
    ease: 'power3.out',
    /** Distance de montée des lignes de titre, en % de leur hauteur (≥ 110 : cachées sous le masque) */
    yPercent: 115,
    /** Début de l'animation : haut de l'élément à X % de la hauteur de l'écran */
    start: 94,
    /** Fin de l'animation : haut de l'élément à X % de la hauteur de l'écran */
    end: 55,
  },
  hero: {
    /** Délai avant l'ouverture (s) */
    delay: 0.2,
    /** Durée de montée des lignes de l'ouverture (s) */
    duration: 1.4,
    /** Décalage entre les éléments de l'ouverture (s) */
    stagger: 0.08,
  },
  approach: {
    /** Longueur de l'épinglage de la méthode, en hauteurs d'écran de scroll (1 par étape ≈ 4) */
    pinLength: 3.2,
    /** Lissage du scrub de l'épinglage (s) */
    scrub: 0.6,
  },
  fluid: {
    /** Force des traînées laissées par la souris */
    force: 5200,
    /** Quantité d'encre par mouvement */
    ink: 0.11,
    /** Rayon des traînées (fraction de l'écran) */
    radius: 0.22,
    /** Tourbillons */
    curl: 12,
    /** Disparition de l'encre (par seconde) : bas = traînées longues */
    dissipation: 1.4,
    /** Réfraction du mot ALEX par le liquide */
    refract: 0.028,
    /** Lueur de l'encre sur le fond */
    glow: 0.5,
  },
  film: {
    /** Cartes des projets : scroll vertical nécessaire par pixel de défilement horizontal (1 = autant) */
    speed: 1.1,
  },
  stack: {
    /** Écart entre les plaques au repos (fraction de la hauteur d'une plaque) */
    spread: 0.3,
    /** Inclinaison vers l'arrière (degrés) — 90 = vue de dessus */
    tilt: 54,
    /** Rotation dans le plan (degrés) — vue axonométrique */
    rotate: 38,
    /** Bascule de la pile sous la souris (degrés) */
    mouse: 7,
    /** Amplitude du flottement des plaques (px) */
    float: 6,
    /** Décalage latéral de la plaque mise en avant pendant la méthode (fraction de largeur) */
    focus: 0.12,
  },
  fx: {
    /** Attraction des boutons magnétiques (0 = aucun, 0.5 = fort) */
    magnetic: 0.28,
  },

  velocity: {
    /** Lissage de la vitesse de scroll (par frame à 60 Hz) */
    lerp: 0.1,
  },
  grain: {
    /** Cadence du grain façon pellicule (images / s) */
    fps: 10,
  },
};

export type Topic = 'scroll' | 'text' | 'hero' | 'fx' | 'approach' | 'film';

type Listener = () => void;
const listeners = new Map<Topic, Set<Listener>>();

/** S'abonner aux changements d'un groupe de paramètres. Retourne la fonction de désabonnement. */
export function subscribe(topic: Topic, fn: Listener) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic)!.add(fn);
  return () => {
    listeners.get(topic)?.delete(fn);
  };
}

export function emit(topic: Topic) {
  listeners.get(topic)?.forEach((fn) => fn());
}
