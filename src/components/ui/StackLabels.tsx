import { useTranslations } from 'next-intl';
import styles from './StackLabels.module.css';

/**
 * Légendes de la page éclatée, façon dessin technique : une par couche (01 Brief … 05 Interface).
 * Calque fixe au-dessus du canvas ; gl/ExplodedStack.ts les place chaque frame à côté de leur plaque
 * (transform + opacity). Invisibles sans WebGL.
 */
export function StackLabels() {
  const t = useTranslations('stack');
  const layers = t.raw('layers') as string[];
  return (
    <div className={styles.layer} aria-hidden="true" data-stack-labels>
      {layers.map((name, i) => (
        <span key={name} className={styles.tag} data-stack-label={i}>
          <span className={styles.leader} />
          <span className={styles.n}>0{i + 1}</span>
          {name}
        </span>
      ))}
    </div>
  );
}
