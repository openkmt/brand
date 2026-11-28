import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  citeLeKit, justificationDuKit, justificationPourLeKit, teinteDe, lireReponseIA, promptCompletion, normaliserKit,
  justificationAffichee, IDS_TEMPLATES, VERSION_PROMPT,
} from '../src/index.js';

const svg = (corps) => `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${corps}</svg>`).toString('base64')}`;
const LOGO = svg('<rect width="10" height="10" fill="#0b3d2e"/>');
// Kit de l'essai réel du 22/11 05:20 (table ronde, Koffi) : logo + deux couleurs.
const BAOBAB = { nom: 'Baobab Conseil', logo: { type: 'svg', dataUrl: LOGO }, couleurs: ['#0b3d2e', '#e8a33d'] };
const kit = (brut) => normaliserKit(brut).kit;
// Les trois phrases constatées ce jour-là : aucune ne parle du client.
const GENERIQUES = [
  'professionnel et sobre',
  'typographie affirmée, fonds sombres, accent en filet',
  'teintes naturelles et chaleureuses pour une image de confiance',
];

describe('teinteDe', () => {
  it('nomme la teinte en français', () => {
    assert.equal(teinteDe('#0b3d2e'), 'vert');
    assert.equal(teinteDe('#e8a33d'), 'orange');
    assert.equal(teinteDe('#29335c'), 'bleu');
    assert.equal(teinteDe('#c0392b'), 'rouge');
    assert.equal(teinteDe('#16130f'), 'noir');
    assert.equal(teinteDe('#ffffff'), 'blanc');
    assert.equal(teinteDe('#808080'), 'gris');
  });
});

describe('citeLeKit', () => {
  it('refuse les formules passe-partout', () => {
    for (const g of GENERIQUES) assert.equal(citeLeKit(g, kit(BAOBAB)), false, g);
  });

  it('accepte un code, une teinte, le logo, le nom, une police ou un mot de la phrase', () => {
    const k = kit({ ...BAOBAB, polices: ['Fraunces'], phrase: 'Cabinet de conseil en agroforesterie au Sénégal' });
    for (const ok of [
      'Le #0B3D2E en aplats.', 'Le 0b3d2e en aplats.', 'Vert profond en aplats.', 'Accent doré en filet.',
      'Repris du logo.', 'Pour Baobab, des aplats.', 'Titres en Fraunces.', "L'agroforesterie mise en avant.",
    ]) assert.equal(citeLeKit(ok, k), true, ok);
    assert.equal(citeLeKit('Un conseil clair.', k), false, 'un mot vide du nom ne suffit pas');
    assert.equal(citeLeKit('', k), false);
    assert.equal(citeLeKit(undefined, k), false);
  });

  it('kit sans rien de citable : toute phrase convient', () => {
    assert.equal(citeLeKit('professionnel et sobre', kit({})), true);
  });
});

describe('justificationDuKit', () => {
  it('cite le nom, les couleurs retenues et le logo, puis le caractère du template', () => {
    const marque = { couleurs: { primaire: '#0b3d2e', secondaire: '#e8a33d', accent: '#e8a33d' } };
    assert.equal(
      justificationDuKit(kit(BAOBAB), marque, 'sobre'),
      "Baobab Conseil : votre vert #0b3d2e en couleur principale, l'orange #e8a33d en accent, votre logo en tête ; rendu calme et institutionnel.",
    );
    assert.match(justificationDuKit(kit(BAOBAB), marque, 'editorial'), /rendu affirmé/);
    assert.match(justificationDuKit(kit(BAOBAB), marque, 'chaleureux'), /rendu accueillant/);
  });

  it("n'invente rien : couleur hors du kit tue, sans nom « Votre marque », kit vide → undefined", () => {
    const sansNom = justificationDuKit(kit({ couleurs: ['#0b3d2e'] }), { couleurs: { primaire: '#0b3d2e', accent: '#123456' } }, 'sobre');
    assert.equal(sansNom, 'Votre marque : votre vert #0b3d2e en couleur principale ; rendu calme et institutionnel.');
    assert.equal(justificationDuKit(kit({ nom: 'Djeko' }), { couleurs: { primaire: '#2f4a7a' } }, 'sobre'), 'Djeko : rendu calme et institutionnel.');
    assert.equal(justificationDuKit(kit({}), { couleurs: { primaire: '#2f4a7a' } }, 'sobre'), undefined);
  });

  it('justificationPourLeKit garde la phrase du modèle si elle cite le kit', () => {
    const k = kit(BAOBAB);
    const m = { couleurs: { primaire: '#0b3d2e', accent: '#e8a33d' } };
    assert.equal(justificationPourLeKit('Le vert du logo en aplats.', k, m, 'sobre', 'repli'), 'Le vert du logo en aplats.');
    assert.match(justificationPourLeKit('professionnel et sobre', k, m, 'sobre', 'repli'), /^Baobab Conseil : /);
    assert.equal(justificationPourLeKit('professionnel et sobre', kit({}), m, 'sobre', 'repli'), 'professionnel et sobre');
    assert.equal(justificationPourLeKit(undefined, kit({}), m, 'sobre', 'repli'), 'repli');
  });
});

describe('prompt v4 et lecture de la réponse', () => {
  it("le prompt demande une phrase qui cite le kit, sans consigne de longueur à recopier", () => {
    const { version, messages } = promptCompletion(BAOBAB);
    assert.equal(version, 'marque-completion-v4');
    assert.equal(VERSION_PROMPT, 'marque-completion-v4');
    assert.doesNotMatch(messages[0].content, /caractères max/);
    assert.match(messages[0].content, /"j":"phrase qui cite le kit"/);
    assert.match(messages[0].content, /élément précis de SON kit/);
  });

  it('kit partiel (logo + 2 couleurs) : 3 cartes, chaque justification parle du client', () => {
    const props = IDS_TEMPLATES.map((tpl, i) => ({ tpl, j: GENERIQUES[i], p: '#0b3d2e', s: '#e8a33d', a: '#e8a33d', ht: 'Inter', gt: 700, tt: 'Inter' }));
    const r = lireReponseIA(JSON.stringify({ propositions: props }), BAOBAB);
    assert.ok(r.ok, r.erreurs.join());
    assert.equal(r.marques.length, 3);
    for (const { justification, template } of r.marques) {
      assert.ok(citeLeKit(justification, kit(BAOBAB)), justification);
      assert.match(justification, /^Baobab Conseil : votre vert #0b3d2e en couleur principale/);
      // La carte affiche la phrase telle quelle (rien à retirer).
      assert.equal(justificationAffichee(justification, template), justification);
    }
  });

  it('une justification qui cite le kit est gardée telle quelle', () => {
    const props = IDS_TEMPLATES.map((tpl) => ({ tpl, j: 'Le vert #0b3d2e de Baobab en aplats.', p: '#0b3d2e', s: '#e8a33d', a: '#e8a33d' }));
    const r = lireReponseIA(JSON.stringify({ propositions: props }), BAOBAB);
    assert.ok(r.ok, r.erreurs.join());
    for (const { justification } of r.marques) assert.equal(justification, 'Le vert #0b3d2e de Baobab en aplats.');
  });
});
