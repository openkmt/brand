/** Types de @openkmt/marque (format `marque/v1`). */

export type TemplateId = 'sobre' | 'editorial' | 'chaleureux';
export type Hex = `#${string}`;
export type RoleCouleur =
  | 'primaire' | 'surPrimaire' | 'secondaire' | 'accent' | 'fond' | 'surface'
  | 'texte' | 'attenue' | 'bordure' | 'succes' | 'alerte' | 'danger';
export type RoleLogo = 'principal' | 'surFondSombre' | 'signe' | 'favicon';
export type Graisse = 400 | 500 | 600 | 700 | 800;
export type Rayon = 'net' | 'doux' | 'rond';
export type Densite = 'compacte' | 'confortable';
export type Casse = 'normale' | 'majuscules';
export type EnteteEmail = 'sombre' | 'clair' | 'accent';

/** marque/v1 : tout champ est facultatif ; absent = valeur du template. */
export interface Marque {
  version?: 'marque/v1';
  template?: TemplateId;
  identite?: { nom?: string; nomCourt?: string; accroche?: string; ton?: string[] };
  /** data: URI SVG/PNG (512 Ko max) ou chemin relatif à côté de marque.json. */
  logos?: Partial<Record<RoleLogo, string>>;
  couleurs?: Partial<Record<RoleCouleur, string>>;
  typographie?: {
    titres?: { famille?: string; graisse?: Graisse; casse?: Casse };
    texte?: { famille?: string };
    mono?: { famille?: string };
  };
  forme?: { rayon?: Rayon; densite?: Densite };
  emails?: { entete?: EnteteEmail };
  /** Design du catalogue choisi (design/v1, facultatif) : absent = rendu historique. */
  design?: DesignChoisi;
}

/** Choix de design stocké dans `marque.design` (extension additive de marque/v1). */
export interface DesignChoisi {
  version: 'design/v1';
  /** `[a-z][a-z0-9-]{0,39}` ; doit exister dans le catalogue installé, sinon ignoré par le produit. */
  id: string;
  /** Réglage → valeur (mêmes règles d'identifiant ; hors manifeste → défaut, côté produit). */
  reglages?: Record<string, string>;
  /** Tokens `--nom` de l'instance (valeur ≤ 200 car., sans ; { } < > \ et accent grave, ni url(, @import, expression(). */
  tokens?: Record<`--${string}`, string>;
}

/** Sortie de `normaliser` : chaque champ est présent (logos absents = ''). */
export interface MarqueComplete {
  version: 'marque/v1';
  template: TemplateId;
  identite: { nom: string; nomCourt: string; accroche: string; ton: string[] };
  logos: Record<RoleLogo, string>;
  couleurs: Record<RoleCouleur, string>;
  typographie: {
    titres: { famille: string; graisse: Graisse; casse: Casse };
    texte: { famille: string };
    mono: { famille: string };
  };
  forme: { rayon: Rayon; densite: Densite };
  emails: { entete: EnteteEmail };
  /** Présent seulement si l'entrée en avait un (gardé tel que validé). */
  design?: DesignChoisi;
}

export interface Template {
  readonly id: TemplateId;
  readonly nom: string;
  readonly version: string;
  readonly caractere: string;
  readonly identite: { readonly ton: readonly string[] };
  readonly typographie: MarqueComplete['typographie'];
  readonly forme: MarqueComplete['forme'];
  readonly emails: MarqueComplete['emails'];
  /** Neutres par défaut (aucune couleur de marque). */
  readonly couleurs: Readonly<Record<'primaire' | 'fond' | 'texte' | 'succes' | 'alerte' | 'danger', string>>;
  /** Règles de dérivation des rôles manquants (données). */
  readonly derivation: Readonly<Record<string, unknown>>;
  readonly usage: {
    readonly primaire: string;
    readonly aplats: 'clairs' | 'sombres' | 'teintés';
    readonly accentSurFond: boolean;
    readonly surfacesTeintees: boolean;
  };
}

export interface PoliceCatalogue {
  readonly id: string;
  readonly famille: string;
  readonly categorie: 'sans' | 'serif' | 'mono';
  readonly usages: readonly ('titres' | 'texte' | 'mono')[];
  readonly graisses: readonly Graisse[];
  /** Valeur CSS font-family complète, avec replis système. */
  readonly pile: string;
}

/** Kit normalisé du client (collecté par l'installeur, sans IA). */
export interface Kit {
  nom?: string;
  phrase?: string;
  couleurs: string[];
  polices: string[];
  logo?: { type: 'svg' | 'png'; dataUrl: string };
  site?: { url: string; titre: string; texte: string };
  niveau: 'complet' | 'partiel' | 'vide';
}

export interface Proposition {
  marque: MarqueComplete;
  template: TemplateId;
  justification: string;
  /** Paires en défaut dues aux couleurs du client (`verifierContraste`), à afficher dans l'aperçu. */
  contraste: DefautContraste[];
}

