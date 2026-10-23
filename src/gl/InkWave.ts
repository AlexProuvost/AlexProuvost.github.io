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

// Débord maximal d'un bord liquide autour de sa position (houle 56 + inertie 110 + souris 54, arrondi)
const REACH = 240;

/* Le quad ne couvre que la bande où la section peut se dessiner (de son haut à son bas, ± REACH),
   rognée à l'écran : on ne fait plus calculer les pixels hors de la section. */
const vertex = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTop;
  uniform float uBottom;
  varying vec2 vPx;
  void main() {
    float y0 = clamp(uTop - ${REACH}.0, 0.0, uRes.y);
    float y1 = clamp(uBottom + ${REACH}.0, 0.0, uRes.y);
    float py = mix(y0, y1, 0.5 - position.y);
    vPx = vec2((position.x + 0.5) * uRes.x, py);
    gl_Position = vec4(position.x * 2.0, 1.0 - 2.0 * py / uRes.y, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTop;
  uniform float uBottom;
  uniform float uTime;
  uniform float uSlosh;
  uniform vec2 uMouse;
  uniform float uLift;
  uniform vec3 uColor;
  uniform vec3 uRim;
  varying vec2 vPx;

  float edge(float x, float base, float dir, float seed) {
    // Houle lente : trois longueurs d'onde, sans composante rapide (elle se lisait comme une vibration)
    float n = sin(x * 0.0042 + uTime * 0.8 + seed) * 0.55
            + sin(x * 0.0105 - uTime * 1.1 + seed * 2.0) * 0.3
            + sin(x * 0.019 + uTime * 1.4 + seed * 3.0) * 0.15;
    // Plus de houle quand le bord passe au milieu de l'écran
    float mid = 1.0 - clamp(abs(base - uRes.y * 0.5) / (uRes.y * 0.75), 0.0, 1.0);
    float amp = 6.0 + 50.0 * mid * mid;
    // Inertie : le centre traîne derrière le scroll (déplacement en px, calculé par un ressort côté JS)
    float cx = (x / uRes.x) * 2.0 - 1.0;
    float slosh = (1.0 - cx * cx) * uSlosh;
    // La souris attire la surface ; uLift s'éteint en douceur quand elle quitte la fenêtre
    float dx = (x - uMouse.x) / 160.0;
    float dy = (uMouse.y - base) / 240.0;
    float lift = exp(-dx * dx) * exp(-dy * dy) * 54.0 * uLift;
    return base + n * amp + slosh - lift * dir;
  }

  void main() {
    vec2 p = vPx;
    float shade = 0.04 * sin(p.x * 0.002 + p.y * 0.0015 + uTime * 0.3);
    // Loin des deux bords : encre pleine, sans calculer la houle (la plupart des pixels d'une section)
    if (p.y > uTop + ${REACH}.0 && p.y < uBottom - ${REACH}.0) {
      gl_FragColor = vec4(uColor * (1.0 + shade), 1.0);
      #include <colorspace_fragment>
      return;
    }
    float t = edge(p.x, uTop, 1.0, 0.0);
    float b = edge(p.x, uBottom, -1.0, 4.0);
    float inside = smoothstep(t - 1.0, t + 1.0, p.y) * (1.0 - smoothstep(b - 1.0, b + 1.0, p.y));
    if (inside <= 0.001) discard;
    // Liseré d'encre fraîche le long des bords + léger dégradé
    float rim = exp(-max(p.y - t, 0.0) / 22.0) + exp(-max(b - p.y, 0.0) / 22.0);
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
  /** Vitesse du scroll en px/s, lissée (indépendante de la fréquence d'écran) */
  private vel = 0;
  private lastScroll: number | null = null;
  /** Ressort de l'inertie : déplacement du centre (px) et sa vitesse */
  private slosh = 0;
  private sloshV = 0;
  private mouse = { x: 0, y: 0 };
  private lift = 0;

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
          uSlosh: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uLift: { value: 0 },
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
    const active = this.fields.some(({ el }) => {
      const r = el.getBoundingClientRect();
      return r.bottom > -140 && r.top < this.vp.h + 140;
    });
    // Hors écran, plus de mise à jour : au retour, l'écart de scroll accumulé ne doit pas compter comme une vitesse
    if (!active) {
      this.lastScroll = null;
      this.vel = this.slosh = this.sloshV = 0;
    }
    return active;
  }

  /**
   * Inertie du liquide. La vitesse vient du déplacement réel du scroll (px/s) et non de la vitesse « par frame »
   * de Lenis, trop bruitée (elle dépend de la durée de chaque frame et donnait des tremblements). Un saut
   * (ancre, retour sur la page, recalcul des épinglages) n'est pas une vitesse : il est ignoré. Le centre suit
   * ensuite cette vitesse par un ressort amorti, qui ne peut ni trembler ni repartir tout seul.
   */
  private updateSlosh(dt: number) {
    const scroll = motion.scroll;
    const delta = this.lastScroll === null ? 0 : scroll - this.lastScroll;
    this.lastScroll = scroll;
    const jump = Math.abs(delta) > this.vp.h * 0.75;
    const speed = jump || dt <= 0 ? this.vel : delta / dt;
    this.vel = damp(this.vel, speed, 0.12, dt);
    const target = Math.max(-110, Math.min(110, this.vel * 0.035));
    // Ressort semi-implicite, en petits pas (stable même si une frame dure longtemps)
    const k = 70;
    const c = 2 * 0.8 * Math.sqrt(k);
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.sloshV += (k * (target - this.slosh) - c * this.sloshV) * h;
      this.slosh += this.sloshV * h;
    }
    if (Math.abs(this.slosh) < 0.01 && Math.abs(this.sloshV) < 0.01) this.slosh = this.sloshV = 0;
  }

  update(dt: number) {
    this.updateSlosh(dt);
    // La souris : la position la suit, l'intensité s'allume ou s'éteint (plus de bosse qui traverse l'écran
    // quand elle quitte la fenêtre)
    const m = motion.mouse;
    if (m.active) {
      const snap = this.lift < 0.01;
      this.mouse.x = snap ? m.x : damp(this.mouse.x, m.x, 0.12, dt);
      this.mouse.y = snap ? m.y : damp(this.mouse.y, m.y, 0.12, dt);
    }
    this.lift = damp(this.lift, m.active ? 1 : 0, 0.06, dt);
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
      u.uSlosh.value = this.slosh;
      u.uMouse.value.set(this.mouse.x, this.mouse.y);
      u.uLift.value = this.lift;
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
