import { useTranslations } from 'next-intl';
import { site, sectionIds } from '@/content/site';
import { SectionLabel } from '../ui/SectionLabel';
import { ContactForm } from './contact/ContactForm';
import styles from './Contact.module.css';

/**
 * 06 — Contact, sur le fond sombre (le bleu reste réservé au pied de page, où l'encre monte juste après).
 *  - En haut : le titre géant, « Disponible » avec l'heure de Tournai, l'email avec un bouton « Copier ».
 *  - Dessous : le formulaire, en grand et épuré (interactions/contactForm.ts).
 */
export function Contact() {
  const t = useTranslations('contact');
  const tc = useTranslations('cursor');

  return (
    <section id={sectionIds.contact} className={styles.section} data-section="contact" data-section-label={t('label')}>
      <div className="container">
        <SectionLabel index="06">{t('label')}</SectionLabel>

        <header className={styles.head}>
          <h2 className={`headline ${styles.title}`}>
            <span data-split="title" data-drift="5">
              {t('titleA')}
            </span>
            <span className={styles.titleB} data-split="title" data-drift="-5">
              <em>{t('titleB')}</em>
            </span>
          </h2>

          <div className={styles.aside}>
            <div className={styles.status} data-reveal="up">
              <p className={styles.available}>
                <span className={styles.pulse} aria-hidden="true" />
                {t('available')}
              </p>
              <p className={`label ${styles.local}`}>
                {t('local')}{' '}
                <span className={styles.clock} data-clock>
                  --:--:--
                </span>
              </p>
            </div>

            <p className={styles.lead} data-reveal="up">
              {t('lead')}
            </p>

            <div className={styles.direct} data-reveal="up">
              <p className={`label ${styles.directLabel}`}>{t('direct')}</p>
              <p className={styles.emailRow}>
                <a
                  href={`mailto:${site.email}`}
                  className={styles.email}
                  aria-label={`${t('emailLabel')} : ${site.email}`}
                  data-cursor-label={tc('write')}
                >
                  <span className="link-underline">{site.email}</span>
                </a>
                <button
                  type="button"
                  className={styles.copy}
                  data-copy-email={site.email}
                  data-copied={t('copied')}
                  aria-live="polite"
                >
                  <svg className={styles.copyIcon} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <rect x="5" y="5" width="9" height="9" rx="2" />
                    <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
                  </svg>
                  <span data-copy-label>{t('copy')}</span>
                </button>
              </p>
              {site.links.length > 0 && (
                <ul className={styles.links}>
                  {site.links.map((l) => (
                    <li key={l.id}>
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        <span className="link-underline">{l.label}</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </header>

        <ContactForm />
      </div>
    </section>
  );
}
