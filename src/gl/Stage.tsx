'use client';

import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mountGL } from './mount';
import styles from './Stage.module.css';

/**
 * LE canvas WebGL du site : un seul, fixe, plein écran, derrière le contenu, transparent aux clics.
 * frameloop="never" : R3F ne lance pas sa propre boucle ; le ticker GSAP appelle advance()
 * quand une couche est visible (voir mount.ts).
 */
export default function Stage() {
  return (
    <Canvas
      className={styles.canvas}
      frameloop="never"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 35, near: 10, far: 10000, position: [0, 0, 1000] }}
      aria-hidden="true"
    >
      <Driver />
    </Canvas>
  );
}

function Driver() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const advance = useThree((s) => s.advance);

  useEffect(() => mountGL({ renderer: gl, scene, camera, render: (t) => advance(t) }), [gl, scene, camera, advance]);

  return null;
}
