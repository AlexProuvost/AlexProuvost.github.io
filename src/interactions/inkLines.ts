/**
 * Mots clés des grands titres (<em> dans .headline) : un trait d'encre se trace dessous quand le titre
 * arrive bien dans l'écran, une seule fois. Le trait est un dégradé en arrière-plan (globals.css) : il suit
 * les retours à la ligne et ne bouge pas la mise en page. On marque le titre, pas le mot : le découpage
 * en lignes (motion/textReveals.ts) peut recréer les <em>. En animations réduites, il est déjà tracé.
 */
export function initInkLines(): () => void {
  const titles = [...document.querySelectorAll<HTMLElement>('.headline')].filter((h) => h.querySelector('em'));
  if (!titles.length) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    titles.forEach((h) => h.setAttribute('data-ink', ''));
    return () => {};
  }

  const timers: number[] = [];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const h = entry.target as HTMLElement;
        // Laisse le titre finir de monter avant de souligner
        timers.push(window.setTimeout(() => h.setAttribute('data-ink', ''), 500));
        io.unobserve(h);
      });
    },
    { rootMargin: '0px 0px -30% 0px' },
  );
  titles.forEach((h) => io.observe(h));

  return () => {
    io.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
  };
}
