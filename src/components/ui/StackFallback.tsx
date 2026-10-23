import styles from './StackFallback.module.css';

/**
 * Version CSS (sans WebGL / animations réduites) de la page éclatée :
 * cinq plaques empilées en perspective — brief, grille, wireframe, typographie, interface.
 * Masquée dès que la scène WebGL prend le relais (classe .gl-on).
 */
export function StackFallback() {
  return (
    <div className={styles.scene} data-stack-fallback aria-hidden="true">
      <div className={styles.stack}>
        <span className={`${styles.plate} ${styles.brief}`} style={{ '--i': 0 } as React.CSSProperties}>
          <i />
          <i />
          <i />
        </span>
        <span className={`${styles.plate} ${styles.grid}`} style={{ '--i': 1 } as React.CSSProperties} />
        <span className={`${styles.plate} ${styles.wire}`} style={{ '--i': 2 } as React.CSSProperties}>
          <i />
          <i />
          <i />
        </span>
        <span className={`${styles.plate} ${styles.type}`} style={{ '--i': 3 } as React.CSSProperties}>
          Aa
        </span>
        <span className={`${styles.plate} ${styles.surface}`} style={{ '--i': 4 } as React.CSSProperties}>
          <i />
        </span>
      </div>
    </div>
  );
}
