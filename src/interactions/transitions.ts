import { gsap } from '@/motion/gsap';
import { arrivalKind, markTransition } from '@/motion/arrival';

/**
 * Transitions entre les pages (accueil ↔ études de cas, changement de langue) : une goutte d'encre bleue.
 *  - Au clic, une tache d'encre naît sous le curseur, projette quelques gouttes et s'étale jusqu'à couvrir l'écran
 *    (bords irréguliers : filtre SVG de bruit et de déplacement qui bouge pendant l'animation).
 *  - La page suivante arrive couverte d'encre (classe posée dans le <head>, sans flash), puis l'encre se rétracte
 *    en une goutte qui disparaît au centre.
 *  - Aperçu autonome : window.__navigate(href) remplace le chargement de page.
 * Désactivé en animations réduites (navigation normale).
 */
export function initTransitions(): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.className = 'page-curtain';
  layer.innerHTML = `
    <svg preserveAspectRatio="none">
      <defs>
        <filter id="pt-ink" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="90" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#pt-ink)" fill="#2e3bff">
        <circle class="pt-main" r="0" />
        ${'<circle class="pt-drop" r="0" />'.repeat(7)}
      </g>
    </svg>
    <span class="page-curtain-mark">ALEX</span>`;
  document.body.appendChild(layer);
  const svg = layer.querySelector('svg')!;
  const turb = layer.querySelector('feTurbulence')!;
  const main = layer.querySelector<SVGCircleElement>('.pt-main')!;
  const drops = Array.from(layer.querySelectorAll<SVGCircleElement>('.pt-drop'));
  const mark = layer.querySelector<HTMLElement>('.page-curtain-mark')!;

  const fit = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return { w, h, full: Math.hypot(w, h) * 0.62 };
  };
  // L'encre « vit » pendant l'animation : le bruit qui déforme son bord change doucement
  const wobble = { f: 0.012 };
  const liven = () => turb.setAttribute('baseFrequency', `${wobble.f.toFixed(4)} ${(wobble.f * 1.3).toFixed(4)}`);

  const hide = () => {
    layer.style.visibility = 'hidden';
    html.classList.remove('pt-in');
  };

  // Arrivée par transition : l'écran est couvert d'encre, qui se rétracte en une goutte au centre
  if (arrivalKind() === 'curtain' && !reduce) {
    const { w, h, full } = fit();
    layer.style.visibility = 'visible';
    gsap.set(main, { attr: { cx: w / 2, cy: h / 2, r: full * 1.25 } });
    drops.forEach((d) => gsap.set(d, { attr: { r: 0 } }));
    html.classList.remove('pt-in');
    gsap
      .timeline({ delay: 0.12, onComplete: hide })
      .set(mark, { autoAlpha: 1 })
      .to(mark, { autoAlpha: 0, scale: 0.9, duration: 0.35, ease: 'power2.in' }, 0)
      .to(main, { attr: { r: 0, cy: h * 0.62 }, duration: 1.05, ease: 'expo.inOut' }, 0.05)
      .fromTo(wobble, { f: 0.006 }, { f: 0.02, duration: 1.05, ease: 'none', onUpdate: liven }, 0.05);
  } else {
    hide();
  }

  let leaving = false;
  const navigate = (href: string) => {
    const w = window as unknown as { __navigate?: (href: string) => boolean };
    if (w.__navigate?.(href)) return;
    window.location.href = href;
  };

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="/"]');
    if (!a || a.target === '_blank' || leaving) return;
    const href = a.getAttribute('href')!;
    const url = new URL(href, window.location.href);
    const here = window.location.pathname.replace(/\/$/, '');
    const there = url.pathname.replace(/\/$/, '');
    // Même page (ancre) : laissé au défilement doux
    if (there === here && url.hash) return;
    e.preventDefault();
    if (reduce) return navigate(href);
    leaving = true;
    markTransition();
    const { w, h, full } = fit();
    const x = e.clientX || w / 2;
    const y = e.clientY || h / 2;
    layer.style.visibility = 'visible';
    gsap.set(main, { attr: { cx: x, cy: y, r: 0 } });
    const tl = gsap.timeline({
      onComplete: () => {
        leaving = false;
        navigate(href);
      },
    });
    // Les gouttes projetées autour du point d'impact
    drops.forEach((d, i) => {
      const ang = (i / drops.length) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 80 + Math.random() * 160;
      const r = 10 + Math.random() * 26;
      gsap.set(d, { attr: { cx: x, cy: y, r: 0 } });
      tl.to(
        d,
        { attr: { cx: x + Math.cos(ang) * dist, cy: y + Math.sin(ang) * dist, r }, duration: 0.45, ease: 'power3.out' },
        0.02 * i,
      );
    });
    // La tache s'étale jusqu'à couvrir l'écran (en englobant les gouttes)
    const cover = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * 1.25;
    tl.to(main, { attr: { r: Math.max(cover, full) }, duration: 0.95, ease: 'power3.in' }, 0.05)
      .fromTo(wobble, { f: 0.02 }, { f: 0.007, duration: 0.95, ease: 'none', onUpdate: liven }, 0.05)
      .fromTo(mark, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' }, 0.75)
      .to({}, { duration: 0.15 });
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    layer.remove();
  };
}
