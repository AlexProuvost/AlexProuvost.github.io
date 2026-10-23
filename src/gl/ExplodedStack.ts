import * as THREE from 'three';
import { params } from '@/motion/params';
import { motion, damp } from '@/motion/store';
import { canvasTexture } from './materials';
import { plateDefs, CORNER, TEX_W, TEX_H } from './plates';
import { stackState } from './stackState';
import type { GLLayer, Viewport } from './types';

/**
 * La pièce maîtresse : une page web éclatée en cinq couches (brief, grille, wireframe, typographie, interface),
 * en vue axonométrique.
 *
 *  - Hero : la pile flotte dans [data-stack-anchor="hero"], bascule doucement sous la souris.
 *  - Scroll : elle glisse vers [data-stack-anchor="approach"] (stackState.travel).
 *  - Méthode (épinglée) : chaque étape met ses couches en avant (les autres s'estompent),
 *    puis à « Livrer » tout se referme en une seule page, qui se redresse face à l'écran.
 *  - Contact : la pile revient une dernière fois et se referme en carte de contact (stackState.contact).
 *
 * Plaques en MeshBasicMaterial (pas d'éclairage : les textures restent nettes et fidèles aux couleurs),
 * filets fins sur les bords, épaisseur réelle pour les plaques pleines.
 * Les légendes (DOM, components/ui/StackLabels.tsx) sont placées chaque frame à côté de leur plaque.
 */

const PW = TEX_W / TEX_H; // largeur d'une plaque (hauteur = 1)
const PH = 1;
const THICK = 0.022;
/** Couches mises en avant à chaque étape de la méthode (indices des plaques) */
const STEP_PLATES = [[0], [1, 2], [3, 4], [4]];

const deg = THREE.MathUtils.degToRad;
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const smooth = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = THREE.MathUtils.lerp;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

