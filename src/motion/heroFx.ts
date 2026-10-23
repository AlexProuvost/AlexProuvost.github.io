import { gsap, SplitText } from './gsap';
import { params } from './params';
import { stackState } from '@/gl/stackState';
import { arrivalKind } from './arrival';

/**
 * Séquence 01 — l'ouverture, un élément à la fois (rien n'apparaît en même temps) :
 *  1. ALEX monte d'un seul bloc (jamais lettre par lettre) ;
 *  2. la ligne « Développeur web créatif à Tournai » monte depuis son masque ;
 *  3. le menu apparaît.
 * La page éclatée se met en place hors champ (stackState.intro) : elle n'apparaît qu'à la méthode.
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
    gsap.set(stackState, { intro: 1, word: 1 });
    return () => {};
  }
  const { hero } = params;
  const lead = document.querySelector<HTMLElement>('[data-hero-lead]');
  const split = lead ? SplitText.create(lead, { type: 'lines', mask: 'lines', linesClass: 'split-line' }) : null;

  const tl = gsap.timeline({ delay: hero.delay, defaults: { ease: 'expo.out', duration: hero.duration } });
  // L'écran de chargement, s'il est là, passe d'abord
  if (document.documentElement.classList.contains('pl-on')) {
    tl.pause();
    window.addEventListener('preloader-done', () => tl.play(), { once: true });
  }
  // Un seul élément à la fois : ALEX, puis la ligne, puis le menu
  tl.from('[data-hero-word]', { yPercent: 102, duration: 1.6 }, 0)
    .fromTo(stackState, { word: 0 }, { word: 1, duration: 1.6 }, 0)
    .from(split?.lines ?? [], { yPercent: 105, stagger: hero.stagger }, 0.9)
    .from('[data-nav]', { autoAlpha: 0, y: -10, duration: 1 }, 1.5)
    // Les plaques de la page éclatée se mettent en place, hors champ (elle n'apparaît qu'à la méthode)
    .fromTo(stackState, { intro: 0 }, { intro: 1, duration: 2.4, ease: 'power2.out' }, 0.5)
    // Une fois en place, on rend la ligne à son état normal (le découpage n'est plus utile)
    .add(() => split?.revert());

  return () => {
    tl.kill();
    split?.revert();
  };
}
