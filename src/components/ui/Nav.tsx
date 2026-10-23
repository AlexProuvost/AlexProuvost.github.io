import { useTranslations } from 'next-intl';
import { sectionIds } from '@/content/site';
import { MenuOverlay } from './MenuOverlay';
import styles from './Nav.module.css';

/**
 * Barre du haut, réduite au minimum : le logo et le bouton Menu (menu plein écran, avec la langue et le contact).
 * Sur l'écran d'arrivée, le logo s'efface (le grand ALEX est déjà là) ; il revient dès qu'on descend
 * (data-top, posé par motion/scrollFx.ts).
 * mix-blend-mode: difference → lisible sur le noir, sur les fonds clairs des projets et sur le menu ouvert.
 * Le comportement (ouverture, fermeture, clavier) est dans interactions/menu.ts.
 */
export function Nav() {
  const t = useTranslations('nav');

  return (
    <>
      <header className={styles.nav} data-nav>
        <div className={`container ${styles.inner}`}>
          <a href={`#${sectionIds.top}`} className={styles.logo} aria-label="Alex — haut de page">
            ALEX
          </a>

          <button
            type="button"
            className={styles.menuBtn}
            data-menu-toggle
            aria-expanded="false"
            aria-controls="menu"
            aria-label={t('openMenu')}
            data-aria-open={t('openMenu')}
            data-aria-close={t('closeMenu')}
            data-label-open={t('menu')}
            data-label-close={t('close')}
          >
            <span className={styles.burger} aria-hidden="true">
              <span />
              <span />
            </span>
            <span className={styles.menuLabel} data-menu-label>
              {t('menu')}
            </span>
          </button>
        </div>
      </header>
      <MenuOverlay />
    </>
  );
}
