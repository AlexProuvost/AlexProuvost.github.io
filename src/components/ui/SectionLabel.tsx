import styles from './SectionLabel.module.css';

type Props = {
  /** Numéro de chapitre (ex. "02") */
  index: string;
  children: React.ReactNode;
  className?: string;
};

/** En-tête de section : un filet sur toute la largeur, le numéro de chapitre à gauche, le nom à droite. */
export function SectionLabel({ index, children, className }: Props) {
  return (
    <p className={`label ${styles.label} ${className ?? ''}`} data-reveal="label">
      <span className={styles.rule} aria-hidden="true" data-rule />
      <span>{index}</span>
      <span data-scramble="reveal">{children}</span>
    </p>
  );
}
