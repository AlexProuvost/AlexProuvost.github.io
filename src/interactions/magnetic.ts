import { gsap } from '@/motion/gsap';
import { params } from '@/motion/params';

/**
 * Boutons magnétiques : [data-magnetic] glisse légèrement vers le curseur quand il le survole,
 * et son contenu ([data-magnetic-inner]) un peu plus, pour un effet de profondeur.
 * Transform uniquement. Inactif sur écran tactile.
 */
export function initMagnetic(): () => void {
  if (window.matchMedia('(pointer: coarse)').matches) return () => {};
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]');
    const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' });
    const ix = inner ? gsap.quickTo(inner, 'x', { duration: 0.8, ease: 'power3.out' }) : null;
    const iy = inner ? gsap.quickTo(inner, 'y', { duration: 0.8, ease: 'power3.out' }) : null;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const k = params.fx.magnetic;
      x(dx * k);
      y(dy * k);
      ix?.(dx * k * 0.5);
      iy?.(dy * k * 0.5);
    };
    const onLeave = () => {
      x(0);
      y(0);
      ix?.(0);
      iy?.(0);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.set([el, inner].filter(Boolean), { clearProps: 'transform' });
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
