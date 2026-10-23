import * as THREE from 'three';

/**
 * Simulation de fluide 2D sur GPU (équations d'Euler incompressibles), d'après la technique popularisée par
 * « WebGL Fluid Simulation » de Pavel Dobryakov (licence MIT) : advection semi-lagrangienne, confinement de
 * vorticité, projection par pression (itérations de Jacobi).
 *
 *  - velocity : champ de vitesses (texels / s), basse résolution
 *  - dye      : « encre » colorée transportée par le fluide, plus haute résolution
 * Tout tient dans des textures demi-flottantes ; chaque étape = un quad plein écran rendu dans une cible.
 */

const vertex = /* glsl */ `
  uniform vec2 texelSize;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  void main() {
    vUv = uv;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const head = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
`;

const shaders = {
  clear: `${head}
    uniform sampler2D uTexture;
    uniform float value;
    void main() { gl_FragColor = value * texture2D(uTexture, vUv); }`,

  splat: `${head}
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main() {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      vec3 splat = exp(-dot(p, p) / radius) * color;
      gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
    }`,

  advection: `${head}
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 velTexel;
    uniform float dt;
    uniform float dissipation;
    void main() {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * velTexel;
      gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
    }`,

  divergence: `${head}
    uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,

  curl: `${head}
    uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,

  vorticity: `${head}
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main() {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
      gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
    }`,

  pressure: `${head}
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float divergence = texture2D(uDivergence, vUv).x;
      gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
    }`,

  gradient: `${head}
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main() {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }`,
};

type Target = THREE.WebGLRenderTarget;
type Double = { read: Target; write: Target; swap(): void };

export type FluidConfig = {
  /** Résolution de la simulation (côté court) */
  simRes: number;
  /** Résolution de l'encre (côté court) */
  dyeRes: number;
  /** Disparition de l'encre (par seconde) */
  densityDissipation: number;
  /** Ralentissement du fluide (par seconde) */
  velocityDissipation: number;
  /** Persistance de la pression entre deux frames */
  pressure: number;
  pressureIterations: number;
  /** Tourbillons */
  curl: number;
  /** Rayon des touches (fraction de l'écran) */
  splatRadius: number;
};

