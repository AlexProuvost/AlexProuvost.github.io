'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { hasWebGL } from './mount';
import { prefersReducedMotion } from '@/motion/reducedMotion';

// Three.js n'est chargé qu'après le premier rendu de la page
const Stage = dynamic(() => import('./Stage'), { ssr: false });

let supported: boolean | null = null;
const getSupported = () => (supported ??= hasWebGL() && !prefersReducedMotion());
const noop = () => () => {};

/**
 * Monte le canvas WebGL si le navigateur le permet et si le visiteur n'a pas demandé moins d'animations.
 * Sinon tout reste en DOM (appareils CSS, fonds de panneaux CSS).
 * useSyncExternalStore : `false` pendant l'hydratation (comme le serveur), la vraie valeur juste après.
 */
export function GLRoot() {
  const enabled = useSyncExternalStore(noop, getSupported, () => false);
  return enabled ? <Stage /> : null;
}
