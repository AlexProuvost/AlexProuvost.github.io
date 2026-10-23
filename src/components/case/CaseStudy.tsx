/* eslint-disable @next/next/no-img-element -- site statique : captures WebP servies telles quelles */
import { useTranslations } from 'next-intl';
import type { Project } from '@/content/projects';
import { sectionIds } from '@/content/site';
import { Browser, Phone } from '../sections/work/Frames';
import styles from './CaseStudy.module.css';

type Props = { project: Project; next: Project; locale: string };
type CaseText = {
  intro: string;
  context: string;
  challenge: string;
  approach: string[];
  delivered: string[];
  result: string;
};

/**
 * Étude de cas : couverture plein écran (titre posé dessus), intro et fiche,
 * le récit en lignes éditoriales (contexte → défi → démarche → livré → résultat), la galerie, puis la suite.
 */
export function CaseStudy({ project, next, locale }: Props) {
  const t = useTranslations('project');
  const tnav = useTranslations('nav');
  const tcur = useTranslations('cursor');
  const tp = useTranslations(`projects.${project.id}`);
  const tn = useTranslations(`projects.${next.id}`);
  const c = useTranslations('cases').raw(project.id) as CaseText;
  const alts = tp.raw('screens') as string[];
  const title = tp('title');
  const { theme, media } = project;

  const style = {
    '--p-bg': theme.bg,
    '--p-fg': theme.fg,
    '--p-accent': theme.accent,
    '--p-muted': theme.muted,
    '--p-line': theme.line,
  } as React.CSSProperties;

  const rows: Array<[string, React.ReactNode]> = [
    [t('context'), <p key="c">{c.context}</p>],
    [
      t('challenge'),
      <p key="d" className={styles.big}>
        {c.challenge}
      </p>,
    ],
    [
      t('approach'),
      <ol key="a" className={styles.steps}>
        {c.approach.map((s, i) => (
          <li key={s}>
            <span className="label">0{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>,
    ],
    [
      t('delivered'),
      <ul key="l" className={styles.delivered}>
        {c.delivered.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>,
    ],
    [
      t('result'),
      <p key="r" className={styles.big}>
        {c.result}
      </p>,
    ],
  ];

  return (
    <article className={styles.case} style={style}>
      {/* Barre de lecture : avance avec la page (interactions/readProgress.ts) */}
      <span className={styles.readBar} data-read-progress aria-hidden="true" />
      {/* Couverture plein écran : même cadrage que l'image ouverte depuis l'index des projets */}
      <header className={styles.cover} data-section="case" data-section-label={t('caseLabel')}>
        <div className={styles.coverMedia} data-case-cover>
          <img
            src={project.cover.src}
            alt={alts[0] ?? title}
            width={2000}
            height={1250}
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className={`container ${styles.coverText}`}>
          <a href={`/${locale}/#${sectionIds.work}`} className={`label ${styles.back}`} data-intro>
            <span aria-hidden="true">←</span>{' '}
            <span className="link-underline" data-scramble>
              {t('back')}
            </span>
          </a>
          <div className={styles.coverBottom} data-case-title>
            <p className={`label ${styles.kicker}`} data-intro>
              {t('caseLabel')} · {project.track} / {tp('kind')}
              {project.concept && <span className={styles.badge}>{t('concept')}</span>}
            </p>
            <h1
              className={`headline ${styles.title} ${project.titleStyle === 'serif' ? styles.serif : ''}`}
              data-intro="chars"
            >
              {title}
            </h1>
          </div>
        </div>
      </header>

      <div className={`container ${styles.introRow}`}>
        <p className={styles.intro} data-split="lines">
          {c.intro}
        </p>
        <dl className={styles.facts} data-reveal="up">
          <div>
            <dt className="label">{t('client')}</dt>
            <dd>{tp('client')}</dd>
          </div>
          <div>
            <dt className="label">{t('role')}</dt>
            <dd>{tp('role')}</dd>
          </div>
          <div>
            <dt className="label">{t('stack')}</dt>
            <dd>{project.stack.join(', ')}</dd>
          </div>
          <div>
            <dt className="label">{project.url ? 'URL' : t('status')}</dt>
            <dd>
              {project.url ? (
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {new URL(project.url).host} ↗
                </a>
              ) : project.concept ? (
                t('conceptNote')
              ) : (
                t('soon')
              )}
            </dd>
          </div>
        </dl>
      </div>

      <section className={`container ${styles.story}`} data-section="story" data-section-label={t('caseLabel')}>
        {rows.map(([label, content]) => (
          <div key={label} className={styles.row} data-reveal="up">
            <h2 className={`label ${styles.rowLabel}`}>{label}</h2>
            <div className={styles.rowBody}>{content}</div>
          </div>
        ))}
      </section>

      <section className={`container ${styles.gallery}`} aria-label={t('gallery')}>
        <h2 className={`label ${styles.galleryLabel}`}>{t('gallery')}</h2>
        {(media.desktop ?? []).map((s, i) => (
          <div key={s.src} className={styles.galleryWide} data-reveal="up" data-skew>
            <Browser title={title}>
              <img src={s.src} alt={alts[i] ?? title} width={s.w} height={s.h} loading="lazy" decoding="async" />
            </Browser>
          </div>
        ))}
        <div className={styles.galleryPhones}>
          {media.phones.map((s, i) => (
            <div key={s.src} className={styles.galleryPhone} data-reveal="up" data-skew>
              <Phone>
                <img
                  src={s.src}
                  alt={alts[(media.desktop?.length ?? 0) + i] ?? title}
                  width={s.w}
                  height={s.h}
                  loading="lazy"
                  decoding="async"
                />
              </Phone>
            </div>
          ))}
        </div>
      </section>

      <section className={`container ${styles.end}`} data-section="next" data-section-label={t('next')}>
        <a href={`/${locale}/projets/${next.slug}`} className={styles.next} data-cursor-label={tcur('watch')}>
          <span className={styles.nextMedia} data-reveal="image">
            <img src={next.cover.small} alt="" width={1000} height={625} loading="lazy" decoding="async" />
          </span>
          <span className={styles.nextText}>
            <span className="label">{t('next')}</span>
            <span className={`headline ${styles.nextTitle}`}>
              {tn('title')} <span aria-hidden="true">→</span>
            </span>
          </span>
        </a>
        <div className={styles.cta}>
          <p className={`headline ${styles.ctaTitle}`}>{t('cta')}</p>
          <p className={styles.ctaText}>{t('ctaText')}</p>
          <a href={`/${locale}/#${sectionIds.contact}`} className="pill" data-magnetic>
            <span data-magnetic-inner data-roll>
              {tnav('talk')} <span aria-hidden="true">→</span>
            </span>
          </a>
        </div>
      </section>
    </article>
  );
}
