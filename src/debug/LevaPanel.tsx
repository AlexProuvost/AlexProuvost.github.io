'use client';

import { useEffect, useRef } from 'react';
import { Leva, folder, useControls } from 'leva';
import { params, emit, type Topic } from '@/motion/params';
import styles from './LevaPanel.module.css';

const EASES = ['power2.out', 'power3.out', 'power4.out', 'expo.out', 'circ.out', 'sine.out', 'back.out(1.4)', 'none'];

/**
 * Panneau de réglages (développement uniquement).
 * Chaque dossier écrit dans `params` puis prévient les modules concernés.
 * Les valeurs par défaut viennent de motion/params.ts : une fois réglé, recopie tes valeurs là-bas.
 */
export default function LevaPanel() {
  const global = useControls('Global', {
    grainOpacity: { value: 0.045, min: 0, max: 0.25, step: 0.005, label: 'grain.opacity' },
    grainFps: { value: params.grain.fps, min: 0, max: 24, step: 1, label: 'grain.fps' },
    grid: { value: false, label: 'debug.grid' },
  });

  const scroll = useControls('Scroll', {
    lerp: { value: params.scroll.lerp, min: 0.03, max: 0.3, step: 0.005, label: 'scroll.lerp' },
    wheelMultiplier: {
      value: params.scroll.wheelMultiplier,
      min: 0.4,
      max: 2.5,
      step: 0.05,
      label: 'scroll.wheelMultiplier',
    },
    touchMultiplier: {
      value: params.scroll.touchMultiplier,
      min: 0.5,
      max: 3,
      step: 0.05,
      label: 'scroll.touchMultiplier',
    },
  });

  const text = useControls('Texte', {
    scrub: { value: params.text.scrub, min: 0, max: 3, step: 0.05, label: 'scrub' },
    duration: { value: params.text.duration, min: 0.2, max: 3, step: 0.05, label: 'text.duration' },
    stagger: { value: params.text.stagger, min: 0, max: 0.3, step: 0.005, label: 'text.stagger' },
    ease: { value: params.text.ease, options: EASES, label: 'text.ease' },
    yPercent: { value: params.text.yPercent, min: 20, max: 160, step: 5, label: 'text.yPercent' },
    window: folder(
      {
        start: { value: params.text.start, min: 50, max: 110, step: 1, label: 'text.start (% écran)' },
        end: { value: params.text.end, min: 0, max: 90, step: 1, label: 'text.end (% écran)' },
      },
      { collapsed: true },
    ),
  });

  const hero = useControls('Hero', {
    delay: { value: params.hero.delay, min: 0, max: 1.5, step: 0.05, label: 'intro.delay' },
    duration: { value: params.hero.duration, min: 0.4, max: 3, step: 0.05, label: 'intro.duration' },
    stagger: { value: params.hero.stagger, min: 0, max: 0.3, step: 0.01, label: 'intro.stagger' },
    cineDuration: { value: params.hero.cineDuration, min: 0.8, max: 5, step: 0.1, label: 'intro.cinematic' },
  });

  const approach = useControls('Méthode', {
    pinLength: { value: params.approach.pinLength, min: 1.5, max: 6, step: 0.1, label: 'pin.length (écrans)' },
    scrub: { value: params.approach.scrub, min: 0, max: 2, step: 0.05, label: 'pin.scrub' },
  });

  const fluid = useControls('Liquide (hero)', {
    force: { value: params.fluid.force, min: 0, max: 15000, step: 100, label: 'fluid.force' },
    ink: { value: params.fluid.ink, min: 0, max: 0.6, step: 0.01, label: 'fluid.ink' },
    radius: { value: params.fluid.radius, min: 0.05, max: 1, step: 0.01, label: 'fluid.radius' },
    curl: { value: params.fluid.curl, min: 0, max: 60, step: 1, label: 'fluid.curl' },
    dissipation: { value: params.fluid.dissipation, min: 0.1, max: 4, step: 0.05, label: 'fluid.dissipation' },
    refract: { value: params.fluid.refract, min: 0, max: 0.2, step: 0.005, label: 'fluid.refract' },
    glow: { value: params.fluid.glow, min: 0, max: 1.5, step: 0.05, label: 'fluid.glow' },
  });

  const film = useControls('Projets', {
    speed: { value: params.film.speed, min: 0.5, max: 3, step: 0.05, label: 'film.speed (scroll / px)' },
  });

  const stack = useControls('Page éclatée 3D', {
    spread: { value: params.stack.spread, min: 0.05, max: 0.8, step: 0.01, label: 'stack.spread' },
    tilt: { value: params.stack.tilt, min: 20, max: 80, step: 1, label: 'stack.tilt (°)' },
    rotate: { value: params.stack.rotate, min: 0, max: 60, step: 1, label: 'stack.rotate (°)' },
    mouse: { value: params.stack.mouse, min: 0, max: 20, step: 0.5, label: 'stack.mouse (°)' },
    float: { value: params.stack.float, min: 0, max: 20, step: 0.5, label: 'stack.float (px)' },
    focus: { value: params.stack.focus, min: 0, max: 0.4, step: 0.01, label: 'stack.focus' },
  });

  const fx = useControls('Effets', {
    magnetic: { value: params.fx.magnetic, min: 0, max: 0.6, step: 0.01, label: 'magnetic' },
  });

  // Accès aux réglages depuis la console (développement uniquement)
  useEffect(() => {
    (window as unknown as { __params?: typeof params }).__params = params;
  }, []);

  // Global
  useEffect(() => {
    document.documentElement.style.setProperty('--grain-opacity', String(global.grainOpacity));
    params.grain.fps = global.grainFps;
  }, [global.grainOpacity, global.grainFps]);

  // Écrit les valeurs et prévient — sauf au premier rendu (les défauts sont déjà en place)
  useSync('scroll', scroll, params.scroll);
  useSync('text', text, params.text);
  useSync('hero', hero, params.hero);
  useSync('fx', fx, params.fx);
  useSync('approach', approach, params.approach);
  useSync('film', film, params.film);
  // Lus à chaque frame par la scène 3D (et par les boutons magnétiques) : rien à reconstruire
  useEffect(() => {
    Object.assign(params.stack, stack);
  }, [stack]);
  useEffect(() => {
    Object.assign(params.fluid, fluid);
  }, [fluid]);

  return (
    <>
      <Leva collapsed titleBar={{ title: 'Alex — réglages', position: { x: 0, y: 64 } }} />
      {global.grid && (
        <div className={styles.overlay} aria-hidden="true">
          <div className={`container grid ${styles.cols}`}>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={styles.col} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function useSync<T extends object>(topic: Topic, values: T, target: object) {
  const first = useRef(true);
  const key = JSON.stringify(values);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Object.assign(target, JSON.parse(key));
    emit(topic);
  }, [key, topic, target]);
}
