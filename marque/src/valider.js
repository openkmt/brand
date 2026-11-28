/**
 * `valider(obj)` : contrôle strict d'une `marque/v1` (partielle ou complète).
 *
 * Ne corrige rien, ne complète rien (c'est `normaliser`) : chaque valeur est
 * une couleur `#RRGGBB`, une police du catalogue, un fichier (logo `data:` SVG
 * ou PNG de 512 Ko max, ou chemin relatif), une valeur d'énumération ou un
 * texte court sans balise. Tout le reste est refusé avec un message clair,
 * réutilisable tel quel comme raison de rejet pour un nouvel essai de l'IA.
 */
import { HEX } from './couleur.js';
import { GRAISSES, policeDuCatalogue } from './polices.js';
import { IDS_TEMPLATES } from './templates/index.js';

export const VERSION_FORMAT = 'marque/v1';

export const ROLES_COULEURS = Object.freeze([
  'primaire', 'surPrimaire', 'secondaire', 'accent', 'fond', 'surface',
  'texte', 'attenue', 'bordure', 'succes', 'alerte', 'danger',
]);
export const LOGOS = Object.freeze(['principal', 'surFondSombre', 'signe', 'favicon']);
export const RAYONS = Object.freeze({ net: 4, doux: 10, rond: 18 });
export const DENSITES = Object.freeze(['compacte', 'confortable']);
export const CASSES = Object.freeze(['normale', 'majuscules']);
export const ENTETES_EMAIL = Object.freeze(['sombre', 'clair', 'accent']);
/** Taille maximale d'un logo, décodé (512 Ko). */
export const LOGO_OCTETS_MAX = 512 * 1024;

const LIMITES_TEXTE = { nom: 80, nomCourt: 20, accroche: 160 };
const TON_MAX = 3;
const TON_LONGUEUR = 30;

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Texte court : borné, sans balise ni caractère qui casserait un `.env`, un
 * compose ou du CSS (mêmes règles que create-edms, ia/proposition.ts).
 * Renvoie le texte nettoyé ou un message d'erreur.
 */
