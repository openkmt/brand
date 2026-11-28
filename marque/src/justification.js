/**
 * Justification d'une proposition de marque qui parle du client.
 *
 * Constaté le 22/11/2026 (kit « Baobab Conseil », logo + `#0b3d2e,#e8a33d`,
 * API de marque) : « professionnel et sobre », « teintes naturelles et
 * chaleureuses pour une image de confiance ». Des phrases valables pour
 * n'importe qui. Le prompt demande de citer le kit ; ce module le vérifie et,
 * si le modèle ne l'a pas fait, écrit une phrase sans IA à partir du kit et de
 * la marque retenue. Rien n'est inventé : seuls le nom, les couleurs et le logo
 * fournis sont cités.
 */
import { HEX, versHsl } from './couleur.js';

/** Sans accents, en minuscules, découpé en mots. */
function mots(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9#]+/)
    .filter(Boolean);
}

/**
 * Familles de teintes : le premier mot est celui qu'on écrit, les autres sont
 * des synonymes reconnus dans la phrase du modèle (« accent doré » cite bien
 * l'orangé `#e8a33d`). Comparaison par début de mot, sans accents.
 */
const TEINTES = {
  noir: ['noir', 'anthracite', 'charbon', 'ebene'],
  blanc: ['blanc', 'creme', 'ivoire', 'papyrus', 'sable', 'beige'],
  gris: ['gris', 'ardoise', 'acier', 'taupe'],
  rouge: ['rouge', 'bordeaux', 'carmin', 'grenat', 'vermillon', 'brique', 'cerise'],
  orange: ['orange', 'dore', 'ocre', 'ambre', 'cuivre', 'safran', 'terracotta', 'abricot', 'moutarde'],
  brun: ['brun', 'marron', 'chocolat', 'cafe', 'terre', 'bronze', 'caramel'],
  jaune: ['jaune', 'dore', 'moutarde', 'citron', 'soleil', 'safran'],
  vert: ['vert', 'emeraude', 'olive', 'sauge', 'foret', 'menthe', 'sapin', 'jade', 'kaki'],
  turquoise: ['turquoise', 'canard', 'sarcelle', 'petrole', 'cyan', 'lagon'],
  bleu: ['bleu', 'marine', 'azur', 'indigo', 'cobalt', 'ciel', 'saphir', 'outremer'],
  violet: ['violet', 'prune', 'mauve', 'lavande', 'aubergine', 'pourpre', 'lilas'],
  rose: ['rose', 'fuchsia', 'magenta', 'framboise', 'corail'],
};

/** Teinte d'une couleur `#rrggbb` (clé de `TEINTES`). */
export function teinteDe(hex) {
  const [h, s, l] = versHsl(hex);
  if (l < 0.1) return 'noir';
  if (l > 0.93) return 'blanc';
  if (s < 0.15) return l > 0.8 ? 'blanc' : 'gris';
  if (h < 15 || h >= 345) return 'rouge';
  if (h < 45) return l < 0.3 ? 'brun' : 'orange';
  if (h < 65) return 'jaune';
  if (h < 170) return 'vert';
  if (h < 200) return 'turquoise';
  if (h < 255) return 'bleu';
  if (h < 290) return 'violet';
  return 'rose';
}

/** Petits mots qui ne suffisent pas à dire qu'une phrase parle du client. */
const VIDES = new Set([
  'entreprise', 'organisation', 'societe', 'association', 'service', 'services', 'conseil', 'groupe',
  'agence', 'cabinet', 'notre', 'votre', 'nous', 'vous', 'pour', 'avec', 'dans', 'leurs', 'cette',
]);

/**
 * La phrase cite-t-elle le kit ? Oui si elle reprend une de ses couleurs (code
 * ou nom de teinte), son logo, un mot de son nom, une de ses polices ou un mot
 * marquant de sa phrase. Un kit sans rien de citable : toute phrase convient.
 * @param {unknown} texte
 * @param {import('./index.js').Kit} kit
 * @returns {boolean}
 */
