import { gsap } from '@/motion/gsap';
import { getLenis } from '@/motion/loop';

/**
 * Écran de chargement (components/ui/Preloader.tsx) : les salutations défilent, le compteur monte à 100,
 * puis l'écran se lève (bord courbe qui se tend) et l'événement « preloader-done » lance l'ouverture du site.
 */
export function initPreloader(): () => void {
  const html = document.documentElement;
  const el = document.querySelector<HTMLElement>('[data-preloader]');
  if (!el || !html.classList.contains('pl-on')) return () => {};
  const word = el.querySelector<HTMLElement>('[data-preloader-word]')!;
  const count = el.querySelector<HTMLElement>('[data-preloader-count]')!;
  const curve = el.querySelector<SVGPathElement>('[data-preloader-curve]')!;
  const words = (word.dataset.words ?? word.textContent ?? '').split('|');
  html.classList.add('pl-running');
  const lenis = getLenis();
  lenis?.stop();

  const state = { n: 0, bend: 100 };
  const draw = () => curve.setAttribute('d', `M0 0 L100 0 L100 0 Q50 ${state.bend.toFixed(1)} 0 0 Z`);
  const done = () => {
    html.classList.remove('pl-on', 'pl-running');
    lenis?.start();
    window.dispatchEvent(new Event('preloader-done'));
  };

  const tl = gsap.timeline({ onComplete: done });
  // Salutations : la première reste un peu, puis elles s'enchaînent
  let t = 0.5;
  words.slice(1).forEach((w) => {
    tl.call(() => (word.textContent = w), [], t);
    t += 0.13;
  });
  tl.fromTo(
    el.querySelector('p'),
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out' },
    0,
  )
    .to(
      state,
      {
        n: 100,
        duration: t + 0.2,
        ease: 'power2.inOut',
        onUpdate: () => (count.textContent = String(Math.round(state.n)).padStart(3, '0')),
      },
      0,
    )
    .to(el.querySelectorAll('p'), { autoAlpha: 0, y: -30, duration: 0.4, ease: 'power2.in' }, t + 0.25)
    .to(el, { yPercent: -100, duration: 1, ease: 'power4.inOut' }, t + 0.45)
    .fromTo(state, { bend: 100 }, { bend: 0, duration: 1, ease: 'power3.inOut', onUpdate: draw }, t + 0.45)
    // L'ouverture peut démarrer pendant que l'écran se lève
    .call(() => window.dispatchEvent(new Event('preloader-done')), [], t + 0.8);

  // Nettoyage : on arrête l'animation sans retirer pl-on (en développement, React relance aussitôt l'effet)
  return () => {
    tl.kill();
    lenis?.start();
  };
}
