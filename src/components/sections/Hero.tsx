import { useTranslations } from 'next-intl';
import { site, sectionIds } from '@/content/site';
import { rich } from '@/lib/rich';
import { StackFallback } from '../ui/StackFallback';
import styles from './Hero.module.css';

/**
 * 01 — Ouverture.
 * À gauche : qui, où, et la promesse. À droite : la pièce maîtresse 3D, une page web éclatée en couches
 * (gl/ExplodedStack.ts), posée dans l'emplacement [data-stack-anchor="hero"]. En bas : le logotype ALEX, en DOM.
 * Sans WebGL : une version CSS de la pile (StackFallback).
 */
export function Hero() {
  const t = useTranslations('hero');

  return (
    <section id={sectionIds.top} className={styles.hero} data-section="hero" data-section-label={t('label')}>
      <div className={`container ${styles.top}`}>
        <div className={styles.intro} data-hero-out>
          <ul className={`label ${styles.meta}`} data-hero-meta data-hero-hide>
            <li>{t('role')}</li>
            <li>{t('place')}</li>
            <li className={styles.available}>
              <span className="dot" aria-hidden="true" />
              {t('available')}
            </li>
          </ul>

          <p className={`headline ${styles.lead}`} data-hero-lead data-hero-hide>
            {t.rich('lead', rich)}
          </p>
        </div>

        <figure className={styles.figure} data-hero-figure>
          <div className={styles.anchor} data-stack-anchor="hero">
            <StackFallback />
          </div>
          <figcaption className={`label ${styles.caption}`} data-hero-hide data-hero-caption>
            {t('figure')}
          </figcaption>
        </figure>
      </div>

      <div className={`container ${styles.foot}`}>
        <div className={`label ${styles.row}`} data-hero-hide data-hero-row>
          <span>Portfolio — 2026</span>
          <span>{site.coords}</span>
        </div>
        <span className={styles.rule} data-hero-rule data-hero-hide aria-hidden="true" />
        <h1 className={styles.word}>
          <span className={styles.wordInner} data-hero-word data-hero-hide aria-hidden="true">
            {site.name}
          </span>
          <span className="sr-only">{t('name')}</span>
        </h1>
      </div>
    </section>
  );
}
