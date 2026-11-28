/**
 * @openkmt/marque — format `marque/v1`, templates et règles déterministes de
 * la marque à l'installation (Fondation KMT). ESM pur, zéro dépendance :
 * Node ≥ 18, navigateurs, Cloudflare Workers.
 *
 * Source de vérité : openkmt/edms `packages/marque/`. La copie de
 * openkmt/zeno `packages/marque/` est identique (sha d'origine dans `SOURCE`,
 * vérifiée en CI) : ne la modifiez pas là-bas, modifiez ici puis
 * `scripts/sync-marque.sh` côté zeno.
 */
export { templates, IDS_TEMPLATES, TEMPLATE_PAR_DEFAUT, templateParId } from './templates/index.js';
export { catalogueDePolices, policeDuCatalogue, policeProche } from './polices.js';
export {
  valider, validerLogo, MarqueInvalide, VERSION_FORMAT, ROLES_COULEURS, LOGOS, RAYONS, LOGO_OCTETS_MAX,
} from './valider.js';
export { validerDesign, valeurTokenSure, VERSION_DESIGN, ID_DESIGN } from './valider.js';
export { normaliser, derivees, versVariablesCss, versCss } from './normaliser.js';
export { verifierContraste, PAIRES_CONTRASTE } from './contraste.js';
export {
  normaliserKit, completerSansIA, proposerSansIA, nombreDePropositions, rolesDesCouleurs, fondEtTexteDuKit, templateSuggere, identiteDuKit,
  justificationDuTemplate,
} from './completer.js';
export { justificationAffichee, rolesDuKit } from './affichage.js';
export { citeLeKit, justificationDuKit, justificationPourLeKit, teinteDe } from './justification.js';
export { promptCompletion, messageCorrection, lireReponseIA, extraireJson, VERSION_PROMPT, CLES_COMPACTES } from './prompt.js';
export { vignette } from './vignette.js';
export {
  normaliserReponses, promptPropositionDesign, lireReponseDesign, proposerDesignSansIA, reglagesParDefaut,
  VERSION_PROMPT_DESIGN, STYLES_DESIGN, LIMITES_REPONSES, POURQUOI_MAX, PROPOSITIONS_DESIGN_MAX,
  DESIGN_PAR_TEMPLATE, DESIGN_PAR_STYLE, DESIGN_PAR_DEFAUT,
} from './design.js';
export { contraste, SEUIL_AA, SEUIL_AA_GRAPHIQUE } from './couleur.js';
