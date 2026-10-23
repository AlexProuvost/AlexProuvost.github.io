import { Fragment } from 'react';

/**
 * Empêche la coupure de ligne sur les traits d'union (« E-commerce », « Parlons-en »).
 * Les mots composés sont enveloppés dans un span insécable ; le reste coupe normalement.
 */
export function keepHyphenated(text: string) {
  return text.split(' ').map((word, i, all) => (
    <Fragment key={i}>
      {word.includes('-') ? <span style={{ whiteSpace: 'nowrap' }}>{word}</span> : word}
      {i < all.length - 1 ? ' ' : null}
    </Fragment>
  ));
}
