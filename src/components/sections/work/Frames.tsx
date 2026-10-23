import styles from './Frames.module.css';

type FrameProps = {
  children: React.ReactNode;
  className?: string;
  /** Profondeur pour la parallaxe sous la souris (-1 → 1) */
  depth?: number;
};

/** Repères aux 4 coins de l'appareil : leur position à l'écran (transforms 3D compris) cale le rendu WebGL. */
function Corners() {
  return (
    <>
      <i className={styles.corner} data-corner="0" aria-hidden="true" />
      <i className={styles.corner} data-corner="1" aria-hidden="true" />
      <i className={styles.corner} data-corner="2" aria-hidden="true" />
      <i className={styles.corner} data-corner="3" aria-hidden="true" />
    </>
  );
}

/**
 * Cadres d'appareils en CSS pur, sobres : un téléphone (bords fins, caméra discrète) et une fenêtre de navigateur.
 * Utilisés dans la galerie des études de cas.
 */
export function Phone({ children, className, depth = 0, main = false }: FrameProps & { main?: boolean }) {
  return (
    <div
      className={`${styles.phone} ${className ?? ''}`}
      data-depth={depth}
      data-device="phone"
      data-main={main || undefined}
    >
      <Corners />
      <div className={styles.phoneScreen} data-screen>
        <span className={styles.camera} aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function Browser({ children, className, title, depth = 0 }: FrameProps & { title: string }) {
  return (
    <div className={`${styles.browser} ${className ?? ''}`} data-depth={depth} data-device="browser" data-title={title}>
      <Corners />
      <div className={styles.chrome} aria-hidden="true">
        <span className={styles.lights}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.address}>{title}</span>
      </div>
      <div className={styles.browserScreen} data-screen>
        {children}
      </div>
    </div>
  );
}
