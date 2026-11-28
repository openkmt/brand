import sobre from './sobre.js';
import editorial from './editorial.js';
import chaleureux from './chaleureux.js';

const geler = (o) => {
  for (const v of Object.values(o)) if (v && typeof v === 'object') geler(v);
  return Object.freeze(o);
};

/** Les trois templates, dans l'ordre d'affichage des propositions. */
export const templates = geler([sobre, editorial, chaleureux]);

export const IDS_TEMPLATES = Object.freeze(templates.map((t) => t.id));

export const TEMPLATE_PAR_DEFAUT = 'sobre';

export function templateParId(id) {
  return templates.find((t) => t.id === id);
}
