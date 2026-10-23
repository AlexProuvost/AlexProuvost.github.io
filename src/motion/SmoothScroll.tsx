'use client';

import { useEffect } from 'react';
import { initSmoothScroll } from './loop';

/** Monte la boucle unique (Lenis + ticker GSAP) une fois, côté client. */
export function SmoothScroll() {
  useEffect(() => initSmoothScroll(), []);
  return null;
}
