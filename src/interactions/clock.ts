/** Heure de Tournai (Europe/Brussels), mise à jour chaque seconde dans tous les [data-clock]. */
export function initClock(): () => void {
  const format = new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const update = () => {
    const now = format.format(new Date());
    document.querySelectorAll<HTMLElement>('[data-clock]').forEach((el) => {
      if (el.textContent !== now) el.textContent = now;
    });
  };
  update();
  const id = window.setInterval(update, 1000);
  return () => window.clearInterval(id);
}
