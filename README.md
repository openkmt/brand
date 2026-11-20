# KMT — Design System v1.0

> Agents Claude : commencez par **`AGENTS.md`**.

L'empreinte graphique commune à tout ce que KMT construit : openkmt.org, Zeno, EDMS, DevPanel, les CLI, les apps desktop, les contrats, les factures. Un seul principe : **`tokens/tokens.json` est la source unique**, et tout le reste est généré à partir de ce fichier.

Ouvrir **`docs/index.html`** dans un navigateur.

> **Partie privée.** Les modèles de documents officiels (contrats, factures, devis, attestations, procès-verbaux, lettres, cartes de visite, signature e-mail, papier à en-tête Word) et le kit réseaux sociaux vivent dans le dépôt privé `openkmt/kmt-docs`, dossier `Marque/`. Ce dépôt public ne contient que ce qui sert à construire les interfaces.
 C'est la vitrine complète (logo, couleurs, typo, composants, coque d'app, CLI, documents), en thème Papyrus et en thème Noir KMT. Le fichier est autonome et marche hors-ligne.

## Contenu

```
design-system/
├── tokens/tokens.json        ← SOURCE UNIQUE (couleurs, rôles clair/sombre, typo, espaces, rayons, ombres, motion)
├── dist/                     ← généré par `node scripts/build.mjs` — ne pas éditer
│   ├── css/kmt-tokens.css        variables CSS --kmt-*, thèmes clair / sombre / auto
│   ├── js/                       tokens en JS/JSON/TS
│   ├── tailwind/                 preset v3 + @theme v4
│   ├── zeno/kmt.ts               BrandConfig complet pour core/brands (57 tokens)
│   ├── edms/theme.json           thème EDMS (format @edms/theme), clair + sombre
│   ├── documents/charte-kmt.json charte documentaire Zeno (contrats, factures du module RH)
│   └── terminal/                 kmt-cli.mjs + thèmes Ghostty, iTerm2, Windows Terminal, Alacritty
├── ui/
│   ├── kmt-ui.css            bibliothèque de composants (CSS pur, préfixe .kmt-)
│   └── icons/                36 icônes Lucide, trait 1,5, grille 24
├── logo/
│   ├── svg/                  symbole (or, noir, papyrus), lockups clair/sombre/mono, icône app, favicon
│   └── png/                  exports 128/512, icône app 192/512/1024, apple-touch-icon, favicon.ico
├── fonts/                    Space Grotesk, Manrope, JetBrains Mono (woff2, OFL) + kmt-fonts.css
├── docs/index.html           site de documentation (généré depuis docs/src/)
├── AGENTS.md                 brief pour les agents qui intègrent le système dans Zeno, EDMS, DevPanel
└── scripts/                  build.mjs, build_docs.py, icons.py
```

## Les règles en 30 secondes

- **Nom** : on écrit toujours **KMT**, avec le sigle, jamais le nom en toutes lettres : textes, documents, interfaces et code.
- **Couleurs** : Papyrus `#F4EEE3` 55 % · Noir KMT `#16130F` 22 % · Sable `#D8CFBD` 10 % · Or Solaire `#C9993B` 8 % · Nil `#2E5A5C` 5 %.
- **L'or ne se lit jamais sur fond clair** (2,2:1). Sur papyrus, un texte « or » utilise `--kmt-text-gold` (or 700, 4,8:1). L'or plein sert pour le symbole, les fonds de bouton (texte noir), les chiffres sur noir.
- **Typo** : Space Grotesk (titres, chiffres clés), Manrope (texte, UI, libellés d'interface), JetBrains Mono (montants, code, et surtitres éditoriaux en capitales espacées sur le site et les documents).
- **Sans traits** : ni cadres, ni filets, ni soulignés, ni boutons à contour. La mise en page structure déjà : l'espace sépare, un fond (`--kmt-bg-field`, `--kmt-bg-card`) regroupe, la typo hiérarchise. Les ombres sont réservées à ce qui flotte (menus, modales, toasts). Les champs de formulaire sont inline (`.kmt-inline`) : ils ressemblent à du texte et ne montrent un fond qu'au survol et au focus.
- **La grammaire des blocs** : l'interface parle la langue du symbole, une colonne et des modules.
  - *Blocs* : rayons 3 · 6 · 10 px, jamais de pilule pour un bouton.
  - *Modules* : une action, un statut, une icône se détachent en petit bloc à côté de leur contenu. Le bouton KMT = libellé + module d'icône (`<button class="kmt-btn"><span>…</span><i>…</i></button>`) ; au survol le module se détache.
  - *Joint* (`--kmt-joint`, 3 px) : l'écart du symbole. Il découpe boutons, onglets, lignes de tableau, jauges, mosaïques de KPI.
  - *L'or* marque le module actif (entrée de menu, page courante, étape en cours, focus d'un champ), jamais une surface entière.
  - Signatures : eyebrow précédé d'un module or, index mono « 01 », ombre-bloc or nette au survol des tuiles, avatars carrés, jauges en segments, histogrammes en blocs, état vide = le symbole en attente.
