/**
 * Export statique pour GitHub Pages → dossier out/ (+ site-github-pages.zip si `zip` est installé).
 *
 *   npm run export:pages
 *
 * - Le proxy de langue (src/proxy.ts) ne peut pas tourner sur un hébergement statique : il est mis de côté
 *   le temps du build, puis remis en place.
 * - out/index.html redirige vers /fr/ ou /en/ selon la langue du navigateur.
 * - out/.nojekyll : GitHub Pages sert le dossier _next/ tel quel.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const proxy = path.join(root, 'src/proxy.ts');
const parked = path.join(root, 'proxy.ts.parked');
const out = path.join(root, 'out');

fs.renameSync(proxy, parked);
try {
  fs.rmSync(out, { recursive: true, force: true });
  execSync('npx next build', { cwd: root, stdio: 'inherit', env: { ...process.env, STATIC_EXPORT: '1' } });
} finally {
  fs.renameSync(parked, proxy);
}

fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Alex — Développeur web créatif à Tournai</title>
<link rel="canonical" href="./fr/">
<meta http-equiv="refresh" content="0; url=./fr/">
<script>location.replace((navigator.language || 'fr').toLowerCase().startsWith('fr') ? './fr/' : './en/');</script>
<style>html{background:#0f0e0d}</style>
</head>
<body><a href="./fr/">Français</a> · <a href="./en/">English</a></body>
</html>
`,
);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('\n✓ Site statique prêt dans out/');

try {
  const zip = path.join(root, 'site-github-pages.zip');
  fs.rmSync(zip, { force: true });
  execSync(`zip -qr "${zip}" .`, { cwd: out });
  console.log('✓ site-github-pages.zip créé (contenu à déposer à la racine du dépôt)');
} catch {
  console.log('(zip non disponible : dépose directement le contenu de out/)');
}
