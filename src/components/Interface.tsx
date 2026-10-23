'use client';

import { useEffect } from 'react';
import { initInterface } from '@/interactions';

/** Monte les détails d'interface (curseur, son, menu, barre du bas, horloge) côté client. */
export function Interface() {
  useEffect(() => initInterface(), []);
  return null;
}
