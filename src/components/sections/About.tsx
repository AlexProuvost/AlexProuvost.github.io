import { useTranslations } from 'next-intl';
import { sectionIds } from '@/content/site';
import { rich } from '@/lib/rich';
import { SectionLabel } from '../ui/SectionLabel';
import styles from './About.module.css';

type Fact = { k: string; v: string };
type Stat = { n: number; suffix: string; label: string };

/**
 * 05 — À propos : une déclaration en grand qui s'allume mot par mot au scroll,
 * des chiffres qui comptent à l'arrivée, un court texte, les repères en lignes éditoriales, puis les outils.
 */
export function About() {
  const t = useTranslations('about');
  const facts = t.raw('facts') as Fact[];
  const stats = t.raw('stats') as Stat[];
  const tools = t.raw('tools') as string[];

  return (
    <section id={sectionIds.about} className={styles.section} data-section="about" data-section-label={t('label')}>
      <div className="container">
        <SectionLabel index="05">{t('label')}</SectionLabel>

        <p className={`headline ${styles.statement}`} data-split="light">
          {t.rich('statement', rich)}
        </p>

        {/* Chiffres (ils comptent à l'arrivée) */}
        <ul className={styles.stats}>
          {stats.map((st) => (
            <li key={st.label} className={styles.stat} data-reveal="up">
              <span className={styles.statN}>
                <span data-count={st.n}>{st.n}</span>
                {st.suffix}
              </span>
              <span className={styles.statLabel}>{st.label}</span>
            </li>
          ))}
        </ul>

        <div className={styles.grid}>
          <p className={styles.text} data-split="lines">
            {t('text')}
          </p>

          <dl className={styles.facts}>
            {facts.map((f, i) => (
              <div key={f.k} className={styles.fact} data-reveal="up">
                <dt className="label">
                  <span className={styles.n}>0{i + 1}</span> {f.k}
                </dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.tools} data-reveal="up">
          <p className="label">{t('toolsLabel')}</p>
          <ul className={styles.toolList}>
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
