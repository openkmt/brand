// Template « sobre » — fichier de données (aucune logique, aucune couleur de marque).
// Calme, institutionnel : c'est le rendu neutre d'une instance sans marque.
export default {
  id: 'sobre',
  nom: 'Sobre',
  version: '1.0.0',
  caractere: 'Calme, institutionnel. Fond clair, la couleur principale est réservée aux actions.',
  identite: { ton: ['clair', 'fiable', 'posé'] },
  typographie: {
    titres: { famille: 'Inter', graisse: 600, casse: 'normale' },
    texte: { famille: 'Inter' },
    mono: { famille: 'JetBrains Mono' },
  },
  forme: { rayon: 'doux', densite: 'confortable' },
  emails: { entete: 'clair' },
  // Neutres utilisés quand le kit ne donne rien (gris ardoise, pas une marque).
  couleurs: {
    primaire: '#334155',
    fond: '#ffffff',
    texte: '#0f172a',
    succes: '#15803d',
    alerte: '#b45309',
    danger: '#b91c1c',
  },
  // Rôles manquants, dérivés des autres : [a, b, t] = mélange de a vers b (part t de b).
  derivation: {
    secondaire: { rotation: ['primaire', 30] },
    accent: { rotation: ['primaire', -40] },
    surface: { melange: ['fond', 'primaire', 0.035] },
    attenue: { melange: ['texte', 'fond', 0.4] },
    bordure: { melange: ['fond', 'texte', 0.14] },
    aplat: { melange: ['fond', 'primaire', 0.06] },
  },
  usage: {
    primaire: 'actions',
    aplats: 'clairs',
    accentSurFond: true,
    surfacesTeintees: false,
  },
};
