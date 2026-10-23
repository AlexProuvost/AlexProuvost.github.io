import { gsap } from '@/motion/gsap';
import { motion } from '@/motion/store';

/**
 * Barre de lecture des études de cas ([data-read-progress]) : elle suit l'avancement de la page,
 * lu dans le store de mouvement (déjà lissé par Lenis). Transform uniquement.
 */
export function initReadProgress(): () => void {
  const bar = document.querySelector<HTMLElement>('[data-read-progress]');
  if (!bar) return () => {};
  let last = -1;
  const tick = () => {
    const p = Math.round(motion.progress * 1000) / 1000;
    if (p === last) return;
    last = p;
    bar.style.transform = `scaleX(${p})`;
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}
