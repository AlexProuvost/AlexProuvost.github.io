import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const PUB = '/home/claude/portfolio-alex/public';
const data = (p) => 'data:image/webp;base64,' + fs.readFileSync(PUB + p).toString('base64');
const cfgs = {
  nuance: { kind: 'phones', bg: ['#F5ECE1', '#E6D6C3'], glow: 'rgba(255,255,255,0.55)', shots: ['/contenu/nuance-vegetale/accueil.webp', '/contenu/nuance-vegetale/parti-pris.webp', '/contenu/nuance-vegetale/decodeur.webp'] },
  hybrid: { kind: 'desktop', bg: ['#1b1b1b', '#0c0c0c'], glow: 'rgba(255,199,0,0.30)', shots: ['/contenu/hybrid-timing/competitions.webp', '/contenu/hybrid-timing/accueil.webp'], phone: ['/contenu/hybrid-timing/mobile.webp'] },
};
const only = process.argv[2];
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, cfg] of Object.entries(cfgs)) {
  if (only && only !== name) continue;
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.setContent('<body style="margin:0"></body>');
  await p.addScriptTag({ path: 'render.js' });
  const c = { ...cfg, shots: cfg.shots.map(data), phone: (cfg.phone ?? []).map(data) };
  const url = await p.evaluate((c) => window.render(c), c);
  fs.writeFileSync(`${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(name);
  await p.close();
}
await b.close();
