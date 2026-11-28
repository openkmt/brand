/**
 * `normaliser(marque)` : marque/v1 partielle → marque/v1 complète.
 *
 * 1. Refus de toute valeur invalide (`valider`), en bloc : `MarqueInvalide`.
 * 2. Le template (par défaut `sobre`) remplit chaque champ absent ; les
 *    couleurs manquantes sont dérivées des couleurs présentes selon les règles
 *    de données du template.
 * 3. Contraste WCAG AA (4,5:1 texte, 3:1 éléments d'interface) forcé sur
 *    surPrimaire/primaire, texte/fond, texte/surface, attenue/fond et surface,
 *    statuts, primaire/fond : seules les couleurs DÉRIVÉES sont éclaircies ou
 *    foncées, jamais une couleur donnée par le client. Une paire de couleurs
 *    données qui échoue est gardée et signalée par `verifierContraste`.
 *    Seule exception : une primaire « papier » (clarté ≥ `CLARTE_PAPIER`)
 *    invisible sur le fond (contraste < 1,5) n'est pas une couleur de bouton,
 *    quelle que soit la source (API, IA, saisie) : elle passe au fond si le
 *    fond est blanc ou absent, et la primaire devient la secondaire ou
 *    l'accent lisible, à défaut celle du template.
 *
 * 4. Le choix de design (`design`, facultatif) est gardé tel que validé ; le
 *    catalogue n'est pas consulté ici (un id inconnu est ignoré par le produit).
 *
 * Idempotente : normaliser une marque normalisée la rend à l'identique.
 * `derivees(marque)` calcule ce qui n'est pas dans le format : survol/appui,
 * couleur de lien, aplats, en-tête d'e-mail et mode sombre.
 */
import {
  BLANC, NOIR, SEUIL_AA, SEUIL_AA_GRAPHIQUE, contraste, estEncre, estHex, estPapier, extremeLisible, luminance,
  melanger, teinteLisible, texteSur, tournerTeinte, versHsl,
} from './couleur.js';
import { catalogueDePolices, policeDuCatalogue } from './polices.js';
import { TEMPLATE_PAR_DEFAUT, templateParId } from './templates/index.js';
import { LOGOS, MarqueInvalide, RAYONS, VERSION_FORMAT, valider } from './valider.js';

/** Calcule une règle de dérivation du template (`melange`, `rotation`, rôle ou hex). */
function evaluer(regle, c) {
  if (typeof regle === 'string') return estHex(regle) ? regle : c[regle];
  if (regle?.melange) {
    const [a, b, t] = regle.melange;
    return melanger(evaluer(a, c), evaluer(b, c), t);
  }
  if (regle?.rotation) {
    const [a, deg] = regle.rotation;
    return tournerTeinte(evaluer(a, c), deg);
  }
  throw new Error(`règle de dérivation inconnue : ${JSON.stringify(regle)}`);
}

/** Écart de clarté minimal entre `danger` et une primaire de même teinte. */
const ECART_DANGER = 1.5;
/** Écart de teinte (degrés) en dessous duquel deux couleurs se confondent. */
const TEINTE_PROCHE = 30;

function teintesProches(a, b) {
  const [ha, sa] = versHsl(a);
  const [hb, sb] = versHsl(b);
  if (sa < 0.15 || sb < 0.15) return false;
  const d = Math.abs(ha - hb) % 360;
  return Math.min(d, 360 - d) < TEINTE_PROCHE;
}

/** `danger` et `primaire` se confondent : même teinte et clarté voisine. */
function dangerConfonduAvecPrimaire(danger, primaire) {
  return teintesProches(danger, primaire) && contraste(danger, primaire) < ECART_DANGER;
}

/**
 * Danger dérivé écarté d'une primaire proche (marque rouge) : un message
 * d'erreur ne doit pas ressembler au bouton principal. La teinte est gardée,
 * seule la clarté change, vers le noir ou le blanc, sans perdre la lisibilité
 * sur les `fonds`. Plus petit déplacement retenu ; à défaut, inchangé.
 */
