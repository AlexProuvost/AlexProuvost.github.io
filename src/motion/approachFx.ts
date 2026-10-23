import { gsap, ScrollTrigger } from './gsap';
import { params } from './params';
import { stackState } from '@/gl/stackState';

/**
 * Séquence 02 — « De l'idée au site ».
 *  - Trajet : pendant que l'intro de la section défile, la page éclatée glisse du hero vers la scène
 *    (stackState.travel, scrubé).
 *  - Scène épinglée : 4 étapes. La progression (stackState.approach) pilote la 3D ; l'étape active
 *    est marquée dans le DOM (data-active) — fondus en CSS.
 * À appeler dans un gsap.context() : retourne une fonction de nettoyage.
 */
export function buildApproach(): () => void {
  const section = document.querySelector<HTMLElement>('[data-section="approach"]');
  const stage = document.querySelector<HTMLElement>('[data-approach-stage]');
  if (!section || !stage) return () => {};
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-approach-step]'));
  const details = Array.from(section.querySelectorAll<HTMLElement>('[data-approach-detail]'));
  const fill = section.querySelector<HTMLElement>('[data-approach-progress]');
  const { approach } = params;

  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    steps.forEach((el, k) => el.setAttribute('data-active', String(k === i)));
    details.forEach((el, k) => el.setAttribute('data-active', String(k === i)));
  };
  setActive(0);

  // Trajet hero → scène : commence dès que le hero défile, finit quand la scène s'épingle
  const travel = gsap.fromTo(
    stackState,
    { travel: 0 },
    {
      travel: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        endTrigger: stage,
        end: 'top top',
        scrub: approach.scrub,
      },
    },
  );

  // Scène épinglée : 4 étapes
  const pin = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: 'top top',
      end: () => `+=${window.innerHeight * approach.pinLength}`,
      pin: true,
      scrub: approach.scrub,
      invalidateOnRefresh: true,
      onUpdate: (self) => setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
    },
  });
  pin.fromTo(stackState, { approach: 0 }, { approach: 1, ease: 'none', duration: 1 }, 0);
  if (fill) pin.fromTo(fill, { scaleY: 0.25 }, { scaleY: 1, ease: 'none', duration: 1 }, 0);

  return () => {
    travel.scrollTrigger?.kill();
    travel.kill();
    pin.scrollTrigger?.kill();
    pin.kill();
    gsap.set(stackState, { travel: 0, approach: 0 });
  };
}

/** Animations réduites : toutes les étapes visibles, pas d'épinglage. */
export function showAllSteps() {
  document
    .querySelectorAll<HTMLElement>('[data-approach-step], [data-approach-detail]')
    .forEach((el) => el.setAttribute('data-active', 'true'));
  ScrollTrigger.refresh();
}
