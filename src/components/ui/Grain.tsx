import styles from './Grain.module.css';

/**
 * Grain pellicule : une petite tuile de bruit répétée.
 * Le calque intérieur est plus grand que l'écran : à l'étape 3 il sera décalé en translate
 * par à-coups (12 i/s) — transform uniquement, coût quasi nul.
 * Opacité réglable via --grain-opacity (Leva en dev).
 */
export function Grain() {
  return (
    <div className={styles.frame} aria-hidden="true">
      <div className={styles.grain} data-grain />
    </div>
  );
}
