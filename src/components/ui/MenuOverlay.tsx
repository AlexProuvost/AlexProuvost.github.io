import { useLocale, useTranslations } from 'next-intl';
import { routing } from '@/i18n/routing';
import { site, sectionIds } from '@/content/site';
import { LangLink } from './LangLink';
import styles from './MenuOverlay.module.css';

const langNames = { fr: 'français', en: 'English' } as const;

/**
 * Menu plein écran : les sections, puis l'email, les liens, la langue et l'heure de Tournai.
 * Fermé : hors écran, `inert` (ni focus ni lecture). Ouvert par interactions/menu.ts.
 */
export function MenuOverlay() {
  const t = useTranslations('nav');
  const tb = useTranslations('bar');
  const tc = useTranslations('cursor');
  const locale = useLocale();

  const items = [
    { id: sectionIds.top, label: t('home') },
    { id: sectionIds.work, label: t('work') },
    { id: sectionIds.services, label: t('services') },
    { id: sectionIds.about, label: t('about') },
    { id: sectionIds.contact, label: t('contact') },
  ];

  return (
    <div id="menu" className={styles.overlay} data-menu aria-hidden="true" inert>
      <div className={`container ${styles.inner}`}>
        <nav aria-label={t('label')}>
          <ol className={styles.links}>
            {items.map((item, i) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={styles.link} data-menu-link>
                  <span className={`label ${styles.n}`}>0{i + 1}</span>
                  <span className={styles.mask}>
                    <span className={styles.word} data-menu-word data-roll>
                      {item.label}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.foot} data-menu-foot>
          <div>
            <p className="label">{t('write')}</p>
            <a href={`mailto:${site.email}`} className="link-underline" data-cursor-label={tc('write')}>
              {site.email}
            </a>
          </div>
          {site.links.length > 0 && (
            <div>
              <p className="label">{t('follow')}</p>
              <ul className={styles.socials}>
                {site.links.map((l) => (
                  <li key={l.id}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="link-underline">
                      {l.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="label">{t('lang')}</p>
            <ul className={styles.langs}>
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
          </div>
          <div>
            <p className="label">{tb('city')}</p>
            <p className={styles.clock} data-clock>
              --:--:--
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
