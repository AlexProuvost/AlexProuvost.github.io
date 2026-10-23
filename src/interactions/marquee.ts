import { gsap } from '@/motion/gsap';
import { motion } from '@/motion/store';

/**
 * Bandes défilantes ([data-marquee-track], contenu doublé) : défilement continu, accéléré par la vitesse du scroll,
 * sens inversé quand on remonte, et légère inclinaison dans le mouvement. Immobiles en animations réduites.
 */
export function initMarquee(): () => void {
  if (motion.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const tracks = Array.from(document.querySelectorAll<HTMLElement>('[data-marquee-track]')).map((el) => ({
    el,
    dir: Number(el.dataset.dir ?? 1),
    x: 0,
    width: 0,
    setX: gsap.quickSetter(el, 'x', 'px') as (v: number) => void,
    setSkew: gsap.quickSetter(el, 'skewX', 'deg') as (v: number) => void,
    visible: true,
  }));
  if (!tracks.length) return () => {};

  const measure = () => tracks.forEach((t) => (t.width = t.el.scrollWidth / 2));
  measure();
  window.addEventListener('resize', measure);
  document.fonts?.ready.then(measure);

  // On ne calcule que ce qui est à l'écran
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const t = tracks.find((k) => k.el === e.target);
      if (t) t.visible = e.isIntersecting;
    });
  });
  tracks.forEach((t) => io.observe(t.el));

  let heading = 1;
  const tick = () => {
    const v = motion.smoothVelocity;
    if (Math.abs(v) > 0.4) heading = v > 0 ? 1 : -1;
    const speed = 60 + Math.min(Math.abs(v) * 28, 1400); // px / s
    tracks.forEach((t) => {
      if (!t.visible || !t.width) return;
      t.x -= speed * motion.dt * t.dir * heading;
      if (t.x <= -t.width) t.x += t.width;
      if (t.x > 0) t.x -= t.width;
      t.setX(t.x);
      t.setSkew(Math.max(-12, Math.min(12, -v * 0.35 * t.dir)));
    });
  };
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    io.disconnect();
    window.removeEventListener('resize', measure);
  };
}
