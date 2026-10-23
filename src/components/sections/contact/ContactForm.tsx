import { useTranslations } from 'next-intl';
import { site } from '@/content/site';
import styles from './ContactForm.module.css';

const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

/**
 * Formulaire de contact, volontairement simple : trois questions numérotées en grand, posées sur des filets
 * (nom, email, projet), et un grand bouton rond « Envoyer ».
 * Le type de projet n'est pas demandé : il est rempli (champ caché) par les boutons « Demander un devis » des offres.
 * Pensé pour un hébergement statique (GitHub Pages) : envoyé à FormSubmit (aucun serveur, aucun compte),
 * qui transfère le message par email.
 *  - Sans JS : envoi classique avec la validation du navigateur.
 *  - Avec JS (interactions/contactForm.ts) : les questions montent et leurs filets se tracent à l'arrivée,
 *    validation en direct, brouillon gardé, envoi en arrière-plan ; à l'envoi, une onde part du bouton,
 *    le formulaire s'efface et « Merci {prénom}. » s'écrit en grand avec le récapitulatif.
 * Le premier envoi déclenche un email d'activation de FormSubmit à valider une fois.
 */
export function ContactForm() {
  const t = useTranslations('contact.form');
  const types = t.raw('types') as string[];
  const errors = t.raw('errors') as Record<string, string>;
  const endpoint = `https://formsubmit.co/${site.email}`;

  // Textes utilisés par le script (gabarits avec {name}, {email}…)
  const copy = {
    errors,
    counter: t.raw('counter') as string,
    draftSaved: t('draftSaved'),
    draftRestored: t('draftRestored'),
    subject: t.raw('subject') as string,
    successTitle: t.raw('successTitle') as string,
    successText: t.raw('successText') as string,
    typeLabel: t('type'),
    types,
  };

  const check = (
    <span className={styles.check} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path d="M3.5 8.4 6.6 11.3 12.5 4.9" />
      </svg>
    </span>
  );

  /** Une question : son numéro, la question, le champ sur son filet, l'erreur dessous */
  const question = (n: number, name: string, label: string, input: React.ReactNode, top?: React.ReactNode) => (
    <li className={styles.field} data-field={name} data-form-in>
      <span className={styles.num} aria-hidden="true">
        0{n}
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <label htmlFor={`cf-${name}`} className={styles.q}>
            {label}
          </label>
          {top}
        </div>
        <div className={styles.control}>
          {input}
          {check}
          <span className={styles.rule} aria-hidden="true" data-form-rule />
        </div>
        <p className={styles.error} id={`cf-${name}-error`} data-error />
      </div>
    </li>
  );

  return (
    <div className={styles.card} data-contact-card>
      <form
        className={styles.form}
        action={endpoint}
        method="POST"
        data-contact-form
        data-endpoint={`https://formsubmit.co/ajax/${site.email}`}
        data-copy={JSON.stringify(copy)}
        aria-describedby="cf-summary"
      >
        {/* Réglages FormSubmit */}
        <input type="hidden" name="_subject" value="Nouveau projet via le portfolio" data-subject />
        <input type="hidden" name="_template" value="table" />
        <input type="hidden" name="_captcha" value="false" />
        {/* Type de projet, choisi depuis une offre (« Demander un devis ») */}
        <input type="hidden" name="type" defaultValue="" data-type />
        {/* Piège à robots : reste vide pour un humain */}
        <input type="text" name="_honey" className={styles.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <ol className={styles.questions}>
          {question(
            1,
            'name',
            t('name'),
            <input
              id="cf-name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder={t('namePh')}
              aria-describedby="cf-name-error"
            />,
          )}
          {question(
            2,
            'email',
            t('email'),
            <input
              id="cf-email"
              name="email"
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder={t('emailPh')}
              aria-describedby="cf-email-error"
            />,
          )}
          {question(
            3,
            'message',
            t('message'),
            <textarea
              id="cf-message"
              name="message"
              rows={2}
              required
              minLength={MESSAGE_MIN}
              maxLength={MESSAGE_MAX}
              placeholder={t('messagePh')}
              aria-describedby="cf-message-error"
              data-lenis-prevent
            />,
            <span className={styles.counter} data-counter aria-hidden="true" />,
          )}
        </ol>

        <p className={styles.summary} id="cf-summary" data-summary role="alert" hidden>
          {errors.summary}
        </p>

        <div className={styles.footer} data-form-in>
          <div className={styles.footerSide}>
            <p className={styles.privacy}>{t('privacy')}</p>
            <p className={styles.draft} data-draft aria-live="polite">
              <span className={styles.draftDot} aria-hidden="true" />
              <span data-draft-text />
              <button type="button" className={styles.draftClear} data-draft-clear>
                {t('draftClear')}
              </button>
            </p>
          </div>
          <button type="submit" className={styles.submit} data-submit data-magnetic>
            <span className={styles.submitInner} data-magnetic-inner>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.submitIdle}>{t('send')}</span>
              <span className={styles.submitBusy}>{t('sending')}</span>
              <span className={styles.submitArrow} aria-hidden="true">
                →
              </span>
            </span>
          </button>
        </div>

        <div className={styles.failure} data-form-error role="alert" hidden>
          <p>{t('error')}</p>
          <p className={styles.failureActions}>
            <button type="submit" className={styles.retry}>
              {t('retry')}
            </button>
            <span className={styles.failureOr}>
              {t('errorOr')}{' '}
              <a href={`mailto:${site.email}`} className="link-underline">
                {site.email}
              </a>
            </span>
          </p>
        </div>
      </form>

      {/* L'onde d'encre, lancée depuis le bouton à l'envoi */}
      <span className={styles.drop} data-form-drop aria-hidden="true" />

      {/* Après l'envoi */}
      <div className={styles.success} data-form-success tabIndex={-1} hidden>
        <p className={`label ${styles.successLabel}`} data-success-item>
          <span className={styles.successDot} aria-hidden="true" />
          {t('successLabel')}
        </p>
        <h3 className={styles.successTitle}>
          <span className={styles.successMask}>
            <span data-success-title data-success-line />
          </span>
        </h3>
        <p className={styles.successText} data-success-text data-success-item />
        <div className={styles.recap} data-success-item>
          <p className="label">{t('recap')}</p>
          <dl data-recap />
        </div>
        <button type="button" className={styles.again} data-form-again data-success-item>
          {t('again')} <span aria-hidden="true">↺</span>
        </button>
      </div>
    </div>
  );
}