function distinguerDanger(danger, primaire, fonds) {
  for (let i = 1; i <= 40; i++) {
    for (const extreme of [extremeLisible(fonds[0] ?? BLANC), extremeLisible(primaire)]) {
      const c = melanger(danger, extreme, i / 40);
      if (contraste(c, primaire) >= ECART_DANGER && fonds.every((f) => contraste(c, f) >= SEUIL_AA)) return c;
    }
  }
  return danger;
}

/**
 * Sous ce contraste avec le fond, une primaire ne se voit pas (papier sur
 * blanc : 1,07 à 1,15). Au-dessus, c'est un choix de marque (un or sur papier,
 * 2,4) : on n'y touche pas. Mêmes seuils que l'admin Zeno (zeno#392) et que
 * `primaireLisible` des installeurs.
 */
const PRIMAIRE_INVISIBLE = 1.5;

/**
 * Primaire papier invisible sur le fond (ex. `#f4eee3` sur `#ffffff`, renvoyée
 * par l'API de marque v2) : le papier devient le fond si le fond est blanc ou
 * absent ; la primaire passe à la secondaire ou à l'accent donnés (lisible à
 * 3:1 d'abord, encre en dernier, sinon simplement visible), et le rôle repris
 * redevient dérivé. Sans candidate, la primaire du template s'applique.
 * Renvoie `null` si rien n'est à déplacer.
 */
function deplacerPrimairePapier(entree, tpl, donnees) {
  const p = entree.primaire;
  if (!p || !donnees.has('primaire') || !estPapier(p)) return null;
  if (contraste(p, entree.fond ?? tpl.couleurs.fond) >= PRIMAIRE_INVISIBLE) return null;
  const c = { ...entree };
  const d = new Set(donnees);
  delete c.primaire;
  d.delete('primaire');
  // Le papier pris pour fond reste ajustable (dérivé) : un texte donné trop
  // pâle le décale encore, comme le fond d'un template.
  if (!entree.fond || luminance(entree.fond) > 0.95) {
    c.fond = p;
    d.delete('fond');
  }
  const fond = c.fond ?? tpl.couleurs.fond;
  const candidates = ['secondaire', 'accent']
    .filter((r) => entree[r] && donnees.has(r) && entree[r].toLowerCase() !== p.toLowerCase())
    .map((role) => ({ role, hex: entree[role] }));
  const au = (seuil) => (x) => contraste(x.hex, fond) >= seuil;
  const choix =
    candidates.filter((x) => !estEncre(x.hex)).find(au(SEUIL_AA_GRAPHIQUE)) ??
    candidates.find(au(SEUIL_AA_GRAPHIQUE)) ??
    candidates.find(au(PRIMAIRE_INVISIBLE));
  if (choix) {
    c.primaire = choix.hex;
    d.add('primaire');
    // Le rôle repris redevient dérivé (sauf s'il porte la même couleur qu'un autre rôle donné).
    delete c[choix.role];
    d.delete(choix.role);
  }
  return { entree: c, donnees: d };
}

/**
 * Couleurs complètes. Règle (issue openkmt/edms#8) : une couleur DONNÉE
 * (présente dans l'entrée, ou listée dans `options.donnees`) n'est jamais
 * modifiée ; seules les couleurs dérivées (template, règles) sont éclaircies
 * ou foncées jusqu'au seuil. Une paire de deux couleurs données qui échoue
 * reste telle quelle : `verifierContraste` la signale.
 */
