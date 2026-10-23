/**
 * Cartes qui s'inclinent sous la souris ([data-tilt]) : la carte pivote légèrement vers le curseur
 * et un reflet de lumière le suit (variables CSS --tilt-* et --glare-*, styles dans la feuille de la carte).
 * La rotation passe par la propriété CSS `rotate` : elle se cumule avec les `transform` posés par GSAP
 * (révélations), sans les écraser. Inactif sur écran tactile et en animations réduites.
 */
const MAX_DEG = 6;

export function initTilt(): () => void {
  if (window.matchMedia('(pointer: coarse), (prefers-reduced-motion: reduce)').matches) return () => {};
  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0 → 1
      const py = (e.clientY - r.top) / r.height;
      const dx = px * 2 - 1;
      const dy = py * 2 - 1;
      // Axe perpendiculaire au déplacement : le coin sous la souris s'enfonce, l'opposé se relève
      const angle = Math.min(1, Math.hypot(dx, dy)) * MAX_DEG;
      // Au centre exact, l'axe serait nul (rotation invalide) : on garde le précédent
      if (Math.abs(dx) + Math.abs(dy) > 0.001) {
        el.style.setProperty('--tilt-x', (-dy).toFixed(3));
        el.style.setProperty('--tilt-y', dx.toFixed(3));
      }
      el.style.setProperty('--tilt-a', `${angle.toFixed(2)}deg`);
      el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
      el.setAttribute('data-tilting', '');
    };
    const onLeave = () => {
      el.style.setProperty('--tilt-a', '0deg');
      el.removeAttribute('data-tilting');
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}