type Plate = {
  group: THREE.Group;
  face: THREE.MeshBasicMaterial;
  side?: THREE.MeshBasicMaterial;
  line: THREE.LineBasicMaterial;
  opaque: boolean;
  label: HTMLElement | null;
  /** Mise en avant lissée (0 → 1) */
  focus: number;
};

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export class ExplodedStack implements GLLayer {
  readonly root = new THREE.Group();
  private readonly mouseGroup = new THREE.Group();
  private readonly axo = new THREE.Group();
  private readonly plates: Plate[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly heroEl: HTMLElement | null;
  private readonly approachEl: HTMLElement | null;
  private readonly contactEl: HTMLElement | null;
  private surfaceTex!: THREE.Texture;
  private contactTex!: THREE.Texture;
  private vp: Viewport = { w: 1, h: 1, cameraZ: 1000 };
  private time = 0;
  /** Disposition calculée dans isActive(), réutilisée par update() */
  private layout = { cx: 0, cy: 0, w: 1, h: 1, travel: 0, contact: 0 };
  private readonly rot = new THREE.Matrix4();
  private readonly tmp = new THREE.Vector3();
  private readonly isMobile = () => this.vp.w < 900;
  private shown = false;

  constructor(
    private readonly camera: THREE.Camera,
    maxAniso = 8,
  ) {
    this.heroEl = document.querySelector('[data-stack-anchor="hero"]');
    this.approachEl = document.querySelector('[data-stack-anchor="approach"]');
    this.contactEl = document.querySelector('[data-stack-anchor="contact"]');
    this.root.add(this.mouseGroup);
    this.mouseGroup.add(this.axo);
    this.axo.rotation.order = 'XYZ';

    const shape = roundedShape(PW, PH, CORNER);
    const flat = new THREE.ShapeGeometry(shape, 8);
    const solid = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 8 });
    solid.translate(0, 0, -THICK); // la face du dessus à z = 0, comme les calques
    const outline = new THREE.BufferGeometry().setFromPoints(
      shape.getPoints(8).map((p) => new THREE.Vector3(p.x, p.y, 0.0005)),
    );
    this.disposables.push(flat, solid, outline);

    const labels = document.querySelectorAll<HTMLElement>('[data-stack-label]');
    const { plates, contact } = plateDefs(document.documentElement.lang);
    // Résolution des textures selon l'écran : les plaques s'affichent bien plus petites que 1920 × 1200.
    // Sur un écran courant on dessine à 60 % (≈ 2,5× moins de mémoire graphique, envoi plus rapide) ;
    // pleine résolution seulement sur les grands écrans haute densité. Le dessin, lui, ne change pas.
    const res = Math.min(1, Math.max(0.6, (window.innerWidth * Math.min(window.devicePixelRatio, 1.5)) / 2400));
    const makeTex = (draw: Parameters<typeof canvasTexture>[2]) => {
      const tex = canvasTexture(
        Math.round(TEX_W * res),
        Math.round(TEX_H * res),
        (ctx) => {
          ctx.scale(res, res);
          draw(ctx, TEX_W, TEX_H);
        },
        maxAniso,
      );
      // UV des formes = coordonnées brutes (-PW/2…PW/2) → ramenées à 0…1
      tex.repeat.set(1 / PW, 1 / PH);
      tex.offset.set(0.5, 0.5);
      return tex;
    };
    this.contactTex = makeTex(contact);
    this.disposables.push(this.contactTex);

    plates.forEach((def, i) => {
      const tex = makeTex(def.draw);
      if (def.key === 'surface') this.surfaceTex = tex;
      const face = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: def.opaque,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const line = new THREE.LineBasicMaterial({
        color: '#f0ebe2',
        transparent: true,
        opacity: def.opaque ? 0.18 : 0.32,
        depthWrite: false,
        toneMapped: false,
      });
      const group = new THREE.Group();
      let side: THREE.MeshBasicMaterial | undefined;
      if (def.opaque) {
        side = new THREE.MeshBasicMaterial({ color: def.side, transparent: true, toneMapped: false });
        const mesh = new THREE.Mesh(solid, [face, side]);
        mesh.renderOrder = i;
        group.add(mesh);
      } else {
        const mesh = new THREE.Mesh(flat, face);
        mesh.renderOrder = i;
        group.add(mesh);
      }
      const edge = new THREE.LineLoop(outline, line);
      edge.renderOrder = i + 0.5;
      group.add(edge);
      this.axo.add(group);
      this.disposables.push(tex, face, line, ...(side ? [side] : []));
      this.plates.push({ group, face, side, line, opaque: def.opaque, label: labels[i] ?? null, focus: 0 });
    });
  }

  measure(vp: Viewport) {
    this.vp = vp;
  }

  /** Échelle (px par unité) pour que la pile, telle qu'orientée, tienne dans w × h */
  private fit(w: number, h: number, tilt: number, rotZ: number, spread: number, room: number) {
    this.rot.makeRotationFromEuler(new THREE.Euler(-deg(tilt), 0, deg(rotZ), 'XYZ'));
    const zMax = 2 * spread + 0.08;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const x of [-PW / 2, PW / 2])
      for (const y of [-PH / 2, PH / 2])
        for (const z of [-zMax, zMax]) {
          this.tmp.set(x, y, z).applyMatrix4(this.rot);
          minX = Math.min(minX, this.tmp.x);
          maxX = Math.max(maxX, this.tmp.x);
          minY = Math.min(minY, this.tmp.y);
          maxY = Math.max(maxY, this.tmp.y);
        }
    return Math.min((w * room) / (maxX - minX), (h * room) / (maxY - minY));
  }

  isActive() {
    if (!this.heroEl || !this.approachEl) return false;
    const l = this.layout;
    l.contact = clamp01(stackState.contact);
    let r: DOMRect;
    if (l.contact > 0.001 && this.contactEl) {
      // Fin du site : la carte revient dans le contact
      r = this.contactEl.getBoundingClientRect();
      l.travel = 1;
      l.cx = r.left + r.width / 2;
      l.cy = r.top + r.height / 2;
      l.w = r.width;
      l.h = r.height;
    } else {
      const hr = this.heroEl.getBoundingClientRect();
      const ar = this.approachEl.getBoundingClientRect();
      const travel = easeInOut(clamp01(stackState.travel));
      l.travel = travel;
      l.cx = lerp(hr.left + hr.width / 2, ar.left + ar.width / 2, travel);
      l.cy = lerp(hr.top + hr.height / 2, ar.top + ar.height / 2, travel);
      l.w = lerp(hr.width, ar.width, travel);
      l.h = lerp(hr.height, ar.height, travel);
    }
    // Visible si la zone (un peu agrandie) recoupe l'écran
    const mx = l.w * 0.7;
    const my = l.h * 0.7;
    const visible = l.cx + mx > 0 && l.cx - mx < this.vp.w && l.cy + my > 0 && l.cy - my < this.vp.h;
    // En sortant de l'écran : on range les légendes
    if (!visible && this.shown) this.plates.forEach((p) => p.label && (p.label.style.opacity = '0'));
    this.shown = visible;
    return visible;
  }

  update(dt: number) {
    this.time += dt;
    const P = params.stack;
    const l = this.layout;
    const intro = clamp01(stackState.intro);
    const inContact = l.contact > 0.001;
    const s4 = inContact ? 0 : clamp01(stackState.approach) * 4;
    // Contact : la pile arrive éclatée puis se referme en carte de contact
    const close = inContact ? smooth(0.4, 0.9, l.contact) : smooth(2.85, 3.45, s4) * l.travel;
    const assemble = close;
    const highlight = inContact ? 0 : l.travel * (1 - assemble);
    const surfaceMap = inContact ? this.contactTex : this.surfaceTex;
    const surface = this.plates[4];
    if (surface && surface.face.map !== surfaceMap) surface.face.map = surfaceMap;

    // Orientation : axonométrique au repos, presque de face une fois assemblée
    const tilt = lerp(P.tilt, 8, assemble);
    const rotZ = lerp(P.rotate, 0, assemble);
    const base = inContact && this.isMobile() ? P.spread * 0.5 : P.spread;
    const spread = lerp(lerp(base, base * 1.3, inContact ? 0 : l.travel), 0.004, assemble);
    // (place laissée aux légendes à droite dans la scène de la méthode)
    const room = lerp(this.isMobile() ? 1 : lerp(0.94, 0.8, inContact ? 0 : l.travel), 0.98, assemble);
    const scale = this.fit(l.w, l.h, tilt, rotZ, Math.max(spread, 0.02), room);

    // Dans la scène de la méthode, la pile pivote lentement tout au long du scroll (on sent qu'on avance,
    // même entre deux étapes). Pas prise en compte dans le cadrage : la taille ne pompe pas.
    const orbit = inContact ? 0 : l.travel * (1 - assemble) * (clamp01(stackState.approach) - 0.5) * 26;

    this.root.position.set(l.cx - this.vp.w / 2, this.vp.h / 2 - l.cy, 0);
    this.root.scale.setScalar(scale);
    this.axo.rotation.set(-deg(tilt + orbit * 0.25), 0, deg(rotZ + orbit));

    // Souris : légère bascule de toute la pile (moins forte dans la scène épinglée)
    const m = deg(P.mouse) * (motion.mouse.active ? 1 : 0) * (1 - 0.5 * l.travel);
    this.mouseGroup.rotation.x = damp(this.mouseGroup.rotation.x, -motion.mouse.ny * m, 0.08, dt);
    this.mouseGroup.rotation.y = damp(this.mouseGroup.rotation.y, motion.mouse.nx * m, 0.08, dt);

    const showLabels = !this.isMobile();
    this.root.updateMatrixWorld();

    this.plates.forEach((p, i) => {
      // Mise en avant selon l'étape en cours
      let target = 0;
      STEP_PLATES.forEach((list, k) => {
        if (!list.includes(i)) return;
        const rise = k === 0 ? 1 : smooth(k - 0.2, k + 0.2, s4);
        const fall = 1 - smooth(k + 0.8, k + 1.2, s4);
        target = Math.max(target, rise * fall);
      });
      p.focus = damp(p.focus, target, 0.12, dt);
      const focus = p.focus * highlight;

      // Ouverture : chaque plaque descend à sa place, de bas en haut
      const e = inContact ? smooth(0, 1, l.contact * 3.2 - i * 0.12) : smooth(0, 1, intro * 1.6 - i * 0.15);
      const drop = (1 - e) * 1.4;
      const float = (Math.sin(this.time * 0.9 + i * 1.3) * P.float) / scale;

      p.group.position.set(focus * P.focus * PW, 0, (i - 2) * spread + drop + float * (1 - assemble) + focus * 0.12);

      // Opacité : estompée si une autre couche est mise en avant
      const dim = lerp(1, 0.14 + 0.86 * p.focus, highlight);
      // À l'assemblage, les calques transparents se fondent dans la page finie
      const merge = p.opaque ? 1 : 1 - assemble;
      const alpha = e * dim * merge;
      p.face.opacity = alpha;
      if (p.side) p.side.opacity = alpha;
      p.line.opacity = alpha * (p.opaque ? 0.18 : 0.32) * (1 - assemble * 0.6);
      p.group.visible = alpha > 0.002;

      // Légende à côté du coin le plus à droite de la plaque
      if (p.label) {
        const a = showLabels && !inContact ? alpha * (1 - assemble) * lerp(0.75, 0.35 + 0.65 * p.focus, highlight) : 0;
        if (a > 0.01) {
          this.tmp.set(PW / 2, -PH / 2, 0);
          p.group.localToWorld(this.tmp);
          this.tmp.project(this.camera);
          const x = (this.tmp.x * 0.5 + 0.5) * this.vp.w;
          const y = (-this.tmp.y * 0.5 + 0.5) * this.vp.h;
          p.label.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - 6).toFixed(1)}px, 0)`;
        }
        p.label.style.opacity = a.toFixed(3);
      }
    });
  }

  dispose() {
    if (this.plates[4]) this.plates[4].face.map = this.surfaceTex;
    this.plates.forEach((p) => p.label && (p.label.style.opacity = '0'));
    this.disposables.forEach((d) => d.dispose());
  }
}
