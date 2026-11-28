/**
 * Kit du client → marque, sans IA (déterministe).
 *
 * `normaliserKit(brut)` : la forme normalisée du contrat
 *   `{ nom?, phrase?, couleurs: [hex], polices: [nom], logo?: { type, dataUrl },
 *      site?: { url, titre, texte (1 200 car. max) }, niveau }`
 * `completerSansIA(kit, templateId)` : une marque complète pour ce template.
 * `proposerSansIA(kit, templateId?)` : les propositions que l'installeur
 *   affiche — 1 si le kit est complet ou le template imposé, 3 sinon (une
 *   par template). Sans template, un kit vide donne `sobre`.
 */
import { HEX, estCouleurDeMarque, estEncre, estPapier, luminance, saturation } from './couleur.js';
import { policeProche } from './polices.js';
import { IDS_TEMPLATES, TEMPLATE_PAR_DEFAUT, templateParId } from './templates/index.js';
import { normaliser } from './normaliser.js';
import { verifierContraste } from './contraste.js';
import { texteCourt, validerLogo } from './valider.js';
import { justificationDuKit } from './justification.js';

export const TEXTE_SITE_MAX = 1200;
const COULEURS_MAX = 12;
const POLICES_MAX = 6;

/** Texte libre du client, nettoyé et tronqué (jamais refusé : c'est une donnée). */
export function propre(v, max) {
  if (typeof v !== 'string') return undefined;
  const s = v
    // eslint-disable-next-line no-control-regex -- caractères de contrôle retirés exprès
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>{}$"\\`]/g, ' ')
    .replace(/url\(|javascript:/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
  return s || undefined;
}

/**
 * Kit brut (installeur, admin, API) → kit normalisé. Les valeurs invalides
 * sont écartées et signalées dans `avertissements`, jamais devinées.
 * @returns {{ kit: import('./index.js').Kit, avertissements: string[] }}
 */
export function normaliserKit(brut) {
  const avertissements = [];
  const o = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  /** @type {import('./index.js').Kit} */
  const kit = { couleurs: [], polices: [], niveau: 'vide' };
  const nom = propre(o.nom, 80);
  if (nom) kit.nom = nom;
  const phrase = propre(o.phrase, 300);
  if (phrase) kit.phrase = phrase;

  // Liste, ou chaîne « #0b6e4f,#f2a541 » (séparateurs : virgule, point-virgule, espace).
  const couleurs = typeof o.couleurs === 'string' ? o.couleurs.split(/[\s,;]+/).filter(Boolean) : Array.isArray(o.couleurs) ? o.couleurs : [];
  for (const c of couleurs) {
    if (typeof c === 'string' && HEX.test(c.trim())) {
      const h = c.trim().toLowerCase();
      if (!kit.couleurs.includes(h) && kit.couleurs.length < COULEURS_MAX) kit.couleurs.push(h);
    } else avertissements.push(`couleur ignorée (format #RRGGBB attendu) : ${String(c).slice(0, 30)}`);
  }
  for (const p of Array.isArray(o.polices) ? o.polices : []) {
    const n = propre(p, 60);
    if (n && !kit.polices.includes(n) && kit.polices.length < POLICES_MAX) kit.polices.push(n);
  }
  if (o.logo !== undefined && o.logo !== null) {
    const dataUrl = typeof o.logo === 'string' ? o.logo : o.logo?.dataUrl;
    const r = validerLogo(dataUrl);
    if (r.erreur || !String(dataUrl).startsWith('data:')) avertissements.push(`logo ignoré : ${r.erreur ?? 'data: URI attendu'}`);
    else kit.logo = { type: /^data:image\/png/i.test(dataUrl) ? 'png' : 'svg', dataUrl };
  }
  if (o.site && typeof o.site === 'object') {
    const url = typeof o.site.url === 'string' && /^https?:\/\/[^\s<>"]{1,300}$/i.test(o.site.url.trim()) ? o.site.url.trim() : undefined;
    const site = { url: url ?? '', titre: propre(o.site.titre, 120) ?? '', texte: propre(o.site.texte, TEXTE_SITE_MAX) ?? '' };
    if (site.url || site.titre || site.texte) kit.site = site;
  }

  const visuel = kit.couleurs.length + kit.polices.length + (kit.logo ? 1 : 0) + (kit.site ? 1 : 0);
  kit.niveau = kit.logo && kit.couleurs.length >= 2 && kit.polices.length >= 1 ? 'complet' : visuel ? 'partiel' : 'vide';
  return { kit, avertissements };
}

/**
 * Rôles des couleurs du kit : les couleurs de marque (chromatiques, pas un
 * papier) dans l'ordre donné (primaire, secondaire, accent) ; sans couleur de
 * marque, la plus foncée des neutres devient la primaire (marque noir et
 * blanc). Un papier (couleur très claire, même teintée) va au fond, jamais à la
 * primaire ; une encre (presque noire, neutre) va au texte quand une couleur de
 * marque porte la primaire. Ex. charte `#16130f,#f4eee3,#c9993b,#2e5a5c` :
 * primaire or, secondaire et accent nil, fond papyrus, texte noir.
 */
export function rolesDesCouleurs(couleurs) {
  const papiers = fondEtTexteDuKit(couleurs);
  const chroma = couleurs.filter(estCouleurDeMarque);
  if (chroma.length) {
    const [primaire, secondaire, accent] = chroma;
    return { primaire, ...(secondaire && { secondaire }), ...(accent ? { accent } : secondaire ? { accent: secondaire } : {}), ...papiers };
  }
  const neutres = couleurs.filter((c) => !estPapier(c)).sort((a, b) => luminance(a) - luminance(b));
  const fond = papiers.fond ? { fond: papiers.fond } : {};
  return neutres.length && luminance(neutres[0]) < 0.2 ? { primaire: neutres[0], ...fond } : fond;
}

/**
 * Fond et texte donnés par le kit : premier papier, première encre (voir
 * `estPapier`, `estEncre`). Rien d'inventé : rôle absent si le kit n'en a pas.
 * @param {string[]} couleurs
 * @returns {{ fond?: string, texte?: string }}
 */
export function fondEtTexteDuKit(couleurs) {
  const fond = couleurs.find(estPapier);
  const texte = couleurs.find(estEncre);
  return { ...(fond && { fond }), ...(texte && { texte }) };
}

function nomDuKit(kit) {
  if (kit.nom) return kit.nom;
  const titre = kit.site?.titre;
  return titre ? titre.split(/\s[|—–-]\s|[|—–]/)[0].trim().slice(0, 80) : '';
}

/**
 * Nom et accroche tirés du kit : nom, sinon titre du site ; accroche = la
 * phrase du kit seulement (au dernier mot entier sous 160 car.). Le texte
 * d'une page (`site.texte`) n'est jamais une accroche : c'est le texte brut
 * recollé (titre, menu, boutons : « Atelier Nkosi Atelier Nkosi Menuiserie
 * sur mesure à Dakar. Devis »). Il reste un indice pour le modèle ; un appelant
 * qui veut l'accroche d'une page la passe en `phrase` (description, premier
 * paragraphe : `accrocheDeLaPage` des installeurs).
 */
export function identiteDuKit(kitBrut) {
  const { kit } = normaliserKit(kitBrut);
  const identite = {};
  const nom = nomDuKit(kit);
  if (nom) {
    const r = texteCourt(nom, 80);
    if (r.valeur) identite.nom = r.valeur;
  }
  const accroche = kit.phrase;
  if (accroche) {
    const courte = accroche.length > 160 ? accroche.slice(0, 161).replace(/\s+\S*$/, '') : accroche;
    const r = texteCourt(courte.slice(0, 160), 160);
    if (r.valeur) identite.accroche = r.valeur;
  }
  return identite;
}

/**
 * Marque complète, sans IA, pour un kit (normalisé ou brut) et un template.
 * Les couleurs du kit sont des couleurs données : jamais modifiées ; une
 * paire qui échoue à cause d'elles est listée par `verifierContraste(marque)`
 * (et dans `proposerSansIA(…)[i].contraste`).
 * @param {unknown} kitBrut
 * @param {string} [templateId] `sobre` par défaut
 * @returns {import('./index.js').MarqueComplete}
 */
export function completerSansIA(kitBrut, templateId = TEMPLATE_PAR_DEFAUT) {
  const { kit } = normaliserKit(kitBrut);
  const tpl = templateParId(templateId) ?? templateParId(TEMPLATE_PAR_DEFAUT);
  const marque = { version: 'marque/v1', template: tpl.id };

  const identite = identiteDuKit(kit);
  if (Object.keys(identite).length) marque.identite = identite;

  if (kit.logo) marque.logos = { principal: kit.logo.dataUrl, ...(kit.logo.type === 'svg' ? { favicon: kit.logo.dataUrl } : {}) };

  const couleurs = rolesDesCouleurs(kit.couleurs);
  if (Object.keys(couleurs).length) marque.couleurs = couleurs;

  const polices = kit.polices.map((p) => policeProche(p)).filter(Boolean);
  const titres = polices.find((p) => p.usages.includes('titres'));
  const texte = polices.filter((p) => p.usages.includes('texte'))[1] ?? titres;
  const mono = polices.find((p) => p.categorie === 'mono');
  if (titres || mono) {
    marque.typographie = {
      ...(titres && { titres: { famille: titres.famille } }),
      ...(texte && { texte: { famille: texte.famille } }),
      ...(mono && { mono: { famille: mono.famille } }),
    };
  }
  return normaliser(marque);
}

const JUSTIFICATIONS = {
  sobre: 'Rendu calme et institutionnel : fond clair, la couleur principale réservée aux actions.',
  editorial: 'Rendu affirmé et typographique : grands aplats sombres, accent en filet.',
  chaleureux: 'Rendu accueillant et arrondi : surfaces teintées de la couleur secondaire.',
};

/** Phrase d'un template, montrée sur sa carte quand aucune justification n'est affichable. */
export function justificationDuTemplate(templateId) {
  return JUSTIFICATIONS[templateId] ?? JUSTIFICATIONS.sobre;
}

/** Template le plus proche d'un kit complet (sans IA) : polices puis couleurs. */
export function templateSuggere(kitBrut) {
  const { kit } = normaliserKit(kitBrut);
  const familles = kit.polices.map((p) => policeProche(p)?.famille);
  for (const t of IDS_TEMPLATES) if (familles[0] && templateParId(t).typographie.titres.famille === familles[0]) return t;
  const { primaire } = rolesDesCouleurs(kit.couleurs);
  if (primaire && luminance(primaire) < 0.04) return 'editorial';
  if (primaire && saturation(primaire) > 0.55 && luminance(primaire) > 0.15) return 'chaleureux';
  return TEMPLATE_PAR_DEFAUT;
}

/** Nombre de propositions attendues : 1 si le template est imposé ou le kit complet, 3 sinon. */
export function nombreDePropositions(kitBrut, templateId) {
  const { kit } = normaliserKit(kitBrut);
  return (templateId && templateParId(templateId)) || kit.niveau === 'complet' ? 1 : 3;
}

/**
 * Propositions sans IA, mêmes règles de nombre que l'API (`nombreDePropositions`) :
 * template imposé ou kit complet → 1 ; sinon 3, une par template, `sobre` en tête.
 * @returns {Array<{ marque: import('./index.js').MarqueComplete, template: string, justification: string }>}
 */
export function proposerSansIA(kitBrut, templateId) {
  const { kit } = normaliserKit(kitBrut);
  let ids;
  if (templateId && templateParId(templateId)) ids = [templateId];
  else if (kit.niveau === 'complet') ids = [templateSuggere(kit)];
  else ids = [...IDS_TEMPLATES];
  return ids.map((id) => {
    const marque = completerSansIA(kit, id);
    const justification = justificationDuKit(kit, marque, id) ?? justificationDuTemplate(id);
    return { marque, template: id, justification, contraste: verifierContraste(marque) };
  });
}
