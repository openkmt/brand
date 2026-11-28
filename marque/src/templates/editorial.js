// Template « editorial » — fichier de données (aucune logique, aucune couleur de marque).
// Affirmé, typographique (la marque KMT) : grands aplats sombres, l'accent en
// filet seulement, jamais en fond.
export default {
  id: 'editorial',
  nom: 'Éditorial',
  version: '1.0.0',
  caractere: 'Affirmé, typographique. Grands aplats sombres, accent en filet, jamais en fond.',
  identite: { ton: ['direct', 'affirmé', 'précis'] },
  typographie: {
    titres: { famille: 'Space Grotesk', graisse: 700, casse: 'normale' },
    texte: { famille: 'Manrope' },
    mono: { famille: 'JetBrains Mono' },
  },
  forme: { rayon: 'net', densite: 'compacte' },
  emails: { entete: 'sombre' },
  couleurs: {
    primaire: '#1c1917',
    fond: '#f7f6f2',
    texte: '#111111',
    succes: '#15803d',
    alerte: '#b45309',
    danger: '#b91c1c',
  },
  derivation: {
    secondaire: { rotation: ['primaire', 180] },
    accent: { rotation: ['primaire', 150] },
    surface: { melange: ['fond', '#ffffff', 0.6] },
    attenue: { melange: ['texte', 'fond', 0.42] },
    bordure: { melange: ['fond', 'texte', 0.2] },
    // Aplat sombre : la primaire poussée vers le noir.
    aplat: { melange: ['primaire', '#000000', 0.55] },
  },
  usage: {
    primaire: 'actions et aplats',
    aplats: 'sombres',
    accentSurFond: false,
    surfacesTeintees: false,
  },
};
