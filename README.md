# Portfolio — Alex

« De l'idée au site » — portfolio de développeur web créatif (Tournai, BE), en FR / EN.

**État : direction « éditorial cinéma », couleur signature bleue.**

- Fond noir chaud, typographie géante (Geist serrée + italique serif), et une couleur forte : le bleu signature (`--c-accent`).
- Ouverture à l'encre liquide (WebGL), bandes de texte croisées qui réagissent au scroll.
- Pièce maîtresse 3D : une page web éclatée en 5 couches, qui raconte la méthode puis revient en carte de contact.
- Projets en cartes qui défilent à l'horizontale, avec les vraies captures ; écran de chargement « Bonjour, Hello… ».
- Vague d'encre WebGL entre les sections (Services en bleu, trois offres en cartes), grand logotype bleu en pied de page.
- Sommaire discret en bas d'écran (chapitres 01 → 06, avancement en %).

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000  → redirige vers /fr
```

Autres commandes :

```bash
npm run build      # build de production (pages /fr et /en pré-générées)
npm run start      # sert le build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run format     # Prettier
npm run export:pages  # site statique pour GitHub Pages → out/ + site-github-pages.zip
```

## Mettre en ligne sur GitHub Pages

Le code source vit dans le dépôt **`AlexProuvost.github.io`** (site à la racine : `https://alexprouvost.github.io`).

1. Chaque push sur `main` lance `.github/workflows/deploy.yml` : `npm ci`, `npm run export:pages`, puis mise en ligne du dossier `out/`.
2. Réglage (une fois) : Settings → Pages → Source : _GitHub Actions_.
3. Suivi des déploiements : onglet **Actions** du dépôt. Relancer à la main : Actions → « Déployer sur GitHub Pages » → _Run workflow_.
4. La racine redirige vers `/fr/` ou `/en/` selon la langue du navigateur.

Pour un dépôt d'un autre nom (site à `ton-nom.github.io/portfolio`), il faudrait ajouter `basePath: '/portfolio'` à l'export.

Node 20 ou plus récent.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript strict
- next-intl — `/fr` (par défaut) et `/en`
- Polices auto-hébergées via `next/font/local` : Archivo (display, largeur variable), Geist, Geist Mono, Instrument Serif italique
- CSS Modules + tokens CSS (pas de framework CSS)
- Leva — panneau de réglages **en développement uniquement** (absent du build de prod)
- GSAP 3.15 (ScrollTrigger, SplitText) + Lenis 1.3.26, une seule boucle requestAnimationFrame
- three.js 0.186 + React Three Fiber 9 (+ Drei installé) : un seul canvas, rendu piloté par le ticker GSAP

## Arborescence

```
src/
├─ app/[locale]/            layout (nav, canvas, légendes 3D, barre du bas…) · page (ordre des sections)
│  └─ projets/[slug]/       études de cas (une par projet, pré-générées)
├─ proxy.ts                 redirection de langue (Next 16 : ex-middleware)
├─ i18n/                    routing · request · navigation
├─ messages/                fr.json · en.json  ← tous les textes (<em>…</em> = mot en italique serif)
├─ content/
│  ├─ site.ts               email, liens, URL  ← À COMPLÉTER
│  └─ projects.ts           projets : couleurs, médias (facultatifs), stack
├─ components/
│  ├─ sections/             Hero · Approach · Work · Services · About · Contact
│  └─ ui/                   Nav · MenuOverlay · ScrollRail · Cursor · Footer · Grain · SectionLabel · Marquee
│                           · StackLabels (légendes de la 3D) · StackFallback (pile en CSS sans WebGL)
├─ lib/                     rich.tsx (balise <em>) · typography.tsx
├─ motion/
│  ├─ loop.ts               LA boucle : ticker GSAP → Lenis → ScrollTrigger → store → grain
│  ├─ textReveals.ts        révélations scrubées (data-split / data-reveal) + orchestration
│  ├─ heroFx.ts             ouverture cinématique (pinceau d'encre qui révèle ALEX) ou montée simple
│  ├─ arrival.ts            arrivée par transition ? (saute l'ouverture) · WebGL possible ?
│  ├─ approachFx.ts         trajet de la 3D + méthode épinglée en 4 étapes
│  ├─ filmFx.ts             projets : cartes qui défilent (arrivée, épinglage, parallaxe des captures, glisser)
│  ├─ scrollFx.ts           parallaxes, nav
│  ├─ params.ts             tous les réglages (valeurs par défaut)
│  └─ store.ts              scroll, vitesse lissée, souris (objet mutable)
├─ gl/
│  ├─ Stage.tsx             LE canvas R3F (frameloop="never", fixe, derrière le contenu)
│  ├─ GLRoot.tsx            monte le canvas si WebGL dispo et pas de reduced-motion
│  ├─ mount.ts              caméra « pixel », couches, rendu seulement si visible, qualité adaptative
│  ├─ ExplodedStack.ts      la page éclatée : 5 plaques, vue axonométrique, souris, étapes, assemblage, contact
│  ├─ fluid.ts · HeroFluid.ts  simulation de fluide GPU + logotype ALEX à l'encre (hero)
│  ├─ devices.ts            iPhone 15 Pro et MacBook Pro 14" modélisés en 3D (servent aux couvertures)
│  ├─ InkWave.ts            fonds des sections colorées, au bord liquide (vague d'encre)
│  ├─ plates.ts             dessin des 5 couches (canvas 2D, 1920 × 1200, FR / EN)
│  └─ stackState.ts         avancement (intro, trajet, méthode) partagé avec GSAP
├─ interactions/            cursor · menu · scrollRail · clock · magnetic · contactForm · anchors · transitions (goutte d'encre entre pages) · marquee · preloader · textFx
├─ debug/                   panneau Leva (dev)
├─ styles/                  tokens.css · globals.css
└─ fonts/                   fichiers woff2
```