function couleursCompletes(entreeBrute, tpl, donneesBrutes) {
  const deplace = deplacerPrimairePapier(entreeBrute, tpl, donneesBrutes);
  const entree = deplace?.entree ?? entreeBrute;
  const donnees = deplace?.donnees ?? donneesBrutes;
  const c = { ...tpl.couleurs, ...entree };
  const derivee = (role) => !donnees.has(role);
  const corriger = (role, fonds, seuil = SEUIL_AA) => {
    if (derivee(role)) c[role] = teinteLisible(c[role], fonds, seuil);
  };

  // Fond (template) illisible sous un texte donné : on le décale, pas le texte.
  if (!derivee('texte') && derivee('fond') && contraste(c.texte, c.fond) < SEUIL_AA) {
    c.fond = teinteLisible(c.fond, [c.texte]);
  }
  for (const role of ['secondaire', 'accent', 'surface', 'attenue', 'bordure']) {
    if (!c[role]) c[role] = evaluer(tpl.derivation[role], c);
  }
  if (!derivee('texte') && derivee('surface') && contraste(c.texte, c.surface) < SEUIL_AA) {
    c.surface = teinteLisible(c.surface, [c.texte]);
  }

  // Texte, texte atténué et statuts lisibles sur le fond et sur les cartes.
  corriger('texte', [c.fond, c.surface]);
  corriger('attenue', [c.fond, c.surface]);
  for (const s of ['succes', 'alerte', 'danger']) corriger(s, [c.fond, c.surface]);

  // Primaire (neutre du template) visible comme élément d'interface (3:1).
  corriger('primaire', [c.fond], SEUIL_AA_GRAPHIQUE);

  // Texte des boutons sur la primaire.
  if (derivee('surPrimaire')) {
    c.surPrimaire = texteSur(c.primaire, contraste(BLANC, c.primaire) >= SEUIL_AA ? BLANC : undefined);
  } else if (derivee('primaire') && contraste(c.surPrimaire, c.primaire) < SEUIL_AA) {
    c.primaire = teinteLisible(c.primaire, [c.surPrimaire]);
  }

  if (derivee('danger') && dangerConfonduAvecPrimaire(c.danger, c.primaire)) {
    c.danger = distinguerDanger(c.danger, c.primaire, [c.fond, c.surface]);
  }

  const ordre = ['primaire', 'surPrimaire', 'secondaire', 'accent', 'fond', 'surface', 'texte', 'attenue', 'bordure', 'succes', 'alerte', 'danger'];
  return Object.fromEntries(ordre.map((k) => [k, c[k]]));
}

const tronquer = (s, max) => {
  if (s.length <= max) return s;
  const coupe = s.slice(0, max + 1).replace(/\s+\S*$/, '');
  return (coupe && coupe.length <= max ? coupe : s.slice(0, max)).trim();
};

/**
 * @param {unknown} entree marque/v1 (tout champ facultatif)
 * @param {{ donnees?: string[] }} [options] rôles de couleur donnés par le client
 *   (jamais modifiés) ; par défaut, toutes les couleurs présentes dans l'entrée.
 * @returns {import('./index.js').MarqueComplete}
 * @throws {MarqueInvalide} si une valeur n'est pas une couleur, une police du catalogue, un fichier…
 */
export function normaliser(entree, options = {}) {
  const { ok, marque: m, erreurs } = valider(entree);
  if (!ok) throw new MarqueInvalide(erreurs);
  const tpl = templateParId(m.template ?? TEMPLATE_PAR_DEFAUT);

  const nom = m.identite?.nom ?? '';
  const identite = {
    nom,
    nomCourt: m.identite?.nomCourt ?? tronquer(nom, 20),
    accroche: m.identite?.accroche ?? '',
    ton: m.identite?.ton ?? [...tpl.identite.ton],
  };
  const logos = Object.fromEntries(LOGOS.map((k) => [k, m.logos?.[k] ?? '']));
  const typographie = {
    titres: {
      famille: m.typographie?.titres?.famille ?? tpl.typographie.titres.famille,
      graisse: m.typographie?.titres?.graisse ?? tpl.typographie.titres.graisse,
      casse: m.typographie?.titres?.casse ?? tpl.typographie.titres.casse,
    },
    texte: { famille: m.typographie?.texte?.famille ?? tpl.typographie.texte.famille },
    mono: { famille: m.typographie?.mono?.famille ?? tpl.typographie.mono.famille },
  };
  // Graisse disponible pour la famille retenue (la plus proche, sinon).
  const graisses = policeDuCatalogue(typographie.titres.famille).graisses;
  if (!graisses.includes(typographie.titres.graisse)) {
    typographie.titres.graisse = graisses.reduce((a, b) =>
      Math.abs(b - typographie.titres.graisse) < Math.abs(a - typographie.titres.graisse) ? b : a);
  }

  return {
    version: VERSION_FORMAT,
    template: tpl.id,
    identite,
    logos,
    couleurs: couleursCompletes(m.couleurs ?? {}, tpl, new Set(options.donnees ?? Object.keys(m.couleurs ?? {}))),
    typographie,
    forme: {
      rayon: m.forme?.rayon ?? tpl.forme.rayon,
      densite: m.forme?.densite ?? tpl.forme.densite,
    },
    emails: { entete: m.emails?.entete ?? tpl.emails.entete },
    // design/v1 (facultatif) : gardé tel que validé ; absent, la sortie est celle d'avant.
    ...(m.design && { design: m.design }),
  };
}

