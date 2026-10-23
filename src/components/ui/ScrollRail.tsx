import { useTranslations } from 'next-intl';
import styles from './ScrollRail.module.css';

/**
 * Le rail de défilement, sur le bord droit (comportement : interactions/scrollRail.ts).
 *  - En haut de page : « Faites défiler » à la verticale, et un point qui descend le long du trait, en boucle.
 *  - Ensuite : l'avancement de la page (en %), le trait qui se remplit, un repère par section (cliquable)
 *    et le nom de la section en cours.
 */
export function ScrollRail() {
  const t = useTranslations('rail');

  return (
    <aside className={styles.rail} data-rail data-hint="" data-goto={t('goto')} aria-label={t('label')}>
      <p className={styles.pct} aria-hidden="true">
        <span data-rail-pct>000</span>
        <span className={styles.pctUnit}>%</span>
      </p>

      <div className={styles.line} data-rail-line>
        <span className={styles.fill} data-rail-fill aria-hidden="true" />
        <span className={styles.runner} aria-hidden="true" />
        <ol className={styles.ticks} data-rail-ticks />
      </div>

      <p className={styles.label} aria-live="polite">
        <span className={styles.labelHint}>{t('hint')}</span>
        <span className={styles.labelNow}>
          <span data-rail-now />
        </span>
      </p>
      <span className={styles.arrow} aria-hidden="true">
        ↓
      </span>
    </aside>
  );
}
