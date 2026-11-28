/**
 * Couleurs sans dépendance : hex, contraste WCAG, mélanges, teintes lisibles.
 *
 * Repris de `@edms/theme` (color.ts : luminance, contrast, mix, readableTint)
 * et de create-edms (ia/proposition.ts : seuils AA). Le format `marque/v1`
 * n'accepte que `#RRGGBB` : toute autre écriture est refusée, jamais
 * interprétée.
 */

export const HEX = /^#[0-9a-fA-F]{6}$/;

/** Texte courant (WCAG AA). */
export const SEUIL_AA = 4.5;
/** Éléments graphiques : filets, icônes, bordures actives (WCAG AA). */
export const SEUIL_AA_GRAPHIQUE = 3;

export const BLANC = '#ffffff';
export const NOIR = '#000000';

export function estHex(v) {
  return typeof v === 'string' && HEX.test(v);
}

const borne = (n) => Math.min(255, Math.max(0, Math.round(n)));
const hex2 = (n) => borne(n).toString(16).padStart(2, '0');

export function versRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

export function depuisRgb([r, g, b]) {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
export function luminance(hex) {
  const [r, g, b] = versRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre deux couleurs (1 à 21). */
export function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mélange `a` vers `b` (`t` = part de `b`, 0 à 1). */
export function melanger(a, b, t) {
  const ca = versRgb(a);
  const cb = versRgb(b);
  return depuisRgb(ca.map((v, i) => v + (cb[i] - v) * t));
}

export function estSombre(hex) {
  return luminance(hex) < 0.18;
}

/** Noir ou blanc, le plus lisible sur `fond`. */
export function extremeLisible(fond) {
  return contraste(fond, NOIR) >= contraste(fond, BLANC) ? NOIR : BLANC;
}

/**
 * Variante de `couleur` lisible sur tous les `fonds` (ratio `seuil`). Rendue
 * telle quelle si elle passe ; sinon mélangée par paliers de 2,5 % vers le
 * noir (fonds clairs) ou le blanc (fonds sombres) : la teinte reste
 * reconnaissable, seule la clarté change. Repli : noir ou blanc.
 */
export function teinteLisible(couleur, fonds, seuil = SEUIL_AA) {
  const passe = (c) => fonds.every((f) => contraste(c, f) >= seuil);
  if (passe(couleur)) return couleur;
  const versExtreme = extremeLisible(fonds[0] ?? BLANC);
  for (let i = 1; i <= 40; i++) {
    const c = melanger(couleur, versExtreme, i / 40);
    if (passe(c)) return c;
  }
  // Fonds contradictoires (un clair, un sombre) : l'extrême le moins mauvais.
  const scores = [NOIR, BLANC].map((c) => Math.min(...fonds.map((f) => contraste(c, f))));
  return scores[0] >= scores[1] ? NOIR : BLANC;
}

/** Texte lisible sur `fond` : `prefere` s'il passe le seuil, sinon noir ou blanc (le plus lisible). */
export function texteSur(fond, prefere, seuil = SEUIL_AA) {
  if (prefere && contraste(prefere, fond) >= seuil) return prefere;
  return extremeLisible(fond);
}

// ─── HSL (dérivation des couleurs manquantes) ───

export function versHsl(hex) {
  const [r, g, b] = versRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function depuisHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return depuisRgb([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/** Saturation HSL (0 à 1). */
export function saturation(hex) {
  return versHsl(hex)[1];
}

/** Tourne la teinte de `deg` degrés, saturation et clarté gardées. */
export function tournerTeinte(hex, deg) {
  const [h, s, l] = versHsl(hex);
  return depuisHsl((((h + deg) % 360) + 360) % 360, s, l);
}

/** Couleur « chromatique » : ni gris, ni presque blanc, ni presque noir. */
export function estChromatique(hex) {
  const [, s, l] = versHsl(hex);
  return s >= 0.15 && l > 0.08 && l < 0.94;
}

/**
 * Clarté HSL à partir de laquelle une couleur du kit est un papier (fond de
 * page), même teintée : `#f4eee3` (clarté 0,92) est chromatique, mais des
 * boutons de cette couleur sur fond blanc ne se voient pas.
 */
export const CLARTE_PAPIER = 0.85;
/** Luminance relative sous laquelle une couleur neutre du kit est une encre (texte). */
export const LUMINANCE_ENCRE = 0.05;

/** Couleur du kit qui peut porter la marque (primaire, secondaire, accent) : chromatique et pas un papier. */
export function estCouleurDeMarque(hex) {
  return estChromatique(hex) && versHsl(hex)[2] < CLARTE_PAPIER;
}

/** Papier : couleur très claire du kit, teintée ou non ; elle va au fond. */
export function estPapier(hex) {
  return versHsl(hex)[2] >= CLARTE_PAPIER;
}

/** Encre : couleur presque noire et non chromatique du kit ; elle va au texte. */
export function estEncre(hex) {
  return !estChromatique(hex) && luminance(hex) < LUMINANCE_ENCRE;
}
