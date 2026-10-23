import { gsap } from '@/motion/gsap';
import { motion, damp } from '@/motion/store';

/**
 * Curseur à inertie : suit la souris (lissé, indépendant de la fréquence d'écran),
 * grossit sur les liens / boutons et affiche leur data-cursor-label ; sur les grands titres, il devient un grand
 * disque qui inverse le texte (façon Studio Freight / Dennis Snellenberg).
 * transform + opacity uniquement. Inactif sur écran tactile.
 */
export function initCursor(): () => void {
  const el = document.querySelector<HTMLElement>('[data-cursor]');
  const ring = el?.querySelector<HTMLElement>('[data-cursor-ring]');
  const text = el?.querySelector<HTMLElement>('[data-cursor-text]');
  if (!el || !ring || !text || window.matchMedia('(pointer: coarse)').matches) return () => {};

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let scale = 1;
  let targetScale = 1;
  let shown = false;

  const onOver = (e: PointerEvent) => {
    const el0 = e.target as HTMLElement;
    const target = el0.closest<HTMLElement>('a, button, [data-cursor-label]');
    const label = target?.dataset.cursorLabel ?? '';
    // Sur les grands titres : un grand disque qui inverse le texte (mix-blend-mode: difference)
    const big = !target && !!el0.closest('.headline, [data-cursor-invert]');
    targetScale = target ? (label ? 5.2 : 2.6) : big ? 7.5 : 1;
    text.textContent = label;
    gsap.to(text, { opacity: label ? 1 : 0, duration: 0.25, overwrite: true });
  };
  const onDown = () => (targetScale *= 0.8);
  const onUp = () => (targetScale /= 0.8);
  const onLeave = () => gsap.to(el, { opacity: 0, duration: 0.3, overwrite: true });

  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);

  const tick = () => {
    if (!motion.mouse.active) return;
    if (!shown) {
      shown = true;
      pos.x = motion.mouse.x;
      pos.y = motion.mouse.y;
    }
    if (Number(el.style.opacity || 0) < 1 && !gsap.isTweening(el)) gsap.to(el, { opacity: 1, duration: 0.3 });
    pos.x = damp(pos.x, motion.mouse.x, 0.22, motion.dt);
    pos.y = damp(pos.y, motion.mouse.y, 0.22, motion.dt);
    scale = damp(scale, targetScale, 0.15, motion.dt);
    el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    ring.style.transform = `scale(${scale})`;
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}
