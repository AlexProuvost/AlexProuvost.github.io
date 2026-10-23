'use client';

import dynamic from 'next/dynamic';

/**
 * Panneau Leva — chargé UNIQUEMENT en développement.
 * En production, la condition est remplacée à la compilation par `false` :
 * le module Leva n'est même pas inclus dans le bundle.
 */
const LevaPanel =
  process.env.NODE_ENV === 'development' ? dynamic(() => import('./LevaPanel'), { ssr: false }) : () => null;

export function DebugPanel() {
  return <LevaPanel />;
}
