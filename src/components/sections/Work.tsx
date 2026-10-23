/* eslint-disable @next/next/no-img-element -- site statique (GitHub Pages) : captures déjà optimisées en WebP */
import { useLocale, useTranslations } from 'next-intl';
import { projects, type Project } from '@/content/projects';
import { sectionIds } from '@/content/site';
import { rich } from '@/lib/rich';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './Work.module.css';

/**
 * 03 — Projets : des cartes qui défilent à l'horizontale (motion/filmFx.ts).
 *  - À gauche, fixe : le titre de la section, le compteur 01 / 02 et la progression.
 *  - À droite : une carte par projet, avec les vraies captures du site (navigateur et/ou téléphones à plat,
 *    sans faux appareils 3D), puis le nom, le type, le statut, l'accroche. Une dernière carte bleue mène au contact.
 *  - Grand écran : la section s'épingle et le scroll fait glisser les cartes (on peut aussi les glisser à la souris) ;
 *    les captures bougent en parallaxe. Mobile, sans JS ou en animations réduites : un carrousel qu'on fait
 *    défiler au doigt (défilement natif, cartes calées).
 */

function Shot({ p, title }: { p: Project; title: string }) {
  const { media } = p;
  if (media.layout === 'phones') {
    return (
      <span className={styles.phones}>
        {media.phones.slice(0, 3).map((s, i) => (
          <span key={s.src} className={styles.slot}>
            <span className={styles.screen} data-depth={[0.7, 1, 1.3][i]}>
              <img src={s.src} alt="" width={s.w} height={s.h} loading="lazy" decoding="async" draggable={false} />
            </span>
          </span>
        ))}
      </span>
    );
  }
  const [main, alt] = media.desktop ?? [];
  const phone = media.phones[0];
  return (
    <>
      {main && (
        <span className={styles.browserSlot}>
          <span className={styles.browser} data-depth="0.5">
            <span className={styles.bar} aria-hidden="true">
              <i />
              <i />
              <i />
              <span className={styles.url}>{p.url ? p.url.replace(/^https?:\/\//, '') : title}</span>
            </span>
            <span className={styles.viewport}>
              <img
                src={main.src}
                alt=""
                width={main.w}
                height={main.h}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              {alt && (
                <img
                  className={styles.alt}
                  src={alt.src}
                  alt=""
                  width={alt.w}
                  height={alt.h}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              )}
            </span>
          </span>
        </span>
      )}
      {phone && (
        <span className={`${styles.slot} ${styles.side}`}>
          <span className={styles.screen} data-depth="1.1">
            <img
              src={phone.src}
              alt=""
              width={phone.w}
              height={phone.h}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </span>
        </span>
      )}
    </>
  );
}

export function Work() {
  const t = useTranslations('work');
  const tp = useTranslations('projects');
  const tpr = useTranslations('project');
  const tc = useTranslations('cursor');
  const locale = useLocale();

  return (
    <section id={sectionIds.work} className={styles.section} data-section="work" data-section-label={t('label')}>
      <div className={styles.stage} data-film-stage>
        {/* Colonne fixe : titre et progression */}
        <div className={styles.aside}>
          <SectionLabel index="03">{t('label')}</SectionLabel>
          <h2 className={`headline ${styles.title}`} data-split="title">
            {t.rich('title', rich)}
          </h2>
          <p className={styles.note} data-reveal="up">
            {t('note')}
          </p>

          <div className={styles.progress} data-reveal="up" aria-hidden="true">
            <p className={styles.counter}>
              <span className={styles.counterMask}>
                <span className={styles.counterReel} data-film-reel>
                  {projects.map((p) => (
                    <span key={p.id}>{p.track}</span>
                  ))}
                </span>
              </span>
              <span className={styles.counterOf}>/ 0{projects.length}</span>
            </p>
            <span className={styles.progressBar}>
              <span data-film-fill />
            </span>
            <p className={`label ${styles.hint}`}>
              {t('dragHint')} <span className={styles.hintArrow}>→</span>
            </p>
          </div>
        </div>

        {/* Les cartes */}
        <div className={styles.rail} data-film-rail>
          <ol className={styles.track} data-film-track data-cursor-label={t('drag')}>
            {projects.map((p, i) => {
              const title = tp(`${p.id}.title`);
              const status = p.concept ? tpr('concept') : p.url ? tpr('live') : tpr('soon');
              const href = `/${locale}/projets/${p.slug}`;
              return (
                <li key={p.id} className={styles.card} data-film-card={i}>
                  <a
                    href={href}
                    className={`${styles.shot} ${p.media.layout === 'phones' ? styles.shotPhones : styles.shotDesktop}`}
                    data-film-shot
                    data-cursor-label={tc('watch')}
                    style={
                      {
                        '--tint': p.theme.bg,
                        '--glow': p.theme.accent,
                      } as React.CSSProperties
                    }
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <Shot p={p} title={title} />
                  </a>
                  <div className={styles.info} data-film-info>
                    <p className={styles.num}>{p.track}</p>
                    <div className={styles.infoMain}>
                      <h3
                        id={`card-${p.id}`}
                        className={`${styles.cardTitle} ${p.titleStyle === 'serif' ? styles.serif : ''}`}
                      >
                        <a href={href}>{title}</a>
                      </h3>
                      <p className={styles.meta}>
                        <span>{tp(`${p.id}.kind`)}</span>
                        <span className={styles.status}>
                          <span className="dot" aria-hidden="true" /> {status}
                        </span>
                      </p>
                      <p className={styles.tagline}>{tp(`${p.id}.tagline`)}</p>
                    </div>
                    <span className={styles.arrow} aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </li>
              );
            })}

            {/* Dernière carte : votre projet */}
            <li className={`${styles.card} ${styles.endCard}`} data-film-card={projects.length}>
              <a href={`#${sectionIds.contact}`} className={`${styles.shot} ${styles.endShot}`} data-film-shot>
                <span className={`label ${styles.endLabel}`}>{t('endLabel')}</span>
                <span className={`headline ${styles.endTitle}`}>{t.rich('endTitle', rich)}</span>
                <span className={`pill ${styles.endCta}`}>
                  {t('endCta')} <span aria-hidden="true">→</span>
                </span>
              </a>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
