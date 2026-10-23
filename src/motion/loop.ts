import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { params, subscribe } from './params';
import { motion, damp } from './store';
import { prefersReducedMotion } from './reducedMotion';

let lenis: Lenis | null = null;

/** Instance Lenis courante (null en prefers-reduced-motion). */
export function getLenis() {
  return lenis;
}

function createLenis() {
  const instance = new Lenis({
    lerp: params.scroll.lerp,
    wheelMultiplier: params.scroll.wheelMultiplier,
    touchMultiplier: params.scroll.touchMultiplier,
    // Le ticker GSAP appelle raf() : une seule boucle pour tout le site
    autoRaf: false,
    // Ancres gérées plus bas (Lenis ne sait pas lire les liens /fr/#contact)
    anchors: false,
  });
  instance.on('scroll', ScrollTrigger.update);
  return instance;
}

/**
 * LA boucle du site.
 * gsap.ticker (seul requestAnimationFrame) → Lenis → ScrollTrigger → store de mouvement → grain.
 * Les étapes suivantes y brancheront le rendu WebGL (R3F advance) et la physique.
 * Retourne la fonction de nettoyage.
 */
export function initSmoothScroll(): () => void {
  motion.reducedMotion = prefersReducedMotion();
  if (!motion.reducedMotion) lenis = createLenis();

  // Leva (dev) : on recrée Lenis avec les nouveaux réglages, à la même position
  const unsubscribe = subscribe('scroll', () => {
    if (motion.reducedMotion) return;
    const y = window.scrollY;
    lenis?.destroy();
    lenis = createLenis();
    lenis.scrollTo(y, { immediate: true });
  });

  // Souris — tant qu'elle n'a pas bougé, on la considère au centre de l'écran (pas d'inclinaison parasite)
  motion.mouse.x = window.innerWidth / 2;
  motion.mouse.y = window.innerHeight / 2;
  const onPointer = (e: PointerEvent) => {
    motion.mouse.x = e.clientX;
    motion.mouse.y = e.clientY;
    motion.mouse.active = true;
  };
  const onPointerLeave = () => {
    motion.mouse.active = false;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // Liens #ancre de la page : défilement doux avec Lenis (les liens /fr/#id d'une autre page naviguent normalement)
  const onAnchor = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || !lenis || e.defaultPrevented) return;
    const id = a.getAttribute('href')!.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.4 });
  };
  document.addEventListener('click', onAnchor);
  document.documentElement.addEventListener('pointerleave', onPointerLeave);

  // Grain : décalé par à-coups à cadence fixe (transform uniquement)
  const grain = document.querySelector<HTMLElement>('[data-grain]');
  let grainClock = 0;

  const tick = (time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    motion.time = time;
    motion.dt = dt;

    lenis?.raf(time * 1000);

    // Scroll et vitesse
    const scroll = lenis ? lenis.scroll : window.scrollY;
    const limit = lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight;
    const velocity = lenis ? lenis.velocity : 0;
    if (scroll !== motion.scroll) motion.direction = scroll > motion.scroll ? 1 : -1;
    motion.scroll = scroll;
    motion.limit = Math.max(limit, 1);
    motion.progress = Math.min(Math.max(scroll / motion.limit, 0), 1);
    motion.velocity = velocity;
    motion.smoothVelocity = damp(motion.smoothVelocity, velocity, params.velocity.lerp, dt);

    // Souris normalisée et lissée
    const tx = (motion.mouse.x / window.innerWidth) * 2 - 1;
    const ty = -((motion.mouse.y / window.innerHeight) * 2 - 1);
    motion.mouse.nx = damp(motion.mouse.nx, tx, 0.12, dt);
    motion.mouse.ny = damp(motion.mouse.ny, ty, 0.12, dt);

    if (grain && !motion.reducedMotion) {
      grainClock += dt;
      if (grainClock >= 1 / params.grain.fps) {
        grainClock = 0;
        const gx = Math.round(Math.random() * 192 - 96);
        const gy = Math.round(Math.random() * 192 - 96);
        grain.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      }
    }
  };

  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('pointermove', onPointer);
    document.removeEventListener('click', onAnchor);
    document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    unsubscribe();
    lenis?.destroy();
    lenis = null;
  };
}
