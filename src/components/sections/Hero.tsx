import { useTranslations } from 'next-intl';
import { site, sectionIds } from '@/content/site';
import styles from './Hero.module.css';

/**
 * 01 — Ouverture, volontairement dépouillée : le logotype ALEX en géant et une seule ligne pour dire ce que je fais.
 * Rien d'autre à l'écran (la barre du haut se réduit au menu). Le reste se découvre au scroll.
 * L'emplacement [data-stack-anchor="hero"] reste, vide et invisible : c'est le point de départ de la page éclatée
 * (gl/ExplodedStack.ts), qui n'apparaît qu'en arrivant à la méthode.
 */
export function Hero() {
  const t = useTranslations('hero');

  return (
    <section id={sectionIds.top} className={styles.hero} data-section="hero" data-section-label={t('label')}>
      <div className={`container ${styles.top}`}>
        <p className={styles.line} data-hero-lead data-hero-hide data-hero-out>
          {t('line')}
        </p>
        <div className={styles.anchor} data-stack-anchor="hero" aria-hidden="true" />
      </div>

      <div className={`container ${styles.foot}`}>
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
