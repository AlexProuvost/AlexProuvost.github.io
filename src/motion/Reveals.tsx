'use client';

import { useEffect } from 'react';
import { initReveals } from './textReveals';

/** Monte les animations de texte et d'apparition (voir textReveals.ts). */
export function Reveals() {
  useEffect(() => initReveals(), []);
  return null;
}
