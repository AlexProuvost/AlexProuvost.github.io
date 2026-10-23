import styles from './Marquee.module.css';

type Props = {
  /** Bande principale (bleue) */
  a: string[];
  /** Bande croisée (crème), en sens inverse */
  b: string[];
};

/** Petite étoile entre deux mots */
function Star() {
  return (
    <svg className={styles.star} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0l2.6 8.4L24 12l-9.4 3.6L12 24l-2.6-8.4L0 12l9.4-3.6z" fill="currentColor" />
    </svg>
  );
}

function Row({ words }: { words: string[] }) {
  return (
    <span className={styles.row}>
      {words.map((w) => (
        <span key={w} className={styles.item}>
          {w}
          <Star />
        </span>
      ))}
    </span>
  );
}

/**
 * Deux bandes de texte géant qui se croisent et défilent en sens contraire (interactions/marquee.ts) :
 * elles accélèrent avec la vitesse du scroll, changent de sens quand on remonte et se penchent dans le mouvement.
 * Décoratif : le contenu est déjà dit ailleurs (aria-hidden).
 */
export function Marquee({ a, b }: Props) {
  return (
    <div className={styles.marquee} aria-hidden="true" data-marquee>
      <div className={`${styles.band} ${styles.bandB}`}>
        <div className={styles.track} data-marquee-track data-dir="-1">
          <Row words={b} />
          <Row words={b} />
        </div>
      </div>
      <div className={`${styles.band} ${styles.bandA}`}>
        <div className={styles.track} data-marquee-track data-dir="1">
          <Row words={a} />
          <Row words={a} />
        </div>
      </div>
    </div>
  );
}
