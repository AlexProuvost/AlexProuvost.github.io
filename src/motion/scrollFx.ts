import { gsap } from './gsap';
import { motion } from './store';

/**
 * Effets liés au scroll, pilotés par des attributs. Uniquement transform et opacity, tout est scrubé.
 *
 *   data-parallax="0.3"     parallaxe verticale (négatif = monte plus vite)
 *   data-skew               les grands titres se penchent selon la vitesse du scroll
 *   data-drift="5"          les grands titres glissent à l'horizontale pendant qu'ils traversent l'écran
 *                           (de -5 à +5 % de la largeur, alignés au milieu ; négatif = sens inverse)
 *   data-hero-out           ouverture : le contenu s'éloigne en profondeur quand on quitte le hero
 *   data-case-cover         étude de cas : la couverture descend moins vite et zoome, le titre part plus vite
 *   data-nav                se cache en descendant, revient en remontant
 *
 * À appeler dans un gsap.context() : retourne une fonction de nettoyage.
 */
export function buildScrollFx(): () => void {
  const cleanups: Array<() => void> = [];

  /* Parallaxe */
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const p = Number(el.dataset.parallax) || 0;
    gsap.fromTo(
      el,
      { yPercent: -p * 50 },
      {
        yPercent: p * 50,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });

  /* Grands titres qui glissent : deux lignes voisines partent en sens opposés, avec un léger retard (scrub) */
  gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el) => {
    const d = Number(el.dataset.drift) || 0;
    gsap.fromTo(
      el,
      { x: () => (-d * window.innerWidth) / 100 },
      {
        x: () => (d * window.innerWidth) / 100,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true },
      },
    );
  });

  /* Grands titres : inclinaison selon la vitesse (lissée), comme s'ils traînaient derrière le scroll */
  const skewed = gsap.utils
    .toArray<HTMLElement>('[data-skew]')
    .map((el) => gsap.quickTo(el, 'skewY', { duration: 0.5, ease: 'power3.out' }));
  if (skewed.length) {
    const tick = () => {
      const k = Math.max(-5, Math.min(5, motion.smoothVelocity * -0.12));
      skewed.forEach((set) => set(k));
    };
    gsap.ticker.add(tick);
    cleanups.push(() => gsap.ticker.remove(tick));
  }

  /* Ouverture : en quittant le hero, son contenu recule et s'efface */
  const hero = document.querySelector<HTMLElement>('[data-section="hero"]');
  const heroOut = gsap.utils.toArray<HTMLElement>('[data-hero-out]');
  if (hero && heroOut.length) {
    gsap.to(heroOut, {
      yPercent: -18,
      scale: 0.94,
      autoAlpha: 0,
      ease: 'none',
      transformOrigin: '50% 0%',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: true },
    });
  }

  /* Étude de cas : la couverture descend moins vite et zoome, le titre s'en va plus vite */
  const cover = document.querySelector<HTMLElement>('[data-case-cover]');
  if (cover) {
    const header = cover.parentElement!;
    const st = { trigger: header, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to(cover, { yPercent: 28, scale: 1.08, ease: 'none', scrollTrigger: st });
    const title = header.querySelector('[data-case-title]');
    if (title)
      gsap.to(title, { yPercent: -60, autoAlpha: 0, ease: 'none', scrollTrigger: { ...st, end: 'bottom 30%' } });
  }

  /* Navigation : cachée en descendant après le premier écran, visible en remontant.
     Sur l'écran d'arrivée de l'accueil (le grand ALEX), data-top efface le petit logo. */
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (nav) {
    const navY = gsap.quickTo(nav, 'yPercent', { duration: 0.6, ease: 'power3.out' });
    const hasHero = !!document.querySelector('[data-section="hero"]');
    let hidden = false;
    let atTop: boolean | null = null;
    const tick = () => {
      const top = hasHero && motion.scroll < window.innerHeight * 0.6;
      if (top !== atTop) {
        atTop = top;
        nav.toggleAttribute('data-top', top);
      }
      const v = motion.smoothVelocity;
      const hide = motion.direction === 1 && motion.scroll > window.innerHeight * 0.8 && Math.abs(v) > 0.5;
      const show = motion.direction === -1 || motion.scroll < window.innerHeight * 0.8;
      if (hide && !hidden) {
        hidden = true;
        navY(-110);
      } else if (show && hidden) {
        hidden = false;
        navY(0);
      }
    };
    gsap.ticker.add(tick);
    cleanups.push(() => {
      gsap.ticker.remove(tick);
      nav.removeAttribute('data-top');
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