export interface JeuDerive extends Record<RoleCouleur, string> {
  primaireSurvol: string;
  primaireAppui: string;
  lien: string;
  surSecondaire: string;
  surAccent: string;
  accentTexte: string;
  accentGraphique: string;
  /** `transparent` quand le template interdit l'accent en fond. */
  accentFond: string;
  aplat: string;
  surAplat: string;
  email: { fond: string; texte: string; filet: string };
}
export interface Derivees { clair: JeuDerive; sombre: JeuDerive }

export declare const templates: readonly Template[];
export declare const IDS_TEMPLATES: readonly TemplateId[];
export declare const TEMPLATE_PAR_DEFAUT: 'sobre';
export declare function templateParId(id: string): Template | undefined;

export declare const catalogueDePolices: readonly PoliceCatalogue[];
export declare function policeDuCatalogue(nom: string, usage?: 'titres' | 'texte' | 'mono'): PoliceCatalogue | undefined;
export declare function policeProche(nom: string): PoliceCatalogue | undefined;

export declare const VERSION_FORMAT: 'marque/v1';
export declare const ROLES_COULEURS: readonly RoleCouleur[];
export declare const LOGOS: readonly RoleLogo[];
export declare const RAYONS: Readonly<Record<Rayon, number>>;
export declare const LOGO_OCTETS_MAX: number;
export declare function valider(obj: unknown): { ok: boolean; marque: Marque; erreurs: string[] };
export declare function validerLogo(v: unknown): { valeur?: string; erreur?: string };
export declare const VERSION_DESIGN: 'design/v1';
export declare const ID_DESIGN: RegExp;
export declare function valeurTokenSure(v: unknown): v is string;
export declare function validerDesign(v: unknown): { design?: DesignChoisi; erreurs: string[] };
export declare class MarqueInvalide extends Error {
  erreurs: string[];
  constructor(erreurs: string[]);
}

/**
 * Rôles de couleur donnés par le client : jamais modifiés par `normaliser`
 * (défaut : toutes les couleurs présentes dans l'entrée), sauf une primaire
 * papier invisible sur le fond (contraste < 1,5), déplacée vers le fond.
 * @throws {MarqueInvalide}
 */
export declare function normaliser(marque: unknown, options?: { donnees?: RoleCouleur[] }): MarqueComplete;

/** Paire de couleurs sous le seuil WCAG AA (couleurs données par le client, gardées telles quelles). */
export interface DefautContraste {
  /** ex. `surPrimaire/primaire`, `email.texte/email.fond` */
  paire: string;
  premierPlan: string;
  fond: string;
  couleurs: [string, string];
  /** Ratio arrondi par défaut (2 décimales). */
  ratio: number;
  /** 4,5 (texte) ou 3 (éléments d'interface). */
  seuil: number;
  usage: string;
  mode: 'clair' | 'sombre';
}
export declare const PAIRES_CONTRASTE: ReadonlyArray<readonly [string, string, number, string]>;
/** Paires en défaut, modes clair et sombre ; vide si tout passe. */
export declare function verifierContraste(marque: unknown): DefautContraste[];
export declare function derivees(marque: unknown): Derivees;
export declare function versVariablesCss(marque: unknown, options?: { mode?: 'clair' | 'sombre' }): Record<`--marque-${string}`, string>;
export declare function versCss(marque: unknown, options?: { selecteur?: string }): string;

export declare function normaliserKit(brut: unknown): { kit: Kit; avertissements: string[] };
export declare function completerSansIA(kit: unknown, templateId?: TemplateId | string): MarqueComplete;
export declare function proposerSansIA(kit: unknown, templateId?: TemplateId | string): Proposition[];
export declare function nombreDePropositions(kit: unknown, templateId?: TemplateId | string): 1 | 3;
export declare function rolesDesCouleurs(couleurs: string[]): { primaire?: string; secondaire?: string; accent?: string; fond?: string; texte?: string };
/** Fond et texte donnés par le kit : premier papier (couleur très claire), première encre (presque noire, neutre). */
export declare function fondEtTexteDuKit(couleurs: string[]): { fond?: string; texte?: string };
export declare function templateSuggere(kit: unknown): TemplateId;
export declare function identiteDuKit(kit: unknown): { nom?: string; accroche?: string };
/** Phrase d'un template (repli de la carte). */
export declare function justificationDuTemplate(templateId: TemplateId | string): string;
/** Justification de l'IA filtrée pour la carte ; sinon `repli`, ou la phrase du template. */
export declare function justificationAffichee(brut: unknown, templateId: TemplateId | string, repli?: string): string;
/** Couleurs du kit remises à leur rôle après l'IA (copie ; `max` : premières couleurs du kit lues). */
export declare function rolesDuKit<T extends Record<string, unknown> | undefined>(couleurs: T, couleursDuKit: unknown, options?: { max?: number }): T;

