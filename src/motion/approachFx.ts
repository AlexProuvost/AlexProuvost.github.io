import { gsap, ScrollTrigger, SplitText } from './gsap';
import { params } from './params';
import { stackState } from '@/gl/stackState';

/**
 * Séquence 02 — « De l'idée au site ».
 *  - Trajet : pendant que l'intro de la section défile, la page éclatée glisse du hero vers la scène
 *    (stackState.travel, scrubé).
 *  - Scène épinglée : 4 étapes. La progression (stackState.approach) pilote la 3D ; l'étape active
 *    est marquée dans le DOM (data-active) — fondus en CSS.
 *  - Mouvement continu, à chaque cran de scroll (pour qu'on sente qu'on avance dans l'étape) :
 *    le curseur descend le fil, la barre de l'étape se remplit, ses mots s'allument un à un,
 *    le grand numéro se remplit d'encre puis glisse vers le suivant (la 3D tourne : gl/ExplodedStack.ts).
 * À appeler dans un gsap.context() : retourne une fonction de nettoyage.
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
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

  /* ── Mouvement continu dans la scène ── */
  const n = steps.length;
  const bars = steps.map((el) => el.querySelector<HTMLElement>('[data-approach-bar]'));
  const knob = section.querySelector<HTMLElement>('[data-approach-knob]');
  const track = knob?.parentElement ?? null;
  const strip = section.querySelector<HTMLElement>('[data-approach-strip]');
  const nums = Array.from(section.querySelectorAll<HTMLElement>('[data-approach-n]'));
  const splits = details.map((d) => {
    const text = d.querySelector<HTMLElement>('[data-approach-text]');
    return text ? SplitText.create(text, { type: 'words' }) : null;
  });
  const lit = splits.map(() => -1);
  let trackH = track?.clientHeight ?? 0;

  const paint = (p: number) => {
    const pos = Math.min(Math.max(p, 0) * n, n - 0.0001);
    const k = Math.floor(pos);
    const local = pos - k;
    bars.forEach((b, i) => {
      if (b) b.style.transform = `scaleX(${i < k ? 1 : i === k ? local.toFixed(3) : 0})`;
    });
    if (knob) knob.style.transform = `translate3d(0, ${(p * trackH).toFixed(1)}px, 0)`;
    // Grand numéro : se remplit pendant l'étape, glisse vers le suivant dans le dernier cinquième
    nums.forEach((el, i) => {
      const fill = i < k ? 1 : i === k ? Math.min(1, local / 0.8) : 0;
      el.style.setProperty('--fill', fill.toFixed(3));
    });
    if (strip) strip.style.transform = `translate3d(0, ${((-(k + smooth(0.8, 1, local)) * 100) / n).toFixed(3)}%, 0)`;
    // Les mots de l'étape active s'allument au fil du scroll (tous allumés aux trois quarts de l'étape)
    splits.forEach((split, i) => {
      if (!split) return;
      const count = i < k ? split.words.length : i === k ? Math.ceil((local / 0.75) * split.words.length) : 0;
      if (count === lit[i]) return;
      lit[i] = count;
      split.words.forEach((w, j) => ((w as HTMLElement).style.opacity = j < count ? '' : '0.25'));
    });
  };
  paint(0);

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
      onUpdate: (self) => {
        setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length)));
        paint(self.progress);
      },
      onRefresh: (self) => {
        trackH = track?.clientHeight ?? 0;
        paint(self.progress);
      },
    },
  });
  pin.fromTo(stackState, { approach: 0 }, { approach: 1, ease: 'none', duration: 1 }, 0);
  if (fill) pin.fromTo(fill, { scaleY: 0.25 }, { scaleY: 1, ease: 'none', duration: 1 }, 0);

  return () => {
    travel.scrollTrigger?.kill();
    travel.kill();
    pin.scrollTrigger?.kill();
    pin.kill();
    splits.forEach((s) => s?.revert());
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
