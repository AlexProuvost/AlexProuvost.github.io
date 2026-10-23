import * as THREE from 'three';
import { damp, motion } from '@/motion/store';
import type { GLLayer, Viewport } from './types';

/**
 * Le fil d'encre : un trait bleu épais et plat qui serpente derrière le contenu et se dessine au fil du scroll.
 * Chaque fil vit dans une zone de la page ([data-thread="<id>"]) : sa courbe est décrite en fractions
 * de la largeur de la zone (on peut déborder).
 *  - Le maillage est recalé sur la zone à chaque image : il défile exactement avec le texte.
 *  - Sa longueur visible suit l'avancement de la zone dans l'écran, lissée ; une tête arrondie le termine.
 *  - Aplat du bleu signature, sans relief ni profondeur.
 */

type Point = [x: number, y: number];

/**
 * Tracés des fils, par zone. x et y en fractions de la LARGEUR de la zone (les formes gardent leurs proportions
 * quelle que soit la hauteur du texte), y vers le bas depuis le haut de la zone.
 */
const PATHS: Record<string, Point[]> = {
  // Méthode, intro : arrive de la gauche au-dessus du titre, traverse, boucle à droite (le texte est à gauche),
  // puis plonge vers la suite
  approach: [
    [-0.12, -0.2],
    [0.12, -0.12],
    [0.38, 0.02],
    [0.6, 0.075],
    [0.82, -0.008],
    [0.98, 0.11],
    [0.86, 0.27],
    [0.64, 0.19],
    [0.74, 0.08],
    [0.94, 0.23],
    [1.14, 0.39],
  ],
  // À propos : arrive de la droite au-dessus de la phrase, s'enroule en grande boucle sur sa gauche,
  // puis file vers le bas à gauche, vers les chiffres
  about: [
    [1.15, -0.32],
    [0.86, -0.16],
    [0.56, -0.06],
    [0.3, -0.04],
    [0.1, 0.06],
    [0.06, 0.26],
    [0.24, 0.36],
    [0.38, 0.22],
    [0.24, 0.1],
    [0.02, 0.36],
    [-0.16, 0.62],
  ],
};

const vertex = /* glsl */ `
  varying float vU;
  void main() {
    vU = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Aplat de bleu, sans relief : le tube ne sert qu'à donner une épaisseur régulière et des bouts ronds
const fragment = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;
  varying float vU;
  void main() {
    if (vU > uProgress) discard;
    gl_FragColor = vec4(uColor, 1.0);
    #include <colorspace_fragment>
  }
`;

type Strand = {
  el: HTMLElement;
  points: Point[];
  group: THREE.Group;
  tube: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial> | null;
  head: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  tail: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  curve: THREE.CatmullRomCurve3 | null;
  size: { w: number; h: number };
  /** Débord de la courbe autour de la zone (px), pour savoir si elle est à l'écran */
  bounds: { top: number; bottom: number };
  progress: number;
  visible: boolean;
};

export class InkThread implements GLLayer {
  readonly root = new THREE.Group();
  private readonly strands: Strand[] = [];
  private vp: Viewport = { w: 1, h: 1, cameraZ: 1000 };
  private radius = 24;

