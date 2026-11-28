// Catalogue de polices marque/v1 : Source Serif 4 et Nunito Sans (design/v1),
// et cohérence avec les fichiers auto-hébergés de packages/theme/polices.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalogueDePolices, policeDuCatalogue, policeProche, valider, normaliser, versVariablesCss } from '../src/index.js';

const DOSSIER_POLICES = fileURLToPath(new URL('../../theme/polices/', import.meta.url));
// Absent quand le paquet est recopié hors d'edms (openkmt/zeno, scripts/sync-marque.sh) :
// la partie « auto-hébergées » est alors ignorée, le reste du catalogue est testé.
const AVEC_THEME = existsSync(`${DOSSIER_POLICES}polices.css`);
const css = AVEC_THEME ? readFileSync(`${DOSSIER_POLICES}polices.css`, 'utf8') : '';
const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map((m) => m[1]);

describe('catalogue : Source Serif 4 et Nunito Sans', () => {
  it('les deux familles sont au catalogue, avec les métadonnées attendues', () => {
    const serif = catalogueDePolices.find((p) => p.famille === 'Source Serif 4');
    const humaniste = catalogueDePolices.find((p) => p.famille === 'Nunito Sans');
    assert.deepEqual({ ...serif, usages: [...serif.usages], graisses: [...serif.graisses] }, {
      id: 'source-serif-4',
      famille: 'Source Serif 4',
      categorie: 'serif',
      usages: ['titres', 'texte'],
      graisses: [400, 600, 700],
      pile: "'Source Serif 4', Georgia, 'Times New Roman', serif",
    });
    assert.deepEqual({ ...humaniste, usages: [...humaniste.usages], graisses: [...humaniste.graisses] }, {
      id: 'nunito-sans',
      famille: 'Nunito Sans',
      categorie: 'sans',
      usages: ['titres', 'texte'],
      graisses: [400, 600, 700],
      pile: "'Nunito Sans', 'Manrope', system-ui, sans-serif",
    });
    assert.ok(Object.isFrozen(serif) && Object.isFrozen(serif.graisses));
    // Une seule mono, ids uniques.
    assert.equal(catalogueDePolices.filter((p) => p.categorie === 'mono').length, 1);
    assert.equal(new Set(catalogueDePolices.map((p) => p.id)).size, catalogueDePolices.length);
  });

  it('recherche exacte (casse, espaces, guillemets ignorés) et usage', () => {
    assert.equal(policeDuCatalogue("'source serif 4'")?.famille, 'Source Serif 4');
    assert.equal(policeDuCatalogue('NUNITO  SANS', 'texte')?.famille, 'Nunito Sans');
    assert.equal(policeDuCatalogue('Source Serif 4', 'mono'), undefined);
  });

  it('rapprochement sans IA : serif → Source Serif 4, Nunito → Nunito Sans, le reste inchangé', () => {
    for (const n of ['Georgia', 'Times New Roman', 'Merriweather', 'Playfair Display', 'Source Serif Pro']) {
      assert.equal(policeProche(n)?.famille, 'Source Serif 4', n);
    }
    assert.equal(policeProche('Nunito')?.famille, 'Nunito Sans');
    assert.equal(policeProche('Open Sans')?.famille, 'Inter');
    assert.equal(policeProche('Poppins')?.famille, 'Plus Jakarta Sans');
    assert.equal(policeProche('Lato')?.famille, 'Manrope');
  });

  it('une marque qui les choisit les garde : validation, normalisation, variables CSS', () => {
    const marque = { typographie: { titres: { famille: 'source serif 4', graisse: 600 }, texte: { famille: 'Nunito Sans' } } };
    const v = valider(marque);
    assert.equal(v.ok, true, v.erreurs?.join(' | '));
    const m = normaliser(marque);
    assert.equal(m.typographie.titres.famille, 'Source Serif 4');
    assert.equal(m.typographie.titres.graisse, 600);
    assert.equal(m.typographie.texte.famille, 'Nunito Sans');
    const vars = versVariablesCss(m);
    assert.equal(vars['--marque-police-titres'], "'Source Serif 4', Georgia, 'Times New Roman', serif");
    assert.equal(vars['--marque-police-texte'], "'Nunito Sans', 'Manrope', system-ui, sans-serif");
  });

  it('graisse absente de la famille : la plus proche disponible', () => {
    assert.equal(normaliser({ typographie: { titres: { famille: 'Source Serif 4', graisse: 800 } } }).typographie.titres.graisse, 700);
    assert.equal(normaliser({ typographie: { titres: { famille: 'Nunito Sans', graisse: 500 } } }).typographie.titres.graisse, 400);
  });
});

describe('polices auto-hébergées (packages/theme/polices)', { skip: !AVEC_THEME && 'packages/theme absent (copie hors edms)' }, () => {
  it('chaque famille du catalogue a ses @font-face (font-display: swap)', () => {
    for (const p of catalogueDePolices) {
      const siennes = faces.filter((f) => f.includes(`font-family: '${p.famille}';`));
      assert.ok(siennes.length >= 2, `${p.famille} : latin et latin étendu attendus`);
      for (const f of siennes) assert.match(f, /font-display: swap;/);
    }
  });

  it('Source Serif 4 : 400/600/700 + italique 400 ; Nunito Sans : 400/600/700 (latin et latin étendu)', () => {
    const variantes = (famille) => faces
      .filter((f) => f.includes(`font-family: '${famille}';`))
      .map((f) => `${/font-weight: (\d+);/.exec(f)?.[1]}-${/font-style: (\w+);/.exec(f)?.[1]}`)
      .sort();
    const deux = (vs) => vs.flatMap((v) => [v, v]).sort();
    assert.deepEqual(variantes('Source Serif 4'), deux(['400-italic', '400-normal', '600-normal', '700-normal']));
    assert.deepEqual(variantes('Nunito Sans'), deux(['400-normal', '600-normal', '700-normal']));
  });

  it('chaque fichier référencé existe, est un WOFF2, et rien ne vient de Google Fonts', () => {
    const fichiers = [...css.matchAll(/url\(\.\/([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(fichiers.length > 0);
    for (const f of fichiers) {
      assert.ok(existsSync(`${DOSSIER_POLICES}${f}`), f);
      assert.equal(readFileSync(`${DOSSIER_POLICES}${f}`).subarray(0, 4).toString('latin1'), 'wOF2', f);
    }
    assert.doesNotMatch(css, /fonts\.(googleapis|gstatic)\.com/);
  });

  it('licence SIL OFL de chaque famille du catalogue dans LICENCES.md', () => {
    const licences = readFileSync(`${DOSSIER_POLICES}LICENCES.md`, 'utf8');
    for (const p of catalogueDePolices) assert.ok(licences.includes(`## ${p.famille}\n`), p.famille);
    assert.match(licences, /Adobe \(http:\/\/www\.adobe\.com\/\), with Reserved Font Name ‘Source’/);
    assert.match(licences, /The Nunito Sans Project Authors/);
  });
});