export function texteCourt(v, max) {
  if (typeof v !== 'string') return { erreur: 'texte attendu' };
  // eslint-disable-next-line no-control-regex -- caractères de contrôle retirés exprès
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ');
  if (s.length > max) return { erreur: `trop long (${s.length} > ${max} caractères)` };
  if (/[<>{}$"\\`]|url\(|javascript:/i.test(s)) return { erreur: 'caractères interdits (< > { } $ " \\ `)' };
  return { valeur: s };
}

function decoderBase64(b64) {
  try {
    return atob(b64.replace(/\s+/g, ''));
  } catch {
    return null;
  }
}

/** SVG sans script, sans gestionnaire d'événement, sans ressource externe. */
function svgSain(svg) {
  const s = svg.trim();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(s)) return 'le contenu n\'est pas un SVG';
  if (/<script|<foreignObject|<iframe|<embed|<object/i.test(s)) return 'SVG avec script ou contenu embarqué';
  if (/\son[a-z]+\s*=/i.test(s)) return 'SVG avec gestionnaire d\'événement';
  if (/javascript:|(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/)/i.test(s)) return 'SVG avec lien ou ressource externe';
  return null;
}

/**
 * Logo : `data:image/svg+xml` (base64 ou texte encodé) ou `data:image/png;base64`,
 * 512 Ko maximum décodés ; ou chemin relatif `.svg`/`.png` à côté de
 * `marque.json` (sans `..`, sans racine, sans schéma).
 */
export function validerLogo(v) {
  if (typeof v !== 'string' || !v) return { erreur: 'fichier attendu (data: URI SVG/PNG ou chemin relatif)' };
  if (v.startsWith('data:')) {
    const m = v.match(/^data:(image\/svg\+xml|image\/png)(;charset=[\w-]+|;utf-?8)?(;base64)?,([\s\S]*)$/i);
    if (!m) return { erreur: 'data: URI SVG ou PNG attendu' };
    const type = m[1].toLowerCase();
    const base64 = Boolean(m[3]);
    let contenu;
    if (base64) contenu = decoderBase64(m[4]);
    else {
      try {
        contenu = decodeURIComponent(m[4]);
      } catch {
        contenu = null;
      }
    }
    if (contenu === null) return { erreur: 'data: URI illisible' };
    if (contenu.length > LOGO_OCTETS_MAX) return { erreur: `fichier trop lourd (${Math.ceil(contenu.length / 1024)} Ko > 512 Ko)` };
    if (type === 'image/png') {
      if (!base64 || !contenu.startsWith('\x89PNG\r\n\x1a\n')) return { erreur: 'le contenu n\'est pas un PNG' };
    } else {
      // Le base64 décodé par atob est en latin-1 : suffisant pour les contrôles ci-dessous.
      const probleme = svgSain(contenu);
      if (probleme) return { erreur: probleme };
    }
    return { valeur: v };
  }
  if (v.length > 200 || !/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[\w./-]+\.(svg|png)$/i.test(v) || v.includes('//')) {
    return { erreur: 'chemin relatif .svg ou .png attendu (sans .., sans racine)' };
  }
  return { valeur: v };
}

function police(v, usage, chemin, erreurs) {
  if (typeof v !== 'string') {
    erreurs.push(`${chemin} : nom de police attendu`);
    return undefined;
  }
  const p = policeDuCatalogue(v, usage);
  if (!p) {
    erreurs.push(`${chemin} : « ${String(v).slice(0, 60)} » n'est pas une police du catalogue pour ${usage}`);
    return undefined;
  }
  return p.famille;
}

function inconnues(o, permises, chemin, erreurs) {
  for (const k of Object.keys(o)) if (!permises.includes(k)) erreurs.push(`${chemin}${k} : champ inconnu`);
}

function enumeration(v, valeurs, chemin, erreurs) {
  if (!valeurs.includes(v)) {
    erreurs.push(`${chemin} : valeur attendue parmi ${valeurs.join(', ')}`);
    return undefined;
  }
  return v;
}

/**
 * @param {unknown} obj
 * @returns {{ ok: boolean, marque: import('./index.js').Marque, erreurs: string[] }}
 * `marque` contient les champs valides (nettoyés : hex en minuscules, polices
 * à leur nom du catalogue), même quand `ok` est faux.
 */
export function valider(obj) {
  const erreurs = [];
  /** @type {Record<string, any>} */
  const marque = { version: VERSION_FORMAT };
  if (!estObjet(obj)) return { ok: false, marque, erreurs: ['la marque doit être un objet JSON'] };
  const o = /** @type {Record<string, any>} */ (obj);
  inconnues(o, ['version', 'template', 'identite', 'logos', 'couleurs', 'typographie', 'forme', 'emails', 'design'], '', erreurs);

  if (o.version !== undefined && o.version !== VERSION_FORMAT) erreurs.push(`version : « ${VERSION_FORMAT} » attendu`);
  if (o.template !== undefined) {
    const t = enumeration(o.template, IDS_TEMPLATES, 'template', erreurs);
    if (t) marque.template = t;
  }

  if (o.identite !== undefined) {
    if (!estObjet(o.identite)) erreurs.push('identite : objet attendu');
    else {
      inconnues(o.identite, ['nom', 'nomCourt', 'accroche', 'ton'], 'identite.', erreurs);
      const identite = {};
      for (const k of ['nom', 'nomCourt', 'accroche']) {
        if (o.identite[k] === undefined || o.identite[k] === '') continue;
        const r = texteCourt(o.identite[k], LIMITES_TEXTE[k]);
        if (r.erreur) erreurs.push(`identite.${k} : ${r.erreur}`);
        else if (r.valeur) identite[k] = r.valeur;
      }
      if (o.identite.ton !== undefined) {
        if (!Array.isArray(o.identite.ton) || o.identite.ton.length > TON_MAX) {
          erreurs.push(`identite.ton : liste de ${TON_MAX} mots au plus attendue`);
        } else {
          const ton = [];
          o.identite.ton.forEach((m, i) => {
            const r = texteCourt(m, TON_LONGUEUR);
            if (r.erreur) erreurs.push(`identite.ton[${i}] : ${r.erreur}`);
            else if (r.valeur) ton.push(r.valeur);
          });
          if (ton.length) identite.ton = ton;
        }
      }
      if (Object.keys(identite).length) marque.identite = identite;
    }
  }

  if (o.logos !== undefined) {
    if (!estObjet(o.logos)) erreurs.push('logos : objet attendu');
    else {
      inconnues(o.logos, LOGOS, 'logos.', erreurs);
      const logos = {};
      for (const k of LOGOS) {
        if (o.logos[k] === undefined || o.logos[k] === '') continue;
        const r = validerLogo(o.logos[k]);
        if (r.erreur) erreurs.push(`logos.${k} : ${r.erreur}`);
        else logos[k] = r.valeur;
      }
      if (Object.keys(logos).length) marque.logos = logos;
    }
  }

  if (o.couleurs !== undefined) {
    if (!estObjet(o.couleurs)) erreurs.push('couleurs : objet attendu');
    else {
      inconnues(o.couleurs, ROLES_COULEURS, 'couleurs.', erreurs);
      const couleurs = {};
      for (const k of ROLES_COULEURS) {
        const v = o.couleurs[k];
        if (v === undefined || v === '') continue;
        if (typeof v !== 'string' || !HEX.test(v)) erreurs.push(`couleurs.${k} : couleur #RRGGBB attendue`);
        else couleurs[k] = v.toLowerCase();
      }
      if (Object.keys(couleurs).length) marque.couleurs = couleurs;
    }
  }

  if (o.typographie !== undefined) {
    if (!estObjet(o.typographie)) erreurs.push('typographie : objet attendu');
    else {
      inconnues(o.typographie, ['titres', 'texte', 'mono'], 'typographie.', erreurs);
      const typo = {};
      const t = o.typographie;
      if (t.titres !== undefined) {
        if (!estObjet(t.titres)) erreurs.push('typographie.titres : objet attendu');
        else {
          inconnues(t.titres, ['famille', 'graisse', 'casse'], 'typographie.titres.', erreurs);
          const titres = {};
          if (t.titres.famille !== undefined && t.titres.famille !== '') {
            const f = police(t.titres.famille, 'titres', 'typographie.titres.famille', erreurs);
            if (f) titres.famille = f;
          }
          if (t.titres.graisse !== undefined) {
            const g = Number(t.titres.graisse);
            if (!GRAISSES.includes(g)) erreurs.push(`typographie.titres.graisse : valeur attendue parmi ${GRAISSES.join(', ')}`);
            else titres.graisse = g;
          }
          if (t.titres.casse !== undefined) {
            const c = enumeration(t.titres.casse, CASSES, 'typographie.titres.casse', erreurs);
            if (c) titres.casse = c;
          }
          if (Object.keys(titres).length) typo.titres = titres;
        }
      }
      for (const k of ['texte', 'mono']) {
        if (t[k] === undefined) continue;
        if (!estObjet(t[k])) {
          erreurs.push(`typographie.${k} : objet attendu`);
          continue;
        }
        inconnues(t[k], ['famille'], `typographie.${k}.`, erreurs);
        if (t[k].famille === undefined || t[k].famille === '') continue;
        const f = police(t[k].famille, k, `typographie.${k}.famille`, erreurs);
        if (f) typo[k] = { famille: f };
      }
      if (Object.keys(typo).length) marque.typographie = typo;
    }
  }

  if (o.forme !== undefined) {
    if (!estObjet(o.forme)) erreurs.push('forme : objet attendu');
    else {
      inconnues(o.forme, ['rayon', 'densite'], 'forme.', erreurs);
      const forme = {};
      if (o.forme.rayon !== undefined) {
        const r = enumeration(o.forme.rayon, Object.keys(RAYONS), 'forme.rayon', erreurs);
        if (r) forme.rayon = r;
      }
      if (o.forme.densite !== undefined) {
        const d = enumeration(o.forme.densite, DENSITES, 'forme.densite', erreurs);
        if (d) forme.densite = d;
      }
      if (Object.keys(forme).length) marque.forme = forme;
    }
  }

  if (o.emails !== undefined) {
    if (!estObjet(o.emails)) erreurs.push('emails : objet attendu');
    else {
      inconnues(o.emails, ['entete'], 'emails.', erreurs);
      if (o.emails.entete !== undefined) {
        const e = enumeration(o.emails.entete, ENTETES_EMAIL, 'emails.entete', erreurs);
        if (e) marque.emails = { entete: e };
      }
    }
  }

  if (o.design !== undefined) {
    const d = validerDesign(o.design);
    if (d.erreurs.length) erreurs.push(...d.erreurs);
    else marque.design = d.design;
  }

  return { ok: erreurs.length === 0, marque, erreurs };
}

// ─── design/v1 (champ facultatif, docs/design/DESIGN_V1.md §4.6) ───

export const VERSION_DESIGN = 'design/v1';
/** Identifiant d'un design, d'un réglage ou d'une valeur de réglage (même règle que le socle @edms/react). */
export const ID_DESIGN = /^[a-z][a-z0-9-]{0,39}$/;
const NOM_TOKEN = /^--[a-z0-9][a-z0-9-]{0,63}$/;
const REGLAGES_MAX = 20;
const TOKENS_MAX = 64;

/**
 * Valeur de token sûre : 200 caractères au plus, pas de sortie de déclaration
 * (`;{}`), pas de balise, pas de ressource externe (`url(`, `@import`), pas
 * d'`expression(` (même règle que `valeurTokenSure` du socle @edms/react).
 */
export function valeurTokenSure(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= 200 && !/[;{}<>\\`]|url\(|@import|expression\(/i.test(v);
}

/**
 * `design` d'une marque : `{ version: 'design/v1', id, reglages?, tokens? }`.
 * Ne vérifie pas que l'id existe dans le catalogue (c'est le rôle du produit
 * installé : un id inconnu y est ignoré, rendu historique).
 * @returns {{ design?: import('./index.js').DesignChoisi, erreurs: string[] }}
 */
export function validerDesign(v) {
  const erreurs = [];
  if (!estObjet(v)) return { erreurs: ['design : objet attendu'] };
  inconnues(v, ['version', 'id', 'reglages', 'tokens'], 'design.', erreurs);
  if (v.version !== VERSION_DESIGN) erreurs.push(`design.version : « ${VERSION_DESIGN} » attendu`);
  if (typeof v.id !== 'string' || !ID_DESIGN.test(v.id)) erreurs.push('design.id : identifiant attendu ([a-z][a-z0-9-], 40 caractères max)');
  const design = { version: VERSION_DESIGN, id: v.id };
  if (v.reglages !== undefined) {
    if (!estObjet(v.reglages) || Object.keys(v.reglages).length > REGLAGES_MAX) erreurs.push(`design.reglages : objet de ${REGLAGES_MAX} réglages au plus attendu`);
    else {
      const reglages = {};
      for (const [k, val] of Object.entries(v.reglages)) {
        if (!ID_DESIGN.test(k)) erreurs.push(`design.reglages : nom de réglage invalide « ${k.slice(0, 40)} »`);
        else if (typeof val !== 'string' || !ID_DESIGN.test(val)) erreurs.push(`design.reglages.${k} : valeur attendue ([a-z][a-z0-9-], 40 caractères max)`);
        else reglages[k] = val;
      }
      design.reglages = reglages;
    }
  }
  if (v.tokens !== undefined) {
    if (!estObjet(v.tokens) || Object.keys(v.tokens).length > TOKENS_MAX) erreurs.push(`design.tokens : objet de ${TOKENS_MAX} tokens au plus attendu`);
    else {
      const tokens = {};
      for (const [k, val] of Object.entries(v.tokens)) {
        if (!NOM_TOKEN.test(k)) erreurs.push(`design.tokens : nom de token invalide « ${k.slice(0, 64)} » (--nom attendu)`);
        else if (!valeurTokenSure(val)) erreurs.push(`design.tokens.${k} : valeur refusée (200 caractères max, sans ; { } < > \\ \`, url(, @import, expression()`);
        else tokens[k] = val;
      }
      design.tokens = tokens;
    }
  }
  return erreurs.length ? { erreurs } : { design, erreurs };
}

export class MarqueInvalide extends Error {
  constructor(erreurs) {
    super(`marque invalide : ${erreurs.join(' ; ')}`);
    this.name = 'MarqueInvalide';
    this.erreurs = erreurs;
  }
}
