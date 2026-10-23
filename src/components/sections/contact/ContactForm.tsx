import { useTranslations } from 'next-intl';
import { site } from '@/content/site';
import styles from './ContactForm.module.css';

const MESSAGE_MIN = 20;
const MESSAGE_MAX = 2000;

type Letter = {
  meta: { to: string; toValue: string; subject: string };
  hello: string;
  lines: string[];
  companyPh: string;
  websitePh: string;
  messagePh: string;
  types: string[];
  budgets: string[];
  deadlines: string[];
  bye: string;
  signPh: string;
};

/**
 * Formulaire de contact en lettre à trous : « Bonjour Alex, je m'appelle ___, j'aimerais ___… ».
 * Les blancs sont de vrais champs (texte souligné qui s'élargit avec ce qu'on tape), les choix des menus
 * en italique bleu, le message un grand paragraphe ; l'objet de l'email et la signature se remplissent en direct.
 * Pensé pour un hébergement statique (GitHub Pages) : envoyé à FormSubmit (aucun serveur, aucun compte),
 * qui transfère le message par email.
 *  - Sans JS : envoi classique avec la validation du navigateur.
 *  - Avec JS (interactions/contactForm.ts) : les lignes montent à l'arrivée, validation en direct,
 *    brouillon gardé, envoi en arrière-plan ; à l'envoi, une goutte d'encre part du bouton,
 *    la lettre s'efface et « Merci {prénom}. » s'écrit en grand avec le récapitulatif.
 * Le premier envoi déclenche un email d'activation de FormSubmit à valider une fois.
 */
