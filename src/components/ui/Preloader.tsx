import styles from './Preloader.module.css';

/** Salutations affichées pendant le chargement (la première dans la langue de la page) */
const GREETINGS = ['Hello', 'Hola', 'Ciao', 'Hallo', 'Olá', 'Hej', 'Hoi', 'Bonjour'];

/**
 * Écran de chargement, à la première visite de la session (façon Dennis Snellenberg) :
 * « Bonjour », « Hello », « Hola »… défilent en grand, un compteur monte de 000 à 100,
 * puis l'écran bleu se lève avec un bord courbe qui se tend. L'ouverture du site démarre ensuite.
 * Affiché seulement si la classe html.pl-on est posée dans le <head> (pas de flash) ; comportement : interactions/preloader.ts.
 */
export function Preloader({ locale }: { locale: string }) {
  const first = locale === 'fr' ? 'Bonjour' : 'Hello';
  const words = [first, ...GREETINGS.filter((w) => w !== first)];
  return (
    <div className={styles.preloader} data-preloader aria-hidden="true">
      <p className={styles.word}>
        <span className={styles.dot} />
        <span data-preloader-word data-words={words.join('|')}>
          {first}
        </span>
      </p>
      <p className={styles.count}>
        <span data-preloader-count>000</span>
      </p>
      <svg className={styles.curve} viewBox="0 0 100 100" preserveAspectRatio="none">
        <path data-preloader-curve d="M0 0 L100 0 L100 0 Q50 100 0 0 Z" />
      </svg>
    </div>
  );
}