export function citeLeKit(texte, kit) {
  if (typeof texte !== 'string' || !texte.trim()) return false;
  const brut = texte.toLowerCase();
  const dits = mots(texte);
  const commence = (racine) => dits.some((m) => m.startsWith(racine));
  const couleurs = (kit?.couleurs ?? []).filter((c) => HEX.test(c));
  const nom = mots(kit?.nom).filter((m) => m.length >= 4 && !VIDES.has(m));
  const phrase = mots(kit?.phrase).filter((m) => m.length >= 6 && !VIDES.has(m));
  const polices = (kit?.polices ?? []).map((p) => String(p).toLowerCase()).filter(Boolean);
  if (!couleurs.length && !nom.length && !phrase.length && !polices.length && !kit?.logo) return true;

  if (couleurs.some((c) => brut.includes(c.toLowerCase()) || brut.includes(c.slice(1).toLowerCase()))) return true;
  if (couleurs.some((c) => TEINTES[teinteDe(c)].some(commence))) return true;
  if (kit?.logo && commence('logo')) return true;
  if (nom.some((m) => dits.includes(m))) return true;
  if (polices.some((p) => brut.includes(p))) return true;
  return phrase.some((m) => dits.includes(m));
}

const CARACTERES = {
  sobre: 'rendu calme et institutionnel',
  editorial: 'rendu affirmé et typographique, en grands aplats',
  chaleureux: 'rendu accueillant et arrondi',
};

/**
 * Phrase écrite sans IA à partir du kit et de la marque retenue, par exemple
 * « Baobab Conseil : votre vert #0b3d2e en couleur principale, votre logo en
 * tête ; rendu calme et institutionnel. » `undefined` si le kit n'a ni nom, ni
 * couleur, ni logo.
 * @param {import('./index.js').Kit} kit
 * @param {{ couleurs?: Record<string, string> } | undefined} marque
 * @param {string} templateId
 * @returns {string | undefined}
 */
export function justificationDuKit(kit, marque, templateId) {
  const elements = [];
  const c = marque?.couleurs ?? {};
  const duKit = (x) => typeof x === 'string' && (kit?.couleurs ?? []).includes(x.toLowerCase());
  if (duKit(c.primaire)) elements.push(`votre ${teinteDe(c.primaire)} ${c.primaire.toLowerCase()} en couleur principale`);
  const seconde = [c.accent, c.secondaire].find((x) => duKit(x) && x.toLowerCase() !== c.primaire?.toLowerCase());
  if (seconde) {
    const teinte = teinteDe(seconde);
    const article = /^[aeiou]/.test(teinte) ? "l'" : 'le ';
    elements.push(`${article}${teinte} ${seconde.toLowerCase()} en ${seconde === c.accent ? 'accent' : 'appui'}`);
  }
  if (kit?.logo) elements.push('votre logo en tête');
  if (!kit?.nom && !elements.length) return undefined;
  const caractere = CARACTERES[templateId] ?? CARACTERES.sobre;
  const sujet = kit?.nom ?? 'Votre marque';
  return elements.length ? `${sujet} : ${elements.join(', ')} ; ${caractere}.` : `${sujet} : ${caractere}.`;
}

/**
 * Justification retenue : celle du modèle si elle cite le kit, sinon la phrase
 * écrite à partir du kit, sinon `repli`.
 * @param {unknown} texte
 * @param {import('./index.js').Kit} kit
 * @param {{ couleurs?: Record<string, string> } | undefined} marque
 * @param {string} templateId
 * @param {string} repli
 * @returns {string}
 */
export function justificationPourLeKit(texte, kit, marque, templateId, repli) {
  if (typeof texte === 'string' && texte.trim() && citeLeKit(texte, kit)) return texte;
  return justificationDuKit(kit, marque, templateId) ?? (typeof texte === 'string' && texte.trim() ? texte : repli);
}
