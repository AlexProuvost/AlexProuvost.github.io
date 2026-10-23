import { gsap, ScrollTrigger } from './gsap';
import { params } from './params';
import { motion } from './store';
import { getLenis } from './loop';

/**
 * Projets — les cartes qui défilent ([data-film-stage], components/sections/Work.tsx).
 *  - Arrivée (partout) : les cartes glissent depuis la droite l'une après l'autre, et chaque capture se dévoile
 *    de bas en haut en se recadrant doucement.
 *  - Grand écran : la scène s'épingle ; le scroll vertical fait glisser les cartes vers la gauche, les captures
 *    bougent en parallaxe (chaque écran à sa vitesse). Compteur 01 / 02 et barre de progression à gauche.
 *    On peut aussi glisser les cartes à la souris.
 *  - Mobile : carrousel natif (au doigt), seul le compteur suit.
 * En animations réduites : rien ne bouge, le carrousel natif reste.
 * À appeler dans un gsap.context() : retourne une fonction de nettoyage.
 */
export function buildFilm(): () => void {
  const html = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-film-stage]');
  const rail = stage?.querySelector<HTMLElement>('[data-film-rail]');
  const track = stage?.querySelector<HTMLElement>('[data-film-track]');
  const reduced = motion.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!stage || !rail || !track || reduced) {
    html.classList.remove('film-on');
    return () => {};
  }

  const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-film-card]'));
  const projectsCount = cards.length - 1; // la dernière carte invite au contact
  const reel = stage.querySelector<HTMLElement>('[data-film-reel]');
  const fill = stage.querySelector<HTMLElement>('[data-film-fill]');
  const cleanups: (() => void)[] = [];

  // Compteur (le chiffre roule) : la carte la plus proche du début visible du rail
  let current = -1;
  const updateCounter = (progress: number) => {
    if (fill) fill.style.transform = `scaleX(${progress.toFixed(4)})`;
    const edge = rail.getBoundingClientRect().left + rail.clientWidth * 0.35;
    let best = 0;
    let dist = Infinity;
    cards.slice(0, projectsCount).forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - edge);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    if (best !== current && reel) {
      current = best;
      gsap.to(reel, { yPercent: (-100 * best) / projectsCount, duration: 0.6, ease: 'expo.out', overwrite: true });
    }
  };

  // Arrivée des cartes
  const shots = cards.map((c) => c.querySelector<HTMLElement>('[data-film-shot]')).filter(Boolean) as HTMLElement[];
  const infos = cards.map((c) => c.querySelector<HTMLElement>('[data-film-info]')).filter(Boolean) as HTMLElement[];
  const insides = shots.map((s) => s.firstElementChild).filter(Boolean) as HTMLElement[];
  gsap.set(cards, { x: () => window.innerWidth * 0.18, autoAlpha: 0 });
  gsap.set(shots, { clipPath: 'inset(100% 0% 0% 0% round 18px)' });
  gsap.set(infos, { y: 24, autoAlpha: 0 });
  gsap.set(insides, { scale: 1.18 });
  const enter = gsap
    .timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .to(cards, { x: 0, autoAlpha: 1, duration: 1.6, stagger: 0.12 }, 0)
    .to(shots, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, stagger: 0.12, ease: 'expo.inOut' }, 0)
    .to(insides, { scale: 1, duration: 1.8, stagger: 0.12 }, 0)
    .to(infos, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.12 }, 0.5);
  const enterTrigger = ScrollTrigger.create({
    trigger: stage,
    start: 'top 70%',
    once: true,
    onEnter: () => enter.play(),
  });
  cleanups.push(() => {
    enterTrigger.kill();
    enter.kill();
    gsap.set([...cards, ...shots, ...infos, ...insides], { clearProps: 'transform,opacity,visibility,clipPath' });
  });

  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px) and (hover: hover)', () => {
    html.classList.add('film-on');
    rail.scrollLeft = 0;
    const distance = () => Math.max(track.scrollWidth - rail.clientWidth, 0);

    // (le tween peut se mettre à jour pendant sa propre création : on passe par une référence)
    const ref: { tween: gsap.core.Tween | null } = { tween: null };
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      onUpdate: () => ref.tween && updateCounter(ref.tween.progress()),
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: () => `+=${distance() * params.film.speed}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
    ref.tween = tween;

    // Parallaxe : dans chaque capture, les écrans glissent à des vitesses différentes
    cards.forEach((card) => {
      card.querySelectorAll<HTMLElement>('[data-depth]').forEach((el) => {
        const d = Number(el.dataset.depth) || 1;
        gsap.fromTo(
          el,
          { xPercent: 7 * d },
          {
            xPercent: -7 * d,
            ease: 'none',
            scrollTrigger: {
              containerAnimation: tween,
              trigger: card,
              start: 'left right',
              end: 'right left',
              scrub: true,
            },
          },
        );
      });
    });

    // Glisser à la souris : on fait défiler la page d'autant (les cartes suivent)
    let drag: { x: number; scroll: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, scroll: window.scrollY, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) {
        drag.moved = true;
        html.classList.add('film-dragging');
      }
      if (!drag.moved) return;
      const y = drag.scroll - dx * params.film.speed * 1.2;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { immediate: false, lerp: 0.2, force: true });
      else window.scrollTo(0, y);
    };
    const onUp = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      html.classList.remove('film-dragging');
      // Après un glissé, le clic qui suit n'ouvre pas le projet
      if (moved) {
        const block = (ev: MouseEvent) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        track.addEventListener('click', block, { capture: true, once: true });
        setTimeout(() => track.removeEventListener('click', block, { capture: true }), 50);
      }
    };
    track.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      track.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      html.classList.remove('film-on', 'film-dragging');
    };
  });

  // Mobile : carrousel natif, le compteur suit le défilement au doigt
  mm.add('(max-width: 899px), (hover: none)', () => {
    const onScroll = () => {
      const max = Math.max(rail.scrollWidth - rail.clientWidth, 1);
      updateCounter(rail.scrollLeft / max);
    };
    rail.addEventListener('scroll', onScroll, { passive: true });
    return () => rail.removeEventListener('scroll', onScroll);
  });
  cleanups.push(() => mm.revert());

  return () => {
    cleanups.forEach((fn) => fn());
    html.classList.remove('film-on', 'film-dragging');
    ScrollTrigger.refresh();
  };
}
