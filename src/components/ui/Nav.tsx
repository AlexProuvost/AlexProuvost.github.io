import { useLocale, useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { sectionIds } from '@/content/site';
import { MenuOverlay } from './MenuOverlay';
import { LangLink } from './LangLink';
import styles from './Nav.module.css';

const langNames = { fr: 'français', en: 'English' } as const;

/**
 * Barre du haut : logo, rôle, langue, pastille « Parlons-en » et bouton Menu (menu plein écran).
 * mix-blend-mode: difference → lisible sur le noir, sur les fonds clairs des projets et sur le menu ouvert.
 * Le comportement (ouverture, fermeture, clavier) est dans interactions/menu.ts.
 */
export function Nav() {
  const t = useTranslations('nav');
  const tc = useTranslations('cursor');
  const locale = useLocale();

  return (
    <>
      <header className={styles.nav} data-nav>
        <div className={`container ${styles.inner}`}>
          <a href={`#${sectionIds.top}`} className={styles.logo} aria-label="Alex — haut de page">
            ALEX
          </a>

          <p className={`label ${styles.role}`}>{t('role')}</p>

          <div className={styles.right}>
            <ul className={`label ${styles.lang}`} aria-label={t('lang')}>
              {routing.locales.map((l) => (
                <li key={l}>
                  {l === locale ? (
                    <span aria-current="true" className={styles.langActive}>
                      {l}
                    </span>
                  ) : (
                    <LangLink lang={l} className={styles.langLink} title={t('switchTo', { lang: langNames[l] })} />
                  )}
                </li>
              ))}
            </ul>

            <a href={`#${sectionIds.contact}`} className={styles.talk} data-cursor-label={tc('write')} data-roll>
              <span className={styles.talkDot} aria-hidden="true" />
              {t('talk')}
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
        </div>
      </header>
      <MenuOverlay />
    </>
  );
}
