import { gsap, SplitText } from './gsap';
import { params } from './params';
import { stackState } from '@/gl/stackState';
import { getLenis } from './loop';
import { arrivalKind, arrivedByTransition, canUseGL } from './arrival';

/**
 * Séquence 01 — l'ouverture.
 *  0. Première arrivée (avec WebGL) : ouverture cinématique. Sur le noir, un pinceau d'encre traverse l'écran
 *     et ALEX se révèle dans le liquide (stackState.cine / reveal, lus par gl/HeroFluid.ts). Le scroll attend ;
 *     un clic, une touche ou la molette accélèrent la fin.
 *  1. la navigation et les repères apparaissent ;
 *  2. la phrase d'intro monte ligne par ligne depuis son masque ;
 *  3. le filet se trace, puis ALEX monte d'un seul bloc (jamais lettre par lettre) ;
 *  4. les plaques de la page éclatée tombent en place, de bas en haut (stackState.intro).
 * Pas d'épinglage : la page défile librement.
 * À appeler dans un gsap.context() : retourne une fonction de nettoyage.
 */
export function buildHero(withIntro: boolean): () => void {
  // Pages sans hero (études de cas) : la navigation, puis l'en-tête [data-intro] (lignes masquées ou fondu)
  if (!document.querySelector('[data-section="hero"]')) {
    if (!withIntro) return () => {};
    const splits = gsap.utils
      .toArray<HTMLElement>('[data-intro="lines"], [data-intro="chars"]')
      .map((el) =>
        el.dataset.intro === 'chars'
          ? SplitText.create(el, { type: 'lines,words,chars', mask: 'lines', linesClass: 'split-line' })
          : SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' }),
      );
    const tl = gsap.timeline({ delay: 0.1, defaults: { ease: 'expo.out', duration: 1.3 } });
    tl.from('[data-nav]', { autoAlpha: 0, y: -10, duration: 1 }, 0);
    // Couverture : déjà en place si on arrive depuis l'index (l'image ouverte en plein écran) ; sinon elle se pose
    const cover = document.querySelector<HTMLElement>('[data-case-cover]');
    if (cover && arrivalKind() !== 'cover') tl.from(cover, { scale: 1.18, duration: 1.8 }, 0);
    gsap.utils.toArray<HTMLElement>('[data-intro]').forEach((el, i) => {
      const split = splits.find((s) => s.elements.includes(el));
      const at = 0.15 + i * 0.08;
      if (split && el.dataset.intro === 'chars')
        tl.from(split.chars, { yPercent: 110, rotate: 8, transformOrigin: '0% 100%', stagger: 0.035 }, at);
      else if (split) tl.from(split.lines, { yPercent: 105, stagger: 0.07 }, at);
      else tl.from(el, { autoAlpha: 0, y: 28 }, at);
    });
    tl.add(() => splits.forEach((s) => s.revert()));
    return () => {
      tl.kill();
      splits.forEach((s) => s.revert());
    };
  }
  if (!withIntro) {
    gsap.set(stackState, { intro: 1, word: 1, reveal: 1, cine: 1 });
    return () => {};
  }
  const { hero } = params;
  const lead = document.querySelector<HTMLElement>('[data-hero-lead]');
  const split = lead ? SplitText.create(lead, { type: 'lines', mask: 'lines', linesClass: 'split-line' }) : null;
  const ease = 'expo.out';

  // Ouverture cinématique : seulement à la première arrivée, avec WebGL
  const cinematic = canUseGL() && !arrivedByTransition();
  const tl = gsap.timeline({ delay: hero.delay, defaults: { ease, duration: hero.duration } });
  let skip: (() => void) | null = null;
  if (cinematic) {
    const lenis = getLenis();
    lenis?.stop();
    gsap.set(stackState, { word: 1, reveal: 0, cine: 0 });
    tl.to(stackState, { cine: 1, duration: params.hero.cineDuration, ease: 'power2.inOut' }, 0)
      .to(stackState, { reveal: 1, duration: 1.2, ease: 'power2.out' }, params.hero.cineDuration * 0.75)
      .add(() => lenis?.start(), params.hero.cineDuration * 0.9)
      .addLabel('ui', params.hero.cineDuration * 0.8);
    // Passer : on accélère jusqu'à la fin de l'ouverture (écouté seulement une fois l'ouverture lancée)
    skip = () => {
      if (tl.progress() < 1) tl.timeScale(4);
      ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, skip!));
    };
  }
  // Avant de lancer l'ouverture, on attend : la scène WebGL (au plus 2,5 s) et l'écran de chargement s'il est là
  const gates: Promise<void>[] = [];
  if (cinematic && !document.documentElement.classList.contains('gl-on')) {
    gates.push(
      new Promise<void>((res) => {
        window.addEventListener('gl-ready', () => res(), { once: true });
        gsap.delayedCall(2.5, res);
      }),
    );
  }
  if (document.documentElement.classList.contains('pl-on')) {
    gates.push(new Promise<void>((res) => window.addEventListener('preloader-done', () => res(), { once: true })));
  }
  const listenSkip = () =>
    skip &&
    ['wheel', 'keydown', 'pointerdown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, skip!, { passive: true }),
    );
  if (gates.length) {
    tl.pause();
    Promise.all(gates).then(() => {
      if (tl.paused()) tl.play();
      listenSkip();
    });
  } else listenSkip();
  if (!cinematic) {
    gsap.set(stackState, { reveal: 1, cine: 1 });
    tl.addLabel('ui', 0);
  }
  tl.from('[data-nav]', { autoAlpha: 0, y: -10, duration: 1 }, 'ui')
    .from('[data-hero-meta] > *', { autoAlpha: 0, y: 12, stagger: hero.stagger, duration: 1 }, 'ui+=0.1')
    .from(split?.lines ?? [], { yPercent: 105, stagger: hero.stagger }, 'ui+=0.15')
    .fromTo('[data-hero-rule]', { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'expo.inOut' }, 'ui+=0.2')
    .from('[data-hero-row] > *', { autoAlpha: 0, y: 10, stagger: hero.stagger, duration: 1 }, 'ui+=0.6')
    .from('[data-hero-word]', { yPercent: 102, duration: 1.6 }, 'ui+=0.55')
    .fromTo(stackState, { intro: 0 }, { intro: 1, duration: 2.4, ease: 'power2.out' }, 'ui+=0.5')
    .from('[data-hero-caption]', { autoAlpha: 0, duration: 1 }, 'ui+=1.4')
    // Une fois en place, on rend le texte d'intro à son état normal (le découpage n'est plus utile)
    .add(() => split?.revert());
  // Sans ouverture cinématique : le mot (WebGL) monte comme le <h1>
  if (!cinematic) tl.fromTo(stackState, { word: 0 }, { word: 1, duration: 1.6 }, 'ui+=0.55');

  return () => {
    tl.kill();
    split?.revert();
    skip?.();
    getLenis()?.start();
  };
}
