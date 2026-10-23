import { initCursor } from './cursor';
import { initMenu } from './menu';
import { initScrollRail } from './scrollRail';
import { initClock } from './clock';
import { initMagnetic } from './magnetic';
import { initContactForm } from './contactForm';
import { initAnchors } from './anchors';
import { initTransitions } from './transitions';
import { initMarquee } from './marquee';
import { initTextFx } from './textFx';
import { initPreloader } from './preloader';

/** Détails d'interface : curseur, menu, barre du bas, horloges, boutons magnétiques, bascule des visuels. */
export function initInterface(): () => void {
  const cleanups = [
    initPreloader(),
    initCursor(),
    initMenu(),
    initClock(),
    initScrollRail(),
    initMagnetic(),
    initContactForm(),
    initAnchors(),
    initTransitions(),
    initMarquee(),
    initTextFx(),
  ];
  return () => cleanups.forEach((fn) => fn());
}
