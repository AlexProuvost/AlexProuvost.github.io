/**
 * Petits effets de texte, inspirés des portfolios de référence :
 *
 *   data-roll        au survol, chaque lettre roule vers le haut et sa copie arrive par le bas, en cascade
 *                    (boutons, liens de navigation — façon Dennis Snellenberg)
 *   data-scramble    au survol, le texte se « décode » : des signes aléatoires se fixent un à un de gauche à droite
 *                    (petits liens et labels en mono — façon Lusion / Active Theory)
 *   data-scramble="reveal"  même décodage, une fois, quand l'élément arrive à l'écran
 *
 * Accessibilité : le texte d'origine reste lisible par les lecteurs d'écran (aria-label / texte masqué).
 * En animations réduites : rien ne bouge.
 */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';

function rollify(el: HTMLElement) {
  if (el.dataset.rollReady) return;
  el.dataset.rollReady = '1';
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.textContent?.trim() && !(n.parentElement?.closest('[aria-hidden="true"]') && n.parentElement !== el)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let i = 0;
  nodes.forEach((node) => {
    const text = node.textContent ?? '';
    const wrap = document.createElement('span');
    wrap.className = 'roll';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.className = 'roll-vis';
    vis.setAttribute('aria-hidden', 'true');
    for (const ch of text) {
      const c = document.createElement('span');
      c.className = 'roll-c';
      const glyph = ch === ' ' ? ' ' : ch;
      c.textContent = glyph;
      c.dataset.c = glyph;
      c.style.setProperty('--i', String(i++));
      vis.appendChild(c);
    }
    wrap.append(sr, vis);
    node.replaceWith(wrap);
  });
}

function scrambler(el: HTMLElement) {
  const original = el.textContent ?? '';
  let raf = 0;
  return () => {
    cancelAnimationFrame(raf);
    const start = performance.now();
    const duration = Math.min(900, 280 + original.length * 26);
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const fixed = Math.floor(t * original.length);
      let out = '';
      for (let k = 0; k < original.length; k++) {
        const ch = original[k];
        out += k < fixed || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) raf = requestAnimationFrame(step);
      else el.textContent = original;
    };
    raf = requestAnimationFrame(step);
  };
}

export function initTextFx(): () => void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  document.querySelectorAll<HTMLElement>('[data-roll]').forEach(rollify);

  const cleanups: Array<() => void> = [];
  const canHover = window.matchMedia('(hover: hover)').matches;
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    // Le texte d'origine reste disponible pour les lecteurs d'écran
    if (!el.getAttribute('aria-label') && el.dataset.scramble !== 'reveal')
      el.setAttribute('aria-label', el.textContent ?? '');
    const run = scrambler(el);
    if (el.dataset.scramble === 'reveal') {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            run();
            io.disconnect();
          });
        },
        { rootMargin: '0px 0px -12% 0px' },
      );
      io.observe(el);
      cleanups.push(() => io.disconnect());
    } else if (canHover) {
      const target = el.closest('a, button') ?? el;
      target.addEventListener('pointerenter', run);
      cleanups.push(() => target.removeEventListener('pointerenter', run));
    }
  });
  return () => cleanups.forEach((fn) => fn());
}