  /* Le fil est peint au fond de la scène, juste après les vagues d'encre : la page éclatée passe toujours devant.
     Sans test de profondeur ; faces arrière masquées (le tube reste convexe), et là où il se croise,
     le morceau dessiné en dernier (le plus loin sur le tracé) passe dessus. */
  private material(progress = 0) {
    return new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uProgress: { value: progress },
        uColor: { value: new THREE.Color('#2e3bff') },
      },
    });
  }

  constructor() {
    document.querySelectorAll<HTMLElement>('[data-thread]').forEach((el) => {
      const points = PATHS[el.dataset.thread ?? ''];
      if (!points) return;
      const group = new THREE.Group();
      // Tête et queue : des sphères du même bleu (toujours entières)
      const sphere = new THREE.SphereGeometry(1, 32, 16);
      const head = new THREE.Mesh(sphere, this.material(2));
      const tail = new THREE.Mesh(sphere, this.material(2));
      tail.renderOrder = -501;
      head.renderOrder = -499;
      group.add(head, tail);
      this.root.add(group);
      this.strands.push({
        el,
        points,
        group,
        tube: null,
        head,
        tail,
        curve: null,
        size: { w: 0, h: 0 },
        bounds: { top: 0, bottom: 0 },
        progress: 0,
        visible: false,
      });
    });
  }

  /** (Re)construit le tube d'un fil à la taille actuelle de sa zone */
  private build(s: Strand) {
    const w = s.el.offsetWidth;
    const h = s.el.offsetHeight;
    if (w === s.size.w && h === s.size.h && s.tube) return;
    s.size = { w, h };
    // Repère local : origine en haut à gauche de la zone, y vers le haut (comme la scène)
    // Petits écrans : la zone est étroite, on étire le tracé en hauteur pour qu'il respire
    const ky = w < 700 ? 1.9 : 1;
    const pts = s.points.map(([x, y]) => new THREE.Vector3(x * w, -y * w * ky, 0));
    s.curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const length = s.curve.getLength();
    const geometry = new THREE.TubeGeometry(s.curve, Math.max(120, Math.round(length / 6)), this.radius, 20, false);
    if (s.tube) {
      s.tube.geometry.dispose();
      s.tube.geometry = geometry;
    } else {
      s.tube = new THREE.Mesh(geometry, this.material(0));
      s.tube.renderOrder = -500;
      s.group.add(s.tube);
    }
    const ys = pts.map((p) => -p.y);
    s.bounds = { top: Math.min(...ys) - this.radius * 2, bottom: Math.max(...ys) + this.radius * 2 };
    s.head.scale.setScalar(this.radius);
    s.tail.scale.setScalar(this.radius);
    s.tail.position.copy(s.curve.getPointAt(0));
  }

  measure(vp: Viewport) {
    this.vp = vp;
    // Épaisseur du fil : suit la largeur de l'écran
    const r = Math.min(30, Math.max(12, vp.w * 0.017));
    if (r !== this.radius) {
      this.radius = r;
      this.strands.forEach((s) => (s.size = { w: 0, h: 0 }));
    }
    this.strands.forEach((s) => this.build(s));
  }

  isActive() {
    let any = false;
    this.strands.forEach((s) => {
      const r = s.el.getBoundingClientRect();
      s.visible = r.top + s.bounds.bottom > -80 && r.top + s.bounds.top < this.vp.h + 80;
      any ||= s.visible;
    });
    return any;
  }

  update(dt: number) {
    const { w: vw, h: vh } = this.vp;
    this.strands.forEach((s) => {
      s.group.visible = s.visible;
      if (!s.visible || !s.curve || !s.tube) return;
      const r = s.el.getBoundingClientRect();
      // Recalé sur la zone : coin haut gauche de la zone → repère de la scène (origine au centre, y vers le haut)
      s.group.position.set(r.left - vw / 2, vh / 2 - r.top, 0);

      // Longueur dessinée : de l'entrée de la zone en bas d'écran jusqu'à sa sortie par le haut
      const span = s.bounds.bottom - s.bounds.top;
      const target = Math.min(Math.max((vh * 0.92 - (r.top + s.bounds.top)) / (span + vh * 0.35), 0), 1);
      s.progress = motion.reducedMotion ? 1 : damp(s.progress, target, 0.14, dt);
      const p = s.progress;
      s.tube.material.uniforms.uProgress.value = p;
      s.head.visible = p > 0.002 && p < 0.998;
      s.tail.visible = p > 0.002;
      if (s.head.visible) s.head.position.copy(s.curve.getPointAt(p));
    });
  }

  dispose() {
    this.strands.forEach((s) => {
      s.tube?.geometry.dispose();
      s.tube?.material.dispose();
      s.head.geometry.dispose();
      s.head.material.dispose();
      s.tail.material.dispose();
    });
  }
}
