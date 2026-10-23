/**
 * Arrivée sur une page :
 *  - « transition » : on vient d'une autre page du site (rideau, voir interactions/transitions.ts) ;
 *  - sinon, première arrivée sur la page.
 * Lu une seule fois par chargement ; stockage de session protégé (navigation privée, stockage bloqué…).
 */
const KEY = 'alex-transition';
/** '1' : rideau ; '2' : couverture ouverte en plein écran depuis l'index des projets */
let cached: string | null = null;

function read() {
  if (cached !== null) return cached;
  try {
    cached = sessionStorage.getItem(KEY) ?? '';
    sessionStorage.removeItem(KEY);
  } catch {
    cached = '';
  }
  return cached;
}

/** Comment est-on arrivé ? */
export function arrivalKind(): 'curtain' | 'cover' | null {
  const v = read();
  return v === '1' ? 'curtain' : v === '2' ? 'cover' : null;
}

function mark(value: string) {
  try {
    sessionStorage.setItem(KEY, value);
  } catch {
    /* sans stockage : la page suivante jouera simplement son ouverture */
  }
}

export function markTransition() {
  mark('1');
}

/** Départ depuis l'index des projets : la couverture ouverte en plein écran devient le haut de l'étude de cas */
export function markCover() {
  mark('2');
}

/** Remet à zéro (aperçu autonome : plusieurs « pages » dans le même document) */
export function resetArrival() {
  cached = null;
}