/** Survol et appui d'une couleur de bouton : on s'éloigne de la couleur du texte posé dessus. */
function etats(fond, texte) {
  const cible = luminance(texte) > 0.5 ? NOIR : BLANC;
  const t = cible === NOIR ? [0.12, 0.22] : [0.16, 0.3];
  return { survol: melanger(fond, cible, t[0]), appui: melanger(fond, cible, t[1]) };
}

/**
 * En-tête d'e-mail. `sombre` : bandeau à l'encre de la marque (couleur du
 * texte), texte au papier (fond de page) s'il passe AA, filet à l'accent
 * lisible dessus ; c'est la règle de l'aperçu de l'installeur (`.ent.sombre`)
 * et de Zeno (`paletteEmail`). Encre claire (mode sombre, ou texte clair
 * donné) : aplat sombre, sinon primaire assombrie.
 */
function enteteEmail(entete, c, aplat) {
  if (entete === 'sombre') {
    if (contraste(c.texte, BLANC) > contraste(c.texte, NOIR)) {
      const fond = c.texte;
      const texte = contraste(c.fond, fond) >= SEUIL_AA ? c.fond : [c.surface, BLANC].reduce((m, x) => (contraste(x, fond) > contraste(m, fond) + 1e-9 ? x : m), c.fond);
      return { fond, texte, filet: teinteLisible(c.accent, [fond], SEUIL_AA_GRAPHIQUE) };
    }
    const fond = luminance(aplat) < 0.05 ? aplat : melanger(c.primaire, NOIR, 0.7);
    return { fond, texte: texteSur(fond, BLANC), filet: teinteLisible(c.accent, [fond], SEUIL_AA_GRAPHIQUE) };
  }
  if (entete === 'accent') return { fond: c.accent, texte: texteSur(c.accent, BLANC), filet: c.accent };
  return { fond: c.surface, texte: c.texte, filet: c.primaire };
}

function jeu(c, tpl, entete, sombre) {
  const aplat = sombre ? melanger(c.fond, c.primaire, tpl.usage.aplats === 'sombres' ? 0.22 : 0.12) : evaluer(tpl.derivation.aplat, c);
  const e = etats(c.primaire, c.surPrimaire);
  return {
    ...c,
    primaireSurvol: e.survol,
    primaireAppui: e.appui,
    lien: teinteLisible(c.primaire, [c.fond, c.surface]),
    surSecondaire: texteSur(c.secondaire, c.texte),
    surAccent: texteSur(c.accent, c.texte),
    accentTexte: teinteLisible(c.accent, [c.fond, c.surface]),
    accentGraphique: teinteLisible(c.accent, [c.fond], SEUIL_AA_GRAPHIQUE),
    // L'accent ne colore jamais un fond dans les templates qui l'interdisent.
    accentFond: tpl.usage.accentSurFond ? c.accent : 'transparent',
    aplat,
    surAplat: texteSur(aplat, luminance(aplat) < 0.18 ? BLANC : c.texte),
    email: enteteEmail(entete, c, aplat),
  };
}

/** Mode sombre dérivé de la marque claire (mêmes teintes, fond presque noir). */
function couleursSombres(c) {
  const fond = melanger('#0b0b0c', c.primaire, 0.08);
  const surface = melanger(fond, BLANC, 0.06);
  const texte = teinteLisible(melanger('#f5f5f4', c.primaire, 0.04), [fond, surface]);
  const primaire = teinteLisible(c.primaire, [fond], SEUIL_AA_GRAPHIQUE);
  return {
    primaire,
    surPrimaire: texteSur(primaire, c.surPrimaire),
    secondaire: teinteLisible(c.secondaire, [fond], SEUIL_AA_GRAPHIQUE),
    accent: teinteLisible(c.accent, [fond], SEUIL_AA_GRAPHIQUE),
    fond,
    surface,
    texte,
    attenue: teinteLisible(melanger(texte, fond, 0.35), [fond, surface]),
    bordure: melanger(fond, texte, 0.18),
    succes: teinteLisible(c.succes, [fond]),
    alerte: teinteLisible(c.alerte, [fond]),
    danger: teinteLisible(c.danger, [fond]),
  };
}

