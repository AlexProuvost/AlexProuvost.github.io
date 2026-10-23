import { gsap } from '@/motion/gsap';
import { getLenis } from '@/motion/loop';

/**
 * Menu plein écran : le panneau descend, les liens montent un par un.
 * Pendant l'ouverture, le scroll de la page est suspendu ; Échap ferme ; un lien ferme puis fait défiler.
 */
export function initMenu(): () => void {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-menu]');
  if (!btn || !panel) return () => {};
  const label = btn.querySelector<HTMLElement>('[data-menu-label]');
  const words = panel.querySelectorAll<HTMLElement>('[data-menu-word]');
  const foot = panel.querySelector<HTMLElement>('[data-menu-foot]');
  let open = false;
  gsap.set(panel, { yPercent: -100 });

  const tl = gsap
    .timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .set(panel, { visibility: 'visible' })
    .fromTo(panel, { yPercent: -100 }, { yPercent: 0, duration: 0.9 })
    .fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, 0.45)
    .fromTo(foot, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' }, 0.7);

  const setOpen = (value: boolean) => {
    if (value === open) return;
    open = value;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', (open ? btn.dataset.ariaClose : btn.dataset.ariaOpen) ?? '');
    if (label) label.textContent = (open ? btn.dataset.labelClose : btn.dataset.labelOpen) ?? '';
    panel.toggleAttribute('inert', !open);
    panel.setAttribute('aria-hidden', String(!open));
    // La barre du bas s'efface pendant que le menu est ouvert
    gsap.to('[data-rail]', { autoAlpha: open ? 0 : 1, duration: 0.4, overwrite: true });
    if (open) {
      getLenis()?.stop();
      tl.timeScale(1).play();
      panel.querySelector<HTMLElement>('[data-menu-link]')?.focus({ preventScroll: true });
    } else {
      getLenis()?.start();
      tl.timeScale(1.6).reverse();
    }
  };

  const onToggle = () => setOpen(!open);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      setOpen(false);
      btn.focus();
    }
  };
  const onLink = (e: Event) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-menu-link]');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    // Lien vers une autre page (ex. /fr/#projets depuis une étude de cas) : navigation normale
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const target = document.getElementById(href.slice(1));
    setOpen(false);
    // Laisse le panneau remonter, puis défile en douceur
    gsap.delayedCall(0.35, () => {
      const lenis = getLenis();
      if (target && lenis) lenis.scrollTo(target as HTMLElement, { duration: 1.6 });
      else target?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  btn.addEventListener('click', onToggle);
  panel.addEventListener('click', onLink);
  window.addEventListener('keydown', onKey);

  return () => {
    btn.removeEventListener('click', onToggle);
    panel.removeEventListener('click', onLink);
    window.removeEventListener('keydown', onKey);
    if (open) getLenis()?.start();
    tl.kill();
    gsap.set(panel, { clearProps: 'all' });
  };
}
