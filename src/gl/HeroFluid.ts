import * as THREE from 'three';
import { params } from '@/motion/params';
import { motion } from '@/motion/store';
import { Fluid } from './fluid';
import { stackState } from './stackState';
import type { GLLayer, Viewport } from './types';

/**
 * Le hero en liquide : une simulation de fluide couvre toute la section d'ouverture.
 *  - La souris (ou le doigt) laisse des traînées d'encre bleue — le bleu signature et ses nuances, jusqu'au blanc.
 *  - Le logotype ALEX est rendu ici (texture dessinée avec la vraie police) : le liquide le réfracte
 *    et décale ses couleurs là où il passe, puis il se repose net.
 *  - Sans interaction, rien ne bouge : l'écran d'arrivée reste calme, l'encre n'apparaît que sous la souris.
 * Le <h1> du DOM reste en place (référencement, lecteurs d'écran), masqué visuellement quand ce calque tourne.
 */

const PALETTE = ['#2e3bff', '#5b66ff', '#8d96ff', '#e9e6ff'].map((c) => new THREE.Color(c));

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uDye;
  uniform sampler2D uVel;
  uniform sampler2D uWord;
  uniform vec4 uWordRect;   // x, y, largeur, hauteur du mot (fraction de la section, origine en bas à gauche)
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform float uIntro;     // montée du mot à l'ouverture (0 → 1)
  uniform float uReveal;    // 0 = ALEX visible seulement dans l'encre, 1 = en entier (toujours 1 aujourd'hui)
  uniform float uRefract;
  uniform float uGlow;
  uniform vec2 uRes;
  varying vec2 vUv;

  float word(vec2 uv) {
    vec2 w = (uv - uWordRect.xy) / uWordRect.zw;
    w.y += (1.0 - uIntro) * 1.05;   // le mot monte depuis son masque
    if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) return 0.0;
    return texture2D(uWord, w).a;
  }

  void main() {
    vec2 vel = texture2D(uVel, vUv).xy;
    vec3 dye = texture2D(uDye, vUv).rgb;
    float energy = clamp(length(vel) * 0.004, 0.0, 1.0);

    // Réfraction : le liquide pousse l'image du mot ; décalage RVB proportionnel au mouvement
    vec2 off = vel * uRefract / uRes;
    // Déformation bornée : le mot reste lisible même en plein tourbillon
    float ol = length(off);
    if (ol > 0.012) off *= 0.012 / ol;
    // Les petits remous résiduels ne touchent pas le mot : net au repos
    off *= smoothstep(0.0025, 0.008, ol);
    vec2 split = off * 0.22;
    float r = word(vUv - off - split);
    float g = word(vUv - off);
    float b = word(vUv - off + split);
    vec3 text = uInk * vec3(r, g, b);
    // Là où l'encre passe sur le mot, il prend sa couleur
    text = mix(text, text * (0.7 + dye * 1.1), clamp(length(dye) * 1.2, 0.0, 0.6));
    float textMask = max(max(r, g), b);
    // Ouverture cinématique : le mot n'existe d'abord que là où l'encre est passée
    float inkHere = clamp(max(max(dye.r, dye.g), dye.b) * 3.0, 0.0, 1.0);
    float shown = max(inkHere, uReveal);
    textMask *= shown;
    text *= shown;

    // Fond : l'encre luit doucement sur le noir chaud
    // Encre : une fumée bleu signature, au cœur presque blanc
    float ink = clamp(max(max(dye.r, dye.g), dye.b), 0.0, 2.0);
    float smoke = smoothstep(0.02, 0.9, ink);
    vec3 col = mix(uBg, vec3(0.18, 0.23, 1.0), smoke * 0.55 * uGlow * 2.0);
    col += vec3(0.85, 0.87, 1.0) * smoothstep(0.7, 1.7, ink) * 0.16 * uGlow * 2.0;
    col = mix(col, text, textMask);
    // Un fil de lumière sur les crêtes rapides
    col += vec3(0.8, 0.84, 1.0) * energy * 0.06;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export class HeroFluid implements GLLayer {
  readonly root = new THREE.Group();
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly fluid: Fluid;
  private readonly section: HTMLElement | null;
  private readonly wordEl: HTMLElement | null;
  private wordTex: THREE.CanvasTexture | null = null;
  private vp: Viewport = { w: 1, h: 1, cameraZ: 1000 };
  private rect = { x: 0, y: 0, w: 1, h: 1 };
  private last = { x: -1, y: -1, t: 0 };
  private colorIndex = 0;
  private time = 0;
  private wordKey = '';

  constructor(renderer: THREE.WebGLRenderer) {
    this.section = document.querySelector('[data-section="hero"]');
    this.wordEl = document.querySelector('[data-hero-word]');
    this.fluid = new Fluid(renderer, {
      simRes: 128,
      dyeRes: window.innerWidth < 900 ? 320 : 512,
      densityDissipation: 1.4,
      velocityDissipation: 0.9,
      pressure: 0.8,
      pressureIterations: 12,
      curl: 12,
      splatRadius: 0.22,
    });
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uDye: { value: null },
        uVel: { value: null },
        uWord: { value: null },
        uWordRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uBg: { value: new THREE.Color('#0f0e0d') },
        uInk: { value: new THREE.Color('#f0ebe2') },
        uIntro: { value: 0 },
        uReveal: { value: 1 },
        uRefract: { value: 1 },
        uGlow: { value: 0.55 },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    this.mesh.renderOrder = -20; // tout au fond : la page éclatée passe devant
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    if (this.wordEl) document.documentElement.classList.add('gl-hero');
  }

  measure(vp: Viewport) {
    this.vp = vp;
    if (!this.section) return;
    const w = this.section.offsetWidth;
    const h = this.section.offsetHeight;
    this.fluid.resize(w, h);
    // Taille de la simulation : convertit les vitesses (texels / s) en décalage d'image
    const a = this.fluid.aspect;
    this.mesh.material.uniforms.uRes.value.set(a >= 1 ? 128 * a : 128, a >= 1 ? 128 : 128 / a);
    this.drawWord();
  }

  /** Dessine ALEX avec la vraie police, au pixel près de la place du <h1> (mise en page, sans les transforms) */
  private drawWord() {
    const el = this.wordEl;
    const section = this.section;
    if (!el || !section) return;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Position dans la section via la chaîne offsetParent (indépendante de l'animation d'ouverture)
    let left = 0;
    let top = 0;
    for (let n: HTMLElement | null = el; n && n !== section; n = n.offsetParent as HTMLElement | null) {
      left += n.offsetLeft;
      top += n.offsetTop;
    }
    const ew = el.offsetWidth;
    const eh = el.offsetHeight;
    const sw = section.offsetWidth;
    const sh = section.offsetHeight;
    const u = this.mesh.material.uniforms;
    u.uWordRect.value.set(left / sw, 1 - (top + eh) / sh, ew / sw, eh / sh);
    const key = `${ew}x${eh}@${dpr}`;
    if (key === this.wordKey) return;
    this.wordKey = key;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(ew * dpr));
    canvas.height = Math.max(1, Math.round(eh * dpr));
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    ctx.fontStretch = 'expanded';
    ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'alphabetic';
    // Ligne de base comme dans le DOM (demi-interlignage autour des métriques de la police)
    const text = (el.textContent ?? '').toUpperCase();
    const m = ctx.measureText(text);
    const lineH = parseFloat(cs.lineHeight) || size;
    const padTop = parseFloat(cs.paddingTop) || 0;
    const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
    const baseline = padTop + (lineH - content) / 2 + m.fontBoundingBoxAscent;
    ctx.fillText(text, 0, baseline);
    this.wordTex?.dispose();
    this.wordTex = new THREE.CanvasTexture(canvas);
    this.wordTex.minFilter = THREE.LinearFilter;
    this.wordTex.generateMipmaps = false;
    u.uWord.value = this.wordTex;
  }

  isActive() {
    if (!this.section || this.vp.w < 1) return false;
    const r = this.section.getBoundingClientRect();
    this.rect = { x: r.left, y: r.top, w: r.width, h: r.height };
    return r.bottom > 0 && r.top < this.vp.h;
  }

  private colorClock = 0;
  /** Couleur de la traînée : change lentement (sinon les teintes se mélangent en brun) */
  private nextColor(strength: number, advance = false) {
    if (advance || this.colorClock > 0.9) {
      this.colorClock = 0;
      this.colorIndex = (this.colorIndex + 1) % PALETTE.length;
    }
    return PALETTE[this.colorIndex].clone().multiplyScalar(strength);
  }

  update(dt: number) {
    this.time += dt;
    this.colorClock += dt;
    const { x, y, w, h } = this.rect;
    const P = params.fluid;
    this.fluid.config.curl = P.curl;
    this.fluid.config.densityDissipation = P.dissipation;
    this.fluid.config.splatRadius = P.radius;

    // Souris : une touche par frame, proportionnelle au déplacement
    const mx = (motion.mouse.x - x) / w;
    const my = 1 - (motion.mouse.y - y) / h;
    const inside = motion.mouse.active && mx >= 0 && mx <= 1 && my >= 0 && my <= 1;
    if (inside) {
      if (this.last.x >= 0) {
        let dx = mx - this.last.x;
        let dy = my - this.last.y;
        if (this.fluid.aspect < 1) dx *= this.fluid.aspect;
        else dy /= this.fluid.aspect;
        if (Math.abs(dx) + Math.abs(dy) > 0.0004) {
          this.fluid.splat(mx, my, dx * P.force, dy * P.force, this.nextColor(P.ink));
        }
      }
      this.last.x = mx;
      this.last.y = my;
    } else {
      this.last.x = -1;
    }

    this.fluid.step(Math.min(dt, 1 / 30));

    const u = this.mesh.material.uniforms;
    u.uDye.value = this.fluid.dyeTexture;
    u.uVel.value = this.fluid.velocityTexture;
    u.uIntro.value = stackState.word;
    u.uRefract.value = P.refract;
    u.uGlow.value = P.glow;
    this.mesh.scale.set(w, h, 1);
    this.mesh.position.set(x + w / 2 - this.vp.w / 2, this.vp.h / 2 - (y + h / 2), 0);
  }

  dispose() {
    document.documentElement.classList.remove('gl-hero');
    this.fluid.dispose();
    this.wordTex?.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
