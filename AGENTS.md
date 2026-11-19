# Brief agents — appliquer le design system KMT (Zeno, EDMS, DevPanel)

Tu travailles sur un produit KMT (Zeno, EDMS ou DevPanel). Ce dossier contient la référence graphique : applique-la, ne l'invente pas. Avant de commencer, lis `README.md` et ouvre `docs/index.html`, qui montre chaque composant en clair et en sombre.

## Règles non négociables

1. **Nom** : toujours **KMT**, en sigle, jamais le nom en toutes lettres (textes, interfaces, documents, code, commits).
2. **Source unique** : les valeurs viennent de `tokens/tokens.json`. Ne copie jamais une couleur, un rayon ou une taille en dur. Si une valeur manque, ajoute-la au JSON, puis lance `node scripts/build.mjs`.
3. **Sans traits** : pas de bordure, pas de filet, pas de soulignement, pas de liseré à gauche, pas de bouton à contour. Ce sont l'espace, les fonds (`--kmt-bg-card`, `--kmt-bg-field`) et la typo qui structurent. Les ombres sont réservées aux surcouches (menus, modales, toasts).
4. **Grammaire des blocs** (voir `ui/kmt-ui.css`, en-tête) :
   - rayons de 3, 6 ou 10 px, et jamais de pilule pour un bouton ;
   - le bouton est un bloc pour le libellé plus un module pour l'icône : `<button class="kmt-btn"><span>Libellé</span><i>icône</i></button>` ;
   - le joint `--kmt-joint` (3 px) sépare les modules : boutons, onglets, lignes de tableau, jauges, mosaïques de KPI ;
   - l'or marque uniquement l'élément actif : entrée de menu, page courante, étape en cours, focus d'un champ.
5. **Couleurs** : Papyrus 55 %, Noir KMT 22 %, Sable 10 %, Or 8 %, Nil 5 %. L'or ne sert jamais de couleur de texte sur fond clair : utilise `--kmt-text-gold` (contraste 4,8:1). Tous les rôles sémantiques sont calculés AA, et il ne faut pas en introduire de nouveaux sans vérifier le contraste.
6. **Typo** : Space Grotesk pour les titres, Manrope pour le texte et l'UI, JetBrains Mono pour les labels en capitales espacées, les montants et le code. Les polices sont auto-hébergées : utilise `fonts/` ou les paquets `@fontsource`.
7. **Icônes** : Lucide, trait 1,5, grille 24, jamais remplies.
8. **Wording** : écris « entreprises », pas « campus ». Zeno est multi-secteur.

## Zeno (`zeno-kmt`, repo openkmt/zeno)

- Remplace `core/brands/src/brands/kmt.ts` par `dist/zeno/kmt.ts`. Il couvre les 57 tokens de `BRAND_TOKENS` : rends les bordures transparentes, et mets les rayons et le pill à 6 px.
- Lance les tests de `core/brands`. `THEME_CONTRAST_PAIRS` doit rester vert.
- Les composants de `core/ui-kit` qui dessinent une bordure en dur (`border: 1px solid ${C.border}`, `1px dashed`…) doivent repasser par les tokens. Aligne le kit sur `ui/kmt-ui.css` : boutons bloc + module, notices module + corps, tableaux en lignes-blocs, onglets en pavés, avatars carrés.
- Documents générés (module RH) : charte `dist/documents/charte-kmt.json`. La mise en page de référence se trouve dans le dépôt privé `openkmt/kmt-docs` (`Marque/documents/*.html`), et les champs variables y sont marqués `data-champ`.
- Polices dans `apps/web` : `@fontsource/space-grotesk`, `@fontsource/manrope`, `@fontsource/jetbrains-mono`.

## EDMS / site openkmt.org (repo openkmt/edms, **privé**)

- Le thème est dans `dist/edms/theme.json` (clair) et `theme-sombre.json`. Le schéma est `@edms/theme`.
- Copie `logo/svg/*` dans `/brand/`. Favicon : `logo/png/favicon.ico`, `logo/svg/favicon.svg`, `apple-touch-icon.png`.
- Pour les pages en CSS libre : importe `fonts/kmt-fonts.css`, `dist/css/kmt-tokens.css` et `ui/kmt-ui.css`, puis ajoute `class="kmt"` sur le body.

## CLI et outils (zeno, edms, devpanel, kmt)

- Utilise `dist/terminal/kmt-cli.mjs` : bannière symbole, `ok`, `warn`, `err`, `step`, `kv`. Il n'a aucune dépendance et respecte `NO_COLOR`.

## Ce qu'il ne faut pas faire

- Ne pas mettre de motif décoratif sur les bannières réseaux sociaux : le kit social est volontairement uni (`social/`). Le motif K (`.kmt-motif`) est réservé aux grands aplats noirs à l'écran ; jamais sur les documents imprimés ou en PDF (il rend mal à l'impression), où la couverture reste un aplat Noir KMT uni.
- Ne pas utiliser d'emoji en guise d'icônes, ni de dégradés, ni de cartes avec un liseré coloré.
- Ne pas modifier ce dossier depuis un repo produit : propose les changements ici, dans `tokens/` ou `ui/`, puis régénère.

## Git et déploiement

- N'utilise jamais `git add -A` ni `git add .` : ajoute les fichiers explicitement.
- Zeno KMT (crm.openkmt.org) et le site EDMS KMT (site.openkmt.org) se déploient **via Coolify uniquement**. Fusionne sur `main`, puis lance un redéploiement dans Coolify (`POST /api/v1/deploy {"uuid":…}`, jeton dans `~/DEV/kemet/.coolify.env`). N'utilise jamais les workflows `deploy-prod` ni `deploy-dev` hérités d'Epitech.
- openkmt.org : rien ne part en production sans le go de Franck.
- Le repo `openkmt/edms` reste privé.
