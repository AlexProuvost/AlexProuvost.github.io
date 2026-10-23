import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTexture, roundRect } from './materials';

/**
 * Appareils réalistes modélisés dans three.js (unités : millimètres, à l'échelle réelle) :
 *  - iPhone (format 15 Pro) : châssis en titane aux bords arrondis, verre avant, Dynamic Island,
 *    boutons latéraux, bloc photo à trois objectifs au dos ;
 *  - MacBook Pro 14" : base en aluminium avec clavier et trackpad, écran à encoche monté sur une charnière
 *    (le capot s'ouvre au scroll).
 * Les écrans reçoivent un matériau fourni par l'appelant (captures « vivantes », voir RailDevices.ts).
 */

export const IPHONE = { w: 70.6, h: 146.6, d: 8.25, r: 11 };
export const MACBOOK = { w: 312.6, d: 221.2, base: 9, lid: 5 };

/** Rectangle arrondi centré (Shape) */
export function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Plan arrondi avec des UV 0 → 1 sur sa boîte (pour y poser une image) */
export function roundedPlane(w: number, h: number, r: number, segments = 12) {
  const g = new THREE.ShapeGeometry(roundedShape(w, h, r), segments);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}

export function createDeviceMaterials(env: THREE.Texture | null) {
  const common = { envMap: env, envMapIntensity: 1 };
  return {
    titanium: new THREE.MeshPhysicalMaterial({
      ...common,
      color: '#4a4744',
      metalness: 1,
      roughness: 0.32,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
    }),
    aluminium: new THREE.MeshPhysicalMaterial({ ...common, color: '#2e2e30', metalness: 1, roughness: 0.38 }),
    glass: new THREE.MeshPhysicalMaterial({
      ...common,
      color: '#050506',
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
    backGlass: new THREE.MeshPhysicalMaterial({ ...common, color: '#3a3836', metalness: 0.2, roughness: 0.55 }),
    lens: new THREE.MeshPhysicalMaterial({
      ...common,
      color: '#07080a',
      metalness: 0.4,
      roughness: 0.05,
      clearcoat: 1,
    }),
    black: new THREE.MeshBasicMaterial({ color: '#000000' }),
    trackpad: new THREE.MeshPhysicalMaterial({ ...common, color: '#38383b', metalness: 0.9, roughness: 0.28 }),
  };
}
export type DeviceMaterials = ReturnType<typeof createDeviceMaterials>;

/** iPhone, centré, écran vers +z. Retourne le groupe et le maillage de l'écran. */
export function createIPhone(m: DeviceMaterials, screen: THREE.Material) {
  const { w, h, d, r } = IPHONE;
  const g = new THREE.Group();
  const bevel = 0.7;
  const body = new THREE.ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, r - bevel), {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 18,
  });
  body.translate(0, 0, -(d - bevel * 2) / 2);
  g.add(new THREE.Mesh(body, m.titanium));

  // Verre avant (le noir autour de l'écran)
  const front = new THREE.Mesh(roundedPlane(w - 1.3, h - 1.3, r - 0.65, 18), m.glass);
  front.position.z = d / 2 + 0.02;
  g.add(front);

  // Écran
  const screenMesh = new THREE.Mesh(roundedPlane(w - 4.6, h - 4.6, r - 2.3, 18), screen);
  screenMesh.position.z = d / 2 + 0.05;
  g.add(screenMesh);

  // Dynamic Island
  const island = new THREE.Mesh(roundedPlane(19.6, 5.8, 2.9, 8), m.black);
  island.position.set(0, h / 2 - 2.3 - 3.2 - 2.9, d / 2 + 0.08);
  g.add(island);

  // Boutons : action, volume +, volume − à gauche ; alimentation à droite
  const button = (len: number) => new RoundedBoxGeometry(1.3, len, 3.2, 3, 0.6);
  [
    [-1, 31, 6.5],
    [-1, 47, 14],
    [-1, 64, 14],
    [1, 52, 20],
  ].forEach(([side, top, len]) => {
    const b = new THREE.Mesh(button(len), m.titanium);
    b.position.set(side * (w / 2 + 0.35), h / 2 - top - len / 2, 0);
    g.add(b);
  });

  // Dos : verre dépoli + bloc photo
  const back = new THREE.Mesh(roundedPlane(w - 1.3, h - 1.3, r - 0.65, 18), m.backGlass);
  back.rotation.y = Math.PI;
  back.position.z = -d / 2 - 0.02;
  g.add(back);
  const plateau = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(36, 36, 9), { depth: 1.1, bevelEnabled: false, curveSegments: 12 }),
    m.glass,
  );
  plateau.position.set(w / 2 - 21.5, h / 2 - 21.5, -d / 2 - 1.1);
  g.add(plateau);
  [
    [-7.5, 7.5],
    [-7.5, -7.5],
    [7.5, 0],
  ].forEach(([lx, ly]) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 1.6, 32), m.titanium);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(w / 2 - 21.5 + lx, h / 2 - 21.5 + ly, -d / 2 - 1.6);
    g.add(ring);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(5, 32), m.lens);
    glass.rotation.y = Math.PI;
    glass.position.set(w / 2 - 21.5 + lx, h / 2 - 21.5 + ly, -d / 2 - 2.42);
    g.add(glass);
  });

  return { group: g, screen: screenMesh };
}

