import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createDeviceMaterials, createIPhone, createMacBook, shadowTexture, IPHONE } from '@/gl/devices';

type Cfg = {
  bg: [string, string];
  glow: string;
  kind: 'phones' | 'desktop';
  shots: string[];
  phone?: string[];
};
const W = 2400, H = 1500;

function load(src: string) {
  return new Promise<HTMLImageElement>((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
}
/** Texture d'écran : pages empilées, calées sur la largeur (aspect = largeur / hauteur de l'écran) */
function screenTex(imgs: HTMLImageElement[], aspect: number) {
  const cw = 1600, ch = Math.round(cw / aspect);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d')!;
  let y = 0;
  for (const img of imgs) { const h = (img.naturalHeight / img.naturalWidth) * cw; ctx.drawImage(img, 0, y, cw, h); y += h; if (y >= ch) break; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t;
}
function bgTex(a: string, b: string, glow: string) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 750;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 750); g.addColorStop(0, a); g.addColorStop(1, b);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 750);
  const r = ctx.createRadialGradient(780, 330, 0, 780, 330, 620); r.addColorStop(0, glow); r.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, 1200, 750);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

(window as any).render = async (cfg: Cfg) => {
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = bgTex(cfg.bg[0], cfg.bg[1], cfg.glow);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const m = createDeviceMaterials(env);
  const camera = new THREE.PerspectiveCamera(24, W / H, 10, 5000);
  const shadow = shadowTexture();
  const shadowPlane = (w: number, h: number, o = 1) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false, opacity: o, toneMapped: false })); return p; };
  const shot = await Promise.all(cfg.shots.map(load));
  const screenMat = (tex: THREE.Texture) => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const phoneAspect = (IPHONE.w - 4.6) / (IPHONE.h - 4.6);

  if (cfg.kind === 'phones') {
    const place = [
      { x: 70, y: 6, z: -60, ry: -0.42, rz: -0.02, img: 2 },
      { x: 4, y: 3, z: -18, ry: -0.3, rz: -0.01, img: 1 },
      { x: -64, y: 0, z: 30, ry: -0.18, rz: 0, img: 0 },
    ];
    for (const p of place) {
      const { group } = createIPhone(m, screenMat(screenTex([shot[p.img]], phoneAspect)));
      group.position.set(p.x, p.y, p.z); group.rotation.set(0.04, p.ry, p.rz); scene.add(group);
      const s = shadowPlane(110, 46, 0.8); s.rotation.x = -Math.PI / 2; s.position.set(p.x + 6, -IPHONE.h / 2 - 9, p.z); scene.add(s);
    }
    camera.position.set(-40, 30, 500); camera.lookAt(4, -6, 0);
  } else {
    const phoneShots = await Promise.all((cfg.phone ?? []).map(load));
    const sa = 16 / 10;
    const mac = createMacBook(m, screenMat(screenTex(shot, sa)));
    mac.hinge.rotation.x = -0.26;
    mac.group.position.set(-40, -70, 0); mac.group.rotation.y = 0.42; scene.add(mac.group);
    const s = shadowPlane(480, 340, 0.9); s.rotation.x = -Math.PI / 2; s.position.set(-40, -69.8, 10); s.rotation.z = 0.42; scene.add(s);
    if (phoneShots.length) {
      const { group } = createIPhone(m, screenMat(screenTex([phoneShots[0]], phoneAspect)));
      group.position.set(175, 4, 150); group.rotation.set(-0.04, -0.1, -0.02); scene.add(group);
      const ps = shadowPlane(110, 40, 0.75); ps.rotation.x = -Math.PI / 2; ps.position.set(180, -70 + 0.5, 152); scene.add(ps);
    }
    camera.position.set(290, 215, 840); camera.lookAt(40, 22, 20);
  }
  renderer.render(scene, camera);
  return canvas.toDataURL('image/png');
};
