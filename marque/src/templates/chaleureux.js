// Template « chaleureux » — fichier de données (aucune logique, aucune couleur de marque).
// Accueillant, arrondi : surfaces teintées de la couleur secondaire.
export default {
  id: 'chaleureux',
  nom: 'Chaleureux',
  version: '1.0.0',
  caractere: 'Accueillant, arrondi. Surfaces teintées de la couleur secondaire.',
  identite: { ton: ['accueillant', 'proche', 'simple'] },
  typographie: {
    titres: { famille: 'Plus Jakarta Sans', graisse: 700, casse: 'normale' },
    texte: { famille: 'Plus Jakarta Sans' },
    mono: { famille: 'JetBrains Mono' },
  },
  forme: { rayon: 'rond', densite: 'confortable' },
  emails: { entete: 'accent' },
  couleurs: {
    primaire: '#57534e',
    fond: '#fffdf9',
    texte: '#1c1917',
    succes: '#15803d',
    alerte: '#b45309',
    danger: '#b91c1c',
  },
  derivation: {
    secondaire: { rotation: ['primaire', 35] },
    accent: { rotation: ['primaire', -35] },
    surface: { melange: ['fond', 'secondaire', 0.1] },
    attenue: { melange: ['texte', 'fond', 0.38] },
    bordure: { melange: ['fond', 'secondaire', 0.28] },
    aplat: { melange: ['fond', 'secondaire', 0.2] },
  },
  usage: {
    primaire: 'actions',
    aplats: 'teintés',
    accentSurFond: true,
    surfacesTeintees: true,
  },
};
