import styles from './Cursor.module.css';

/**
 * Curseur personnalisé : un point qui suit la souris avec inertie, grossit sur les éléments cliquables
 * et affiche une étiquette (data-cursor-label). Le curseur système reste visible (accessibilité).
 * Comportement : interactions/cursor.ts. Absent sur écran tactile.
 */
export function Cursor() {
  return (
    <div className={styles.cursor} data-cursor aria-hidden="true">
      <span className={styles.ring} data-cursor-ring />
      <span className={styles.label} data-cursor-text />
    </div>
  );
}
