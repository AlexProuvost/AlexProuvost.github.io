import type * as THREE from 'three';

export type Viewport = {
  w: number;
  h: number;
  /** Distance caméra → plan z = 0 (où 1 unité = 1 px) */
  cameraZ: number;
};

/** Une couche de la scène WebGL partagée (hero, appareils des projets…). */
export interface GLLayer {
  readonly root: THREE.Object3D;
  /** Recalcule tailles et positions (montage, redimensionnement, refresh de ScrollTrigger). */
  measure(vp: Viewport): void;
  /** La couche a-t-elle besoin d'être mise à jour et redessinée à cette frame ? */
  isActive(): boolean;
  /** Doit-elle apparaître dans l'image (même immobile) ? Par défaut : seulement si active. */
  isVisible?(): boolean;
  update(dt: number): void;
  dispose(): void;
}