## À compléter

1. **Formulaire de contact** : il passe par [FormSubmit](https://formsubmit.co), sans compte ni serveur, donc compatible GitHub Pages. **Au tout premier envoi**, FormSubmit envoie un email d'activation à `prouvostalex@gmail.com` : clique sur le lien une fois, et les messages suivants arrivent directement dans ta boîte. Fais un envoi test juste après la mise en ligne.
2. **Captures des projets** : `public/contenu/<projet>/*.webp`, déclarées dans `src/content/projects.ts`, avec leurs textes alternatifs dans `messages/*.json` › `projects.<id>.screens`.
   - **Couvertures** (`public/contenu/covers/*.webp`) : rendus 3D des vrais appareils avec les captures. Pour les refaire après avoir changé une capture : voir `scripts/covers/` (three.js rendu dans Chromium sans écran, puis conversion en WebP).
   - Téléphone : 393 × 850, ou 786 × 1700 en haute définition.
   - Ordinateur : 1900 × 1000.
3. **Études de cas** : textes dans `messages/*.json` › `cases.<id>`. Relis-les et corrige-les : ils sont rédigés à partir de ce que je sais des projets.

## Pour vendre : offres, études de cas, contact

- **Offres (Services)** : chaque offre indique pour qui elle est, ce qui est inclus, un délai indicatif et « Sur devis ». Le bouton « Demander un devis » présélectionne le type de projet dans le formulaire.
- **Études de cas** : `/fr/projets/<slug>` (une page par projet, en FR et en EN), avec contexte, défi, démarche, ce qui a été livré, résultat, galerie et projet suivant.
- **Contact** : sur le fond sombre (le bleu reste la surprise du pied de page). Titre géant, « Disponible » avec l'heure de Tournai, email avec bouton « Copier ». Formulaire en grand : nom, email, entreprise et site (facultatifs), type / budget / délai en pastilles, message. Les champs montent et leurs traits se tracent à l'arrivée ; validation en direct (coche bleue, erreurs en corail), brouillon gardé dans le navigateur. À l'envoi : un cercle d'encre part du bouton bleu, le formulaire s'efface et « Merci {prénom}. » s'écrit en grand avec le récapitulatif. L'email reçu a pour objet « Nouveau projet · type · nom ». Sans JS : envoi classique.

## Effets « waouh »

- **Couleur signature** : un bleu vif (`--c-accent`, `--c-accent-2` pour le petit texte sur le noir). Une section entière peut passer en bleu avec `data-theme="accent"` (les couleurs secondaires suivent).
- **Hero en liquide** (gl/fluid.ts + gl/HeroFluid.ts) : une simulation de fluide sur GPU couvre l'ouverture ; la souris laisse des traînées d'encre bleue. Le logotype ALEX, redessiné en WebGL avec la vraie police, est réfracté par le liquide. Le `<h1>` reste dans le DOM pour le référencement.
- **Ouverture cinématique** (motion/heroFx.ts) : à la première visite, un pinceau d'encre balaie l'écran et révèle ALEX (2,2 s). Un clic, une touche ou la molette accélèrent la fin. En quittant le hero, son texte recule et s'efface (`data-hero-out`).
- **Bandes croisées** (components/ui/Marquee.tsx + interactions/marquee.ts) : deux bandes de texte géant (bleue et crème) défilent en sens contraire, accélèrent avec la vitesse du scroll, changent de sens quand on remonte et se penchent dans le mouvement.
- **Titres** (`data-split="title"`) : chaque ligne monte de son masque en se redressant, une fois, à l'entrée. Les grands titres (`data-skew`) se penchent selon la vitesse du scroll.
- **Titre signature à l'encre** (`data-split="ink"`, motion/inkFilter.ts) : « De l'idée au site. » s'écrit au fil du scroll, des taches d'encre s'étalent et dessinent les lettres (filtre SVG : bruit, flou, seuil).
- **Projets en cartes qui défilent** (components/sections/Work.tsx, motion/filmFx.ts) : à gauche, fixe, le titre, le compteur 01 / 02 et la progression ; à droite, une carte par projet avec les vraies captures (téléphones à plat pour Nuance, navigateur + téléphone pour Hybrid, sans faux appareils 3D). Les cartes arrivent de la droite et se dévoilent de bas en haut ; sur grand écran la section s'épingle et le scroll les fait glisser, les captures en parallaxe, glisser à la souris possible. Au survol : les écrans s'écartent, la 2e page du site apparaît. Dernière carte bleue vers le contact. Mobile / animations réduites : carrousel au doigt. Réglage : `film.speed`.
- **Rail de défilement** (components/ui/ScrollRail.tsx, interactions/scrollRail.ts) : sur le bord droit, « Faites défiler » avec un point qui descend et une flèche qui rebondit en haut de page ; ensuite, l'avancement en %, un repère cliquable par section et le nom de la section en cours.
- **Écran de chargement** (components/ui/Preloader.tsx + interactions/preloader.ts) : à la première visite de la session, « Bonjour, Hello, Hola… » défilent avec un compteur 000 → 100, puis l'écran bleu se lève (bord courbe qui se tend) ; l'ouverture démarre ensuite. Façon Dennis Snellenberg.
- **Le déroulé, en détail** (Approach) : les 4 étapes avec leur durée indicative, ce que le client reçoit et ce dont j'ai besoin ; la ligne du temps se trace au scroll. Textes : `messages/*.json` › `approach.steps[].duration / get / need`.
- **Chiffres et outils** (About) : 4 chiffres qui comptent à l'arrivée (`about.stats`) et la liste des outils (`about.tools`).
- **Index des projets** (repli : mobile, sans WebGL, animations réduites) : liste en typographie géante, couverture dans la ligne (mobile) ou qui suit la souris (CSS).
- **Vague d'encre** (gl/InkWave.ts) : les sections colorées (`data-theme="accent"`) sont peintes en WebGL derrière le contenu, avec des bords liquides : houle plus haute quand le bord traverse l'écran, ballottement selon la vitesse du scroll, surface qui se soulève vers la souris, liseré d'encre fraîche. Sans WebGL : fond CSS.
- **Études de cas** : couverture plein écran qui descend moins vite et zoome au scroll, titre lettre par lettre ; projet suivant en grande image dévoilée au scroll ; appel à l'action sur fond bleu.
- **Pied de page** : sur fond bleu (la vague d'encre y monte), le logotype ALEX en crème, bord à bord, dont les lettres montent une à une (`data-footer-word`).
- **Curseur qui inverse** (interactions/cursor.ts) : sur les grands titres, le point devient un grand disque qui inverse le texte (façon Studio Freight, Dennis Snellenberg).
- **Lettres qui roulent** (`data-roll`, interactions/textFx.ts) : au survol des boutons et des liens du menu, chaque lettre roule vers le haut et sa copie arrive par le bas, en cascade.
- **Texte qui se décode** (`data-scramble`) : au survol des petits liens (langue, retour en haut, retour aux projets) et à l'arrivée des noms de section, des signes aléatoires se fixent un à un.
- **Galerie des études de cas** : les captures se penchent selon la vitesse du scroll (`data-skew`).
- **Changement de page à l'encre** (interactions/transitions.ts) : une tache d'encre bleue naît sous le clic, projette des gouttes et s'étale jusqu'à couvrir l'écran ; sur la nouvelle page, elle se rétracte en une goutte au centre.
- **Performance** : rendu limité à 1,5× la densité de pixels, qualité qui baisse toute seule si les images par seconde chutent, simulation du fluide allégée sur mobile ; les bandes défilantes ne calculent que lorsqu'elles sont à l'écran.

## La pièce maîtresse : la page web éclatée

- **Hero** : une page web en cinq couches superposées (01 Brief, 02 Grille, 03 Wireframe, 04 Typographie, 05 Interface), en vue axonométrique, avec des légendes façon dessin technique. Elle bascule doucement sous la souris.
- **Au scroll** : elle glisse du hero vers la scène de la méthode.
- **Méthode (épinglée)** : _Comprendre_ met le brief en avant ; _Structurer_ la grille et le wireframe ; _Donner vie_ la typo et l'interface. À _Livrer_, les couches se referment et la page finie se redresse face à l'écran.
- Plaques en `MeshBasicMaterial` + textures 2× : rendu net, couleurs exactes. Filets fins sur les bords, vraie épaisseur pour les plaques pleines.
- Sans WebGL : une pile en CSS (StackFallback). En `prefers-reduced-motion` : pas de 3D, pas d'épinglage, tout le texte visible.

## Services, à propos, contact

- **Services** : trois offres en cartes côte à côte (pour qui, inclus, délai, « Sur devis », bouton « Demander un devis »). Au survol, la carte s'éclaire légèrement.
- **À propos** : la déclaration s'allume mot par mot au scroll.
- **Contact** : titre géant et formulaire en grand sur le fond sombre (détails plus haut, « Pour vendre »).

## Interface

- **Curseur** : point à inertie, grossit sur les liens ; étiquette via `data-cursor-label`. Absent sur tactile.
- **Boutons magnétiques** : `data-magnetic` (+ `data-magnetic-inner`).
- **Liens soulignés** : le trait file puis revient au survol (`.link-underline`).
- **Menu** : plein écran, Échap pour fermer ; les liens passent en italique serif au survol.
- **Barre du bas** : le chapitre en cours (01 → 06) et sa progression, l'avancement de la page en %.

## Réglages Leva (dev)

| Dossier         | Réglage                                             | Effet                                                           |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Global          | `grain.opacity` / `grain.fps`                       | grain pellicule (0,045 / 10 i/s)                                |
| Global          | `debug.grid`                                        | grille 12 colonnes par-dessus le site                           |
| Scroll          | `scroll.lerp`                                       | lissage : bas = plus glissant, haut = plus nerveux (0,09)       |
| Scroll          | `scroll.wheelMultiplier` / `touchMultiplier`        | distance par cran / au doigt (1 / 1,2)                          |
| Texte           | `scrub`                                             | retard de rattrapage des révélations (0,8 s ; 0 = collé)        |
| Texte           | `text.duration` / `text.stagger` / `text.ease`      | rythme des lignes                                               |
| Texte           | `text.yPercent`                                     | distance de montée des lignes (115 %)                           |
| Texte › window  | `text.start` / `text.end`                           | où l'animation commence / finit (94 → 55 % de l'écran)          |
| Hero            | `intro.delay` / `intro.duration` / `intro.stagger`  | rythme de l'ouverture (0,2 / 1,4 / 0,08)                        |
| Hero            | `intro.cinematic`                                   | durée de l'ouverture au pinceau d'encre (2,2 s)                 |
| Méthode         | `pin.length`                                        | durée de l'épinglage de la méthode, en écrans (3,2)             |
| Méthode         | `pin.scrub`                                         | lissage de la méthode (0,6 s)                                   |
| Liquide (hero)  | `fluid.force` / `fluid.ink`                         | force et quantité d'encre des traînées (5200 / 0,11)            |
| Liquide (hero)  | `fluid.radius` / `fluid.curl` / `fluid.dissipation` | taille, tourbillons, disparition des traînées (0,22 / 12 / 1,4) |
| Liquide (hero)  | `fluid.refract` / `fluid.glow`                      | déformation d'ALEX / lueur de l'encre (0,028 / 0,5)             |
| Page éclatée 3D | `stack.focus`                                       | décalage de la couche mise en avant à chaque étape (0,12)       |
| Page éclatée 3D | `stack.spread`                                      | écart entre les couches (0,3)                                   |
| Page éclatée 3D | `stack.tilt` / `stack.rotate`                       | angle de vue axonométrique (54° / 38°)                          |
| Page éclatée 3D | `stack.mouse`                                       | bascule sous la souris (7°)                                     |
| Page éclatée 3D | `stack.float`                                       | flottement des couches (6 px)                                   |
| Effets          | `magnetic`                                          | attraction des boutons magnétiques (0,28)                       |

Une fois les bons réglages trouvés, recopie les valeurs dans `src/motion/params.ts` : ce sont celles utilisées en production.

Le panneau est replié en haut à droite, sous la navigation, et se déplace par sa barre de titre.

## Points d'accroche pour les animations

`data-section` (+ `data-section-label` = nom du chapitre), `data-split="title|lines"`, `data-reveal="up|label"`,
`data-hero-*`, `data-stack-anchor="hero|approach"`, `data-stack-label`, `data-approach-*`,
`data-film-*`, `data-count`, `data-work-index` / `data-project-link` / `data-cover-img`, `data-case-cover`, `data-skew`, `data-hero-out`, `data-reveal="image"`, `data-footer-word`, `data-marquee-track`, `data-parallax`,
`data-magnetic`, `data-cursor-label`, `data-work-*`, `data-sheet`, `data-service-*`, `data-split="light"`.
