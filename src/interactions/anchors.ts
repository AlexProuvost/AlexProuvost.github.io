/**
 * Liens d'ancre (#contact, #projets…) sur une page qui n'a pas la section visée (ex. une étude de cas) :
 * ils pointent alors vers l'accueil de la langue courante (/fr/#contact).
 */
export function initAnchors(): () => void {
  const lang = document.documentElement.lang || 'fr';
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1);
    if (id && !document.getElementById(id)) a.setAttribute('href', `/${lang}/#${id}`);
  });
  return () => {};
}
