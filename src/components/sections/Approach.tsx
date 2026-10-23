import { useTranslations } from 'next-intl';
import { sectionIds } from '@/content/site';
import { rich } from '@/lib/rich';
import { SectionLabel } from '../ui/SectionLabel';
import { StackFallback } from '../ui/StackFallback';
import styles from './Approach.module.css';

type Step = {
  title: string;
  layer: string;
  text: string;
  notes: string[];
  duration: string;
  get: string[];
  need: string[];
};

/**
 * 02 — « De l'idée au site ».
 * Une intro, puis une scène épinglée (motion/approachFx.ts) : à gauche, les quatre étapes de la méthode ;
 * à droite, la page éclatée du hero qui a suivi le scroll et se raconte couche par couche
 * (brief → grille et wireframe → typographie et interface → la page assemblée, en ligne).
 * Sans animation : les quatre étapes restent lisibles en entier.
 */
export function Approach() {
  const t = useTranslations('approach');
  const steps = t.raw('steps') as Step[];

  return (
    <section
      id={sectionIds.approach}
      className={styles.section}
      data-section="approach"
      data-section-label={t('label')}
    >
      <div className={`container ${styles.intro}`}>
        <SectionLabel index="02">{t('label')}</SectionLabel>
        <h2 className={`headline ${styles.title}`} data-split="ink" data-skew>
          {t.rich('title', rich)}
        </h2>
        <p className={styles.lead} data-split="lines">
          {t('lead')}
        </p>
      </div>

      <div className={styles.stage} data-approach-stage>
        <div className={`container ${styles.stageInner}`}>
          <div className={styles.steps}>
            <div className={styles.progress} aria-hidden="true">
              <span className={styles.progressFill} data-approach-progress />
            </div>

            <div className={styles.column}>
              <ol className={styles.list}>
                {steps.map((step, i) => (
                  <li key={step.title} className={styles.step} data-approach-step={i}>
                    <h3 className={styles.stepTitle}>
                      <span className={`label ${styles.stepN}`}>0{i + 1}</span>
                      <span className={`headline ${styles.stepName}`}>{step.title}</span>
                    </h3>
                  </li>
                ))}
              </ol>

              {/* Les textes des étapes, superposés : seul celui de l'étape active est visible */}
              <div className={styles.details}>
                {steps.map((step, i) => (
                  <div key={step.title} className={styles.detail} data-approach-detail={i}>
                    <p className={`label ${styles.layer}`}>
                      <span className="dot" aria-hidden="true" />
                      {step.layer}
                    </p>
                    <p className={styles.stepText}>{step.text}</p>
                    {step.notes.length > 0 && (
                      <ul className={styles.chips}>
                        {step.notes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.visual}>
            <div className={styles.anchor} data-stack-anchor="approach">
              <StackFallback />
            </div>
          </div>
        </div>
      </div>

      {/* Le déroulé concret, en cartes qui s'empilent au scroll (motion/deckFx.ts) :
          chaque étape vient se poser sur la précédente, qui recule et s'assombrit ;
          son grand numéro se remplit d'encre à l'arrivée. Sans animation : les cartes, simplement empilées. */}
      <div className={`container ${styles.process}`}>
        <h3 className={`headline ${styles.processTitle}`} data-split="title">
          {t('detailTitle')}
        </h3>
        <ol className={styles.deck} data-deck>
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={styles.card}
              style={{ '--i': i } as React.CSSProperties}
              data-tone={i === steps.length - 1 ? 'accent' : undefined}
              data-deck-card
            >
              <div className={styles.cardInner} data-deck-inner>
                <div className={styles.cardTop} data-deck-item>
                  <span className="label">
                    0{i + 1} / 0{steps.length}
                  </span>
                  <p className={styles.phaseDuration}>
                    <span className="label">{t('duration')}</span> {step.duration}
                  </p>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.bigN} aria-hidden="true" data-deck-n>
                    0{i + 1}
                  </p>
                  <div className={styles.cardMain}>
                    <h4 className={`headline ${styles.cardTitle}`} data-deck-item>
                      {step.title}
                    </h4>
                    <div className={styles.cardCols}>
                      <div data-deck-item>
                        <p className={`label ${styles.phaseK}`}>{t('receive')}</p>
                        <ul className={styles.phaseList}>
                          {step.get.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                      <div data-deck-item>
                        <p className={`label ${styles.phaseK}`}>{t('need')}</p>
                        <ul className={`${styles.phaseList} ${styles.phaseNeed}`}>
                          {step.need.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <span className={styles.cardShade} aria-hidden="true" data-deck-shade />
              </div>
            </li>
          ))}
        </ol>
        <p className={`label ${styles.processNote}`} data-reveal="up">
          {t('detailNote')}
        </p>
      </div>
    </section>
  );
}
