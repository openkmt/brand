/**
 * Vignette SVG d'une marque (ou d'un template seul) : en-tête, titre, carte,
 * bouton, aux vraies couleurs et au vrai rayon. Sert aux cartes de choix de
 * l'installeur et à `GET /v1/templates`. Aucun texte du client dedans.
 */
import { normaliser, derivees } from './normaliser.js';
import { RAYONS } from './valider.js';

/** @returns {string} data: URI `image/svg+xml` */
export function vignette(entree) {
  const m = normaliser(typeof entree === 'string' ? { template: entree } : entree);
  const c = derivees(m).clair;
  const r = RAYONS[m.forme.rayon];
  const rb = Math.min(r, 14);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">`
    + `<rect width="320" height="200" fill="${c.fond}"/>`
    + `<rect width="320" height="44" fill="${c.aplat}"/>`
    + `<rect x="16" y="15" width="64" height="14" rx="3" fill="${c.surAplat}"/>`
    + `<rect x="16" y="62" width="180" height="16" rx="3" fill="${c.texte}"/>`
    + `<rect x="16" y="86" width="132" height="9" rx="3" fill="${c.attenue}"/>`
    + `<rect x="16" y="112" width="288" height="72" rx="${r}" fill="${c.surface}" stroke="${c.bordure}"/>`
    + `<rect x="32" y="128" width="70" height="6" rx="2" fill="${c.accentGraphique}"/>`
    + `<rect x="32" y="144" width="96" height="26" rx="${rb}" fill="${c.primaire}"/>`
    + `<rect x="46" y="154" width="68" height="6" rx="2" fill="${c.surPrimaire}"/>`
    + `<rect x="140" y="144" width="96" height="26" rx="${rb}" fill="none" stroke="${c.lien}" stroke-width="1.5"/>`
    + `</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
