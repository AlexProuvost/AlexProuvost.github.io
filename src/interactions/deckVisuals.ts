/**
 * Visuels des cartes du déroulé (Approach) : chaque <canvas data-plate="brief | grid wire | type | surface">
 * reçoit la ou les couches de la page éclatée, avec les mêmes dessins que la 3D (gl/plates.ts), en 2D.
 * Les dessins sont chargés à la demande (ils tirent three.js, déjà chargé à part pour la 3D), une fois
 * les polices prêtes, à la taille affichée (densité d'écran plafonnée à 2), puis redessinés si la taille change.
 * Pas de WebGL nécessaire : visibles partout, même sans animation.
 */
export function initDeckVisuals(): () => void {
  const canvases = [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-plate]')];
  if (!canvases.length) return () => {};

  let disposed = false;
  let ro: ResizeObserver | null = null;

  Promise.all([import('@/gl/plates'), document.fonts.ready]).then(([{ plateDefs, TEX_W, TEX_H }]) => {
    if (disposed) return;
    const { plates } = plateDefs(document.documentElement.lang);
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvases.forEach((canvas) => {
        const w = Math.round(canvas.clientWidth * dpr);
        const h = Math.round(canvas.clientHeight * dpr);
        if (!w || !h || (canvas.width === w && canvas.height === h && canvas.dataset.drawn)) return;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(w / TEX_W, 0, 0, h / TEX_H, 0, 0);
        (canvas.dataset.plate ?? '')
          .split(' ')
          .forEach((key) => plates.find((p) => p.key === key)?.draw(ctx, TEX_W, TEX_H));
        canvas.dataset.drawn = '1';
      });
    };
    draw();
    ro = new ResizeObserver(draw);
    canvases.forEach((c) => ro?.observe(c));
  });

  return () => {
    disposed = true;
    ro?.disconnect();
  };
}