/** Clavier dessiné (touches sombres sur l'aluminium) */
function keyboardTexture() {
  return canvasTexture(1600, 640, (ctx, W, H) => {
    ctx.fillStyle = '#1a1a1c';
    ctx.fillRect(0, 0, W, H);
    const rows = [14, 14, 13, 12, 11];
    const gap = 10;
    const top = 22;
    const kh = (H - top - gap * 6) / 6;
    // Rangée des touches de fonction (moins haute)
    ctx.fillStyle = '#0c0c0d';
    for (let i = 0; i < 14; i++) {
      const kw = (W - gap * 15) / 14;
      roundRect(ctx, gap + i * (kw + gap), top - 8, kw, kh * 0.6, 8);
      ctx.fill();
    }
    rows.forEach((n, r) => {
      const y = top + kh * 0.6 + gap + r * (kh + gap);
      const kw = (W - gap * (n + 1)) / n;
      for (let i = 0; i < n; i++) {
        roundRect(ctx, gap + i * (kw + gap), y, kw, kh, 10);
        ctx.fill();
      }
    });
  });
}

/**
 * MacBook Pro 14", base posée sur le plan XZ (y vers le haut), écran vers +z.
 * `hinge.rotation.x` : π/2 = fermé, ≈ −0,26 = ouvert (légèrement incliné vers l'arrière).
 */
export function createMacBook(m: DeviceMaterials, screen: THREE.Material) {
  const { w, d, base, lid } = MACBOOK;
  const g = new THREE.Group();

  const baseMesh = new THREE.Mesh(new RoundedBoxGeometry(w, base, d, 4, 4), m.aluminium);
  baseMesh.position.y = base / 2;
  g.add(baseMesh);

  const keys = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.86, d * 0.4),
    new THREE.MeshBasicMaterial({ map: keyboardTexture() }),
  );
  keys.rotation.x = -Math.PI / 2;
  keys.position.set(0, base + 0.05, -d / 2 + 18 + d * 0.2);
  g.add(keys);

  const pad = new THREE.Mesh(roundedPlane(150, 92, 6), m.trackpad);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, base + 0.05, d / 2 - 12 - 46);
  g.add(pad);

  // Charnière à l'arrière de la base ; le capot tourne autour
  const hinge = new THREE.Group();
  hinge.position.set(0, base, -d / 2 + 3);
  g.add(hinge);
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(w, d - 3, lid, 4, 3), m.aluminium);
  lidMesh.position.set(0, (d - 3) / 2, -lid / 2);
  hinge.add(lidMesh);
  const bezel = new THREE.Mesh(roundedPlane(w - 4, d - 7, 9, 12), m.glass);
  bezel.position.set(0, (d - 3) / 2, 0.06);
  hinge.add(bezel);
  const sw = w - 14;
  const sh = (sw * 10) / 16;
  const screenMesh = new THREE.Mesh(roundedPlane(sw, sh, 6, 12), screen);
  screenMesh.position.set(0, (d - 3) / 2 + 3, 0.12);
  hinge.add(screenMesh);
  const notch = new THREE.Mesh(roundedPlane(30, 7, 3, 6), m.black);
  notch.position.set(0, (d - 3) / 2 + 3 + sh / 2 - 2.4, 0.16);
  hinge.add(notch);

  return { group: g, hinge, screen: screenMesh, screenAspect: sw / sh };
}

/** Ombre douce (dégradé radial) */
export function shadowTexture() {
  return canvasTexture(256, 256, (ctx, W, H) => {
    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  });
}
