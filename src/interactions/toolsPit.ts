import type MatterNS from 'matter-js';
import { gsap } from '@/motion/gsap';

/**
 * « Mes outils » (À propos) : une fosse où les pastilles des technos tombent, rebondissent et s'empilent
 * (moteur physique Matter.js, chargé seulement à l'approche de la section).
 *  - Souris : on attrape une pastille et on la lance ; passer vite dessus les bouscule.
 *  - Tactile : un tap fait sauter la pastille (le scroll de la page n'est jamais bloqué).
 *  - Les corps physiques pilotent les pastilles du DOM (transform uniquement) ; le moteur ne tourne
 *    que si la fosse est à l'écran, et s'endort quand tout est posé.
 * Sans JS ou en animations réduites : la pile reste posée (CSS), rien ne bouge.
 */
type Item = { el: HTMLElement; body: MatterNS.Body; w: number; h: number };

const STEP = 1000 / 60;
const WALL = 200;
/** Vitesses maximales (px et radians par pas de 1/60 s) : un lancer reste lisible, rien ne part en flèche */
const MAX_SPEED = 13;
const MAX_SPIN = 0.16;

export function initToolsPit(): () => void {
  const pit = document.querySelector<HTMLElement>('[data-tools-pit]');
  if (!pit || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const fine = window.matchMedia('(pointer: fine)').matches;
  let disposed = false;
  let teardown: (() => void) | null = null;

  const setup = async () => {
    const M = (await import('matter-js')).default;
    if (disposed) return;
    const { Engine, Bodies, Body, Composite, Events, Mouse, MouseConstraint, Query, Sleeping } = M;

    const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1.4 } });
    const els = [...pit.querySelectorAll<HTMLElement>('[data-tool]')];

    // Tailles mesurées dans la pile posée, puis passage en mode physique (pastilles en absolu)
    const sizes = els.map((el) => ({ w: el.offsetWidth, h: el.offsetHeight }));
    pit.setAttribute('data-physics', '');
    let W = pit.clientWidth;
    let H = pit.clientHeight;

    const floor = Bodies.rectangle(W / 2, H + WALL / 2, W * 4, WALL, { isStatic: true });
    const left = Bodies.rectangle(-WALL / 2, -H, WALL, H * 6, { isStatic: true });
    const right = Bodies.rectangle(W + WALL / 2, -H, WALL, H * 6, { isStatic: true });
    Composite.add(engine.world, [floor, left, right]);

    // Départ au-dessus de la fosse (cachées par son bord), en file : elles tomberont l'une après l'autre
    const order = els.map((_, i) => i).sort(() => Math.random() - 0.5);
    const items: Item[] = els.map((el, i) => {
      const { w, h } = sizes[i];
      const rank = order.indexOf(i);
      const x = w / 2 + Math.random() * Math.max(W - w, 1);
      const y = -h - rank * h * 1.6 - Math.random() * 40;
      const body = Bodies.rectangle(x, y, w, h, {
        chamfer: { radius: h / 2 - 0.5 },
        restitution: 0.35,
        friction: 0.35,
        frictionAir: 0.028,
        density: 0.0016,
        angle: (Math.random() - 0.5) * 0.6,
      });
      return { el, body, w, h };
    });
    Composite.add(
      engine.world,
      items.map((it) => it.body),
    );

    // Bride les vitesses après chaque pas : on peut lancer fort, la pastille reste à une allure douce
    Events.on(engine, 'afterUpdate', () => {
      items.forEach(({ body }) => {
        const speed = body.speed;
        if (speed > MAX_SPEED) {
          const k = MAX_SPEED / speed;
          Body.setVelocity(body, { x: body.velocity.x * k, y: body.velocity.y * k });
        }
        if (Math.abs(body.angularVelocity) > MAX_SPIN) {
          Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * MAX_SPIN);
        }
      });
    });

    const draw = () => {
      items.forEach(({ el, body, w, h }) => {
        if (body.isSleeping && el.dataset.drawn) return;
        el.dataset.drawn = '1';
        const { x, y } = body.position;
        el.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px, 0) rotate(${body.angle.toFixed(4)}rad)`;
      });
    };
    draw();

    /* ── Souris : attraper, lancer, bousculer ── */
    let mouse: MatterNS.Mouse | null = null;
    const listeners: Array<[EventTarget, string, EventListener]> = [];
    const on = (t: EventTarget, type: string, fn: EventListener) => {
      t.addEventListener(type, fn);
      listeners.push([t, type, fn]);
    };

    if (fine) {
      mouse = Mouse.create(pit);
      // Matter bloque la molette et le tactile sur l'élément : on les lui retire (la page doit défiler).
      // Mouvement et relâchement sont suivis sur toute la fenêtre : une pastille lâchée hors de la fosse
      // ne reste pas collée au curseur. (Les positions restent calculées par rapport à la fosse.)
      const m = mouse as MatterNS.Mouse & Record<string, EventListener>;
      pit.removeEventListener('wheel', m.mousewheel);
      pit.removeEventListener('touchmove', m.mousemove);
      pit.removeEventListener('touchstart', m.mousedown);
      pit.removeEventListener('touchend', m.mouseup);
      pit.removeEventListener('mousemove', m.mousemove);
      pit.removeEventListener('mouseup', m.mouseup);
      on(window, 'mousemove', m.mousemove);
      on(window, 'mouseup', m.mouseup);
      const grab = MouseConstraint.create(engine, {
        mouse,
        // Lien souple : la pastille suit la souris avec un peu de retard, le lancer est moins sec
        constraint: { stiffness: 0.08, damping: 0.15, render: { visible: false } },
      });
      Composite.add(engine.world, grab);
      Events.on(grab, 'startdrag', () => {
        items.find((it) => it.body === grab.body)?.el.setAttribute('data-grabbed', '');
      });
      Events.on(grab, 'enddrag', () => items.forEach((it) => it.el.removeAttribute('data-grabbed')));

      // Passer vite sur une pastille la bouscule
      let last = { x: 0, y: 0, t: 0 };
      on(pit, 'pointermove', ((e: PointerEvent) => {
        const r = pit.getBoundingClientRect();
        const p = { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp };
        const dt = Math.max(p.t - last.t, 1);
        const vx = (p.x - last.x) / dt;
        const vy = (p.y - last.y) / dt;
        last = p;
        if (grab.body || Math.hypot(vx, vy) < 0.6) return;
        Query.point(
          items.map((it) => it.body),
          p,
        ).forEach((b) => {
          Sleeping.set(b, false);
          Body.setVelocity(b, { x: b.velocity.x + vx * 2.5, y: b.velocity.y + vy * 2.5 - 1.5 });
          Body.setAngularVelocity(b, b.angularVelocity + vx * 0.01);
        });
      }) as EventListener);
    } else {
      // Tactile : un tap fait sauter la pastille
      on(pit, 'click', ((e: MouseEvent) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]');
        const it = items.find((i) => i.el === el);
        if (!it) return;
        Sleeping.set(it.body, false);
        Body.setVelocity(it.body, { x: (Math.random() - 0.5) * 6, y: -11 - Math.random() * 3 });
        Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.2);
      }) as EventListener);
    }

    /* ── Taille de la fosse ── */
    const onResize = () => {
      const w = pit.clientWidth;
      const h = pit.clientHeight;
      if (w === W && h === H) return;
      W = w;
      H = h;
      Body.setPosition(floor, { x: W / 2, y: H + WALL / 2 });
      Body.setPosition(right, { x: W + WALL / 2, y: -H });
      items.forEach(({ body, w: bw }) => {
        Sleeping.set(body, false);
        const x = Math.min(Math.max(body.position.x, bw / 2), W - bw / 2);
        Body.setPosition(body, { x, y: Math.min(body.position.y, H - 20) });
      });
    };
    on(window, 'resize', onResize);

    /* ── Boucle : seulement à l'écran, et après le déclenchement de la chute ── */
    let visible = false;
    let running = false;
    let acc = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (entry.intersectionRatio >= 0.35) running = true;
      },
      { threshold: [0, 0.35] },
    );
    io.observe(pit);

    const tick = (_t: number, deltaMs: number) => {
      if (!visible || !running) return;
      acc = Math.min(acc + deltaMs, STEP * 4);
      while (acc >= STEP) {
        Engine.update(engine, STEP);
        acc -= STEP;
      }
      draw();
    };
    gsap.ticker.add(tick);

    teardown = () => {
      gsap.ticker.remove(tick);
      io.disconnect();
      listeners.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
      if (mouse)
        pit.removeEventListener('mousedown', (mouse as MatterNS.Mouse & Record<string, EventListener>).mousedown);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      pit.removeAttribute('data-physics');
      items.forEach(({ el }) => {
        el.style.transform = '';
        delete el.dataset.drawn;
      });
    };
  };

  // Le moteur se charge à l'approche de la section, pas avant
  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      void setup();
    },
    { rootMargin: '600px 0px' },
  );
  near.observe(pit);

  return () => {
    disposed = true;
    near.disconnect();
    teardown?.();
  };
}