- **Grille** : base 8, 12 colonnes, gouttière 24.
- **Icônes** : Lucide, trait 1,5, jamais remplies.
- **Signature des apps** : barre latérale Noir KMT, contenu Papyrus, élément actif en or. Même coque pour Zeno, EDMS et DevPanel.
- **Composants** : ils n'utilisent que des rôles (`--kmt-text-primary`, `--kmt-action-brand`…), jamais une teinte brute. C'est ce qui rend possible le thème sombre.

## Intégration

### N'importe quel projet web
```html
<link rel="stylesheet" href="fonts/kmt-fonts.css">
<link rel="stylesheet" href="dist/css/kmt-tokens.css">
<link rel="stylesheet" href="ui/kmt-ui.css">
<body class="kmt">  <!-- data-theme="sombre" sur <html> pour le thème Noir KMT -->
```
Ou, en dépendance : `"@kmt/design-system": "github:openkmt/brand#main"` (voir « Suite » ci-dessous), puis `import '@kmt/design-system/css'`.

### Zeno (`zeno-kmt`)
1. Remplacer `core/brands/src/brands/kmt.ts` par `dist/zeno/kmt.ts`. Il couvre les 57 tokens du contrat `BRAND_TOKENS` (vérifié) : titres Space Grotesk sans majuscules, libellés d'interface en Manrope sans capitales, chiffres clés en Space Grotesk 28 px, montants en mono, rayons 4/8/16/pill, plus de curseur `_`, et le parti pris « sans traits » (`--border-subtle` transparent, `--border-default` réduit à un fond très léger, pas d'ombre de carte). Attention : certains composants de `core/ui-kit` dessinent leurs bordures en dur ; il faudra une passe sur le kit pour un rendu entièrement sans traits.
2. Charger les polices : `pnpm add @fontsource/space-grotesk @fontsource/manrope @fontsource/jetbrains-mono` dans `apps/web`. Le module RH les a déjà côté PDF.
3. Lancer les tests `core/brands` : `THEME_CONTRAST_PAIRS` vérifie les contrastes. Les rôles ont été calculés AA (≥ 4,5:1).
4. Documents : `dist/documents/charte-kmt.json` correspond au `CharteSchema` de `modules/rh/api/src/charte.ts`. Les logos PNG du module se régénèrent depuis `logo/png/`.
5. Les modèles HTML de documents (dépôt privé `openkmt/kmt-docs`, dossier `Marque/documents/`) balisent leurs champs variables avec `data-champ="…"` (client_nom, numero, total, signataire_nom…) pour le publipostage.

### EDMS / openkmt.org
`dist/edms/theme.json` (et `theme-sombre.json`) suit le schéma `@edms/theme`. Copier `logo/svg/` vers `/brand/` du site et utiliser `logo/png/favicon.ico` et `apple-touch-icon.png`.

### CLI (zeno, edms, devpanel, kmt)
```js
import { kmt } from '@kmt/design-system/cli'
console.log(kmt.banner('zeno', '2.4.0'))   // le symbole en blocs + nom + version
console.log(kmt.step(1, 3, 'Build'), kmt.ok('ok'))
```
Zéro dépendance, truecolor, et respecte `NO_COLOR`. Les thèmes de terminal de `dist/terminal/` donnent la même palette au poste des contributeurs.

### Desktop (Electron / Tauri)
Même CSS que le web. Icône : `logo/png/kmt-icone-app-1024.png` (générer `.icns`/`.ico` depuis ce fichier).

## Modifier le système

```bash
# 1. éditer tokens/tokens.json
node scripts/build.mjs                         # régénère dist/
python3 scripts/build_docs.py                  # régénère docs/index.html
```

## À compléter avant usage officiel

- **Mentions légales** : n° de récépissé de l'association, IBAN, numéro mobile money et téléphones sont marqués `[à compléter]` dans les modèles de documents privés.
- **Contenu juridique** : les modèles de contrat (dépôt privé) sont des **modèles de mise en page**. Faire valider le texte (le persona juridique peut le préparer, un juriste doit le relire).
- **Logo** : les SVG reproduisent le logo du 17 novembre (géométrie relevée sur le PNG officiel, wordmark en Space Grotesk Bold vectorisé et calé sur les lettres d'origine). Si le graphiste a un fichier source vectoriel, le substituer dans `logo/svg/` puis régénérer les exports PNG de `logo/png/`.
- **Brandbook PDF** : la v1.0 d'octobre montre encore le pyramidion et kmt.foundation. Ce design system suit le nouveau symbole et openkmt.org.

## Suite logique

Ce dossier a vocation à devenir le dépôt `openkmt/brand` (ou un paquet `packages/design-system` publié), consommé par Zeno, EDMS et DevPanel comme dépendance. Il ne faudra plus le copier.
