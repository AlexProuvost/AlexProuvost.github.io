import localFont from 'next/font/local';

/**
 * Polices auto-hébergées (aucune requête externe, aucun décalage de layout).
 * - Archivo : display variable (largeur 62–125 %, graisse 100–900)
 * - Geist : texte
 * - Geist Mono : labels, numéros de pistes, code
 * - Instrument Serif italique : identité du projet Nuance végétale
 */
export const archivo = localFont({
  src: '../fonts/archivo-wdth.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
});

export const geist = localFont({
  src: '../fonts/geist.woff2',
  variable: '--font-geist',
  weight: '100 900',
  display: 'swap',
});

export const geistMono = localFont({
  src: '../fonts/geist-mono.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

export const instrumentSerif = localFont({
  src: '../fonts/instrument-serif-italic.woff2',
  variable: '--font-serif',
  weight: '400',
  style: 'italic',
  display: 'swap',
  preload: false,
});

export const fontVariables = [archivo, geist, geistMono, instrumentSerif].map((f) => f.variable).join(' ');
