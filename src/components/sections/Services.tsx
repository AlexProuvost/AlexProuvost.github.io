import { useTranslations } from 'next-intl';
import { sectionIds } from '@/content/site';
import { rich } from '@/lib/rich';
import { keepHyphenated } from '@/lib/typography';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Services.module.css';

type Service = { id: string; title: string; for: string; text: string; includes: string[]; delay: string };

/**
 * 04 — Services, sur fond bleu : trois offres côte à côte (pour qui, ce qui est inclus, délai, « Sur devis »),
 * chacune avec son bouton « Demander un devis » (qui présélectionne le type de projet dans le formulaire),
 * et la note sur la maintenance.
 */
export function Services() {
  const t = useTranslations('services');
  const items = t.raw('items') as Service[];

  return (
    <section
      id={sectionIds.services}
      className={styles.section}
      data-section="services"
      data-section-label={t('label')}
      data-theme="accent"
    >
      <div className="container">
        <SectionLabel index="04">{t('label')}</SectionLabel>

        <header className={styles.header}>
          <h2 className={`headline ${styles.title}`} data-split="title" data-skew data-drift="-4">
            {t.rich('title', rich)}
          </h2>
          <div className={styles.headSide}>
            <p className={styles.lead} data-split="lines">
              {t('lead')}
            </p>
            <p className={`label ${styles.promise}`} data-reveal="up">
              <span className="dot" aria-hidden="true" />
              {t('promise')}
            </p>
          </div>
        </header>

        {/* Trois offres côte à côte, faciles à comparer */}
        <ol className={styles.cards}>
          {items.map((item, i) => (
            <li key={item.id} className={styles.cell} data-reveal="up">
              {/* La carte s'incline dans sa cellule : la révélation (GSAP) anime la cellule, pas la carte */}
              <div className={styles.card} data-tilt>
                <div className={styles.cardHead}>
                  <span className={styles.n}>0{i + 1}</span>
                  <h3 className={`headline ${styles.cardTitle}`}>{keepHyphenated(item.title)}</h3>
                  <p className={styles.for}>
                    {t('for')} : {item.for}
                  </p>
                </div>
                <p className={styles.cardText}>{item.text}</p>
                <ul className={styles.includes} aria-label={t('includes')}>
                  {item.includes.map((inc) => (
                    <li key={inc}>{inc}</li>
                  ))}
                </ul>
                <div className={styles.cardFoot}>
                  <p className={styles.meta}>
                    <span className="label">{t('delay')}</span>
                    <span>
                      {item.delay} · {t('price')}
                    </span>
                  </p>
                  <a href={`#${sectionIds.contact}`} className={styles.quote} data-quote={i} data-roll>
                    {t('quote')} <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className={`label ${styles.maintenance}`} data-reveal="up">
          {t('maintenance')}
        </p>
      </div>
    </section>
  );
}
