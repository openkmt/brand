// Lecture d'une proposition avant la carte : node:test, sans dépendance (même fichier dans edms et zeno).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { justificationAffichee, justificationDuTemplate, rolesDuKit, proposerSansIA, IDS_TEMPLATES } from '../src/index.js';

describe('justificationAffichee', () => {
  it('retire la consigne recopiée du prompt (réponse réelle du 20/11, carte sobre)', () => {
    assert.equal(
      justificationAffichee('Rouge d’ancrage et jaune d’accent pour contraste modéré, 60 caractères max', 'sobre'),
      'Rouge d’ancrage et jaune d’accent pour contraste modéré',
    );
    assert.equal(justificationAffichee('Aplats sombres (60 caractères maximum).', 'editorial'), 'Aplats sombres');
  });

  it('rien d’utile → phrase du template, ou le repli donné', () => {
    for (const t of IDS_TEMPLATES) {
      const phrase = proposerSansIA({ couleurs: [] }, t)[0].justification;
      assert.equal(justificationDuTemplate(t), phrase);
      for (const brut of [undefined, 42, '', '  ', 'Pourquoi ?', '60 caractères max']) assert.equal(justificationAffichee(brut, t), phrase);
    }
    assert.equal(justificationAffichee(undefined, 'sobre', 'Phrase de l’installeur.'), 'Phrase de l’installeur.');
    assert.equal(justificationDuTemplate('inconnu'), justificationDuTemplate('sobre'));
  });

  it('pas de balise, 300 caractères au plus', () => {
    assert.equal(justificationAffichee('<b>Calme</b> et net', 'sobre'), 'bCalme/b et net');
    assert.equal(justificationAffichee('x'.repeat(500), 'sobre').length, 300);
  });
});

describe('rolesDuKit', () => {
  const KIT = ['#C0392B', '#F1C40F'];

  it('accent = primaire (19/11) → la seconde couleur du kit revient', () => {
    assert.deepEqual(rolesDuKit({ primaire: '#c0392b', secondaire: '#c0392b', accent: '#c0392b' }, KIT), {
      primaire: '#c0392b', secondaire: '#f1c40f', accent: '#f1c40f',
    });
  });

  it('secondaire et accent inventés (20/11) → la seconde couleur chasse l’accent, la secondaire inventée reste', () => {
    assert.deepEqual(rolesDuKit({ primaire: '#c0392b', secondaire: '#2c3e50', accent: '#16a085', fond: '#ffffff' }, KIT), {
      primaire: '#c0392b', secondaire: '#2c3e50', accent: '#f1c40f', fond: '#ffffff',
    });
  });

  it('primaire hors du kit → première couleur du kit ; rien n’est modifié en place', () => {
    const entree = { primaire: '#123456' };
    const sortie = rolesDuKit(entree, KIT);
    assert.deepEqual(entree, { primaire: '#123456' });
    assert.deepEqual(sortie, { primaire: '#c0392b', secondaire: '#f1c40f', accent: '#f1c40f' });
  });

  it('trois couleurs : la troisième prend la secondaire inventée', () => {
    assert.deepEqual(rolesDuKit({ primaire: '#c0392b', secondaire: '#999999', accent: '#f1c40f' }, [...KIT, '#2E86AB']), {
      primaire: '#c0392b', secondaire: '#2e86ab', accent: '#f1c40f',
    });
  });

  it('max : seules les premières couleurs du kit comptent (admin : deux)', () => {
    const c = { primaire: '#c0392b', secondaire: '#999999', accent: '#f1c40f' };
    assert.deepEqual(rolesDuKit(c, [...KIT, '#2E86AB'], { max: 2 }), c);
  });

  it('kit sans couleur valide ou couleurs absentes : inchangé', () => {
    assert.deepEqual(rolesDuKit({ primaire: '#123456' }, ['rouge', '#fff']), { primaire: '#123456' });
    assert.equal(rolesDuKit(undefined, KIT), undefined);
  });
});
