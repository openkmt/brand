/**
 * Catalogue des polices acceptées par `marque/v1`. Les produits les
 * auto-hébergent (aucun appel à Google Fonts à l'exécution) : une famille
 * hors catalogue est refusée par `valider`, jamais chargée.
 *
 * `id` sert de nom de dossier ou de fichier côté produits (`/polices/<id>/…`).
 * `pile` est la valeur CSS `font-family` complète, avec replis système.
 */

/** @type {ReadonlyArray<import('./index.js').PoliceCatalogue>} */
export const catalogueDePolices = Object.freeze([
  Object.freeze({
    id: 'inter',
    famille: 'Inter',
    categorie: 'sans',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 500, 600, 700, 800]),
    pile: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  }),
  Object.freeze({
    id: 'space-grotesk',
    famille: 'Space Grotesk',
    categorie: 'sans',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 500, 600, 700]),
    pile: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  }),
  Object.freeze({
    id: 'manrope',
    famille: 'Manrope',
    categorie: 'sans',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 500, 600, 700, 800]),
    pile: "'Manrope', 'Inter', system-ui, sans-serif",
  }),
  Object.freeze({
    id: 'plus-jakarta-sans',
    famille: 'Plus Jakarta Sans',
    categorie: 'sans',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 500, 600, 700, 800]),
    pile: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
  }),
  Object.freeze({
    id: 'nunito-sans',
    famille: 'Nunito Sans',
    categorie: 'sans',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 600, 700]),
    pile: "'Nunito Sans', 'Manrope', system-ui, sans-serif",
  }),
  Object.freeze({
    id: 'source-serif-4',
    famille: 'Source Serif 4',
    categorie: 'serif',
    usages: Object.freeze(['titres', 'texte']),
    graisses: Object.freeze([400, 600, 700]),
    pile: "'Source Serif 4', Georgia, 'Times New Roman', serif",
  }),
  Object.freeze({
    id: 'jetbrains-mono',
    famille: 'JetBrains Mono',
    categorie: 'mono',
    usages: Object.freeze(['mono']),
    graisses: Object.freeze([400, 500, 700]),
    pile: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  }),
]);

export const GRAISSES = Object.freeze([400, 500, 600, 700, 800]);

const parNom = new Map(catalogueDePolices.map((p) => [cle(p.famille), p]));

function cle(nom) {
  return String(nom).toLowerCase().replace(/["']/g, '').replace(/[\s_-]+/g, ' ').trim();
}

/** Police du catalogue pour ce nom exact (casse et espaces ignorés), sinon `undefined`. */
export function policeDuCatalogue(nom, usage) {
  if (typeof nom !== 'string') return undefined;
  const p = parNom.get(cle(nom));
  if (!p) return undefined;
  if (usage && !p.usages.includes(usage)) return undefined;
  return p;
}

/**
 * Familles proches des polices du catalogue, pour rapprocher les polices d'un
 * kit (lues sur un site ou une maquette) sans IA. Une police inconnue ne
 * donne rien : le template décide.
 */
const PROCHES = {
  inter: ['helvetica', 'helvetica neue', 'arial', 'roboto', 'open sans', 'sf pro', 'sf pro text', 'sf pro display', 'segoe ui', 'system ui', 'ibm plex sans', 'source sans pro', 'source sans 3', 'noto sans', 'work sans', 'public sans', 'geist'],
  'space grotesk': ['space grotesk', 'syne', 'archivo', 'clash display', 'cabinet grotesk', 'general sans', 'satoshi', 'neue haas grotesk', 'unbounded', 'chivo', 'oswald', 'bebas neue', 'anton', 'familjen grotesk'],
  manrope: ['manrope', 'lato', 'mulish', 'raleway', 'karla', 'rubik', 'outfit', 'figtree', 'lexend', 'sora'],
  'plus jakarta sans': ['plus jakarta sans', 'poppins', 'montserrat', 'dm sans', 'futura', 'avenir', 'avenir next', 'gilroy', 'quicksand', 'urbanist', 'red hat display', 'josefin sans', 'comfortaa', 'varela round'],
  'nunito sans': ['nunito sans', 'nunito', 'myriad pro', 'frutiger', 'gill sans', 'fira sans'],
  'source serif 4': ['source serif 4', 'source serif pro', 'georgia', 'times', 'times new roman', 'merriweather', 'lora', 'playfair display', 'libre baskerville', 'baskerville', 'pt serif', 'noto serif', 'crimson text', 'crimson pro', 'eb garamond', 'garamond', 'cormorant garamond', 'dm serif display', 'ibm plex serif', 'fraunces', 'spectral', 'literata', 'newsreader', 'roboto slab', 'georgia pro'],
  'jetbrains mono': ['jetbrains mono', 'fira code', 'fira mono', 'source code pro', 'ibm plex mono', 'roboto mono', 'menlo', 'consolas', 'courier new', 'sf mono', 'ubuntu mono', 'space mono', 'dm mono'],
};
const proche = new Map();
for (const [cible, noms] of Object.entries(PROCHES)) for (const n of noms) proche.set(n, cible);

/** Police du catalogue la plus proche d'un nom libre (sans IA), sinon `undefined`. */
export function policeProche(nom) {
  const exacte = policeDuCatalogue(nom);
  if (exacte) return exacte;
  if (typeof nom !== 'string') return undefined;
  const cible = proche.get(cle(nom));
  return cible ? parNom.get(cible) : undefined;
}
