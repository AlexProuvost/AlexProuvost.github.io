import { roundRect, siteFont } from './materials';

/**
 * Les couches de la « page éclatée », dessinées en 2D (canvas) puis posées sur des plaques WebGL.
 * De bas en haut : le brief, la grille, le wireframe, la typographie, l'interface finie.
 * + une face « contact » qui remplace l'interface quand la carte revient à la fin du site.
 *
 * Règle de lisibilité : peu d'éléments, gros textes (≥ 44 px sur 1200 de haut), contrastes francs.
 * Textures en 2× (1920 × 1200). Textes FR / EN selon la langue de la page.
 */

export const TEX_W = 1920;
export const TEX_H = 1200;
/** Rayon des coins, en fraction de la hauteur (identique à la géométrie) */
export const CORNER = 0.035;

const C = {
  ink: '#0f0e0d',
  ink2: '#1a1816',
  fg: '#f0ebe2',
  fg2: '#d8d2c7',
  muted: '#a49e93',
  amber: '#7c86ff', // bleu signature, éclairci pour se lire sur le noir
  cream: '#efe9df',
  choc: '#2a211b',
};

const copy = {
  fr: {
    brief: 'Le vrai besoin',
    rows: ['Objectif', 'Public', 'Contraintes'],
    grid: '12 colonnes',
    wire: ['titre', 'image', 'bouton'],
    lineA: "De l'idée",
    lineB: 'au site.',
    cta: 'Parlons-en',
    contactA: 'Un projet ?',
    contactB: 'Parlons-en.',
    write: 'Écrire →',
  },
  en: {
    brief: 'The real need',
    rows: ['Goal', 'Audience', 'Constraints'],
    grid: '12 columns',
    wire: ['heading', 'image', 'button'],
    lineA: 'From idea',
    lineB: 'to website.',
    cta: "Let's talk",
    contactA: 'A project?',
    contactB: "Let's talk.",
    write: 'Write →',
  },
};

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export type PlateDef = {
  key: 'brief' | 'grid' | 'wire' | 'type' | 'surface';
  /** Plaque pleine (avec épaisseur) ou calque transparent */
  opaque: boolean;
  /** Couleur de la tranche (plaques pleines) */
  side?: string;
  draw: Draw;
};