/**
 * Valeurs dérivées (hors format) d'une marque, clair et sombre.
 * @returns {import('./index.js').Derivees}
 */
export function derivees(entree) {
  const m = normaliser(entree);
  const tpl = templateParId(m.template);
  return {
    clair: jeu(m.couleurs, tpl, m.emails.entete, false),
    sombre: jeu(couleursSombres(m.couleurs), tpl, m.emails.entete, true),
  };
}

const pile = (famille) => catalogueDePolices.find((p) => p.famille === famille)?.pile ?? 'system-ui, sans-serif';

const NOMS_CSS = {
  primaire: 'primaire', surPrimaire: 'sur-primaire', primaireSurvol: 'primaire-survol', primaireAppui: 'primaire-appui',
  secondaire: 'secondaire', surSecondaire: 'sur-secondaire', accent: 'accent', surAccent: 'sur-accent',
  accentTexte: 'accent-texte', accentGraphique: 'accent-graphique', accentFond: 'accent-fond',
  fond: 'fond', surface: 'surface', texte: 'texte', attenue: 'attenue', bordure: 'bordure', lien: 'lien',
  aplat: 'aplat', surAplat: 'sur-aplat', succes: 'succes', alerte: 'alerte', danger: 'danger',
};

/**
 * Variables CSS d'une marque (`--marque-*`), pour le mode clair (défaut) ou
 * sombre. Les noms sont stables : les produits ne lisent que ceux-là.
 * @param {unknown} entree marque/v1
 * @param {{ mode?: 'clair' | 'sombre' }} [options]
 * @returns {Record<string, string>}
 */
export function versVariablesCss(entree, options = {}) {
  const m = normaliser(entree);
  const d = derivees(m)[options.mode === 'sombre' ? 'sombre' : 'clair'];
  const v = {};
  for (const [k, nom] of Object.entries(NOMS_CSS)) v[`--marque-${nom}`] = d[k];
  v['--marque-email-entete-fond'] = d.email.fond;
  v['--marque-email-entete-texte'] = d.email.texte;
  v['--marque-email-entete-filet'] = d.email.filet;
  v['--marque-police-titres'] = pile(m.typographie.titres.famille);
  v['--marque-police-texte'] = pile(m.typographie.texte.famille);
  v['--marque-police-mono'] = pile(m.typographie.mono.famille);
  v['--marque-graisse-titres'] = String(m.typographie.titres.graisse);
  v['--marque-casse-titres'] = m.typographie.titres.casse === 'majuscules' ? 'uppercase' : 'none';
  v['--marque-interlettrage-titres'] = m.typographie.titres.casse === 'majuscules' ? '0.04em' : '0';
  v['--marque-rayon'] = `${RAYONS[m.forme.rayon]}px`;
  v['--marque-rayon-petit'] = `${Math.round(RAYONS[m.forme.rayon] / 2)}px`;
  v['--marque-densite'] = m.forme.densite === 'compacte' ? '0.875' : '1';
  return v;
}

/**
 * Feuille CSS complète : mode clair sur `selecteur`, mode sombre via
 * `prefers-color-scheme` (sauf `data-mode="clair"`) et `data-mode="sombre"`.
 */
export function versCss(entree, { selecteur = ':root' } = {}) {
  const bloc = (vars) => Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const clair = versVariablesCss(entree);
  const sombreTout = versVariablesCss(entree, { mode: 'sombre' });
  const sombre = Object.fromEntries(Object.entries(sombreTout).filter(([k, v]) => clair[k] !== v));
  return [
    `${selecteur} {\n${bloc(clair)}\n}`,
    `@media (prefers-color-scheme: dark) {\n  ${selecteur}:not([data-mode="clair"]) {\n${bloc(sombre).replace(/^/gm, '  ')}\n  }\n}`,
    `${selecteur}[data-mode="sombre"] {\n${bloc(sombre)}\n}`,
  ].join('\n');
}
