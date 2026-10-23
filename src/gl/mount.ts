import * as THREE from 'three';
import { gsap, ScrollTrigger } from '@/motion/gsap';
import { ExplodedStack } from './ExplodedStack';
import { HeroFluid } from './HeroFluid';
import { InkWave } from './InkWave';
import { siteFont } from './materials';
import type { GLLayer, Viewport } from './types';

type MountOptions = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Dessine une frame (R3F : advance ; aperçu autonome : renderer.render) */
  render: (timeMs: number) => void;
};

/**
 * Monte les couches 3D du site dans la scène et les branche sur LA boucle (ticker GSAP).
 * Chaque frame : seules les couches visibles sont mises à jour, et on ne dessine que s'il y a quelque chose.
 * Partagé par le canvas React Three Fiber (site) et par l'aperçu autonome.
 */
export function mountGL({ renderer, scene, camera, render }: MountOptions): () => void {
  const layers: GLLayer[] = [];
  let disposed = false;
  let wasActive = true;
  const viewport: Viewport = { w: 1, h: 1, cameraZ: 1000 };

  // Caméra « pixel » : à z = 0, 1 unité = 1 px d'écran.
  // On mesure le canvas lui-même (100vw × 100vh), pas la fenêtre : sur mobile, innerHeight change quand la barre
  // d'adresse apparaît ou disparaît alors que le canvas, lui, ne bouge pas ; l'écart décalait les vagues d'encre
  // et la 3D, qui sautaient toutes seules pendant le scroll.
  const fit = () => {
    const box = renderer.domElement.getBoundingClientRect();
    const w = box.width || window.innerWidth;
    const h = box.height || window.innerHeight;
    camera.fov = 35;
    camera.aspect = w / h;
    camera.position.set(0, 0, h / 2 / Math.tan((camera.fov * Math.PI) / 360));
    camera.near = 10;
    camera.far = camera.position.z * 8;
    camera.updateProjectionMatrix();
    Object.assign(viewport, { w, h, cameraZ: camera.position.z });
    layers.forEach((l) => l.measure(viewport));
  };
  fit();

  // Les textures des plaques utilisent les polices du site : on attend qu'elles soient prêtes
  const fonts = [
    `500 40px ${siteFont('--font-geist')}`,
    `400 40px ${siteFont('--font-geist-mono')}`,
    `italic 400 40px ${siteFont('--font-serif')}`,
  ];
  Promise.all([document.fonts.ready, ...fonts.map((f) => document.fonts.load(f).catch(() => []))]).then(() => {
    if (disposed) return;
    layers.push(
      new InkWave(),
      new HeroFluid(renderer),
      new ExplodedStack(camera, renderer.capabilities.getMaxAnisotropy()),
    );
    layers.forEach((l) => scene.add(l.root));
    document.documentElement.classList.add('gl-on');
    fit();
    // L'ouverture cinématique (motion/heroFx.ts) attend la scène
    window.dispatchEvent(new Event('gl-ready'));
  });

  ScrollTrigger.addEventListener('refresh', fit);
  window.addEventListener('resize', fit);

  // Résolution plafonnée à 1,5× (le grain et le flou de mouvement masquent la différence), puis adaptative
  if (renderer.getPixelRatio() > 1.5) renderer.setPixelRatio(1.5);
  // Qualité adaptative : si les frames durent trop longtemps, on baisse la résolution (jusqu'à 1×)
  let frameAvg = 1 / 60;
  let frames = 0;
  const adapt = (dt: number) => {
    frameAvg += (dt - frameAvg) * 0.05;
    if (++frames < 90) return;
    frames = 0;
    const dpr = renderer.getPixelRatio();
    if (frameAvg > 1 / 52 && dpr > 1) renderer.setPixelRatio(Math.max(1, dpr - 0.25));
  };

  const tick = (time: number, deltaMs: number) => {
    if (!layers.length) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    let any = false;
    layers.forEach((l) => {
      const active = l.isActive();
      l.root.visible = active || (l.isVisible?.() ?? false);
      if (active) {
        l.update(dt);
        any = true;
      }
    });
    // La résolution change AVANT de dessiner : redimensionner le canvas l'efface, et le faire après le rendu
    // laissait une frame vide à l'écran (vagues qui clignotent)
    if (any) adapt(dt);
    // Une dernière frame quand tout sort de l'écran (pour l'effacer), puis plus rien
    if (any || wasActive) render(time * 1000);
    wasActive = any;
  };
  gsap.ticker.add(tick);

  return () => {
    disposed = true;
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refresh', fit);
    window.removeEventListener('resize', fit);
    document.documentElement.classList.remove('gl-on');
    layers.forEach((l) => {
      scene.remove(l.root);
      l.dispose();
    });
  };
}

/** Le navigateur sait-il faire du WebGL ? */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