export function plateDefs(lang: string): { plates: PlateDef[]; contact: Draw } {
  const t = lang.startsWith('en') ? copy.en : copy.fr;
  const sans = siteFont('--font-geist');
  const mono = siteFont('--font-geist-mono');
  const serif = siteFont('--font-serif');
  const r = TEX_H * CORNER;
  const m = 110;
  // Grille commune à la plaque « grille » et au wireframe : 12 colonnes, gouttières de 36, sous l'étiquette.
  // Chaque bloc du wireframe commence et finit sur une colonne (superposés, les deux calques tombent juste).
  const GUTTER = 36;
  const GRID_TOP = 210;
  const colW = (w: number) => (w - m * 2 - GUTTER * 11) / 12;
  const colX = (w: number, i: number) => m + i * (colW(w) + GUTTER);
  const span = (w: number, a: number, b: number) => colX(w, b) + colW(w) - colX(w, a);

  const bar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
  };
  const text = (
    ctx: CanvasRenderingContext2D,
    s: string,
    x: number,
    y: number,
    font: string,
    color: string,
    spacing = 0,
  ) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(s, x, y);
    ctx.letterSpacing = '0px';
  };
  const panel = (ctx: CanvasRenderingContext2D, w: number, h: number, fill: string) => {
    ctx.fillStyle = fill;
    roundRect(ctx, 0, 0, w, h, r);
    ctx.fill();
  };
  /** La page finie : nav, titre, bouton, image chaude, cartes */
  const page = (ctx: CanvasRenderingContext2D, w: number, h: number, headA: string, headB: string, cta: string) => {
    panel(ctx, w, h, C.cream);
    ctx.fillStyle = C.choc;
    ctx.beginPath();
    ctx.arc(m + 28, 112, 28, 0, Math.PI * 2);
    ctx.fill();
    bar(ctx, w - m - 170, 82, 170, 60, C.choc);
    text(ctx, headA, m - 8, 400, `500 190px ${sans}`, C.choc, -8);
    text(ctx, headB, m, 600, `italic 400 210px ${serif}`, C.choc, -3);
    bar(ctx, m, 680, 400, 112, C.choc);
    ctx.textAlign = 'center';
    text(ctx, cta, m + 200, 752, `500 48px ${sans}`, C.cream);
    ctx.textAlign = 'left';
    const ix = 1080;
    const iy = 220;
    const iw = w - m - ix;
    const ih = 580;
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, 22);
    ctx.clip();
    const sky = ctx.createLinearGradient(0, iy, 0, iy + ih);
    sky.addColorStop(0, '#8d96ff');
    sky.addColorStop(0.55, '#2e3bff');
    sky.addColorStop(1, '#0b0f4a');
    ctx.fillStyle = sky;
    ctx.fillRect(ix, iy, iw, ih);
    const sun = ctx.createRadialGradient(ix + iw * 0.66, iy + ih * 0.42, 0, ix + iw * 0.66, iy + ih * 0.42, 170);
    sun.addColorStop(0, 'rgba(236, 238, 255, 0.95)');
    sun.addColorStop(0.5, 'rgba(200, 206, 255, 0.5)');
    sun.addColorStop(1, 'rgba(200, 206, 255, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = '#3a1d15';
    ctx.beginPath();
    ctx.moveTo(ix, iy + ih * 0.78);
    ctx.bezierCurveTo(ix + iw * 0.3, iy + ih * 0.6, ix + iw * 0.55, iy + ih * 0.88, ix + iw, iy + ih * 0.66);
    ctx.lineTo(ix + iw, iy + ih);
    ctx.lineTo(ix, iy + ih);
    ctx.fill();
    ctx.restore();
    const cw = (w - m * 2 - 60) / 3;
    [
      ['#8ea487', '#5f7559'],
      ['#d9c7a7', '#b39a72'],
      ['#2a211b', '#4a3a30'],
    ].forEach(([a, b], i) => {
      const x = m + i * (cw + 30);
      const g = ctx.createLinearGradient(x, 900, x + cw, 1090);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      roundRect(ctx, x, 890, cw, 200, 18);
      ctx.fill();
    });
  };

  const plates: PlateDef[] = [
    /* 01 — Le brief : le vrai besoin, avant tout */
    {
      key: 'brief',
      opaque: true,
      side: '#2e2a26',
      draw(ctx, w, h) {
        panel(ctx, w, h, C.ink2);
        text(ctx, 'BRIEF', m, m + 30, `500 46px ${mono}`, C.muted, 2);
        text(ctx, t.brief, m - 6, 380, `500 170px ${sans}`, C.fg, -7);
        [600, 800, 1000].forEach((y, i) => {
          ctx.fillStyle = '#34302b';
          ctx.fillRect(m, y - 100, w - m * 2, 3);
          text(ctx, t.rows[i], m, y, `500 72px ${sans}`, i === 0 ? C.fg : C.fg2, -2);
          if (i === 0) {
            ctx.font = `500 72px ${sans}`;
            ctx.fillStyle = C.amber;
            ctx.beginPath();
            ctx.arc(m + ctx.measureText(t.rows[i]).width + 44, y - 24, 16, 0, Math.PI * 2);
            ctx.fill();
          }
          bar(ctx, 1000, y - 50, [600, 480, 680][i], 40, '#3d3833');
        });
      },
    },

    /* 02 — La grille */
    {
      key: 'grid',
      opaque: false,
      draw(ctx, w, h) {
        panel(ctx, w, h, 'rgba(240, 235, 226, 0.06)');
        const col = colW(w);
        for (let i = 0; i < 12; i++) {
          const x = colX(w, i);
          ctx.fillStyle = 'rgba(124, 134, 255, 0.16)';
          ctx.fillRect(x, GRID_TOP, col, h - GRID_TOP - m);
          ctx.fillStyle = 'rgba(124, 134, 255, 0.75)';
          ctx.fillRect(x, GRID_TOP, 3, h - GRID_TOP - m);
          ctx.fillRect(x + col - 3, GRID_TOP, 3, h - GRID_TOP - m);
        }
        text(ctx, t.grid, m, 150, `500 64px ${sans}`, C.amber, -1);
      },
    },

    /* 03 — Le wireframe */
    {
      key: 'wire',
      opaque: false,
      draw(ctx, w, h) {
        panel(ctx, w, h, 'rgba(240, 235, 226, 0.05)');
        ctx.strokeStyle = 'rgba(240, 235, 226, 0.9)';
        ctx.lineWidth = 6;
        const box = (x: number, y: number, bw: number, bh: number, rr = 14, cross = false) => {
          roundRect(ctx, x, y, bw, bh, rr);
          ctx.stroke();
          if (!cross) return;
          ctx.save();
          ctx.strokeStyle = 'rgba(240, 235, 226, 0.4)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + bw, y + bh);
          ctx.moveTo(x + bw, y);
          ctx.lineTo(x, y + bh);
          ctx.stroke();
          ctx.restore();
        };
        // Tout est calé sur la grille (colonnes a → b incluses), en rangées régulières sous la barre de navigation
        const at = (a: number, b: number, y: number, bh: number, rr = 18, cross = false) =>
          box(colX(w, a), y, span(w, a, b), bh, rr, cross);
        const bottom = h - m;
        // Rythme : 30 px entre les blocs d'une zone, 60 px entre les zones ; l'image finit au ras du bouton
        at(0, 11, GRID_TOP + 20, 60, 30); // navigation
        at(0, 6, 380, 120); // titre (380 → 500)
        at(0, 4, 530, 84); // sous-titre (530 → 614)
        at(0, 2, 644, 84, 42); // bouton (644 → 728)
        at(7, 11, 380, 348, 22, true); // image (380 → 728)
        at(0, 5, 788, bottom - 20 - 788, 18, true); // carte
        at(6, 11, 788, bottom - 20 - 788, 18, true); // carte
        // Étiquettes dans les espaces libres, jamais sur un trait
        const label = `500 52px ${mono}`;
        text(ctx, t.wire[0], colX(w, 0), 360, label, C.amber);
        text(ctx, t.wire[1], colX(w, 7), 360, label, C.amber);
        text(ctx, t.wire[2], colX(w, 3), 705, label, C.amber);
      },
    },

    /* 04 — La typographie */
    {
      key: 'type',
      opaque: false,
      draw(ctx, w, h) {
        panel(ctx, w, h, 'rgba(240, 235, 226, 0.05)');
        text(ctx, t.lineA, m - 10, 470, `500 300px ${sans}`, C.fg, -12);
        text(ctx, t.lineB, m, 790, `italic 400 330px ${serif}`, C.fg, -4);
        ctx.textAlign = 'right';
        text(ctx, 'Aa', w - m, 1080, `italic 400 260px ${serif}`, 'rgba(240, 235, 226, 0.4)');
        ctx.textAlign = 'left';
        text(ctx, 'Geist · Fraunces', m, 1060, `500 52px ${mono}`, C.amber);
      },
    },

    /* 05 — L'interface finie */
    {
      key: 'surface',
      opaque: true,
      side: '#cbc2b4',
      draw: (ctx, w, h) => page(ctx, w, h, t.lineA, t.lineB, t.cta),
    },
  ];

  /* La carte de contact (fin du site) : même mise en page, autre message */
  const contact: Draw = (ctx, w, h) => {
    panel(ctx, w, h, C.cream);
    const email = document.querySelector('[data-contact-email]')?.textContent?.trim() ?? '';
    text(ctx, 'CONTACT', m, m + 40, `500 46px ${mono}`, '#7a6f62', 2);
    ctx.fillStyle = '#2e3bff';
    ctx.beginPath();
    ctx.arc(w - m - 20, m + 24, 20, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, t.contactA, m - 8, 470, `500 200px ${sans}`, C.choc, -8);
    text(ctx, t.contactB, m, 700, `italic 400 230px ${serif}`, C.choc, -3);
    ctx.fillStyle = 'rgba(42, 33, 27, 0.18)';
    ctx.fillRect(m, 830, w - m * 2, 3);
    text(ctx, email, m, 960, `500 70px ${sans}`, C.choc, -2);
    bar(ctx, w - m - 380, 880, 380, 120, C.choc);
    ctx.textAlign = 'center';
    text(ctx, t.write, w - m - 190, 958, `500 52px ${sans}`, C.cream);
    ctx.textAlign = 'left';
    text(ctx, 'Tournai — BE', m, 1080, `500 44px ${mono}`, '#7a6f62');
  };

  return { plates, contact };
}
