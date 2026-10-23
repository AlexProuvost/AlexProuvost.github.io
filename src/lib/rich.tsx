import type { ReactNode } from 'react';

/**
 * Balises autorisées dans les textes traduits (messages/*.json), via t.rich(…, rich).
 * <em> : le mot mis en avant, en italique serif (Fraunces).
 */
export const rich = {
  em: (chunks: ReactNode) => <em>{chunks}</em>,
};
