import { gsap, ScrollTrigger, SplitText } from './gsap';
import { params, subscribe } from './params';
import { motion } from './store';
import { getLenis } from './loop';
import { buildHero } from './heroFx';
import { buildScrollFx } from './scrollFx';
import { buildApproach, showAllSteps } from './approachFx';
import { buildFilm } from './filmFx';
import { inkFilter } from './inkFilter';
import { stackState } from '@/gl/stackState';

/**
 * Animations de texte et d'apparition, pilotées par des attributs dans le HTML :
 *
 *   data-split="title"   titres : chaque ligne monte de son masque en se redressant (une fois, à l'entrée)
 *   data-split="ink"     titre signature : écrit à l'encre au fil du scroll (voir inkFilter.ts)
 *   data-reveal="image"  images : dévoilées de bas en haut, l'image dézoome dans son cadre
 *   data-footer-word     pied de page : les lettres du grand logotype montent une à une
 *   data-split="lines"   paragraphes : lignes qui montent depuis leur masque
 *   data-split="light"   déclaration : les mots s'allument un à un (opacité seule, le texte ne bouge pas)
 *   data-reveal="up"     blocs : montée + fondu
 *   data-reveal="label"  labels de section : le trait se trace, le texte apparaît
 *   data-hero-*          ouverture du site (voir heroFx.ts)
 *   data-approach-*      la méthode, épinglée (voir approachFx.ts)
 *   + effets liés au scroll (voir scrollFx.ts)
 *
 * Tout ce qui dépend du scroll est « scrubé » : lié à la position, lissé, et rejoué à l'envers en remontant.
 * Uniquement transform et opacity. En prefers-reduced-motion : simples fondus.
 *
 * Retourne la fonction de nettoyage.
 */
export function initReveals(): () => void {
  let ctx: gsap.Context | null = null;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const build = (withIntro: boolean) => {
    ctx?.revert();
    ctx = gsap.context(() => {
      if (motion.reducedMotion) {
        buildReduced(withIntro);
        return;
      }
      // Ordre de la page : l'épinglage de la méthode d'abord, pour que les déclencheurs suivants en tiennent compte
      const offHero = buildHero(withIntro);
      const offApproach = buildApproach();
      const offWall = buildFilm();
      const offReveals = buildScrollReveals();
      const offFx = buildScrollFx();
      // Appelé par ctx.revert() : retire les écouteurs
      return () => {
        offHero();
        offApproach();
        offWall();
        offReveals();
        offFx();
      };
    });
    document.documentElement.classList.add('motion-ready');
    ScrollTrigger.refresh();
    // Arrivée sur une ancre (/fr/#contact) : une fois les épinglages en place, on se cale sur la section
    if (withIntro) {
      const w = window as unknown as { __pendingHash?: string };
      const id = w.__pendingHash ?? decodeURIComponent(window.location.hash.slice(1));
      w.__pendingHash = undefined;
      const target = id ? document.getElementById(id) : null;
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY;
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      }
    }
  };

  // On attend les polices : les lignes et lettres sont mesurées avec la bonne typo
  document.fonts.ready.then(() => {
    if (!cancelled) build(true);
  });

  // Leva (dev) : reconstruit les animations avec les nouveaux réglages
  const rebuild = (withIntro: boolean) => () => {
    clearTimeout(timer);
    timer = setTimeout(() => build(withIntro), 150);
  };
  const offText = subscribe('text', rebuild(false));
  const offHero = subscribe('hero', rebuild(true));
  const offFx = subscribe('fx', rebuild(false));
  const offApproach = subscribe('approach', rebuild(false));
  const offWallP = subscribe('film', rebuild(false));

  return () => {
    cancelled = true;
    clearTimeout(timer);
    offText();
    offHero();
    offFx();
    offApproach();
    offWallP();
    ctx?.revert();
  };
}

/* ── Révélations au scroll (scrub) ─────────────────────────────── */
function buildScrollReveals(): () => void {
  const { text } = params;
  const disposers: Array<() => void> = [];

  const trigger = (el: Element): ScrollTrigger.Vars => ({
    trigger: el,
    // clamp() : un élément en bas de page termine quand même son animation
    start: `clamp(top ${text.start}%)`,
    end: `clamp(top ${text.end}%)`,
    scrub: text.scrub > 0 ? text.scrub : true,
  });

  // Titres : chaque ligne monte de son masque, en se redressant (joué une fois à l'entrée, comme sur les sites
  // éditoriaux de référence : net, rapide, lisible)
  gsap.utils.toArray<HTMLElement>('[data-split="title"]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          rotate: 2.5,
          transformOrigin: '0% 100%',
          duration: 1.4,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        }),
    });
  });

  // Titre signature (« De l'idée au site. ») : écrit à l'encre — des taches s'étalent et dessinent les lettres
  gsap.utils.toArray<HTMLElement>('[data-split="ink"]').forEach((el) => {
    const ink = inkFilter(el);
    disposers.push(ink.dispose);
    const state = { p: 0 };
    ink.set(0);
    gsap.to(state, {
      p: 1,
      ease: 'none',
      scrollTrigger: trigger(el),
      onUpdate: () => ink.set(state.p),
    });
  });


  // Déclaration : les mots passent de gris à blanc au fil du scroll
  gsap.utils.toArray<HTMLElement>('[data-split="light"]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'split-word' });
    gsap.fromTo(
      split.words,
      { opacity: 0.16 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: true },
      },
    );
  });

  // Contact : la page éclatée revient et se referme en carte
  const contactAnchor = document.querySelector('[data-stack-anchor="contact"]');
  if (contactAnchor) {
    gsap.fromTo(
      stackState,
      { contact: 0 },
      {
        contact: 1,
        ease: 'none',
        scrollTrigger: { trigger: contactAnchor, start: 'top 95%', end: 'center 55%', scrub: text.scrub || true },
      },
    );
  }

  // Blocs
  gsap.utils.toArray<HTMLElement>('[data-reveal="up"]').forEach((el) => {
    gsap.from(el, {
      y: 64,
      autoAlpha: 0,
      duration: text.duration,
      ease: text.ease,
      scrollTrigger: trigger(el),
    });
  });

  // Chiffres : ils comptent jusqu'à leur valeur à l'arrivée
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const state = { v: 0 };
    gsap.to(state, {
      v: target,
      duration: 1.6,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = String(Math.round(state.v))),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  // Ligne du temps du déroulé : elle se trace au scroll
  gsap.utils.toArray<HTMLElement>('[data-timeline-line]').forEach((el) => {
    gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top 85%', end: 'top 35%', scrub: true },
      },
    );
  });

  // Labels de section
  gsap.utils.toArray<HTMLElement>('[data-reveal="label"]').forEach((el) => {
    const rule = el.querySelector('[data-rule]');
    const parts = el.querySelectorAll(':scope > span:not([data-rule])');
    gsap
      .timeline({ scrollTrigger: trigger(el) })
      .from(rule, { scaleX: 0, transformOrigin: '0% 50%', duration: text.duration, ease: text.ease })
      .from(parts, { autoAlpha: 0, x: -8, duration: text.duration, stagger: 0.15, ease: text.ease }, 0);
  });
  return () => disposers.forEach((fn) => fn());
}

/* ── prefers-reduced-motion : un simple fondu d'entrée, puis tout reste visible (aucun contenu masqué) ── */
function buildReduced(withIntro: boolean) {
  showAllSteps();
  if (withIntro) {
    gsap.from('[data-hero-hide], [data-nav]', { autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'none' });
  }
}
