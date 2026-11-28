/**
 * Lecture d'une proposition reçue de l'API de marque (ou d'un fournisseur
 * personnel) avant de l'afficher sur une carte : justification filtrée et
 * couleurs du kit remises à leur rôle. Une seule règle pour l'installeur
 * (create-edms, create-zeno) et la page Marque des admins, qui en avaient
 * chacun une copie.
 */
import { justificationDuTemplate } from './completer.js';

const HEX6 = /^#[0-9a-f]{6}$/;
const bas = (x) => (typeof x === 'string' ? x.trim().toLowerCase() : undefined);

/**
 * Justification de l'IA telle qu'affichée sur la carte. Le modèle recopie
 * parfois la consigne de l'exemple du prompt (« …, 60 caractères max »,
 * constaté 2 fois sur 2 sur la carte « sobre » le 20/11) : elle est retirée ;
 * s'il ne reste rien d'utile, `repli` (par défaut la phrase du template).
 * @param {unknown} brut
 * @param {string} templateId
 * @param {string} [repli]
 * @returns {string}
 */
export function justificationAffichee(brut, templateId, repli) {
  const defaut = typeof repli === 'string' && repli ? repli : justificationDuTemplate(templateId);
  if (typeof brut !== 'string') return defaut;
  const j = brut
    .replace(/[<>]/g, '')
    .replace(/[\s,;.:(–—-]*\(?\s*\d+\s*caract[eè]res?\s*(max(imum)?|au plus)\s*\)?\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
  return j.length < 8 || /^pourquoi\W*$/i.test(j) ? defaut : j;
}

/**
 * Les couleurs du kit restent dans la proposition, à leur rôle. Constaté sur
 * l'API de marque : accent = primaire (19/11), puis secondaire et accent
 * inventés, la seconde couleur du kit disparue (20/11), et pas à chaque
 * appel. Règle déterministe, appliquée après l'IA :
 * - primaire hors du kit → première couleur du kit ;
 * - secondaire ou accent absents, ou égaux à la primaire → couleur suivante du kit ;
 * - couleur du kit encore absente → elle prend la place de l'accent, puis de la
 *   secondaire, si ce rôle porte une couleur inventée (même ordre que
 *   `completerSansIA` : seconde couleur = accent, troisième = secondaire).
 * Une couleur inventée qui ne chasse aucune couleur du kit est gardée. Trois
 * rôles : seules les trois premières couleurs du kit (jusqu'à 6, tirées du
 * logo ou du site) sont garanties. `max` ne lit que les premières couleurs du
 * kit : la page Marque de l'admin n'en tient que deux (principale, accent).
 *
 * Ne modifie pas `couleurs` ; rend une copie (ou `couleurs` tel quel si ce
 * n'est pas un objet). Les couleurs du kit sont rendues en minuscules.
 * @param {Record<string, unknown> | undefined} couleurs
 * @param {unknown} couleursDuKit liste de couleurs `#rrggbb` du kit
 * @param {{ max?: number }} [options]
 * @returns {Record<string, unknown> | undefined}
 */
export function rolesDuKit(couleurs, couleursDuKit, options = {}) {
  if (!couleurs || typeof couleurs !== 'object' || Array.isArray(couleurs)) return couleurs;
  const liste = Array.isArray(couleursDuKit) ? couleursDuKit : [];
  const max = Number.isInteger(options.max) && options.max > 0 ? options.max : liste.length;
  const duKit = [...new Set(liste.slice(0, max).map(bas))].filter((x) => x && HEX6.test(x));
  const c = { ...couleurs };
  if (!duKit.length) return c;
  if (!duKit.includes(bas(c.primaire))) c.primaire = duKit[0];
  const primaire = bas(c.primaire);
  const autres = duKit.filter((x) => x !== primaire);
  if (!autres.length) return c;
  if (!bas(c.secondaire) || bas(c.secondaire) === primaire) c.secondaire = autres[0];
  if (!bas(c.accent) || bas(c.accent) === primaire) c.accent = autres.find((x) => x !== bas(c.secondaire)) ?? c.secondaire;
  for (const x of duKit.slice(0, 3)) {
    if (x === primaire || bas(c.accent) === x || bas(c.secondaire) === x) continue;
    if (!duKit.includes(bas(c.accent))) c.accent = x;
    else if (!duKit.includes(bas(c.secondaire))) c.secondaire = x;
  }
  return c;
}