export class Fluid {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly materials: Record<keyof typeof shaders, THREE.ShaderMaterial>;
  private velocity!: Double;
  private dye!: Double;
  private divergence!: Target;
  private curlTarget!: Target;
  private pressureTarget!: Double;
  private simSize = new THREE.Vector2(1, 1);
  private dyeSize = new THREE.Vector2(1, 1);
  aspect = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    readonly config: FluidConfig,
  ) {
    this.materials = Object.fromEntries(
      Object.entries(shaders).map(([k, fragmentShader]) => [
        k,
        new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader,
          uniforms: { texelSize: { value: new THREE.Vector2() } },
          depthTest: false,
          depthWrite: false,
        }),
      ]),
    ) as Record<keyof typeof shaders, THREE.ShaderMaterial>;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.materials.clear);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** (Re)crée les textures pour une zone de w × h px (garde le rapport largeur / hauteur) */
  resize(w: number, h: number) {
    this.aspect = w / Math.max(h, 1);
    const size = (res: number) =>
      this.aspect >= 1
        ? new THREE.Vector2(Math.round(res * this.aspect), res)
        : new THREE.Vector2(res, Math.round(res / this.aspect));
    const sim = size(this.config.simRes);
    const dye = size(this.config.dyeRes);
    if (sim.equals(this.simSize) && dye.equals(this.dyeSize) && this.velocity) return;
    this.disposeTargets();
    this.simSize = sim;
    this.dyeSize = dye;
    const make = (s: THREE.Vector2, filter: THREE.MagnificationTextureFilter) =>
      new THREE.WebGLRenderTarget(s.x, s.y, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: filter,
        magFilter: filter,
        depthBuffer: false,
        stencilBuffer: false,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
      });
    const double = (s: THREE.Vector2, filter: THREE.MagnificationTextureFilter): Double => {
      const d = {
        read: make(s, filter),
        write: make(s, filter),
        swap() {
          const t = d.read;
          d.read = d.write;
          d.write = t;
        },
      };
      return d;
    };
    this.velocity = double(sim, THREE.LinearFilter);
    this.dye = double(dye, THREE.LinearFilter);
    this.divergence = make(sim, THREE.NearestFilter);
    this.curlTarget = make(sim, THREE.NearestFilter);
    this.pressureTarget = double(sim, THREE.NearestFilter);
    [this.velocity.read, this.velocity.write, this.dye.read, this.dye.write].forEach((t) => this.clearTarget(t));
  }

  get dyeTexture() {
    return this.dye.read.texture;
  }

  get velocityTexture() {
    return this.velocity.read.texture;
  }

  private clearTarget(t: Target) {
    const r = this.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(t);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.setRenderTarget(prev);
  }

  private pass(name: keyof typeof shaders, target: Target, uniforms: Record<string, unknown>, texel: THREE.Vector2) {
    const m = this.materials[name];
    m.uniforms.texelSize.value.set(1 / texel.x, 1 / texel.y);
    for (const [k, v] of Object.entries(uniforms)) {
      if (!m.uniforms[k]) m.uniforms[k] = { value: v };
      else m.uniforms[k].value = v;
    }
    this.quad.material = m;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Ajoute du mouvement et de l'encre en (x, y) (coordonnées 0 → 1, origine en bas à gauche).
   * dx, dy : force (texels / s) ; color : couleur ajoutée (linéaire).
   */
  splat(x: number, y: number, dx: number, dy: number, color: THREE.Color, radiusScale = 1) {
    if (!this.velocity) return;
    const prevTarget = this.renderer.getRenderTarget();
    let radius = (this.config.splatRadius / 100) * radiusScale;
    if (this.aspect > 1) radius *= this.aspect;
    const common = { aspectRatio: this.aspect, point: new THREE.Vector2(x, y), radius };
    this.pass(
      'splat',
      this.velocity.write,
      { ...common, uTarget: this.velocity.read.texture, color: new THREE.Vector3(dx, dy, 0) },
      this.simSize,
    );
    this.velocity.swap();
    this.pass(
      'splat',
      this.dye.write,
      { ...common, uTarget: this.dye.read.texture, color: new THREE.Vector3(color.r, color.g, color.b) },
      this.dyeSize,
    );
    this.dye.swap();
    this.renderer.setRenderTarget(prevTarget);
  }

  step(dt: number) {
    if (!this.velocity) return;
    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    r.autoClear = false;
    const c = this.config;
    const sim = this.simSize;
    const velTexel = new THREE.Vector2(1 / sim.x, 1 / sim.y);

    this.pass('curl', this.curlTarget, { uVelocity: this.velocity.read.texture }, sim);
    this.pass(
      'vorticity',
      this.velocity.write,
      { uVelocity: this.velocity.read.texture, uCurl: this.curlTarget.texture, curl: c.curl, dt },
      sim,
    );
    this.velocity.swap();
    this.pass('divergence', this.divergence, { uVelocity: this.velocity.read.texture }, sim);
    this.pass(
      'clear',
      this.pressureTarget.write,
      { uTexture: this.pressureTarget.read.texture, value: c.pressure },
      sim,
    );
    this.pressureTarget.swap();
    for (let i = 0; i < c.pressureIterations; i++) {
      this.pass(
        'pressure',
        this.pressureTarget.write,
        { uPressure: this.pressureTarget.read.texture, uDivergence: this.divergence.texture },
        sim,
      );
      this.pressureTarget.swap();
    }
    this.pass(
      'gradient',
      this.velocity.write,
      { uPressure: this.pressureTarget.read.texture, uVelocity: this.velocity.read.texture },
      sim,
    );
    this.velocity.swap();
    this.pass(
      'advection',
      this.velocity.write,
      {
        uVelocity: this.velocity.read.texture,
        uSource: this.velocity.read.texture,
        velTexel,
        dt,
        dissipation: c.velocityDissipation,
      },
      sim,
    );
    this.velocity.swap();
    this.pass(
      'advection',
      this.dye.write,
      {
        uVelocity: this.velocity.read.texture,
        uSource: this.dye.read.texture,
        velTexel,
        dt,
        dissipation: c.densityDissipation,
      },
      this.dyeSize,
    );
    this.dye.swap();

    r.autoClear = prevAutoClear;
    r.setRenderTarget(prevTarget);
  }

  private disposeTargets() {
    if (!this.velocity) return;
    [
      this.velocity.read,
      this.velocity.write,
      this.dye.read,
      this.dye.write,
      this.divergence,
      this.curlTarget,
      this.pressureTarget.read,
      this.pressureTarget.write,
    ].forEach((t) => t.dispose());
  }

  dispose() {
    this.disposeTargets();
    Object.values(this.materials).forEach((m) => m.dispose());
    this.quad.geometry.dispose();
  }
}
