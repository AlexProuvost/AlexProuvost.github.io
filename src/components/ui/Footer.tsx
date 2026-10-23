import { useTranslations } from 'next-intl';
import { site, sectionIds } from '@/content/site';
import styles from './Footer.module.css';

/**
 * Pied de page, sur fond bleu (peint par la vague d'encre, gl/InkWave.ts) : un mot de fin, puis le logotype ALEX en crème, bord à bord, dont les lettres montent
 * une à une en arrivant en bas de page (motion/textReveals.ts) ; signature, heure de Tournai, retour en haut.
 */
export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className={styles.footer} data-theme="accent">
      <div className={`container ${styles.inner}`}>
        <div className={`label ${styles.cols}`}>
          <p className={styles.end}>{t('end')}</p>
          <p>{t('made')}</p>
          <p>
            {t('local')}{' '}
            <span className={styles.clock} data-clock>
              --:--:--
            </span>
          </p>
          <a href={`#${sectionIds.top}`} className={styles.top}>
            <span className="link-underline" data-scramble>
              {t('top')}
            </span>{' '}
            ↑
          </a>
        </div>
        <p className={styles.word} aria-hidden="true">
          <span data-footer-word>{site.name}</span>
        </p>
        <p className={`label ${styles.rights}`}>{t('rights')}</p>
      </div>
    </footer>
  );
}
