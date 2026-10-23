/**
 * Titres écrits à l'encre : un filtre SVG par titre.
 * Le texte est flouté, déformé par un bruit, puis « seuillé » : seules les zones les plus denses restent,
 * avec des bords irréguliers d'encre qui bave. En faisant varier le réglage de 0 à 1, l'encre se répand
 * en taches qui s'étalent et dessinent les lettres, jusqu'au texte net (à 1, le filtre est retiré).
 */
let defs: SVGDefsElement | null = null;
let count = 0;
const NS = 'http://www.w3.org/2000/svg';

function ensureDefs() {
  if (defs && document.body.contains(defs)) return defs;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  Object.assign(svg.style, { position: 'absolute', width: '0', height: '0', overflow: 'hidden' });
  defs = document.createElementNS(NS, 'defs');
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return defs;
}

export function inkFilter(el: HTMLElement) {
  const id = `ink-title-${++count}`;
  const filter = document.createElementNS(NS, 'filter');
  filter.setAttribute('id', id);
  filter.setAttribute('x', '-10%');
  filter.setAttribute('y', '-20%');
  filter.setAttribute('width', '120%');
  filter.setAttribute('height', '140%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.innerHTML = `
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.035" numOctaves="1" seed="${count * 7}" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="disp" />
    <feGaussianBlur in="disp" stdDeviation="0" result="blur" />
    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />`;
  ensureDefs().appendChild(filter);
  const disp = filter.querySelector('feDisplacementMap')!;
  const blur = filter.querySelector('feGaussianBlur')!;
  const matrix = filter.querySelector('feColorMatrix')!;
  // Taille du flou proportionnelle au corps du texte
  const size = parseFloat(getComputedStyle(el).fontSize) || 80;
  let last = -1;

  const set = (p: number) => {
    const v = Math.min(Math.max(p, 0), 1);
    if (Math.abs(v - last) < 0.002) return;
    last = v;
    if (v >= 0.999) {
      el.style.filter = '';
      el.style.opacity = '';
      return;
    }
    const k = 1 - v;
    const a = 1 + 23 * Math.pow(k, 1.2);
    const thr = 0.92 * k;
    el.style.filter = `url(#${id})`;
    el.style.opacity = v <= 0.001 ? '0' : '';
    blur.setAttribute('stdDeviation', (size * 0.085 * Math.pow(k, 1.4)).toFixed(2));
    disp.setAttribute('scale', (size * 0.45 * k).toFixed(2));
    matrix.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${a.toFixed(3)} ${(-a * thr).toFixed(3)}`);
  };

  return {
    set,
    dispose() {
      el.style.filter = '';
      el.style.opacity = '';
      filter.remove();
    },
  };
}
