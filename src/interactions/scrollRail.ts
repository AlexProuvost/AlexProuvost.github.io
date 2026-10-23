import { gsap, ScrollTrigger } from '@/motion/gsap';
import { getLenis } from '@/motion/loop';
import { trackState } from './trackState';

/**
 * Le rail de défilement (components/ui/ScrollRail.tsx).
 * Chaque section [data-section-label] est un chapitre : un repère sur le trait, placé à sa hauteur réelle
 * dans la page (recalculé après les épinglages). En haut de page, le rail invite à défiler ; ensuite il affiche
 * l'avancement (en %) et la section en cours, qui change en glissant.
 */
export function initScrollRail(): () => void {
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  const fill = rail?.querySelector<HTMLElement>('[data-rail-fill]');
  const pct = rail?.querySelector<HTMLElement>('[data-rail-pct]');
  const now = rail?.querySelector<HTMLElement>('[data-rail-now]');
  const ticksBox = rail?.querySelector<HTMLElement>('[data-rail-ticks]');
  if (!rail || !fill || !now || !ticksBox) return () => {};

  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section][data-section-label]'));
  trackState.tracks = sections.map((s, i) => ({
    number: String(i + 1).padStart(2, '0'),
    label: s.dataset.sectionLabel ?? '',
  }));

  // Les repères
  const goto = rail.dataset.goto ?? '';
  ticksBox.innerHTML = '';
  const ticks = sections.map((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `${goto} : ${trackState.tracks[i].number} — ${trackState.tracks[i].label}`);
    b.addEventListener('click', () => {
      const lenis = getLenis();
      const y = s.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    });
    li.appendChild(b);
    ticksBox.appendChild(li);
    return { li, b };
  });
  const place = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    sections.forEach((s, i) => {
      const top = s.getBoundingClientRect().top + window.scrollY;
      ticks[i].li.style.top = `${Math.min(Math.max(top / max, 0), 1) * 100}%`;
    });
  };
  ScrollTrigger.addEventListener('refresh', place);
  place();

  // Section en cours : le nom glisse vers le haut et le suivant arrive par le bas
  let current = -1;
  const swap = (text: string) =>
    gsap
      .timeline()
      .to(now, { y: -14, autoAlpha: 0, duration: 0.18, ease: 'power2.in' })
      .add(() => {
        now.textContent = text;
      })
      .fromTo(now, { y: 14 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'expo.out' });
  const show = (i: number) => {
    if (i === current) return;
    current = i;
    trackState.index = i;
    ticks.forEach((t, k) => t.b.setAttribute('aria-current', String(k === i)));
    const track = trackState.tracks[i];
    if (track) swap(`${track.number} — ${track.label}`);
  };
  const triggers = sections.map((section, i) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      refreshPriority: -1, // après les épinglages
      onToggle: (self) => self.isActive && show(i),
      onUpdate: (self) => {
        if (self.isActive) trackState.progress = self.progress;
      },
    }),
  );
  show(0);

  // Avancement global + invitation à défiler en haut de page
  const setFill = gsap.quickSetter(fill, 'scaleY') as (v: number) => void;
  let last = -1;
  let hint = window.scrollY < 40;
  rail.toggleAttribute('data-hint', hint);
  // (pendant un recalcul, ScrollTrigger remet la page en haut un instant : on l'ignore)
  let refreshing = false;
  const onRefreshInit = () => {
    refreshing = true;
  };
  const onRefresh = () => {
    refreshing = false;
    updateHint();
  };
  const updateHint = () => {
    if (refreshing) return;
    const atTop = window.scrollY < 40;
    if (atTop !== hint) {
      hint = atTop;
      rail.toggleAttribute('data-hint', atTop);
    }
  };
  ScrollTrigger.addEventListener('refreshInit', onRefreshInit);
  ScrollTrigger.addEventListener('refresh', onRefresh);
  const page = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      setFill(self.progress);
      updateHint();
      const v = Math.round(self.progress * 100);
      if (!pct || v === last) return;
      last = v;
      pct.textContent = String(v).padStart(3, '0');
    },
  });
  setFill(0);

  return () => {
    ScrollTrigger.removeEventListener('refresh', place);
    ScrollTrigger.removeEventListener('refreshInit', onRefreshInit);
    ScrollTrigger.removeEventListener('refresh', onRefresh);
    triggers.forEach((t) => t.kill());
    page.kill();
  };
}