/** Teinte d'une couleur #rrggbb, en français (« vert », « orange »…). */
export declare function teinteDe(hex: string): 'noir' | 'blanc' | 'gris' | 'rouge' | 'orange' | 'brun' | 'jaune' | 'vert' | 'turquoise' | 'bleu' | 'violet' | 'rose';
/** La phrase cite-t-elle le kit (couleur, teinte, logo, nom, police, mot de la phrase) ? */
export declare function citeLeKit(texte: unknown, kit: Kit): boolean;
/** Phrase écrite sans IA à partir du kit et de la marque retenue ; `undefined` sans nom, couleur ni logo. */
export declare function justificationDuKit(kit: Kit, marque: { couleurs?: Record<string, string> } | undefined, templateId: TemplateId | string): string | undefined;
/** Justification du modèle si elle cite le kit, sinon celle écrite à partir du kit, sinon `repli`. */
export declare function justificationPourLeKit(texte: unknown, kit: Kit, marque: { couleurs?: Record<string, string> } | undefined, templateId: TemplateId | string, repli: string): string;

export declare const VERSION_PROMPT: string;
/** Clés de la sortie compacte du modèle (v2) → chemin dans la marque. */
export declare const CLES_COMPACTES: Readonly<Record<'p' | 's' | 'a' | 'f' | 't' | 'ht' | 'gt' | 'tt', string>>;
export declare function promptCompletion(kit: unknown, templateId?: TemplateId | string): {
  version: string;
  /** Templates attendus dans l'ordre ; `['*']` = une seule proposition, template au choix du modèle. */
  attendus: string[];
  messages: Array<{ role: 'system' | 'user'; content: string }>;
};
export declare function messageCorrection(erreurs: string[]): { role: 'user'; content: string };
export declare function lireReponseIA(texte: string, kit: unknown, templateId?: TemplateId | string): {
  ok: boolean;
  marques: Proposition[];
  erreurs: string[];
};
export declare function extraireJson(texte: string): { valeur?: unknown; erreur?: string };

/** data: URI image/svg+xml d'une vignette (marque ou id de template). */
export declare function vignette(marque: unknown): string;

export declare const SEUIL_AA: 4.5;
export declare const SEUIL_AA_GRAPHIQUE: 3;
export declare function contraste(a: string, b: string): number;

/** Réglage déclaré par un manifeste de design (contrat design/v1). */
export interface ReglageDesign { libelle: string; valeurs: string[]; defaut: string }
/** Manifeste d'un design du catalogue (`packages/designs/src/<id>/manifeste.json`). */
export interface ManifesteDesign {
  id: string;
  nom: string;
  version: 1;
  ambiance: string;
  motsCles: string[];
  convientA: string[];
  eviterPour: string[];
  reglages: Record<string, ReglageDesign>;
  surcharge: string[];
}
/** `packages/designs/catalogue.json`. */
export interface CatalogueDesigns { version: 'design/v1'; designs: ManifesteDesign[] }
export type StyleDesign = 'sobre-dense' | 'aere-expressif';
/** Réponses au questionnaire v1 (toutes facultatives). */
export interface ReponsesDesign {
  public?: string;
  troisMots?: string;
  style?: StyleDesign;
  /** Site aimé (URL ou nom) : jamais visité, seulement lu comme indice. */
  reference?: string;
  contraintes?: string;
}
export interface PropositionDesign {
  id: string;
  nom: string;
  /** Tous les réglages du manifeste, valeurs permises seulement. */
  reglages: Record<string, string>;
  /** Français, 280 caractères au plus. */
  pourquoi: string;
}
export declare const VERSION_PROMPT_DESIGN: 'design-proposition-v1';
export declare const STYLES_DESIGN: readonly StyleDesign[];
export declare const LIMITES_REPONSES: Readonly<Record<'public' | 'troisMots' | 'reference' | 'contraintes', number>>;
export declare const POURQUOI_MAX: 280;
export declare const PROPOSITIONS_DESIGN_MAX: 3;
export declare const DESIGN_PAR_TEMPLATE: Readonly<Record<TemplateId, string>>;
export declare const DESIGN_PAR_STYLE: Readonly<Record<StyleDesign, string>>;
export declare const DESIGN_PAR_DEFAUT: 'atelier';
export declare function normaliserReponses(brut: unknown): { ok: boolean; reponses: ReponsesDesign; erreurs: string[] };
export declare function reglagesParDefaut(manifeste: ManifesteDesign): Record<string, string>;
export declare function promptPropositionDesign(catalogue: CatalogueDesigns, kit: unknown, reponses?: ReponsesDesign, options?: { template?: TemplateId | string }): {
  version: 'design-proposition-v1';
  messages: Array<{ role: 'system' | 'user'; content: string }>;
};
export declare function lireReponseDesign(texte: string, catalogue: CatalogueDesigns): { ok: boolean; propositions: PropositionDesign[]; erreurs: string[] };
export declare function proposerDesignSansIA(catalogue: CatalogueDesigns, kit: unknown, reponses?: ReponsesDesign, options?: { template?: TemplateId | string }): PropositionDesign[];
