/**
 * `verifierContraste(marque)` : les paires de couleurs d'une marque qui
 * n'atteignent pas le seuil WCAG AA (4,5:1 pour le texte, 3:1 pour les
 * éléments d'interface et les gros titres), en mode clair et sombre.
 *
 * Après `normaliser`, les couleurs dérivées passent toujours : une paire en
 * défaut met donc en cause des couleurs données par le client, gardées telles
 * quelles. L'aperçu de l'installeur et l'admin affichent cette liste.
 */
import { SEUIL_AA, SEUIL_AA_GRAPHIQUE, contraste } from './couleur.js';
import { derivees } from './normaliser.js';

/** [premier plan, fond, seuil, usage] — rôles de `derivees(marque)[mode]`. */
export const PAIRES_CONTRASTE = Object.freeze([
  ['texte', 'fond', SEUIL_AA, 'texte courant'],
  ['texte', 'surface', SEUIL_AA, 'texte sur les cartes'],
  ['attenue', 'fond', SEUIL_AA, 'texte secondaire'],
  ['attenue', 'surface', SEUIL_AA, 'texte secondaire sur les cartes'],
  ['surPrimaire', 'primaire', SEUIL_AA, 'texte des boutons'],
  ['lien', 'fond', SEUIL_AA, 'liens'],
  ['lien', 'surface', SEUIL_AA, 'liens sur les cartes'],
  ['primaire', 'fond', SEUIL_AA_GRAPHIQUE, "boutons et éléments d'interface"],
  ['accentGraphique', 'fond', SEUIL_AA_GRAPHIQUE, 'filets et éléments graphiques'],
  ['surSecondaire', 'secondaire', SEUIL_AA, 'texte sur la couleur secondaire'],
  ['surAplat', 'aplat', SEUIL_AA, 'texte sur les aplats'],
  ['succes', 'fond', SEUIL_AA, 'messages de succès'],
  ['alerte', 'fond', SEUIL_AA, "messages d'alerte"],
  ['danger', 'fond', SEUIL_AA, "messages d'erreur"],
].map(Object.freeze));

const arrondi = (r) => Math.floor(r * 100) / 100;

/**
 * @param {unknown} marque marque/v1 (normalisée ou non)
 * @returns {import('./index.js').DefautContraste[]} vide si tout passe
 * @throws {MarqueInvalide} si la marque est invalide
 */
export function verifierContraste(marque) {
  const d = derivees(marque);
  const defauts = [];
  for (const mode of ['clair', 'sombre']) {
    const c = d[mode];
    const paires = [...PAIRES_CONTRASTE, ['email.texte', 'email.fond', SEUIL_AA, "en-tête des e-mails"]];
    for (const [a, b, seuil, usage] of paires) {
      const ca = a.startsWith('email.') ? c.email[a.slice(6)] : c[a];
      const cb = b.startsWith('email.') ? c.email[b.slice(6)] : c[b];
      const ratio = contraste(ca, cb);
      if (ratio < seuil) {
        defauts.push({ paire: `${a}/${b}`, premierPlan: a, fond: b, couleurs: [ca, cb], ratio: arrondi(ratio), seuil, usage, mode });
      }
    }
  }
  return defauts;
}
