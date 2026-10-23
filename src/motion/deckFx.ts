import { gsap } from './gsap';

/**
 * « Le déroulé, en détail » (Approach) : les cartes collent en haut de l'écran (CSS sticky) et s'empilent.
 *  - À l'arrivée d'une carte : son grand numéro se remplit d'encre de gauche à droite et glisse en place,
 *    son contenu monte en cascade.
 *  - Quand la suivante la recouvre : elle recule (échelle, légère bascule vers l'arrière) et s'assombrit.
 * Tout est lié au scroll (scrub) : on peut remonter, tout se rejoue à l'envers. Transform et opacité uniquement.
 * Petits écrans (< 700 px, cartes non collantes) : seule l'arrivée est animée.
 * Appelé dans le contexte GSAP de textReveals.ts (nettoyé avec lui).
 */
export function buildDeck(): () => void {
  const cards = gsap.utils.toArray<HTMLElement>('[data-deck-card]');
  if (!cards.length) return () => {};
  const stacked = window.matchMedia('(min-width: 701px)').matches;

  cards.forEach((card, i) => {
    const inner = card.querySelector<HTMLElement>('[data-deck-inner]');
    const num = card.querySelector<HTMLElement>('[data-deck-n]');
    const shade = card.querySelector<HTMLElement>('[data-deck-shade]');
    const items = card.querySelectorAll<HTMLElement>('[data-deck-item]');
    if (!inner) return;

    // Arrivée : le numéro se remplit et glisse, au rythme du scroll
    gsap.fromTo(
      inner,
      { '--fill': 0 },
      {
        '--fill': 1,
        ease: 'none',
        scrollTrigger: { trigger: card, start: 'top 90%', end: 'top 25%', scrub: 0.6 },
      },
    );
    if (num) {
      gsap.fromTo(
        num,
        { xPercent: -18, rotate: -6 },
        {
          xPercent: 0,
          rotate: 0,
          ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 30%', scrub: 0.6 },
        },
      );
    }
    // Le contenu monte en cascade, une fois
    gsap.from(items, {
      y: 48,
      autoAlpha: 0,
      duration: 1.1,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: card, start: 'top 70%', once: true },
    });

    // Recouverte par la suivante : recul et ombre
    const next = cards[i + 1];
    if (!stacked || !next) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top+=120', scrub: true },
    });
    // Perspective fixée d'emblée : animée depuis 0, elle déformait la carte au début du recul
    gsap.set(inner, { transformPerspective: 1400 });
    tl.to(inner, { scale: 0.9, rotationX: 7, ease: 'none' }, 0);
    if (shade) tl.to(shade, { opacity: 0.55, ease: 'none' }, 0);
  });

  return () => {};
}