export function ContactForm() {
  const t = useTranslations('contact.form');
  const letter = t.raw('letter') as Letter;
  const types = t.raw('types') as string[];
  const budgets = t.raw('budgets') as string[];
  const deadlines = t.raw('deadlines') as string[];
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
    labels: {
      company: t('company'),
      website: t('website'),
      type: t('type'),
      budget: t('budget'),
      deadline: t('deadline'),
    },
  };

  const check = (
    <span className={styles.check} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        <path d="M3.5 8.4 6.6 11.3 12.5 4.9" />
      </svg>
    </span>
  );

  /** Un blanc à remplir, dans le fil de la phrase */
  const blank = (name: string, label: string, input: React.ReactNode, optional = false) => (
    <span className={styles.blank} data-field={name} key={name}>
      <label htmlFor={`cf-${name}`} className="sr-only">
        {label}
        {optional && ` (${t('optional')})`}
      </label>
      {input}
      {check}
      <span className={styles.rule} aria-hidden="true" data-form-rule />
      <span className={styles.error} id={`cf-${name}-error`} data-error />
    </span>
  );

  /**
   * Un choix dans la phrase : la valeur envoyée reste l'intitulé court (« Site vitrine »), on lit « un site vitrine ».
   * Sans JS : le <select> natif. Avec JS (interactions/picks.ts) : le mot devient un bouton qui ouvre
   * un menu sur mesure (cartouche sombre, options numérotées, encre bleue au survol) ; le <select> reste la source.
   */
  const choice = (name: string, label: string, values: string[], phrases: string[], index?: boolean) => (
    <span className={`${styles.blank} ${styles.pick}`} key={name} data-pick>
      <label htmlFor={`cf-${name}`} id={`cf-${name}-label`} className="sr-only">
        {label}
      </label>
      <select id={`cf-${name}`} name={name} defaultValue={values[0]} className={styles.native} data-autosize>
        {values.map((v, i) => (
          <option key={v} value={v} {...(index ? { 'data-type-index': i } : {})}>
            {phrases[i] ?? v}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.pickBtn}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={`cf-${name}-menu`}
        aria-labelledby={`cf-${name}-label cf-${name}-current`}
        data-pick-btn
      >
        <span className={styles.pickMask}>
          <span id={`cf-${name}-current`} className={styles.pickCurrent} data-pick-current>
            {phrases[0] ?? values[0]}
          </span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      <span className={styles.rule} aria-hidden="true" data-form-rule />
      <span
        id={`cf-${name}-menu`}
        className={styles.menu}
        role="listbox"
        tabIndex={-1}
        aria-labelledby={`cf-${name}-label`}
        data-pick-menu
        hidden
      >
        <span className={`label ${styles.menuLabel}`} aria-hidden="true">
          {label}
        </span>
        {values.map((v, i) => (
          <span
            key={v}
            id={`cf-${name}-opt-${i}`}
            className={styles.option}
            role="option"
            aria-selected={i === 0}
            data-value={v}
            data-pick-option
          >
            <span className={styles.optionIndex} aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className={styles.optionText} data-option-text>
              {phrases[i] ?? v}
            </span>
            <span className={styles.optionDot} aria-hidden="true" />
          </span>
        ))}
      </span>
    </span>
  );

  const controls: Record<string, React.ReactNode> = {
    name: blank(
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
        size={14}
        data-autosize
        aria-describedby="cf-name-error"
      />,
    ),
    company: blank(
      'company',
      t('company'),
      <input
        id="cf-company"
        name="company"
        type="text"
        maxLength={100}
        autoComplete="organization"
        placeholder={letter.companyPh}
        size={13}
        data-autosize
      />,
      true,
    ),
    type: choice('type', t('type'), types, letter.types, true),
    budget: choice('budget', t('budget'), budgets, letter.budgets),
    deadline: choice('deadline', t('deadline'), deadlines, letter.deadlines),
    website: blank(
      'website',
      t('website'),
      <input
        id="cf-website"
        name="website"
        type="text"
        inputMode="url"
        maxLength={200}
        autoComplete="url"
        spellCheck={false}
        autoCapitalize="none"
        placeholder={letter.websitePh}
        size={16}
        data-autosize
        aria-describedby="cf-website-error"
      />,
      true,
    ),
    email: blank(
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
        size={15}
        data-autosize
        aria-describedby="cf-email-error"
      />,
    ),
  };

  // Le message : un paragraphe entier sous sa phrase d'amorce, avec son compteur
  const message = (
    <span className={`${styles.blank} ${styles.paragraph}`} data-field="message" key="message">
      <label htmlFor="cf-message" className="sr-only">
        {t('message')}
      </label>
      <textarea
        id="cf-message"
        name="message"
        rows={2}
        required
        minLength={MESSAGE_MIN}
        maxLength={MESSAGE_MAX}
        placeholder={letter.messagePh}
        aria-describedby="cf-message-error"
        data-lenis-prevent
      />
      <span className={styles.rule} aria-hidden="true" data-form-rule />
      <span className={styles.paragraphFoot}>
        <span className={styles.error} id="cf-message-error" data-error />
        <span className={styles.counter} data-counter aria-hidden="true" />
      </span>
    </span>
  );

  /** « Je m'appelle {name}, de {company}. » → texte + champs */
  const line = (tpl: string) =>
    tpl.split(/\{(\w+)\}/).map((part, i) => {
      if (i % 2 === 0) return part;
      return part === 'message' ? message : controls[part];
    });

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
        {/* Piège à robots : reste vide pour un humain */}
        <input type="text" name="_honey" className={styles.honey} tabIndex={-1} autoComplete="off" aria-hidden="true" />

        {/* En-tête façon email : l'objet se compose pendant qu'on écrit */}
        <dl className={styles.meta} data-form-in aria-hidden="true">
          <div>
            <dt>{letter.meta.to}</dt>
            <dd>{letter.meta.toValue}</dd>
          </div>
          <div>
            <dt>{letter.meta.subject}</dt>
            <dd data-letter-subject />
          </div>
        </dl>

        <div className={styles.letter}>
          <p className={styles.hello} data-form-in>
            {letter.hello}
          </p>
          {letter.lines.map((tpl) => (
            <p key={tpl} className={styles.line} data-form-in>
              {line(tpl)}
            </p>
          ))}
          <p className={styles.sign} data-form-in aria-hidden="true">
            <span className={styles.bye}>{letter.bye}</span>
            <span className={styles.signature} data-signature data-placeholder={letter.signPh}>
              {letter.signPh}
            </span>
          </p>
        </div>

        <p className={styles.summary} id="cf-summary" data-summary role="alert" hidden>
          {errors.summary}
        </p>

        <div className={styles.footer} data-form-in>
          <button type="submit" className={styles.submit} data-submit data-magnetic>
            <span className={styles.submitInner} data-magnetic-inner>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.submitIdle} data-roll>
                {t('send')}
              </span>
              <span className={styles.submitBusy}>{t('sending')}</span>
              <span className={styles.submitArrow} aria-hidden="true">
                →
              </span>
            </span>
          </button>
          <div className={styles.footerSide}>
            <p className={styles.draft} data-draft aria-live="polite">
              <span className={styles.draftDot} aria-hidden="true" />
              <span data-draft-text />
              <button type="button" className={styles.draftClear} data-draft-clear>
                {t('draftClear')}
              </button>
            </p>
            <p className={styles.privacy}>{t('privacy')}</p>
          </div>
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

      {/* La goutte d'encre, lancée depuis le bouton à l'envoi */}
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
