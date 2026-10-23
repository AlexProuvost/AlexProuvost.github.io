import * as THREE from 'three';
import { motion, damp } from '@/motion/store';
import type { GLLayer, Viewport } from './types';

/**
 * Vague d'encre entre les sections : les sections colorées ([data-theme="accent"]) n'ont plus de fond CSS,
 * c'est ce calque qui le peint, derrière le contenu. Leurs bords sont liquides :
 *  - une houle lente, plus haute quand le bord traverse le milieu de l'écran (la section « monte » comme une vague) ;
 *  - le centre se creuse ou se bombe selon la vitesse du scroll (inertie d'un liquide) ;
 *  - la surface se soulève vers la souris quand on s'en approche ;
 *  - un liseré plus clair le long du bord, comme de l'encre fraîche.
 * Sans WebGL : le fond CSS reste en place (bord droit).
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTop;
  uniform float uBottom;
  uniform float uTime;
  uniform float uVel;
  uniform vec2 uMouse;
  uniform vec3 uColor;
  uniform vec3 uRim;
  varying vec2 vUv;

  float edge(float x, float base, float dir, float seed) {
    float n = sin(x * 0.0042 + uTime * 0.8 + seed) * 0.55
            + sin(x * 0.0105 - uTime * 1.3 + seed * 2.0) * 0.3
            + sin(x * 0.024 + uTime * 2.2 + seed * 3.0) * 0.15;
    // Plus de houle quand le bord passe au milieu de l'écran
    float mid = 1.0 - clamp(abs(base - uRes.y * 0.5) / (uRes.y * 0.75), 0.0, 1.0);
    float amp = 8.0 + 64.0 * mid * mid;
    // Inertie : le centre traîne derrière le scroll
    float cx = (x / uRes.x) * 2.0 - 1.0;
    float slosh = (1.0 - cx * cx) * clamp(uVel, -70.0, 70.0) * 2.4;
    // La souris attire la surface
    float dx = (x - uMouse.x) / 160.0;
    float dy = (uMouse.y - base) / 240.0;
    float lift = exp(-dx * dx) * exp(-dy * dy) * 54.0;
    return base + n * amp + slosh - lift * dir;
  }

  void main() {
    vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
    float t = edge(p.x, uTop, 1.0, 0.0);
    float b = edge(p.x, uBottom, -1.0, 4.0);
    float inside = smoothstep(t - 1.0, t + 1.0, p.y) * (1.0 - smoothstep(b - 1.0, b + 1.0, p.y));
    if (inside <= 0.001) discard;
    // Liseré d'encre fraîche le long des bords + léger dégradé
    float rim = exp(-max(p.y - t, 0.0) / 22.0) + exp(-max(b - p.y, 0.0) / 22.0);
    float shade = 0.04 * sin(p.x * 0.002 + p.y * 0.0015 + uTime * 0.3);
    vec3 col = uColor * (1.0 + shade) + uRim * rim * 0.45;
    gl_FragColor = vec4(col, inside);
    #include <colorspace_fragment>
  }
`;

type Field = { el: HTMLElement; mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> };

export class InkWave implements GLLayer {
  readonly root = new THREE.Group();
  private readonly fields: Field[] = [];
  private vp: Viewport = { w: 1, h: 1, cameraZ: 1000 };
  private time = 0;
  private vel = 0;
  private mouse = { x: -9999, y: -9999 };

  constructor() {
    document.querySelectorAll<HTMLElement>('[data-theme="accent"]').forEach((el, i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uRes: { value: new THREE.Vector2(1, 1) },
          uTop: { value: 0 },
          uBottom: { value: 0 },
          uTime: { value: i * 10 },
          uVel: { value: 0 },
          uMouse: { value: new THREE.Vector2(-9999, -9999) },
          uColor: { value: new THREE.Color('#2e3bff') },
          uRim: { value: new THREE.Color('#8d96ff') },
        },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.frustumCulled = false;
      mesh.renderOrder = -1000;
      this.root.add(mesh);
      this.fields.push({ el, mesh });
    });
    if (this.fields.length) document.documentElement.classList.add('gl-ink');
  }

  measure(vp: Viewport) {
    this.vp = vp;
  }

  isActive() {
    return this.fields.some(({ el }) => {
      const r = el.getBoundingClientRect();
      return r.bottom > -140 && r.top < this.vp.h + 140;
    });
  }

  update(dt: number) {
    this.time += dt;
    this.vel = damp(this.vel, motion.smoothVelocity, 0.08, dt);
    const m = motion.mouse;
    this.mouse.x = damp(this.mouse.x < -999 ? m.x : this.mouse.x, m.active ? m.x : -9999, 0.12, dt);
    this.mouse.y = damp(this.mouse.y < -999 ? m.y : this.mouse.y, m.active ? m.y : -9999, 0.12, dt);
    // Deux sections bleues qui se touchent (contact + pied de page) ne forment qu'une nappe d'encre :
    // la première s'étend jusqu'au bas de la suivante, qui n'est pas dessinée (pas de vague entre les deux).
    const rects = this.fields.map(({ el }) => el.getBoundingClientRect());
    const merged = new Set<number>();
    this.fields.forEach(({ mesh }, i) => {
      if (merged.has(i)) {
        mesh.visible = false;
        return;
      }
      const r = rects[i];
      let bottom = r.bottom;
      for (let j = i + 1; j < rects.length && Math.abs(rects[j].top - bottom) < 3; j++) {
        bottom = rects[j].bottom;
        merged.add(j);
      }
      const visible = bottom > -140 && r.top < this.vp.h + 140;
      mesh.visible = visible;
      if (!visible) return;
      const u = mesh.material.uniforms;
      u.uRes.value.set(this.vp.w, this.vp.h);
      u.uTop.value = r.top;
      u.uBottom.value = bottom;
      u.uTime.value += dt;
      u.uVel.value = this.vel;
      u.uMouse.value.set(this.mouse.x, this.mouse.y);
    });
  }

  dispose() {
    document.documentElement.classList.remove('gl-ink');
    this.fields.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }
}
