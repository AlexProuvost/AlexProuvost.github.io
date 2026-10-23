import { gsap } from '@/motion/gsap';

/**
 * Choix de la lettre de contact ([data-pick], components/sections/contact/ContactForm.tsx).
 * Le <select> natif reste la source de vérité (envoi, brouillon) ; ici, il est remplacé à l'écran par
 * un mot-bouton qui ouvre un menu sur mesure :
 *  - ouverture : le cartouche se déroule depuis le mot, les options montent en cascade ;
 *  - survol / clavier : une encre bleue remplit l'option depuis la gauche ;
 *  - choix : le mot de la phrase roule vers le haut et le nouveau arrive par le bas.
 * Clavier : ↑ ↓ Début Fin pour parcourir, Entrée / Espace pour choisir, Échap pour fermer.
 */

type Pick = {
  root: HTMLElement;
  select: HTMLSelectElement;
  btn: HTMLButtonElement;
  current: HTMLElement;
  menu: HTMLElement;
  options: HTMLElement[];
};

export function initPicks(form: HTMLFormElement, reduced: boolean) {
  const picks: Pick[] = [...form.querySelectorAll<HTMLElement>('[data-pick]')].flatMap((root) => {
    const select = root.querySelector('select');
    const btn = root.querySelector<HTMLButtonElement>('[data-pick-btn]');
    const current = root.querySelector<HTMLElement>('[data-pick-current]');
    const menu = root.querySelector<HTMLElement>('[data-pick-menu]');
    if (!select || !btn || !current || !menu) return [];
    return [
      { root, select, btn, current, menu, options: [...menu.querySelectorAll<HTMLElement>('[data-pick-option]')] },
    ];
  });
  if (!picks.length) return { sync: () => {}, destroy: () => {} };

  // Le select sort de l'écran et du parcours au clavier : le bouton prend le relais
  form.setAttribute('data-picks', '');
  picks.forEach((p) => {
    p.select.tabIndex = -1;
    p.select.setAttribute('aria-hidden', 'true');
  });

  let open: Pick | null = null;
  let active = -1;

  const phrase = (p: Pick, i: number) => p.options[i]?.querySelector('[data-option-text]')?.textContent ?? '';

  const setActive = (p: Pick, i: number) => {
    active = Math.max(0, Math.min(p.options.length - 1, i));
    p.options.forEach((o, j) => o.toggleAttribute('data-active', j === active));
    p.menu.setAttribute('aria-activedescendant', p.options[active].id);
  };

  /** Recale l'affichage sur le select (brouillon retrouvé, devis présélectionné, formulaire vidé) */
  const sync = () => {
    picks.forEach((p) => {
      const i = p.select.selectedIndex;
      p.options.forEach((o, j) => o.setAttribute('aria-selected', String(j === i)));
      if (!p.root.hasAttribute('data-rolling')) p.current.textContent = phrase(p, i);
    });
  };

  /** Garde le cartouche dans l'écran (mobile, mot en fin de ligne) */
  const place = (p: Pick) => {
    p.menu.style.removeProperty('--shift');
    const r = p.menu.getBoundingClientRect();
    const over = r.right - (document.documentElement.clientWidth - 12);
    if (over > 0) p.menu.style.setProperty('--shift', `${-Math.min(over, r.left - 12)}px`);
  };

  const close = (focusBtn = false) => {
    const p = open;
    if (!p) return;
    open = null;
    p.btn.setAttribute('aria-expanded', 'false');
    p.root.removeAttribute('data-open');
    if (focusBtn) p.btn.focus({ preventScroll: true });
    gsap.killTweensOf([p.menu, p.options]);
    if (reduced) {
      p.menu.hidden = true;
      return;
    }
    gsap.to(p.menu, {
      clipPath: 'inset(0% 0% 100% 0% round 18px)',
      duration: 0.35,
      ease: 'power3.in',
      onComplete: () => {
        p.menu.hidden = true;
      },
    });
  };

  const show = (p: Pick, from: 'selected' | 'first' | 'last' = 'selected') => {
    if (open && open !== p) close();
    open = p;
    p.menu.hidden = false;
    p.btn.setAttribute('aria-expanded', 'true');
    p.root.setAttribute('data-open', '');
    place(p);
    setActive(p, from === 'first' ? 0 : from === 'last' ? p.options.length - 1 : p.select.selectedIndex);
    p.menu.focus({ preventScroll: true });
    gsap.killTweensOf([p.menu, p.options]);
    if (reduced) return;
    gsap.fromTo(
      p.menu,
      { clipPath: 'inset(0% 0% 100% 0% round 18px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 0.7, ease: 'expo.out' },
    );
    gsap.fromTo(
      p.options,
      { yPercent: 60, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.6, stagger: 0.04, delay: 0.05, ease: 'expo.out', clearProps: 'all' },
    );
  };

  const choose = (p: Pick, i: number) => {
    const changed = i !== p.select.selectedIndex;
    close(true);
    if (!changed) return;
    p.select.selectedIndex = i;
    p.options.forEach((o, j) => o.setAttribute('aria-selected', String(j === i)));
    const text = phrase(p, i);
    if (reduced) p.current.textContent = text;
    else {
      // Le mot roule : l'ancien monte et sort, le nouveau arrive par le bas
      p.root.setAttribute('data-rolling', '');
      gsap.killTweensOf(p.current);
      gsap
        .timeline({ onComplete: () => p.root.removeAttribute('data-rolling') })
        .to(p.current, { yPercent: -110, duration: 0.25, ease: 'power2.in' })
        .add(() => {
          p.current.textContent = text;
        })
        .fromTo(p.current, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
      p.root.removeAttribute('data-flash');
      void p.root.offsetWidth;
      p.root.setAttribute('data-flash', '');
    }
    // Brouillon, objet de l'email… (écoutes de contactForm.ts)
    p.select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const pickOf = (el: EventTarget | null) => picks.find((p) => p.root.contains(el as Node)) ?? null;

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const p = pickOf(target);
    if (!p) return;
    if (target.closest('[data-pick-btn]')) {
      if (open === p) close(true);
      else show(p);
      return;
    }
    const opt = target.closest<HTMLElement>('[data-pick-option]');
    if (opt) choose(p, p.options.indexOf(opt));
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!open) return;
    const opt = (e.target as HTMLElement).closest<HTMLElement>('[data-pick-option]');
    if (opt && open.menu.contains(opt)) setActive(open, open.options.indexOf(opt));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const p = pickOf(e.target);
    if (!p) return;
    const onBtn = (e.target as HTMLElement).closest('[data-pick-btn]');
    if (onBtn && open !== p) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        show(p, e.key === 'ArrowUp' ? 'last' : 'selected');
      }
      return;
    }
    if (open !== p) return;
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive(p, active + 1),
      ArrowUp: () => setActive(p, active - 1),
      Home: () => setActive(p, 0),
      End: () => setActive(p, p.options.length - 1),
      Enter: () => choose(p, active),
      ' ': () => choose(p, active),
      Escape: () => close(true),
    };
    if (e.key === 'Tab') close();
    else if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  };

  const onOutside = (e: PointerEvent) => {
    if (open && !open.root.contains(e.target as Node)) close();
  };
  const onFocusOut = (e: FocusEvent) => {
    if (open && !open.root.contains(e.relatedTarget as Node | null) && e.relatedTarget) close();
  };
  const onResize = () => close();

  form.addEventListener('click', onClick);
  form.addEventListener('pointermove', onPointerMove);
  form.addEventListener('keydown', onKeyDown);
  form.addEventListener('focusout', onFocusOut);
  document.addEventListener('pointerdown', onOutside);
  window.addEventListener('resize', onResize);
  sync();

  return {
    sync,
    destroy: () => {
      form.removeEventListener('click', onClick);
      form.removeEventListener('pointermove', onPointerMove);
      form.removeEventListener('keydown', onKeyDown);
      form.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('pointerdown', onOutside);
      window.removeEventListener('resize', onResize);
    },
  };
}
