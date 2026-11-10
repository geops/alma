import type {
  FeatureCollection as GeoJSONFeatureCollection,
  LineString as GeoJSONLineString,
  Point as GeoJSONPoint,
  MultiPolygon as GeoJSONMultiPolygon,
} from "geojson";

export type FormularEingaben = Record<string, unknown>;

export type FormularFeld =
  | {
      choices?: { label: string; value: string }[];
      label?: string;
      name: string;
      type: "str";
    }
  | {
      label?: string;
      name: string;
      type: "bool" | "date" | "int" | "title";
    };

export type JSONTranslation = Record<string, string>;

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Code: { input: string; output: string };
  CodeInputType: { input: any; output: any };
  /** Date (isoformat) */
  Date: { input: string; output: string };
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string };
  FormularEingaben: { input: FormularEingaben; output: FormularEingaben };
  FormularFelder: { input: FormularFeld[]; output: FormularFeld[] };
  GeoJSONFeatureCollection: {
    input: GeoJSONFeatureCollection;
    output: GeoJSONFeatureCollection;
  };
  GeoJSONLineString: { input: GeoJSONLineString; output: GeoJSONLineString };
  GeoJSONMultiPolygon: { input: any; output: any };
  GeoJSONPoint: { input: GeoJSONPoint; output: GeoJSONPoint };
  GeoJSONPointOrMultiPolygon: {
    input: GeoJSONPoint | GeoJSONMultiPolygon;
    output: GeoJSONPoint | GeoJSONMultiPolygon;
  };
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown };
  JSONTranslation: { input: JSONTranslation; output: JSONTranslation };
  /** Represents NULL values */
  Void: { input: any; output: any };
};

export type Ablagerung = {
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  erfassungMutation: ErfassungMutation;
  intaId: Scalars["ID"]["output"];
  kompartimentStoffklassen: Array<KompartimentStoffklasse>;
  tiefe?: Maybe<Scalars["String"]["output"]>;
  volKompartiment?: Maybe<Scalars["Float"]["output"]>;
  zeitraum?: Maybe<Zeitraum>;
};

export type AblagerungInput = {
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  intaId?: InputMaybe<Scalars["ID"]["input"]>;
  kompartimentStoffklassen: Array<KompartimentStoffklasseInput>;
  tiefe?: InputMaybe<Scalars["String"]["input"]>;
  volKompartiment?: InputMaybe<Scalars["Float"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumInput>;
};

export type AddSearchResultsToPoolInput = {
  poolId: Scalars["ID"]["input"];
  query: Scalars["String"]["input"];
};

export type Aufgabe = Task & {
  deletable: Scalars["Boolean"]["output"];
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  vflz: Vflz;
};

export type AufgabeWorkflowProblemGroup = Aufgabe | WorkflowProblemGroup;

export type AusKbsGeloescht = EventInterface & {
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type AutoSuggestItem = {
  category?: Maybe<SearchFieldCategory>;
  fieldType?: Maybe<FieldType>;
  type: AutoSuggestType;
  value: Scalars["String"]["output"];
};

export const AutoSuggestType = {
  FieldName: "FIELD_NAME",
  Operator: "OPERATOR",
  Value: "VALUE",
} as const;

export type AutoSuggestType =
  (typeof AutoSuggestType)[keyof typeof AutoSuggestType];
export type BasisBetrieb = {
  begruendungBewertung?: Maybe<Bemerkung>;
  bemerkung?: Maybe<Bemerkung>;
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  brancheAsw?: Maybe<Scalars["Code"]["output"]>;
  brancheNoga?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  eva?: Maybe<Scalars["String"]["output"]>;
  firmaName?: Maybe<Scalars["String"]["output"]>;
  firmaOrt?: Maybe<Scalars["String"]["output"]>;
  firmaPlz?: Maybe<Scalars["String"]["output"]>;
  firmaStrasse?: Maybe<Scalars["String"]["output"]>;
  groesse?: Maybe<Scalars["Int"]["output"]>;
  intbId: Scalars["ID"]["output"];
  mobileStoffe?: Maybe<Scalars["Boolean"]["output"]>;
  relevant?: Maybe<Scalars["Boolean"]["output"]>;
  untersuchungsStand?: Maybe<Scalars["Code"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type BasisZeitraum = {
  bis?: Maybe<Scalars["Date"]["output"]>;
  bisheute: Scalars["Boolean"]["output"];
  bisjahr: Scalars["Boolean"]["output"];
  von?: Maybe<Scalars["Date"]["output"]>;
  vonjahr: Scalars["Boolean"]["output"];
};

export type BearbeitungsstandGesetzt = EventInterface & {
  code: Scalars["Code"]["output"];
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type BearbeitungsstandSetzen = {
  code: Scalars["Code"]["output"];
};

export type Bemerkung = {
  bem: Scalars["String"]["output"];
  erfassungMutation: ErfassungMutation;
  public: Scalars["Boolean"]["output"];
  sort?: Maybe<Scalars["Int"]["output"]>;
};

export type BemerkungInput = {
  bem: Scalars["String"]["input"];
};

export type Beteiligter = {
  betId: Scalars["ID"]["output"];
  erfassungMutation?: Maybe<ErfassungMutation>;
  isEigentuemer: Scalars["Boolean"]["output"];
  isSachbearbeiter: Scalars["Boolean"]["output"];
  subjekt: Subjekt;
};

export type BeteiligterGeschaeft = {
  betTaskId: Scalars["ID"]["output"];
  subjekt: Subjekt;
};

export type BeteiligterGeschaeftInput = {
  betTaskId?: InputMaybe<Scalars["ID"]["input"]>;
  subjId: Scalars["ID"]["input"];
};

export type BeteiligterStandort = {
  betArtId: Scalars["ID"]["output"];
  beteiligter: Beteiligter;
  beziehungsart: Scalars["Code"]["output"];
  erfassungMutation?: Maybe<ErfassungMutation>;
};

export type BeteiligterStandortInput = {
  betArtId?: InputMaybe<Scalars["ID"]["input"]>;
  beziehungsart: Scalars["CodeInputType"]["input"];
  subjId: Scalars["ID"]["input"];
};

export type Betrieb = BasisBetrieb & {
  begruendungBewertung?: Maybe<Bemerkung>;
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  brancheAsw?: Maybe<Scalars["Code"]["output"]>;
  brancheNoga?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  eva?: Maybe<Scalars["String"]["output"]>;
  firmaName?: Maybe<Scalars["String"]["output"]>;
  firmaOrt?: Maybe<Scalars["String"]["output"]>;
  firmaPlz?: Maybe<Scalars["String"]["output"]>;
  firmaStrasse?: Maybe<Scalars["String"]["output"]>;
  groesse?: Maybe<Scalars["Int"]["output"]>;
  intbId: Scalars["ID"]["output"];
  mobileStoffe?: Maybe<Scalars["Boolean"]["output"]>;
  relevant?: Maybe<Scalars["Boolean"]["output"]>;
  untersuchungsStand?: Maybe<Scalars["Code"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type BetriebInput = {
  begruendungBewertung?: InputMaybe<BemerkungInput>;
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  brancheAsw?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  brancheNoga?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  eva?: InputMaybe<Scalars["String"]["input"]>;
  firmaName?: InputMaybe<Scalars["String"]["input"]>;
  firmaOrt?: InputMaybe<Scalars["String"]["input"]>;
  firmaPlz?: InputMaybe<Scalars["String"]["input"]>;
  firmaStrasse?: InputMaybe<Scalars["String"]["input"]>;
  groesse?: InputMaybe<Scalars["Int"]["input"]>;
  intbId?: InputMaybe<Scalars["ID"]["input"]>;
  mobileStoffe?: InputMaybe<Scalars["Boolean"]["input"]>;
  relevant?: InputMaybe<Scalars["Boolean"]["input"]>;
  untersuchungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumMitGenauigkeitInput>;
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type Beurteilung = {
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  handlungsbedarf?: Maybe<Scalars["Code"]["output"]>;
  kbsInfo?: Maybe<KbsInfo>;
  prioSanier?: Maybe<Scalars["Code"]["output"]>;
  prioUntersuch?: Maybe<Scalars["Code"]["output"]>;
  rechtlicherBezug?: Maybe<Scalars["Code"]["output"]>;
  vflzId: Scalars["ID"]["output"];
};

export type BeurteilungInput = {
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  prioSanier?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  prioUntersuch?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type BeurteilungStatistic = {
  beurteilungGruppe: Scalars["Code"]["output"];
  count: Scalars["Int"]["output"];
};

export type CodeList = {
  bezeichnung: Translation;
  cliId: Scalars["ID"]["output"];
  entries: Array<CodeListEntry>;
  readOnly: Scalars["Boolean"]["output"];
};

export type CodeListEntry = {
  bezeichnung: Translation;
  code: Scalars["Code"]["output"];
  isActive: Scalars["Boolean"]["output"];
  sortKey?: Maybe<Scalars["Int"]["output"]>;
};

export type CodeListEntryProblemGroup = CodeListEntry | ProblemGroup;

export type CreateAufgabeInput = {
  faelligkeitsDatum: Scalars["Date"]["input"];
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  startDatum: Scalars["Date"]["input"];
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
  title: Scalars["String"]["input"];
  vflzId: Scalars["ID"]["input"];
};

export type CreateCodeListEntryInput = {
  bezeichnung: TranslationInput;
  cliId: Scalars["ID"]["input"];
  code: Scalars["CodeInputType"]["input"];
  isActive: Scalars["Boolean"]["input"];
  sortKey?: InputMaybe<Scalars["Int"]["input"]>;
};

export type CreateDokumentInput = {
  dokument: Scalars["String"]["input"];
  kategorie?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  notiz: Scalars["String"]["input"];
  oeffentlich: Scalars["Boolean"]["input"];
  startDatum: Scalars["Date"]["input"];
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
  title: Scalars["String"]["input"];
  url?: InputMaybe<Scalars["String"]["input"]>;
  vflzId: Scalars["ID"]["input"];
};

export type CreateNotizInput = {
  kategorie?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  notiz: Scalars["String"]["input"];
  oeffentlich: Scalars["Boolean"]["input"];
  startDatum: Scalars["Date"]["input"];
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
  title: Scalars["String"]["input"];
  url?: InputMaybe<Scalars["String"]["input"]>;
  vflzId: Scalars["ID"]["input"];
};

export type CreatePoolInput = {
  bemerkungen?: InputMaybe<Scalars["String"]["input"]>;
  bezeichnung: Scalars["String"]["input"];
};

export type CreateSavedSearchInput = {
  fields: Array<SearchField>;
  isGrouped: Scalars["Boolean"]["input"];
  isShared: Scalars["Boolean"]["input"];
  name: Scalars["String"]["input"];
  query: Scalars["String"]["input"];
  showOnDashboard: Scalars["Boolean"]["input"];
  sortBy: Array<SortItemInput>;
};

export type CreateSubjektInput = {
  anrede?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  bemerkung?: InputMaybe<BemerkungInput>;
  kategorien: Array<Scalars["CodeInputType"]["input"]>;
  kontakte: Array<KontaktInput>;
  kuerzel?: InputMaybe<Scalars["String"]["input"]>;
  land?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  ort?: InputMaybe<Scalars["String"]["input"]>;
  postleitzahl?: InputMaybe<Scalars["String"]["input"]>;
  strasse?: InputMaybe<Scalars["String"]["input"]>;
  taetigkeit?: InputMaybe<Scalars["String"]["input"]>;
  vorname?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateTeilstandortInput = {
  bezeichnung: Scalars["String"]["input"];
  combinedId: Scalars["String"]["input"];
  flugplatz?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  gemeinde: GemeindeInput;
  geometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  ktu?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  parentGeometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  parentVflzId: Scalars["ID"]["input"];
  parentZentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type CreateUserInput = {
  email: Scalars["String"]["input"];
  firstName: Scalars["String"]["input"];
  isSachbearbeitung: Scalars["Boolean"]["input"];
  lastName: Scalars["String"]["input"];
  password: Scalars["String"]["input"];
  roleName?: InputMaybe<RoleName>;
};

export type CreateVflzInput = {
  bezeichnung: Scalars["String"]["input"];
  combinedId: Scalars["String"]["input"];
  flugplatz?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  gemeinde: GemeindeInput;
  geometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  ktu?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  vftyp: Scalars["CodeInputType"]["input"];
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type DashboardStatistic = {
  beurteilungen: Array<BeurteilungStatistic>;
  geschaefte: Array<GeschaefteStatistic>;
  standortTypen: Array<StandortTypenStatistic>;
};

export type Dokument = Task & {
  deletable: Scalars["Boolean"]["output"];
  dokument?: Maybe<Scalars["String"]["output"]>;
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  url?: Maybe<Scalars["String"]["output"]>;
  vflz: Vflz;
};

export type Eigentum = {
  beziehungsart?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  gemeinde?: Maybe<Gemeinde>;
  nummerierungsbereich?: Maybe<Nummerierungsbereich>;
  parzellen: Array<Scalars["String"]["output"]>;
  status: EigentumStatus;
  subjekt?: Maybe<Subjekt>;
};

export type EigentumInput = {
  beziehungsart?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  hGemId?: InputMaybe<Scalars["ID"]["input"]>;
  hNbId?: InputMaybe<Scalars["String"]["input"]>;
  parzellen: Array<Scalars["String"]["input"]>;
  status: EigentumStatus;
  subjId?: InputMaybe<Scalars["ID"]["input"]>;
};

export const EigentumStatus = {
  Fehlend: "FEHLEND",
  Ueberzaehlig: "UEBERZAEHLIG",
  Zugeordnet: "ZUGEORDNET",
} as const;

export type EigentumStatus =
  (typeof EigentumStatus)[keyof typeof EigentumStatus];
export type Einzelereignis = {
  bemerkung?: Maybe<Bemerkung>;
  datum?: Maybe<Scalars["Date"]["output"]>;
  einzelereignis?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  veenId: Scalars["ID"]["output"];
};

export type EinzelereignisInput = {
  bemerkung?: InputMaybe<BemerkungInput>;
  datum?: InputMaybe<Scalars["Date"]["input"]>;
  einzelereignis?: InputMaybe<Scalars["Code"]["input"]>;
  veenId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type ErfassungMutation = {
  erfasser?: Maybe<Scalars["String"]["output"]>;
  erfassungsDatum?: Maybe<Scalars["DateTime"]["output"]>;
  mutationsDatum?: Maybe<Scalars["DateTime"]["output"]>;
  mutierer?: Maybe<Scalars["String"]["output"]>;
};

/** Gibt den Status zur Beurteilung und Publikation wieder. */
export type EvaluationStatus = {
  /** Standortversion ist belastet. */
  belastet: Scalars["Boolean"]["output"];
  /** Datum der Rechtskraft. */
  datRechtskraft?: Maybe<Scalars["Date"]["output"]>;
  /** Standortversion soll aus dem KbS */
  deleteNow: Scalars["Boolean"]["output"];
  /** Frühere Standortversion wurde aus dem KbS gelöscht. */
  deletedPreviously: Scalars["Boolean"]["output"];
  /** Standortversion wird publiziert. */
  publishNow: Scalars["Boolean"]["output"];
  /** Frühere Standortversion wurde in KbS eingetragen. */
  publishedPreviously: Scalars["Boolean"]["output"];
  /** Rechtskraft wurde oder ist gesetzt. */
  rechtskraft: Scalars["Boolean"]["output"];
  /** Publikationsdatum des Standorts */
  vflDatPublizieren?: Maybe<Scalars["Date"]["output"]>;
  /** Standort ist aus dem KbS entfernt worden. */
  vflDeleted: Scalars["Boolean"]["output"];
  /** Standort ist im KbS eingetragen. */
  vflPublished: Scalars["Boolean"]["output"];
};

export type Event =
  | AusKbsGeloescht
  | BearbeitungsstandGesetzt
  | InKbsEingetragen
  | ProzessGestartet
  | StandortHistorisiert
  | UntersuchungsStandGesetzt;

export type EventInterface = {
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type EventTrigger =
  | BearbeitungsstandSetzen
  | ProzessStarten
  | Publizieren
  | StandortHistorisieren
  | UntersuchungsStandSetzen;

export type ExportSearchInput = {
  fields: Array<SearchField>;
  format: SearchExportFormat;
  lang: Language;
  query: Scalars["String"]["input"];
  sortBy: Array<SortItemInput>;
};

export const FaelligkeitStatus = {
  FaelligNaechsteWoche: "FAELLIG_NAECHSTE_WOCHE",
  FaelligSpaeter: "FAELLIG_SPAETER",
  Ruhend: "RUHEND",
  Ueberfaellig: "UEBERFAELLIG",
} as const;

export type FaelligkeitStatus =
  (typeof FaelligkeitStatus)[keyof typeof FaelligkeitStatus];
export type FieldInfo = {
  field: SearchField;
  name: Scalars["String"]["output"];
  type: FieldType;
};

export const FieldType = {
  Bbox: "BBOX",
  Bool: "BOOL",
  Code: "CODE",
  Date: "DATE",
  Number: "NUMBER",
  Text: "TEXT",
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];
export type Formular = Task & {
  deletable: Scalars["Boolean"]["output"];
  eingaben: Scalars["FormularEingaben"]["output"];
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  felder: Scalars["FormularFelder"]["output"];
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  vflz: Vflz;
};

export type FormularProblemGroup = Formular | ProblemGroup;

export type Gemeinde = {
  bfsNummer?: Maybe<Scalars["Int"]["output"]>;
  displayValue: Scalars["String"]["output"];
  gemeinde: Scalars["String"]["output"];
  hGemId: Scalars["ID"]["output"];
  kanton?: Maybe<Scalars["Code"]["output"]>;
};

export type GemeindeInput = {
  hGemId: Scalars["ID"]["input"];
};

export type GemeindeNummerierungsbereich = {
  gemeinde?: Maybe<Gemeinde>;
  nummerierungsbereich?: Maybe<Nummerierungsbereich>;
};

export type GeoSearchResult = {
  numResultsTotal: Scalars["Int"]["output"];
  vflgeo: Scalars["GeoJSONFeatureCollection"]["output"];
  zentroid: Scalars["GeoJSONFeatureCollection"]["output"];
};

export type GeschaefteFilter = {
  eigene?: InputMaybe<Scalars["Boolean"]["input"]>;
  faelligkeit?: InputMaybe<Array<FaelligkeitStatus>>;
  status?: InputMaybe<Array<TaskStatus>>;
  taskTyp?: InputMaybe<Array<TaskType>>;
  teilflaechen?: InputMaybe<Array<Scalars["String"]["input"]>>;
  titel?: InputMaybe<Scalars["String"]["input"]>;
};

export type GeschaefteStatistic = {
  count: Scalars["Int"]["output"];
  faelligkeit: FaelligkeitStatus;
};

export type GraphSearchResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  results: Array<Vflz>;
};

export type Grundwasser = {
  distanz?: Maybe<Scalars["Int"]["output"]>;
  erfassungMutation: ErfassungMutation;
  flurabstand?: Maybe<Scalars["Float"]["output"]>;
  gwasId: Scalars["ID"]["output"];
  nutzung?: Maybe<Scalars["Code"]["output"]>;
  relativeLage?: Maybe<Scalars["Code"]["output"]>;
};

export type GrundwasserInput = {
  distanz?: InputMaybe<Scalars["Int"]["input"]>;
  flurabstand?: InputMaybe<Scalars["Float"]["input"]>;
  gwasId?: InputMaybe<Scalars["ID"]["input"]>;
  nutzung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  relativeLage?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type HistorizeVflzInput = {
  message: Scalars["String"]["input"];
  vflzId: Scalars["ID"]["input"];
};

export type InKbsEingetragen = EventInterface & {
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type InstanceSetting = {
  category: SettingCategory;
  key: Scalars["String"]["output"];
  value: Scalars["JSON"]["output"];
  valueSchema: Scalars["JSON"]["output"];
};

export type InstanceSettingProblemGroup = InstanceSetting | ProblemGroup;

export type KbsInfo = {
  belastet: Scalars["Boolean"]["output"];
  beurteilung: Scalars["Code"]["output"];
  beurteilungGruppe: Scalars["Code"]["output"];
  color: Scalars["String"]["output"];
  colorRgb?: Maybe<Scalars["String"]["output"]>;
};

export type KinderspielplatzGruenflaeche = {
  altersstufenKinder: Array<Scalars["Code"]["output"]>;
  begruendungBewertung?: Maybe<Bemerkung>;
  belastungUeberSanierungswert?: Maybe<Scalars["Boolean"]["output"]>;
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  eigentumsform?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  eva?: Maybe<Scalars["String"]["output"]>;
  intkId: Scalars["ID"]["output"];
  kinderspielplatzGruenflacheTyp?: Maybe<Scalars["Code"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  ort?: Maybe<Scalars["String"]["output"]>;
  plz?: Maybe<Scalars["String"]["output"]>;
  relevant?: Maybe<Scalars["Boolean"]["output"]>;
  strasse?: Maybe<Scalars["String"]["output"]>;
  untersuchungsStand?: Maybe<Scalars["Code"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type KinderspielplatzGruenflaecheInput = {
  altersstufenKinder: Array<Scalars["CodeInputType"]["input"]>;
  begruendungBewertung?: InputMaybe<BemerkungInput>;
  belastungUeberSanierungswert?: InputMaybe<Scalars["Boolean"]["input"]>;
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  eigentumsform?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  eva?: InputMaybe<Scalars["String"]["input"]>;
  intkId?: InputMaybe<Scalars["ID"]["input"]>;
  kinderspielplatzGruenflacheTyp?: InputMaybe<
    Scalars["CodeInputType"]["input"]
  >;
  name?: InputMaybe<Scalars["String"]["input"]>;
  ort?: InputMaybe<Scalars["String"]["input"]>;
  plz?: InputMaybe<Scalars["String"]["input"]>;
  relevant?: InputMaybe<Scalars["Boolean"]["input"]>;
  strasse?: InputMaybe<Scalars["String"]["input"]>;
  untersuchungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumMitGenauigkeitInput>;
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type KompartimentStoffgruppe = {
  erfassungMutation: ErfassungMutation;
  kksgId: Scalars["ID"]["output"];
  stoffgruppe?: Maybe<Scalars["Code"]["output"]>;
  teilvol?: Maybe<Scalars["Float"]["output"]>;
};

export type KompartimentStoffgruppeInput = {
  kksgId?: InputMaybe<Scalars["ID"]["input"]>;
  stoffgruppe?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  teilvol?: InputMaybe<Scalars["Float"]["input"]>;
};

export type KompartimentStoffklasse = {
  erfassungMutation: ErfassungMutation;
  kkskId: Scalars["ID"]["output"];
  kompartimentStoffgruppen: Array<KompartimentStoffgruppe>;
  stoffklasse?: Maybe<Scalars["Code"]["output"]>;
  teilvol?: Maybe<Scalars["Float"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
};

export type KompartimentStoffklasseInput = {
  kkskId?: InputMaybe<Scalars["ID"]["input"]>;
  kompartimentStoffgruppen: Array<KompartimentStoffgruppeInput>;
  stoffklasse?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  teilvol?: InputMaybe<Scalars["Float"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumMitGenauigkeitInput>;
};

export type Kontakt = {
  kontakt: Scalars["String"]["output"];
  kontaktId: Scalars["ID"]["output"];
  kontaktTyp: Scalars["Code"]["output"];
};

export type KontaktInput = {
  kontakt: Scalars["String"]["input"];
  kontaktId?: InputMaybe<Scalars["ID"]["input"]>;
  kontaktTyp: Scalars["CodeInputType"]["input"];
};

export const Language = {
  De: "DE",
  Fr: "FR",
  It: "IT",
} as const;

export type Language = (typeof Language)[keyof typeof Language];
export type LoeschschaumEinsatz = {
  haeufigkeitNutzung?: Maybe<Scalars["Code"]["output"]>;
  intpLoeschschaumEinsatzId: Scalars["ID"]["output"];
  loeschschaumEinsatz: Scalars["Code"]["output"];
};

export type LoeschschaumEinsatzInput = {
  haeufigkeitNutzung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  intpLoeschschaumEinsatzId?: InputMaybe<Scalars["ID"]["input"]>;
  loeschschaumEinsatz: Scalars["CodeInputType"]["input"];
};

export type Massnahme = {
  angMassnahme?: Maybe<Scalars["Date"]["output"]>;
  bemerkung?: Maybe<Bemerkung>;
  datMassnahme?: Maybe<Scalars["Date"]["output"]>;
  erfassungMutation: ErfassungMutation;
  massId: Scalars["ID"]["output"];
  massnahme?: Maybe<Scalars["Code"]["output"]>;
};

export type MassnahmeInput = {
  angMassnahme?: InputMaybe<Scalars["Date"]["input"]>;
  bemerkung?: InputMaybe<BemerkungInput>;
  datMassnahme?: InputMaybe<Scalars["Date"]["input"]>;
  massId?: InputMaybe<Scalars["ID"]["input"]>;
  massnahme?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type Mutation = {
  addSearchResultsToPool: Pool;
  addToPool: Pool;
  copyPool: Pool;
  createAufgabe: Aufgabe;
  createCodeListEntry: CodeListEntryProblemGroup;
  createDokument: Dokument;
  createNotiz: Notiz;
  createPool: PoolProblemGroup;
  createSavedSearch: SavedSearchProblemGroup;
  createSubjekt: UpdateSubjektResult;
  createTeilstandort: VflzProblemGroup;
  createUser: UserProblemGroup;
  createVflz: VflzProblemGroup;
  deletePool: Scalars["ID"]["output"];
  deleteSavedSearch: Scalars["ID"]["output"];
  deleteSubjekt: Scalars["ID"]["output"];
  deleteTask: Scalars["ID"]["output"];
  exportSearch: Scalars["ID"]["output"];
  historizeVflz: VflzProblemGroup;
  removeFromPool: Pool;
  sendPasswordResetEmail: User;
  startFolgeschritt: StartTaskResult;
  startProzess: StartProzessResult;
  updateAufgabe: AufgabeWorkflowProblemGroup;
  updateCodeList: CodeList;
  updateCodeListEntry: CodeListEntryProblemGroup;
  updateCurrentUser: UserProblemGroup;
  updateCurrentUserPassword?: Maybe<ProblemGroup>;
  updateDokument: Dokument;
  updateFormular: FormularProblemGroup;
  updateInstanceSetting: InstanceSettingProblemGroup;
  updateNotiz: Notiz;
  updatePoolInfo: PoolProblemGroup;
  updateProzess: ProzessWorkflowProblemGroup;
  updateSavedSearch: SavedSearchProblemGroup;
  updateSubjekt: UpdateSubjektResult;
  updateTranslation: Scalars["String"]["output"];
  updateUser: UserProblemGroup;
  updateUserSetting: UserSetting;
  updateVflzBeteiligte: VflzProblemGroup;
  updateVflzData: VflzProblemGroup;
  updateVflzEvaluation: VflzProblemGroup;
  updateVflzGeo: VflzProblemGroup;
  updateVflzVollzug: VflzProblemGroup;
};

export type MutationAddSearchResultsToPoolArgs = {
  data: AddSearchResultsToPoolInput;
};

export type MutationAddToPoolArgs = {
  poolId: Scalars["ID"]["input"];
  vflId: Scalars["ID"]["input"];
};

export type MutationCopyPoolArgs = {
  bezeichnung: Scalars["String"]["input"];
  poolId: Scalars["ID"]["input"];
};

export type MutationCreateAufgabeArgs = {
  data: CreateAufgabeInput;
};

export type MutationCreateCodeListEntryArgs = {
  data: CreateCodeListEntryInput;
};

export type MutationCreateDokumentArgs = {
  data: CreateDokumentInput;
};

export type MutationCreateNotizArgs = {
  data: CreateNotizInput;
};

export type MutationCreatePoolArgs = {
  data: CreatePoolInput;
};

export type MutationCreateSavedSearchArgs = {
  data: CreateSavedSearchInput;
};

export type MutationCreateSubjektArgs = {
  data: CreateSubjektInput;
};

export type MutationCreateTeilstandortArgs = {
  data: CreateTeilstandortInput;
};

export type MutationCreateUserArgs = {
  data: CreateUserInput;
};

export type MutationCreateVflzArgs = {
  data: CreateVflzInput;
};

export type MutationDeletePoolArgs = {
  poolId: Scalars["ID"]["input"];
};

export type MutationDeleteSavedSearchArgs = {
  savedSearchId: Scalars["ID"]["input"];
};

export type MutationDeleteSubjektArgs = {
  subjId: Scalars["ID"]["input"];
};

export type MutationDeleteTaskArgs = {
  taskId: Scalars["ID"]["input"];
};

export type MutationExportSearchArgs = {
  data: ExportSearchInput;
};

export type MutationHistorizeVflzArgs = {
  data: HistorizeVflzInput;
};

export type MutationRemoveFromPoolArgs = {
  poolId: Scalars["ID"]["input"];
  vflId: Scalars["ID"]["input"];
};

export type MutationSendPasswordResetEmailArgs = {
  userId: Scalars["Int"]["input"];
};

export type MutationStartFolgeschrittArgs = {
  data: StartTaskInput;
};

export type MutationStartProzessArgs = {
  data: StartProzessInput;
};

export type MutationUpdateAufgabeArgs = {
  data: UpdateAufgabeInput;
  updateParentTasks?: Scalars["Boolean"]["input"];
};

export type MutationUpdateCodeListArgs = {
  data: UpdateCodeListInput;
};

export type MutationUpdateCodeListEntryArgs = {
  data: UpdateCodeListEntryInput;
};

export type MutationUpdateCurrentUserArgs = {
  data: UpdateCurrentUserInput;
};

export type MutationUpdateCurrentUserPasswordArgs = {
  data: UpdateCurrentUserPasswordInput;
};

export type MutationUpdateDokumentArgs = {
  data: UpdateDokumentInput;
};

export type MutationUpdateFormularArgs = {
  data: UpdateFormularInput;
};

export type MutationUpdateInstanceSettingArgs = {
  data: UpdateInstanceSettingInput;
};

export type MutationUpdateNotizArgs = {
  data: UpdateNotizInput;
};

export type MutationUpdatePoolInfoArgs = {
  data: UpdatePoolInfoInput;
};

export type MutationUpdateProzessArgs = {
  data: UpdateProzessInput;
  updateChildTasks?: Scalars["Boolean"]["input"];
};

export type MutationUpdateSavedSearchArgs = {
  data: UpdateSavedSearchInput;
};

export type MutationUpdateSubjektArgs = {
  data: UpdateSubjektInput;
};

export type MutationUpdateTranslationArgs = {
  data: UpdateTranslationInput;
};

export type MutationUpdateUserArgs = {
  data: UpdateUserInput;
};

export type MutationUpdateUserSettingArgs = {
  data: UpdateUserSettingInput;
};

export type MutationUpdateVflzBeteiligteArgs = {
  data: UpdateVflzBeteiligteInput;
};

export type MutationUpdateVflzDataArgs = {
  data: UpdateVflzDataInput;
};

export type MutationUpdateVflzEvaluationArgs = {
  data: UpdateVflzEvaluationInput;
};

export type MutationUpdateVflzGeoArgs = {
  data: UpdateVflzGeoInput;
};

export type MutationUpdateVflzVollzugArgs = {
  data: UpdateVflzVollzugInput;
};

export type Notiz = Task & {
  deletable: Scalars["Boolean"]["output"];
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  url?: Maybe<Scalars["String"]["output"]>;
  vflz: Vflz;
};

export type Nummerierungsbereich = {
  bezeichnung?: Maybe<Scalars["String"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  geometry?: Maybe<Scalars["GeoJSONMultiPolygon"]["output"]>;
  hNbId: Scalars["String"]["output"];
};

export type NutzungBoden = {
  aktuelleNutzung?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  nuboId: Scalars["ID"]["output"];
  nutzungsart?: Maybe<Scalars["Code"]["output"]>;
};

export type NutzungBodenInput = {
  aktuelleNutzung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  nuboId?: InputMaybe<Scalars["ID"]["input"]>;
  nutzungsart?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type OberflaechenGewaesser = {
  artGewaesser?: Maybe<Scalars["Code"]["output"]>;
  bauGewaesser?: Maybe<Scalars["Code"]["output"]>;
  distanz?: Maybe<Scalars["Int"]["output"]>;
  erfassungMutation: ErfassungMutation;
  name?: Maybe<Scalars["String"]["output"]>;
  ogwId: Scalars["ID"]["output"];
  relativeLage?: Maybe<Scalars["Code"]["output"]>;
};

export type OberflaechenGewaesserInput = {
  artGewaesser?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  bauGewaesser?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  distanz?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  ogwId?: InputMaybe<Scalars["ID"]["input"]>;
  relativeLage?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type Objekt = {
  erfassungMutation: ErfassungMutation;
  objeId: Scalars["ID"]["output"];
};

export type Pfas = {
  begruendungBewertung?: Maybe<Bemerkung>;
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  beschreibungenDetail?: Maybe<Scalars["String"]["output"]>;
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  branche?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  eva?: Maybe<Scalars["String"]["output"]>;
  intpId: Scalars["ID"]["output"];
  loeschschaumEinsatz: Array<LoeschschaumEinsatz>;
  mengeKonzentrat?: Maybe<Scalars["Int"]["output"]>;
  mengeSchaumgemisch?: Maybe<Scalars["Int"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  ort?: Maybe<Scalars["String"]["output"]>;
  pfasFreieLoeschmittel: Array<Scalars["Code"]["output"]>;
  pfasHaltigeLoeschmittel: Array<Scalars["Code"]["output"]>;
  pfasLoeschmittel?: Maybe<Scalars["Boolean"]["output"]>;
  pfasTyp?: Maybe<Scalars["Code"]["output"]>;
  plz?: Maybe<Scalars["String"]["output"]>;
  relevant?: Maybe<Scalars["Boolean"]["output"]>;
  strasse?: Maybe<Scalars["String"]["output"]>;
  untersuchungsStand?: Maybe<Scalars["Code"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type PfasInput = {
  begruendungBewertung?: InputMaybe<BemerkungInput>;
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  beschreibungenDetail?: InputMaybe<Scalars["String"]["input"]>;
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  branche?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  eva?: InputMaybe<Scalars["String"]["input"]>;
  intpId?: InputMaybe<Scalars["ID"]["input"]>;
  loeschschaumEinsatz: Array<LoeschschaumEinsatzInput>;
  mengeKonzentrat?: InputMaybe<Scalars["Int"]["input"]>;
  mengeSchaumgemisch?: InputMaybe<Scalars["Int"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  ort?: InputMaybe<Scalars["String"]["input"]>;
  pfasFreieLoeschmittel: Array<Scalars["CodeInputType"]["input"]>;
  pfasHaltigeLoeschmittel: Array<Scalars["CodeInputType"]["input"]>;
  pfasLoeschmittel?: InputMaybe<Scalars["Boolean"]["input"]>;
  pfasTyp?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  plz?: InputMaybe<Scalars["String"]["input"]>;
  relevant?: InputMaybe<Scalars["Boolean"]["input"]>;
  strasse?: InputMaybe<Scalars["String"]["input"]>;
  untersuchungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumMitGenauigkeitInput>;
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type PaginatedCodeListResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  results: Array<CodeList>;
};

export type PaginatedPoolResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  results: Array<Pool>;
};

export type PaginatedSubjektResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  results: Array<Subjekt>;
};

export type PaginatedTaskResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  results: Array<Task>;
};

export type PaginatedVflzResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  results: Array<Vflz>;
};

export const ParamType = {
  Bool: "BOOL",
  Date: "DATE",
  Integer: "INTEGER",
  Text: "TEXT",
} as const;

export type ParamType = (typeof ParamType)[keyof typeof ParamType];
export type Parzelle = {
  egrid?: Maybe<Scalars["String"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  gbNummer: Scalars["String"]["output"];
  gemeinde?: Maybe<Gemeinde>;
  geometry?: Maybe<Scalars["GeoJSONMultiPolygon"]["output"]>;
  grunId: Scalars["ID"]["output"];
  nummerierungsbereich?: Maybe<Nummerierungsbereich>;
  status: Scalars["Code"]["output"];
};

export const Permission = {
  EditProcess: "EDIT_PROCESS",
  EditSettings: "EDIT_SETTINGS",
  EditUser: "EDIT_USER",
  EditVfl: "EDIT_VFL",
  ViewProcess: "VIEW_PROCESS",
  ViewVfl: "VIEW_VFL",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
export type Pool = {
  bemerkungen?: Maybe<Scalars["String"]["output"]>;
  bezeichnung?: Maybe<Scalars["String"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  poolId: Scalars["ID"]["output"];
  standorte: PaginatedVflzResult;
};

export type PoolStandorteArgs = {
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
};

export type PoolProblemGroup = Pool | ProblemGroup;

export type Problem = {
  field: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
  messageArgs?: Maybe<Scalars["JSON"]["output"]>;
  messageCode?: Maybe<Scalars["String"]["output"]>;
  problemCode: ProblemCodeEnum;
};

export const ProblemCodeEnum = {
  Busy: "BUSY",
  Exists: "EXISTS",
  TaskDelete: "TASK_DELETE",
  Validation: "VALIDATION",
  ValidationEmail: "VALIDATION_EMAIL",
  ValidationGeom: "VALIDATION_GEOM",
  ValidationPhone: "VALIDATION_PHONE",
  ValidationUrl: "VALIDATION_URL",
} as const;

export type ProblemCodeEnum =
  (typeof ProblemCodeEnum)[keyof typeof ProblemCodeEnum];
export type ProblemGroup = {
  problems: Array<Problem>;
};

export type Prozess = Task & {
  deletable: Scalars["Boolean"]["output"];
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  vflz: Vflz;
};

export type ProzessGestartet = EventInterface & {
  taskId: Scalars["ID"]["output"];
  timestamp: Scalars["DateTime"]["output"];
  title: Scalars["String"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type ProzessStarten = {
  title: Scalars["String"]["output"];
};

export type ProzessWorkflowProblemGroup = Prozess | WorkflowProblemGroup;

export type Publizieren = {
  value?: Maybe<Scalars["Void"]["output"]>;
};

export type Query = {
  autosuggestSearchQuery: Array<AutoSuggestItem>;
  codeLists: PaginatedCodeListResult;
  currentUser: User;
  dashboardStatistic: DashboardStatistic;
  gemeinden: Array<Gemeinde>;
  geoDifference: Scalars["GeoJSONMultiPolygon"]["output"];
  geoIntersection: Scalars["GeoJSONMultiPolygon"]["output"];
  geoMakeValid: Scalars["GeoJSONMultiPolygon"]["output"];
  geoSplit: Scalars["GeoJSONMultiPolygon"]["output"];
  geoUnion: Scalars["GeoJSONMultiPolygon"]["output"];
  geschaefte: PaginatedTaskResult;
  instanceSettings: Array<InstanceSetting>;
  kbsInfos: Array<KbsInfo>;
  latestVflz: Array<Vflz>;
  mappingCodelisten: Scalars["JSON"]["output"];
  mutationPermissions: Array<RequiredPermissions>;
  pool: Pool;
  pools: PaginatedPoolResult;
  queryPermissions: Array<RequiredPermissions>;
  reportConfigurations: Array<ReportConfigurationType>;
  savedSearches: Array<SavedSearch>;
  search: SearchResult;
  searchExports: Array<SearchExport>;
  searchFieldNames: Array<SearchFieldName>;
  searchFields: Array<FieldInfo>;
  subjekt: Subjekt;
  subjekte: PaginatedSubjektResult;
  task: Task;
  translations: TranslationTable;
  users: Array<User>;
  validateCreateTeilstandort: ValidatedCreateVflzDataProblemGroup;
  validateCreateVflz: ValidatedCreateVflzDataProblemGroup;
  validateSearchQuery?: Maybe<Problem>;
  validateVflzData: ValidatedVflzDataProblemGroup;
  vflz: Vflz;
  vflzByVflIds: Array<Vflz>;
};

export type QueryAutosuggestSearchQueryArgs = {
  input: Scalars["String"]["input"];
  lang?: Language;
  pos?: Scalars["Int"]["input"];
};

export type QueryCodeListsArgs = {
  cliIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  filter?: InputMaybe<Scalars["String"]["input"]>;
  lang?: Language;
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
};

export type QueryDashboardStatisticArgs = {
  stichtag: Scalars["Date"]["input"];
};

export type QueryGeoDifferenceArgs = {
  geoA: Scalars["GeoJSONMultiPolygon"]["input"];
  geoB: Scalars["GeoJSONMultiPolygon"]["input"];
};

export type QueryGeoIntersectionArgs = {
  geoA: Scalars["GeoJSONMultiPolygon"]["input"];
  geoB: Scalars["GeoJSONMultiPolygon"]["input"];
};

export type QueryGeoMakeValidArgs = {
  geo: Scalars["GeoJSONMultiPolygon"]["input"];
};

export type QueryGeoSplitArgs = {
  blade: Scalars["GeoJSONLineString"]["input"];
  geo: Scalars["GeoJSONMultiPolygon"]["input"];
};

export type QueryGeoUnionArgs = {
  geoA: Scalars["GeoJSONMultiPolygon"]["input"];
  geoB: Scalars["GeoJSONMultiPolygon"]["input"];
};

export type QueryGeschaefteArgs = {
  asTree?: Scalars["Boolean"]["input"];
  filter?: InputMaybe<GeschaefteFilter>;
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
  reverse?: Scalars["Boolean"]["input"];
  sortBy?: SortTasks;
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type QueryPoolArgs = {
  poolId: Scalars["ID"]["input"];
};

export type QueryPoolsArgs = {
  filterBezeichnung?: InputMaybe<Scalars["String"]["input"]>;
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
};

export type QueryReportConfigurationsArgs = {
  context: ReportContext;
};

export type QuerySearchArgs = {
  advanced?: Scalars["Boolean"]["input"];
  fields?: InputMaybe<Array<SearchField>>;
  filters?: InputMaybe<Array<SearchFilter>>;
  lang?: Language;
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
  query: Scalars["String"]["input"];
  sortBy?: InputMaybe<Array<SortItemInput>>;
};

export type QuerySearchExportsArgs = {
  exportId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type QuerySearchFieldNamesArgs = {
  lang: Language;
};

export type QuerySubjektArgs = {
  subjId: Scalars["ID"]["input"];
};

export type QuerySubjekteArgs = {
  filter?: InputMaybe<Scalars["String"]["input"]>;
  isSachbearbeiter?: Scalars["Boolean"]["input"];
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
};

export type QueryTaskArgs = {
  taskId: Scalars["ID"]["input"];
};

export type QueryValidateCreateTeilstandortArgs = {
  data: ValidateCreateTeilstandortInput;
};

export type QueryValidateCreateVflzArgs = {
  data: ValidateCreateVflzInput;
};

export type QueryValidateSearchQueryArgs = {
  query: Scalars["String"]["input"];
};

export type QueryValidateVflzDataArgs = {
  vflzId: Scalars["ID"]["input"];
};

export type QueryVflzArgs = {
  vflzId: Scalars["ID"]["input"];
};

export type QueryVflzByVflIdsArgs = {
  vflIds: Array<Scalars["ID"]["input"]>;
};

export type ReportConfigurationType = {
  params: Array<ReportParamType>;
  reportId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
};

export const ReportContext = {
  Dashboard: "DASHBOARD",
  Standort: "STANDORT",
} as const;

export type ReportContext = (typeof ReportContext)[keyof typeof ReportContext];
export type ReportParamType = {
  name: Scalars["String"]["output"];
  paramType: ParamType;
};

export type RequiredPermissions = {
  field: Scalars["String"]["output"];
  hasPermission: Scalars["Boolean"]["output"];
  permissions: Array<Permission>;
};

export const RoleName = {
  Administration: "ADMINISTRATION",
  BearbeitenGeschaefte: "BEARBEITEN_GESCHAEFTE",
  BearbeitenSachdaten: "BEARBEITEN_SACHDATEN",
  LesenGeschaefte: "LESEN_GESCHAEFTE",
  LesenSachdaten: "LESEN_SACHDATEN",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];
export type SachbearbeiterStandort = {
  betArtId: Scalars["ID"]["output"];
  beteiligter: Beteiligter;
  beziehungsart: Scalars["Code"]["output"];
  erfassungMutation?: Maybe<ErfassungMutation>;
};

export type SachbearbeitungInput = {
  betArtId?: InputMaybe<Scalars["ID"]["input"]>;
  subjId: Scalars["ID"]["input"];
};

export type Sanierungsziel = {
  bemerkung?: Maybe<Bemerkung>;
  erfassungMutation: ErfassungMutation;
  saniId: Scalars["ID"]["output"];
  sanierungsziel?: Maybe<Scalars["Code"]["output"]>;
};

export type SanierungszielInput = {
  bemerkung?: InputMaybe<BemerkungInput>;
  saniId?: InputMaybe<Scalars["ID"]["input"]>;
  sanierungsziel?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type SavedSearch = {
  fields: Array<SearchField>;
  isGrouped: Scalars["Boolean"]["output"];
  isShared: Scalars["Boolean"]["output"];
  name: Scalars["String"]["output"];
  query: Scalars["String"]["output"];
  savedSearchId: Scalars["ID"]["output"];
  showOnDashboard: Scalars["Boolean"]["output"];
  sortBy: Array<SortItem>;
  user: User;
};

export type SavedSearchQueryArgs = {
  lang: Language;
};

export type SavedSearchProblemGroup = ProblemGroup | SavedSearch;

export type Schiessanlage = BasisBetrieb & {
  begruendungBewertung?: Maybe<Bemerkung>;
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  brancheAsw?: Maybe<Scalars["Code"]["output"]>;
  brancheNoga?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  eva?: Maybe<Scalars["String"]["output"]>;
  firmaName?: Maybe<Scalars["String"]["output"]>;
  firmaOrt?: Maybe<Scalars["String"]["output"]>;
  firmaPlz?: Maybe<Scalars["String"]["output"]>;
  firmaStrasse?: Maybe<Scalars["String"]["output"]>;
  groesse?: Maybe<Scalars["Int"]["output"]>;
  hatKugelfang?: Maybe<Scalars["Boolean"]["output"]>;
  intbId: Scalars["ID"]["output"];
  mobileStoffe?: Maybe<Scalars["Boolean"]["output"]>;
  relevant?: Maybe<Scalars["Boolean"]["output"]>;
  scheibenzahl?: Maybe<Scalars["Int"]["output"]>;
  schusszahl?: Maybe<Scalars["Int"]["output"]>;
  typ?: Maybe<Scalars["Code"]["output"]>;
  untersuchungsStand?: Maybe<Scalars["Code"]["output"]>;
  zeitraum?: Maybe<ZeitraumMitGenauigkeit>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type SchiessanlageInput = {
  begruendungBewertung?: InputMaybe<BemerkungInput>;
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  brancheAsw?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  brancheNoga?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  eva?: InputMaybe<Scalars["String"]["input"]>;
  firmaName?: InputMaybe<Scalars["String"]["input"]>;
  firmaOrt?: InputMaybe<Scalars["String"]["input"]>;
  firmaPlz?: InputMaybe<Scalars["String"]["input"]>;
  firmaStrasse?: InputMaybe<Scalars["String"]["input"]>;
  groesse?: InputMaybe<Scalars["Int"]["input"]>;
  hatKugelfang?: InputMaybe<Scalars["Boolean"]["input"]>;
  intbId?: InputMaybe<Scalars["ID"]["input"]>;
  mobileStoffe?: InputMaybe<Scalars["Boolean"]["input"]>;
  relevant?: InputMaybe<Scalars["Boolean"]["input"]>;
  scheibenzahl?: InputMaybe<Scalars["Int"]["input"]>;
  schusszahl?: InputMaybe<Scalars["Int"]["input"]>;
  typ?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  untersuchungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  zeitraum?: InputMaybe<ZeitraumMitGenauigkeitInput>;
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type SearchExport = {
  downloadUrl?: Maybe<Scalars["String"]["output"]>;
  exportId: Scalars["ID"]["output"];
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  format: SearchExportFormat;
  lang: Language;
  startedAt: Scalars["DateTime"]["output"];
  status: SearchExportStatus;
};

export const SearchExportFormat = {
  Excel: "EXCEL",
  Geopackage: "GEOPACKAGE",
  Shapefile: "SHAPEFILE",
} as const;

export type SearchExportFormat =
  (typeof SearchExportFormat)[keyof typeof SearchExportFormat];
export const SearchExportStatus = {
  Error: "ERROR",
  Running: "RUNNING",
  Started: "STARTED",
  Success: "SUCCESS",
} as const;

export type SearchExportStatus =
  (typeof SearchExportStatus)[keyof typeof SearchExportStatus];
export const SearchField = {
  AktuelleNutzung: "AKTUELLE_NUTZUNG",
  AktuellstePublikation: "AKTUELLSTE_PUBLIKATION",
  AlternativeStandortnummer: "ALTERNATIVE_STANDORTNUMMER",
  AltersstufeKinder: "ALTERSSTUFE_KINDER",
  ArtOberflGewaesser: "ART_OBERFL_GEWAESSER",
  Bearbeitungsstand: "BEARBEITUNGSSTAND",
  BegruendungBeurteilung: "BEGRUENDUNG_BEURTEILUNG",
  BegruendungBewertungBetrieb: "BEGRUENDUNG_BEWERTUNG_BETRIEB",
  BegruendungBewertungPfas: "BEGRUENDUNG_BEWERTUNG_PFAS",
  BegruendungPrioSanierungsbdedarf: "BEGRUENDUNG_PRIO_SANIERUNGSBDEDARF",
  BegruendungPrioUntersuchungsbedarf: "BEGRUENDUNG_PRIO_UNTERSUCHUNGSBEDARF",
  Behoerde: "BEHOERDE",
  BelastungUeberSanierungswert: "BELASTUNG_UEBER_SANIERUNGSWERT",
  BemerkungAdresse: "BEMERKUNG_ADRESSE",
  BemerkungEinzelereignis: "BEMERKUNG_EINZELEREIGNIS",
  BemerkungPfas: "BEMERKUNG_PFAS",
  Beteiligte: "BETEILIGTE",
  Betriebsgroesse: "BETRIEBSGROESSE",
  Beurteilung: "BEURTEILUNG",
  Bezeichnung: "BEZEICHNUNG",
  BeziehungsartEigentum: "BEZIEHUNGSART_EIGENTUM",
  BeziehungsartSachbearbeitung: "BEZIEHUNGSART_SACHBEARBEITUNG",
  BeziehungsartSonstige: "BEZIEHUNGSART_SONSTIGE",
  BfsNr: "BFS_NR",
  Branche: "BRANCHE",
  BrancheNoga: "BRANCHE_NOGA",
  DatumErsteintrag: "DATUM_ERSTEINTRAG",
  DatumPublikationKbs: "DATUM_PUBLIKATION_KBS",
  Deponietyp: "DEPONIETYP",
  DistanzNutzungGwAbstrombereich: "DISTANZ_NUTZUNG_GW_ABSTROMBEREICH",
  DistanzOberflGewaesser: "DISTANZ_OBERFL_GEWAESSER",
  DokumentReferenz: "DOKUMENT_REFERENZ",
  Durchlaessigkeit: "DURCHLAESSIGKEIT",
  Eigentumsform: "EIGENTUMSFORM",
  Erfassung: "ERFASSUNG",
  EvaNummer: "EVA_NUMMER",
  FestgestellteEinwirkungen: "FESTGESTELLTE_EINWIRKUNGEN",
  FirmaBemerkungen: "FIRMA_BEMERKUNGEN",
  FirmaBeurteilung: "FIRMA_BEURTEILUNG",
  FirmaBis: "FIRMA_BIS",
  FirmaKatasterrelevanz: "FIRMA_KATASTERRELEVANZ",
  FirmaName: "FIRMA_NAME",
  FirmaOrt: "FIRMA_ORT",
  FirmaPlz: "FIRMA_PLZ",
  FirmaStrasse: "FIRMA_STRASSE",
  FirmaUntersuchungsstand: "FIRMA_UNTERSUCHUNGSSTAND",
  FirmaVon: "FIRMA_VON",
  FirmaXKoordinate: "FIRMA_X_KOORDINATE",
  FirmaYKoordinate: "FIRMA_Y_KOORDINATE",
  Flaeche: "FLAECHE",
  FlugplatzBezeichnung: "FLUGPLATZ_BEZEICHNUNG",
  Flurabstand: "FLURABSTAND",
  Flurname: "FLURNAME",
  GefaehrdeteUmweltbereiche: "GEFAEHRDETE_UMWELTBEREICHE",
  Gemeinde: "GEMEINDE",
  Gewaesserbau: "GEWAESSERBAU",
  Gewaesserschutzbereich: "GEWAESSERSCHUTZBEREICH",
  GrundbuchBezeichnung: "GRUNDBUCH_BEZEICHNUNG",
  GrunddatenBemerkungen: "GRUNDDATEN_BEMERKUNGEN",
  InBetrieb: "IN_BETRIEB",
  Kanton: "KANTON",
  Karstgebiet: "KARSTGEBIET",
  Kartenausschnitt: "KARTENAUSSCHNITT",
  KinderspielplatzBemerkung: "KINDERSPIELPLATZ_BEMERKUNG",
  KinderspielplatzBeurteilung: "KINDERSPIELPLATZ_BEURTEILUNG",
  KinderspielplatzEva: "KINDERSPIELPLATZ_EVA",
  KinderspielplatzKatasterrelevanz: "KINDERSPIELPLATZ_KATASTERRELEVANZ",
  KinderspielplatzName: "KINDERSPIELPLATZ_NAME",
  KinderspielplatzOrt: "KINDERSPIELPLATZ_ORT",
  KinderspielplatzPlz: "KINDERSPIELPLATZ_PLZ",
  KinderspielplatzStrasse: "KINDERSPIELPLATZ_STRASSE",
  KinderspielplatzTyp: "KINDERSPIELPLATZ_TYP",
  KinderspielplatzUntersuchungsstand: "KINDERSPIELPLATZ_UNTERSUCHUNGSSTAND",
  KinderspielplatzXKoordinate: "KINDERSPIELPLATZ_X_KOORDINATE",
  KinderspielplatzYKoordinate: "KINDERSPIELPLATZ_Y_KOORDINATE",
  KinderspielplatzZeitraumBis: "KINDERSPIELPLATZ_ZEITRAUM_BIS",
  KinderspielplatzZeitraumVon: "KINDERSPIELPLATZ_ZEITRAUM_VON",
  KompartimentBemerkungen: "KOMPARTIMENT_BEMERKUNGEN",
  KompartimentBis: "KOMPARTIMENT_BIS",
  KompartimentTiefe: "KOMPARTIMENT_TIEFE",
  KompartimentVolumen: "KOMPARTIMENT_VOLUMEN",
  KompartimentVon: "KOMPARTIMENT_VON",
  Ktu: "KTU",
  KugelfangVorhanden: "KUGELFANG_VORHANDEN",
  Massnahme: "MASSNAHME",
  MassnahmeAngeordnetAm: "MASSNAHME_ANGEORDNET_AM",
  MassnahmeBemerkung: "MASSNAHME_BEMERKUNG",
  MassnahmeErledigtAm: "MASSNAHME_ERLEDIGT_AM",
  MobileStoffe: "MOBILE_STOFFE",
  Nachname: "NACHNAME",
  Nachsorge: "NACHSORGE",
  NameOberflGewaesser: "NAME_OBERFL_GEWAESSER",
  NbIdent: "NB_IDENT",
  Notiz: "NOTIZ",
  Nutzungszone: "NUTZUNGSZONE",
  NutzungGwAbstrombereich: "NUTZUNG_GW_ABSTROMBEREICH",
  Ort: "ORT",
  Parzelle: "PARZELLE",
  PfasBeschreibungenDetail: "PFAS_BESCHREIBUNGEN_DETAIL",
  PfasBeurteilung: "PFAS_BEURTEILUNG",
  PfasBranche: "PFAS_BRANCHE",
  PfasEvaNummer: "PFAS_EVA_NUMMER",
  PfasFreieLoeschmittel: "PFAS_FREIE_LOESCHMITTEL",
  PfasHaeufigkeitNutzung: "PFAS_HAEUFIGKEIT_NUTZUNG",
  PfasHaltigeLoeschmittel: "PFAS_HALTIGE_LOESCHMITTEL",
  PfasKatasterrelevanz: "PFAS_KATASTERRELEVANZ",
  PfasLoeschmittel: "PFAS_LOESCHMITTEL",
  PfasLoeschschaumEinsatz: "PFAS_LOESCHSCHAUM_EINSATZ",
  PfasMengeKonzentrat: "PFAS_MENGE_KONZENTRAT",
  PfasMengeSchaumgemisch: "PFAS_MENGE_SCHAUMGEMISCH",
  PfasName: "PFAS_NAME",
  PfasOrt: "PFAS_ORT",
  PfasPlz: "PFAS_PLZ",
  PfasStrasse: "PFAS_STRASSE",
  PfasTyp: "PFAS_TYP",
  PfasUntersuchungsstand: "PFAS_UNTERSUCHUNGSSTAND",
  PfasXKoordinate: "PFAS_X_KOORDINATE",
  PfasYKoordinate: "PFAS_Y_KOORDINATE",
  PfasZeitraumBis: "PFAS_ZEITRAUM_BIS",
  PfasZeitraumVon: "PFAS_ZEITRAUM_VON",
  Plz: "PLZ",
  Pool: "POOL",
  PrioSanierungsbedarf: "PRIO_SANIERUNGSBEDARF",
  PrioUntersuchungsbedarf: "PRIO_UNTERSUCHUNGSBEDARF",
  Publiziert: "PUBLIZIERT",
  Rechtskraeftig: "RECHTSKRAEFTIG",
  RelativeLageGrundwasser: "RELATIVE_LAGE_GRUNDWASSER",
  RelativeLageOberflGewaesser: "RELATIVE_LAGE_OBERFL_GEWAESSER",
  Sanierungsziel: "SANIERUNGSZIEL",
  SanierungszielBemerkungen: "SANIERUNGSZIEL_BEMERKUNGEN",
  Scheibenzahl: "SCHEIBENZAHL",
  SchiessanlageTyp: "SCHIESSANLAGE_TYP",
  Schussanzahl: "SCHUSSANZAHL",
  Schutzzone: "SCHUTZZONE",
  SpezifischerStoff: "SPEZIFISCHER_STOFF",
  Sprache: "SPRACHE",
  Standortnummer: "STANDORTNUMMER",
  Standorttyp: "STANDORTTYP",
  StandortEigentuemer: "STANDORT_EIGENTUEMER",
  StoffgruppeStoffgruppe: "STOFFGRUPPE_STOFFGRUPPE",
  StoffgruppeTeilvolumen: "STOFFGRUPPE_TEILVOLUMEN",
  StoffklasseBis: "STOFFKLASSE_BIS",
  StoffklasseStoffklasse: "STOFFKLASSE_STOFFKLASSE",
  StoffklasseTeilvolumen: "STOFFKLASSE_TEILVOLUMEN",
  StoffklasseVon: "STOFFKLASSE_VON",
  Strasse: "STRASSE",
  Taetigkeit: "TAETIGKEIT",
  TaskBeteiligte: "TASK_BETEILIGTE",
  TaskBeziehungsartEigentum: "TASK_BEZIEHUNGSART_EIGENTUM",
  TaskBeziehungsartGeschaefte: "TASK_BEZIEHUNGSART_GESCHAEFTE",
  TaskBeziehungsartSachbearbeitung: "TASK_BEZIEHUNGSART_SACHBEARBEITUNG",
  TaskBeziehungsartSonstige: "TASK_BEZIEHUNGSART_SONSTIGE",
  TaskEndDatum: "TASK_END_DATUM",
  TaskFaelligkeit: "TASK_FAELLIGKEIT",
  TaskKategorie: "TASK_KATEGORIE",
  TaskStartDatum: "TASK_START_DATUM",
  TaskStatus: "TASK_STATUS",
  TaskTitel: "TASK_TITEL",
  TaskTyp: "TASK_TYP",
  Umwelt: "UMWELT",
  UmweltschadenBemerkung: "UMWELTSCHADEN_BEMERKUNG",
  UmweltstoffeBeurteilung: "UMWELTSTOFFE_BEURTEILUNG",
  UmweltstoffGruppe: "UMWELTSTOFF_GRUPPE",
  UmweltBemerkungen: "UMWELT_BEMERKUNGEN",
  UnfallstoffAusgelaufen: "UNFALLSTOFF_AUSGELAUFEN",
  UnfallstoffRestmenge: "UNFALLSTOFF_RESTMENGE",
  UnfallstoffStoffe: "UNFALLSTOFF_STOFFE",
  UnfallstoffZurueckgew: "UNFALLSTOFF_ZURUECKGEW",
  UnfallBemerkung: "UNFALL_BEMERKUNG",
  UnfallGenauigkeit: "UNFALL_GENAUIGKEIT",
  UnfallName: "UNFALL_NAME",
  UnfallZeitpunkt: "UNFALL_ZEITPUNKT",
  Untersuchungsstand: "UNTERSUCHUNGSSTAND",
  VflzId: "VFLZ_ID",
  Vollzug: "VOLLZUG",
  Vorkommnis: "VORKOMMNIS",
  VorkommnisDatum: "VORKOMMNIS_DATUM",
  Vorname: "VORNAME",
  XKoordinate: "X_KOORDINATE",
  YKoordinate: "Y_KOORDINATE",
  ZeitraumBis: "ZEITRAUM_BIS",
  ZeitraumVon: "ZEITRAUM_VON",
} as const;

export type SearchField = (typeof SearchField)[keyof typeof SearchField];
export const SearchFieldCategory = {
  Ablagerungen: "ABLAGERUNGEN",
  Beteiligte: "BETEILIGTE",
  Betriebe: "BETRIEBE",
  Beurteilung: "BEURTEILUNG",
  Geschaeft: "GESCHAEFT",
  Grunddaten: "GRUNDDATEN",
  Grundwasser: "GRUNDWASSER",
  Kinderspielplatz: "KINDERSPIELPLATZ",
  Lokalisierung: "LOKALISIERUNG",
  Massnahmen: "MASSNAHMEN",
  NatuerlichesUmfeld: "NATUERLICHES_UMFELD",
  NutzungenGelaende: "NUTZUNGEN_GELAENDE",
  Oberflaechengewaesser: "OBERFLAECHENGEWAESSER",
  Pfas: "PFAS",
  Priorisierung: "PRIORISIERUNG",
  Standort: "STANDORT",
  Umwelteinwirkungen: "UMWELTEINWIRKUNGEN",
  Umweltstoffe: "UMWELTSTOFFE",
  Unfaelle: "UNFAELLE",
  Vollzug: "VOLLZUG",
  Vorkommnisse: "VORKOMMNISSE",
  Ziele: "ZIELE",
} as const;

export type SearchFieldCategory =
  (typeof SearchFieldCategory)[keyof typeof SearchFieldCategory];
export type SearchFieldName = {
  category: SearchFieldCategory;
  field: SearchField;
  name: Scalars["String"]["output"];
};

export type SearchFilter = {
  field: SearchField;
  value: Scalars["JSON"]["input"];
};

export type SearchResult = {
  directMatch: Scalars["Boolean"]["output"];
  geo: GeoSearchResult;
  graph: GraphSearchResult;
  page: Scalars["Int"]["output"];
  perPage: Scalars["Int"]["output"];
  tabular: TabularSearchResult;
};

export type SearchResultGeoArgs = {
  extent?: InputMaybe<Array<Scalars["Float"]["input"]>>;
};

export const SettingCategory = {
  Admin: "ADMIN",
  General: "GENERAL",
  UserInitial: "USER_INITIAL",
} as const;

export type SettingCategory =
  (typeof SettingCategory)[keyof typeof SettingCategory];
export type SortItem = {
  field: SearchField;
  reverse: Scalars["Boolean"]["output"];
};

export type SortItemInput = {
  field: SearchField;
  reverse?: Scalars["Boolean"]["input"];
};

export const SortTasks = {
  Faelligkeit: "Faelligkeit",
  StartDatum: "StartDatum",
} as const;

export type SortTasks = (typeof SortTasks)[keyof typeof SortTasks];
export type StandortHistorisieren = {
  value?: Maybe<Scalars["Void"]["output"]>;
};

export type StandortHistorisiert = EventInterface & {
  newVflzId: Scalars["ID"]["output"];
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export const StandortTyp = {
  Ablagerung: "ABLAGERUNG",
  Betrieb: "BETRIEB",
  KinderspielplatzGruenflaeche: "KINDERSPIELPLATZ_GRUENFLAECHE",
  Pfas: "PFAS",
  Schiessanlage: "SCHIESSANLAGE",
  Unfall: "UNFALL",
} as const;

export type StandortTyp = (typeof StandortTyp)[keyof typeof StandortTyp];
export type StandortTypenStatistic = {
  count: Scalars["Int"]["output"];
  typ: StandortTyp;
};

export type StartProzessInput = {
  optionId: Scalars["ID"]["input"];
  vflzId: Scalars["ID"]["input"];
};

export type StartProzessResult = {
  prozess: Prozess;
};

export type StartTaskInput = {
  optionId: Scalars["ID"]["input"];
  taskId: Scalars["ID"]["input"];
};

export type StartTaskResult = {
  task: Task;
};

export type StatusPublikation = {
  belastet?: Maybe<Scalars["Boolean"]["output"]>;
  datPublizieren?: Maybe<Scalars["Date"]["output"]>;
};

export type Subjekt = {
  anrede?: Maybe<Scalars["Code"]["output"]>;
  bemerkung?: Maybe<Bemerkung>;
  erfassungMutation?: Maybe<ErfassungMutation>;
  hasStandorte: Scalars["Boolean"]["output"];
  identNr?: Maybe<Scalars["String"]["output"]>;
  kategorien: Array<Scalars["Code"]["output"]>;
  kontakte: Array<Kontakt>;
  kuerzel?: Maybe<Scalars["String"]["output"]>;
  land?: Maybe<Scalars["Code"]["output"]>;
  name: Scalars["String"]["output"];
  ort: Scalars["String"]["output"];
  postleitzahl: Scalars["String"]["output"];
  strasse: Scalars["String"]["output"];
  subjId: Scalars["ID"]["output"];
  taetigkeit: Scalars["String"]["output"];
  user?: Maybe<User>;
  vorname: Scalars["String"]["output"];
};

export type TabularSearchResult = {
  numPages: Scalars["Int"]["output"];
  numResultsTotal: Scalars["Int"]["output"];
  results: Array<Scalars["JSON"]["output"]>;
};

export type Task = {
  deletable: Scalars["Boolean"]["output"];
  endDatum?: Maybe<Scalars["Date"]["output"]>;
  events: Array<Event>;
  faelligkeitsDatum?: Maybe<Scalars["Date"]["output"]>;
  faelligkeitsStatus: FaelligkeitStatus;
  folgeschritte: Array<TaskOption>;
  kategorie?: Maybe<Scalars["Code"]["output"]>;
  notiz?: Maybe<Scalars["String"]["output"]>;
  oeffentlich: Scalars["Boolean"]["output"];
  parentId?: Maybe<Scalars["ID"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  sachbearbeitung: Array<BeteiligterGeschaeft>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeft>;
  startDatum: Scalars["Date"]["output"];
  status: TaskStatus;
  taskId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  triggers: Array<EventTrigger>;
  type: TaskType;
  vflz: Vflz;
};

export type TaskOption = {
  optionId: Scalars["ID"]["output"];
  title: Scalars["String"]["output"];
  type: TaskType;
};

export const TaskStatus = {
  Abgeschlossen: "ABGESCHLOSSEN",
  Offen: "OFFEN",
  Ruhend: "RUHEND",
  Uebersprungen: "UEBERSPRUNGEN",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export const TaskType = {
  Aufgabe: "AUFGABE",
  Dokument: "DOKUMENT",
  Formular: "FORMULAR",
  Notiz: "NOTIZ",
  Prozess: "PROZESS",
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];
export type Translation = {
  de?: Maybe<Scalars["String"]["output"]>;
  fr?: Maybe<Scalars["String"]["output"]>;
  it?: Maybe<Scalars["String"]["output"]>;
};

export type TranslationInput = {
  de: Scalars["String"]["input"];
  fr: Scalars["String"]["input"];
  it: Scalars["String"]["input"];
};

export type TranslationTable = {
  de: Scalars["JSONTranslation"]["output"];
  fr: Scalars["JSONTranslation"]["output"];
  it: Scalars["JSONTranslation"]["output"];
};

export type UmweltStoff = {
  beurteilung?: Maybe<Scalars["Code"]["output"]>;
  erfassungMutation: ErfassungMutation;
  gefaehrdeteBereiche?: Maybe<Scalars["Code"]["output"]>;
  stoff?: Maybe<Scalars["Code"]["output"]>;
  stoffGruppe?: Maybe<Scalars["Code"]["output"]>;
  stoffeId: Scalars["ID"]["output"];
};

export type UmweltStoffInput = {
  beurteilung?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  gefaehrdeteBereiche?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  stoff?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  stoffGruppe?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  stoffeId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type Umweltschaden = {
  artSchaden?: Maybe<Scalars["Code"]["output"]>;
  bemerkung?: Maybe<Bemerkung>;
  erfassungMutation: ErfassungMutation;
  schaeden?: Maybe<Scalars["Code"]["output"]>;
  vfusId: Scalars["ID"]["output"];
};

export type UmweltschadenInput = {
  artSchaden?: InputMaybe<Scalars["Code"]["input"]>;
  bemerkung?: InputMaybe<BemerkungInput>;
  schaeden?: InputMaybe<Scalars["Code"]["input"]>;
  vfusId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type Unfall = {
  bemerkung?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  erfassungMutation: ErfassungMutation;
  genauigkeitZeitpunkt?: Maybe<Scalars["Code"]["output"]>;
  intuId: Scalars["ID"]["output"];
  name?: Maybe<Scalars["String"]["output"]>;
  unfallstoffe: Array<Unfallstoff>;
  zeitpunkt?: Maybe<Scalars["Date"]["output"]>;
  zeitpunktjahr: Scalars["Boolean"]["output"];
};

export type UnfallInput = {
  bemerkung?: InputMaybe<BemerkungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  genauigkeitZeitpunkt?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  intuId?: InputMaybe<Scalars["ID"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  unfallstoffe: Array<UnfallstoffInput>;
  zeitpunkt?: InputMaybe<Scalars["Date"]["input"]>;
  zeitpunktjahr?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type Unfallstoff = {
  ausgelaufen?: Maybe<Scalars["Float"]["output"]>;
  erfassungMutation: ErfassungMutation;
  inumId: Scalars["ID"]["output"];
  stoff?: Maybe<Scalars["Code"]["output"]>;
  stoffmng?: Maybe<Scalars["Float"]["output"]>;
  zurueckgewonnen?: Maybe<Scalars["Float"]["output"]>;
};

export type UnfallstoffInput = {
  ausgelaufen?: InputMaybe<Scalars["Float"]["input"]>;
  inumId?: InputMaybe<Scalars["ID"]["input"]>;
  stoff?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  stoffmng?: InputMaybe<Scalars["Float"]["input"]>;
  zurueckgewonnen?: InputMaybe<Scalars["Float"]["input"]>;
};

export type UntersuchungsStandGesetzt = EventInterface & {
  code: Scalars["Code"]["output"];
  timestamp: Scalars["DateTime"]["output"];
  vflzId: Scalars["ID"]["output"];
};

export type UntersuchungsStandSetzen = {
  code: Scalars["Code"]["output"];
};

export type UpdateAufgabeInput = {
  endDatum?: InputMaybe<Scalars["Date"]["input"]>;
  faelligkeitsDatum?: InputMaybe<Scalars["Date"]["input"]>;
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  sachbearbeitung: Array<BeteiligterGeschaeftInput>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeftInput>;
  startDatum: Scalars["Date"]["input"];
  status: TaskStatus;
  taskId: Scalars["ID"]["input"];
  title: Scalars["String"]["input"];
};

export type UpdateCodeListEntryInput = {
  bezeichnung: TranslationInput;
  code: Scalars["CodeInputType"]["input"];
  isActive: Scalars["Boolean"]["input"];
  sortKey?: InputMaybe<Scalars["Int"]["input"]>;
};

export type UpdateCodeListInput = {
  bezeichnung: TranslationInput;
  cliId: Scalars["ID"]["input"];
};

export type UpdateCurrentUserInput = {
  firstName: Scalars["String"]["input"];
  lastName: Scalars["String"]["input"];
};

export type UpdateCurrentUserPasswordInput = {
  password: Scalars["String"]["input"];
};

export type UpdateDokumentInput = {
  dokument?: InputMaybe<Scalars["String"]["input"]>;
  kategorie?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  oeffentlich: Scalars["Boolean"]["input"];
  sachbearbeitung: Array<BeteiligterGeschaeftInput>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeftInput>;
  startDatum: Scalars["Date"]["input"];
  taskId: Scalars["ID"]["input"];
  title: Scalars["String"]["input"];
  url?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateFormularInput = {
  eingaben?: InputMaybe<Scalars["FormularEingaben"]["input"]>;
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  sachbearbeitung: Array<BeteiligterGeschaeftInput>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeftInput>;
  startDatum: Scalars["Date"]["input"];
  taskId: Scalars["ID"]["input"];
  title: Scalars["String"]["input"];
};

export type UpdateInstanceSettingInput = {
  category: SettingCategory;
  key: Scalars["String"]["input"];
  value: Scalars["JSON"]["input"];
};

export type UpdateNotizInput = {
  kategorie?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  oeffentlich: Scalars["Boolean"]["input"];
  sachbearbeitung: Array<BeteiligterGeschaeftInput>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeftInput>;
  startDatum: Scalars["Date"]["input"];
  taskId: Scalars["ID"]["input"];
  title: Scalars["String"]["input"];
  url?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdatePoolInfoInput = {
  bemerkungen?: InputMaybe<Scalars["String"]["input"]>;
  bezeichnung: Scalars["String"]["input"];
  poolId: Scalars["ID"]["input"];
};

export type UpdateProzessInput = {
  endDatum?: InputMaybe<Scalars["Date"]["input"]>;
  faelligkeitsDatum?: InputMaybe<Scalars["Date"]["input"]>;
  notiz?: InputMaybe<Scalars["String"]["input"]>;
  sachbearbeitung: Array<BeteiligterGeschaeftInput>;
  sonstigeBeteiligte: Array<BeteiligterGeschaeftInput>;
  startDatum: Scalars["Date"]["input"];
  status: TaskStatus;
  taskId: Scalars["ID"]["input"];
  title: Scalars["String"]["input"];
};

export type UpdateSavedSearchInput = {
  isShared: Scalars["Boolean"]["input"];
  name: Scalars["String"]["input"];
  savedSearchId: Scalars["ID"]["input"];
  showOnDashboard: Scalars["Boolean"]["input"];
};

export type UpdateSubjektInput = {
  anrede?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  bemerkung?: InputMaybe<BemerkungInput>;
  kategorien: Array<Scalars["CodeInputType"]["input"]>;
  kontakte: Array<KontaktInput>;
  kuerzel?: InputMaybe<Scalars["String"]["input"]>;
  land?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  ort?: InputMaybe<Scalars["String"]["input"]>;
  postleitzahl?: InputMaybe<Scalars["String"]["input"]>;
  strasse?: InputMaybe<Scalars["String"]["input"]>;
  subjId: Scalars["ID"]["input"];
  taetigkeit?: InputMaybe<Scalars["String"]["input"]>;
  vorname?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateSubjektResult = {
  problemGroup: ProblemGroup;
  subjekt: Subjekt;
};

export type UpdateTranslationInput = {
  key: Scalars["String"]["input"];
  translation: TranslationInput;
};

export type UpdateUserInput = {
  email: Scalars["String"]["input"];
  firstName: Scalars["String"]["input"];
  id: Scalars["ID"]["input"];
  isSachbearbeitung: Scalars["Boolean"]["input"];
  lastName: Scalars["String"]["input"];
  roleName?: InputMaybe<RoleName>;
};

export type UpdateUserSettingInput = {
  key: Scalars["String"]["input"];
  value: Scalars["JSON"]["input"];
};

export type UpdateVflzBeteiligteInput = {
  eigentum: Array<EigentumInput>;
  sachbearbeitung: Array<SachbearbeitungInput>;
  sonstigeBeteiligte: Array<BeteiligterStandortInput>;
  vflzId: Scalars["ID"]["input"];
};

export type UpdateVflzDataInput = {
  ablagerungen: Array<AblagerungInput>;
  bemerkungDatenimport?: InputMaybe<BemerkungInput>;
  bemerkungStandort?: InputMaybe<BemerkungInput>;
  bemerkungUmwelt?: InputMaybe<BemerkungInput>;
  betriebe: Array<BetriebInput>;
  bezeichnung?: InputMaybe<Scalars["String"]["input"]>;
  deponietyp?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  durchlaessigkeit?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  einzelereignisse: Array<EinzelereignisInput>;
  flugplatz?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  flurname?: InputMaybe<Scalars["String"]["input"]>;
  gemeinde?: InputMaybe<GemeindeInput>;
  grundwasser: Array<GrundwasserInput>;
  gwsBereich?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  gwsZone?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  inBetrieb?: InputMaybe<Scalars["Boolean"]["input"]>;
  karstgeb?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  kinderspielplaetzeGruenflaechen: Array<KinderspielplatzGruenflaecheInput>;
  ktu?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  lang?: InputMaybe<Language>;
  nachsorge?: InputMaybe<Scalars["Boolean"]["input"]>;
  nutzungenBoden: Array<NutzungBodenInput>;
  oberflaechenGewaesser: Array<OberflaechenGewaesserInput>;
  ort?: InputMaybe<Scalars["String"]["input"]>;
  pfas: Array<PfasInput>;
  postleitzahl?: InputMaybe<Scalars["String"]["input"]>;
  schiessanlagen: Array<SchiessanlageInput>;
  strasse?: InputMaybe<Scalars["String"]["input"]>;
  umweltStoffe: Array<UmweltStoffInput>;
  umweltschaeden: Array<UmweltschadenInput>;
  unfaelle: Array<UnfallInput>;
  vflzId: Scalars["ID"]["input"];
};

export type UpdateVflzEvaluationInput = {
  bearbeitungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  begruendungBewertung?: InputMaybe<BemerkungInput>;
  begruendungPrioSanierungsbedarf?: InputMaybe<BemerkungInput>;
  begruendungPrioUntersuchungsbedarf?: InputMaybe<BemerkungInput>;
  beurteilung?: InputMaybe<BeurteilungInput>;
  datPublizieren?: InputMaybe<Scalars["Date"]["input"]>;
  datRechtskraft?: InputMaybe<Scalars["Date"]["input"]>;
  massnahmen: Array<MassnahmeInput>;
  publizieren: Scalars["Boolean"]["input"];
  rechtskraft: Scalars["Boolean"]["input"];
  sanierungsziele: Array<SanierungszielInput>;
  untersuchungsStand?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  vflzId: Scalars["ID"]["input"];
};

export type UpdateVflzGeoInput = {
  geometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  vflzId: Scalars["ID"]["input"];
  zentroid?: InputMaybe<Scalars["GeoJSONPoint"]["input"]>;
};

export type UpdateVflzVollzugInput = {
  vflzId: Scalars["ID"]["input"];
  vollzug: Array<VollzugInput>;
};

export type User = {
  email: Scalars["String"]["output"];
  firstName: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  isSachbearbeitung: Scalars["Boolean"]["output"];
  lastName: Scalars["String"]["output"];
  permissions: Array<Permission>;
  roleName?: Maybe<RoleName>;
  settings: Array<UserSetting>;
  subjekt?: Maybe<Subjekt>;
  username: Scalars["String"]["output"];
};

export type UserProblemGroup = ProblemGroup | User;

export type UserSetting = {
  key: Scalars["String"]["output"];
  value: Scalars["JSON"]["output"];
};

export type ValidateCreateTeilstandortInput = {
  combinedId?: InputMaybe<Scalars["String"]["input"]>;
  gemeinde?: InputMaybe<GemeindeInput>;
  geometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  parentCombinedId: Scalars["String"]["input"];
};

export type ValidateCreateVflzInput = {
  combinedId?: InputMaybe<Scalars["String"]["input"]>;
  flugplatz?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  gemeinde?: InputMaybe<GemeindeInput>;
  geometry: Scalars["GeoJSONPointOrMultiPolygon"]["input"];
  ktu?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  vftyp?: InputMaybe<Scalars["CodeInputType"]["input"]>;
};

export type ValidatedCreateVflzData = {
  combinedId: Array<Scalars["String"]["output"]>;
  flugplatz: Array<Scalars["Code"]["output"]>;
  gemeinde: Array<Gemeinde>;
};

export type ValidatedCreateVflzDataProblemGroup =
  ProblemGroup | ValidatedCreateVflzData;

export type ValidatedParzelle = {
  egrid?: Maybe<Scalars["String"]["output"]>;
  gbNummer: Scalars["String"]["output"];
  gemeinde?: Maybe<Gemeinde>;
  nummerierungsbereich?: Maybe<Scalars["String"]["output"]>;
};

export type ValidatedVflzData = {
  flugplatz: Array<Scalars["Code"]["output"]>;
  gemeinde: Array<Gemeinde>;
  gwsBereich: Array<Scalars["Code"]["output"]>;
  gwsZone: Array<Scalars["Code"]["output"]>;
  ort: Array<Scalars["String"]["output"]>;
  parzelle: Array<ValidatedParzelle>;
  postleitzahl: Array<Scalars["String"]["output"]>;
};

export type ValidatedVflzDataProblemGroup = ProblemGroup | ValidatedVflzData;

export type VflGeo = {
  erfassungMutation?: Maybe<ErfassungMutation>;
  geometry?: Maybe<Scalars["GeoJSONPointOrMultiPolygon"]["output"]>;
};

export type Vflz = {
  ablagerungen: Array<Ablagerung>;
  bearbeitungsStand?: Maybe<Scalars["String"]["output"]>;
  begruendungBewertung?: Maybe<Bemerkung>;
  begruendungPrioSanierungsbedarf?: Maybe<Bemerkung>;
  begruendungPrioUntersuchungsbedarf?: Maybe<Bemerkung>;
  bemerkungDatenimport?: Maybe<Bemerkung>;
  bemerkungStandort?: Maybe<Bemerkung>;
  bemerkungUmwelt?: Maybe<Bemerkung>;
  bemerkungenIntern: Array<Bemerkung>;
  beteiligte: Array<Beteiligter>;
  beteiligteParzellen: Array<BeteiligterStandort>;
  beteiligteStandort: Array<BeteiligterStandort>;
  betriebe: Array<Betrieb>;
  beurteilung?: Maybe<Beurteilung>;
  bezeichnung?: Maybe<Scalars["String"]["output"]>;
  combinedId: Scalars["String"]["output"];
  datPublizieren?: Maybe<Scalars["Date"]["output"]>;
  datRechtskraft?: Maybe<Scalars["Date"]["output"]>;
  deponietyp?: Maybe<Scalars["Code"]["output"]>;
  durchlaessigkeit?: Maybe<Scalars["Code"]["output"]>;
  eigentum: Array<Eigentum>;
  einzelereignisse: Array<Einzelereignis>;
  erfassungMutation: ErfassungMutation;
  evaluationStatus: EvaluationStatus;
  flaeche?: Maybe<Scalars["Int"]["output"]>;
  flugplatz?: Maybe<Scalars["Code"]["output"]>;
  flurname?: Maybe<Scalars["String"]["output"]>;
  gemeinde?: Maybe<Gemeinde>;
  gemeindenUndNummerierungsbereiche: Array<GemeindeNummerierungsbereich>;
  geschaefte: PaginatedTaskResult;
  grundwasser: Array<Grundwasser>;
  gwsBereich?: Maybe<Scalars["Code"]["output"]>;
  gwsZone?: Maybe<Scalars["Code"]["output"]>;
  inBetrieb?: Maybe<Scalars["Boolean"]["output"]>;
  isCurrent: Scalars["Boolean"]["output"];
  karstgeb?: Maybe<Scalars["Code"]["output"]>;
  kinderspielplaetzeGruenflaechen: Array<KinderspielplatzGruenflaeche>;
  ktu?: Maybe<Scalars["Code"]["output"]>;
  lang: Language;
  latestVflzId: Scalars["ID"]["output"];
  massnahmen: Array<Massnahme>;
  message: Scalars["String"]["output"];
  nachsorge?: Maybe<Scalars["Boolean"]["output"]>;
  nutzungenBoden: Array<NutzungBoden>;
  oberflaechenGewaesser: Array<OberflaechenGewaesser>;
  objekt: Objekt;
  ort?: Maybe<Scalars["String"]["output"]>;
  parzellen: Array<Parzelle>;
  pfas: Array<Pfas>;
  pools: Array<Pool>;
  postleitzahl?: Maybe<Scalars["String"]["output"]>;
  prozesse: Array<TaskOption>;
  publizieren?: Maybe<Scalars["Boolean"]["output"]>;
  readOnly: Scalars["Boolean"]["output"];
  rechtskraft?: Maybe<Scalars["Boolean"]["output"]>;
  sachbearbeitung: Array<SachbearbeiterStandort>;
  sanierungsziele: Array<Sanierungsziel>;
  schiessanlagen: Array<Schiessanlage>;
  sonstigeBeteiligte: Array<BeteiligterStandort>;
  statusPublikation?: Maybe<StatusPublikation>;
  strasse?: Maybe<Scalars["String"]["output"]>;
  teilstandorte: Array<Vflz>;
  umweltStoffe: Array<UmweltStoff>;
  umweltschaeden: Array<Umweltschaden>;
  unfaelle: Array<Unfall>;
  untersuchungsStand?: Maybe<Scalars["String"]["output"]>;
  versionen: Array<Vflz>;
  vflId: Scalars["ID"]["output"];
  vflgeo?: Maybe<VflGeo>;
  vflzCreatedDate?: Maybe<Scalars["DateTime"]["output"]>;
  vflzId: Scalars["ID"]["output"];
  vftyp: Scalars["Code"]["output"];
  vftypEnum: StandortTyp;
  vollzug: Array<Vollzug>;
  zeitraum?: Maybe<Zeitraum>;
  zentroid?: Maybe<Scalars["GeoJSONPoint"]["output"]>;
};

export type VflzGeschaefteArgs = {
  asTree?: Scalars["Boolean"]["input"];
  filter?: InputMaybe<GeschaefteFilter>;
  page?: Scalars["Int"]["input"];
  perPage?: Scalars["Int"]["input"];
  reverse?: Scalars["Boolean"]["input"];
  sortBy?: SortTasks;
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type VflzProblemGroup = ProblemGroup | Vflz;

export type Vollzug = {
  aktiv: Scalars["Boolean"]["output"];
  behoerde: Scalars["Code"]["output"];
  combinedId: Scalars["String"]["output"];
  erfassungMutation?: Maybe<ErfassungMutation>;
  isDeleteable: Scalars["Boolean"]["output"];
  vflnrId: Scalars["ID"]["output"];
};

export type VollzugInput = {
  aktiv: Scalars["Boolean"]["input"];
  behoerde: Scalars["CodeInputType"]["input"];
  combinedId: Scalars["String"]["input"];
  vflnrId?: InputMaybe<Scalars["ID"]["input"]>;
};

export type WorkflowProblemGroup = {
  faelligkeitsDatumProblemTasks: Array<Task>;
  openEventsProblemTasks: Array<Task>;
  problems: Array<Problem>;
  statusProblemTasks: Array<Task>;
};

export type Zeitraum = BasisZeitraum & {
  bis?: Maybe<Scalars["Date"]["output"]>;
  bisheute: Scalars["Boolean"]["output"];
  bisjahr: Scalars["Boolean"]["output"];
  von?: Maybe<Scalars["Date"]["output"]>;
  vonjahr: Scalars["Boolean"]["output"];
};

export type ZeitraumInput = {
  bis?: InputMaybe<Scalars["Date"]["input"]>;
  bisheute?: InputMaybe<Scalars["Boolean"]["input"]>;
  bisjahr?: InputMaybe<Scalars["Boolean"]["input"]>;
  von?: InputMaybe<Scalars["Date"]["input"]>;
  vonjahr?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type ZeitraumMitGenauigkeit = BasisZeitraum & {
  bis?: Maybe<Scalars["Date"]["output"]>;
  bisheute: Scalars["Boolean"]["output"];
  bisjahr: Scalars["Boolean"]["output"];
  genauigkeitBis?: Maybe<Scalars["Code"]["output"]>;
  genauigkeitVon?: Maybe<Scalars["Code"]["output"]>;
  von?: Maybe<Scalars["Date"]["output"]>;
  vonjahr: Scalars["Boolean"]["output"];
};

export type ZeitraumMitGenauigkeitInput = {
  bis?: InputMaybe<Scalars["Date"]["input"]>;
  bisheute?: InputMaybe<Scalars["Boolean"]["input"]>;
  bisjahr?: InputMaybe<Scalars["Boolean"]["input"]>;
  genauigkeitBis?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  genauigkeitVon?: InputMaybe<Scalars["CodeInputType"]["input"]>;
  von?: InputMaybe<Scalars["Date"]["input"]>;
  vonjahr?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type AddToPoolDialogQueryVariables = Exact<{ [key: string]: never }>;

export type AddToPoolDialogQuery = {
  pools: { results: Array<{ poolId: string; bezeichnung?: string | null }> };
};

export type AddToPoolMutationVariables = Exact<{
  poolId: Scalars["ID"]["input"];
  vflId: Scalars["ID"]["input"];
}>;

export type AddToPoolMutation = { addToPool: { poolId: string } };

export type AddSearchResultsToPoolMutationVariables = Exact<{
  poolId: Scalars["ID"]["input"];
  query: Scalars["String"]["input"];
}>;

export type AddSearchResultsToPoolMutation = {
  addSearchResultsToPool: { poolId: string };
};

export type FormProblemsFragment = {
  __typename: "ProblemGroup";
  problems: Array<{
    field: string;
    problemCode: ProblemCodeEnum;
    message: string;
  }>;
};

export type QuickSearchQueryVariables = Exact<{
  query: Scalars["String"]["input"];
  lang: Language;
}>;

export type QuickSearchQuery = {
  search: {
    directMatch: boolean;
    graph: {
      results: Array<{
        combinedId: string;
        vflzId: string;
        bezeichnung?: string | null;
        beurteilung?: { kbsInfo?: { color: string } | null } | null;
        gemeinde?: { gemeinde: string } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      }>;
    };
  };
};

export type SearchExportsQueryVariables = Exact<{
  exportId?: InputMaybe<Scalars["ID"]["input"]>;
}>;

export type SearchExportsQuery = {
  searchExports: Array<{
    exportId: string;
    downloadUrl?: string | null;
    format: SearchExportFormat;
    startedAt: string;
    status: SearchExportStatus;
  }>;
};

export type MutationInfoFragment = {
  erfassungsDatum?: string | null;
  erfasser?: string | null;
  mutationsDatum?: string | null;
  mutierer?: string | null;
};

export type CreateSavedSearchMutationVariables = Exact<{
  data: CreateSavedSearchInput;
}>;

export type CreateSavedSearchMutation = {
  savedSearch:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | { __typename: "SavedSearch" };
};

export type DeleteSavedSearchMutationVariables = Exact<{
  savedSearchId: Scalars["ID"]["input"];
}>;

export type DeleteSavedSearchMutation = { deleteSavedSearch: string };

export type SearchFieldNamesQueryVariables = Exact<{
  lang: Language;
}>;

export type SearchFieldNamesQuery = {
  searchFieldNames: Array<{
    category: SearchFieldCategory;
    field: SearchField;
    name: string;
  }>;
};

export type VflzPreviewDataQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
  withGeschaefte: Scalars["Boolean"]["input"];
}>;

export type VflzPreviewDataQuery = {
  vflz: {
    vflzId: string;
    combinedId: string;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    lang: Language;
    bearbeitungsStand?: string | null;
    untersuchungsStand?: string | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    zentroid?: GeoJSONPoint | null;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    parzellen: Array<{
      gbNummer: string;
      gemeinde?: { displayValue: string } | null;
      nummerierungsbereich?: { bezeichnung?: string | null } | null;
    }>;
    eigentum: Array<{
      parzellen: Array<string>;
      subjekt?: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      } | null;
      gemeinde?: { bfsNummer?: number | null; displayValue: string } | null;
      nummerierungsbereich?: { bezeichnung?: string | null } | null;
    }>;
    sonstigeBeteiligte: Array<{
      beteiligter: {
        subjekt: {
          subjId: string;
          vorname: string;
          name: string;
          taetigkeit: string;
        };
      };
    }>;
    geschaefte?: {
      numResultsTotal: number;
      results: Array<
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            dokument?: string | null;
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
      >;
    };
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      beurteilung?: { kbsInfo?: { belastet: boolean } | null } | null;
    }>;
    beteiligteStandort: Array<{
      beteiligter: {
        isSachbearbeiter: boolean;
        subjekt: { name: string; vorname: string };
      };
    }>;
    vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
  };
};

export type SearchTabularQueryVariables = Exact<{
  advanced?: InputMaybe<Scalars["Boolean"]["input"]>;
  query: Scalars["String"]["input"];
  filters?: InputMaybe<Array<SearchFilter> | SearchFilter>;
  page?: InputMaybe<Scalars["Int"]["input"]>;
  fields?: InputMaybe<Array<SearchField> | SearchField>;
  sortBy?: InputMaybe<Array<SortItemInput> | SortItemInput>;
  perPage?: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type SearchTabularQuery = {
  search: {
    __typename: "SearchResult";
    page: number;
    tabular: {
      numPages: number;
      numResultsTotal: number;
      results: Array<unknown>;
    };
  };
};

export type ColorsQueryVariables = Exact<{ [key: string]: never }>;

export type ColorsQuery = {
  kbsInfos: Array<{ beurteilung: string; color: string }>;
};

export type SearchFieldTypesQueryVariables = Exact<{ [key: string]: never }>;

export type SearchFieldTypesQuery = {
  searchFields: Array<{ field: SearchField; type: FieldType }>;
};

export type ExportSearchMutationVariables = Exact<{
  data: ExportSearchInput;
}>;

export type ExportSearchMutation = { exportId: string };

export type VflHistoryQueryVariables = Exact<{
  vflIds: Array<Scalars["ID"]["input"]> | Scalars["ID"]["input"];
}>;

export type VflHistoryQuery = {
  vflzByVflIds: Array<{
    combinedId: string;
    vflzId: string;
    bezeichnung?: string | null;
    beurteilung?: { kbsInfo?: { color: string } | null } | null;
    gemeinde?: { gemeinde: string } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  }>;
};

export type HistorizeVflzMutationVariables = Exact<{
  data: HistorizeVflzInput;
}>;

export type HistorizeVflzMutation = {
  historizeVflz:
    { __typename: "ProblemGroup" } | { __typename: "Vflz"; vflzId: string };
};

export type VollzugFormFieldsFragment = {
  vflzId: string;
  vollzug: Array<{
    aktiv: boolean;
    behoerde: string;
    combinedId: string;
    isDeleteable: boolean;
    vflnrId: string;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
  }>;
};

export type VollzugDialogQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VollzugDialogQuery = {
  vflz: {
    vflzId: string;
    vollzug: Array<{
      aktiv: boolean;
      behoerde: string;
      combinedId: string;
      isDeleteable: boolean;
      vflnrId: string;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
    }>;
  };
};

export type UpdateVollzugMutationVariables = Exact<{
  data: UpdateVflzVollzugInput;
}>;

export type UpdateVollzugMutation = {
  updateVflzVollzug:
    | {
        __typename: "ProblemGroup";
        problems: Array<{ field: string; problemCode: ProblemCodeEnum }>;
      }
    | { __typename: "Vflz" };
};

export type VflzCreateFormFieldsFragment = {
  bezeichnung?: string | null;
  combinedId: string;
  flugplatz?: string | null;
  ktu?: string | null;
  vftyp: string;
  gemeinde?: {
    displayValue: string;
    hGemId: string;
    kanton?: string | null;
  } | null;
};

export type VflzInfoQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzInfoQuery = {
  vflz: {
    vflzId: string;
    combinedId: string;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    beteiligteStandort: Array<{
      beteiligter: {
        isSachbearbeiter: boolean;
        subjekt: { name: string; vorname: string };
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      beurteilung?: { kbsInfo?: { belastet: boolean } | null } | null;
    }>;
  };
};

export type VflzItemFragment = {
  combinedId: string;
  vflzId: string;
  bezeichnung?: string | null;
  beurteilung?: { kbsInfo?: { color: string } | null } | null;
  gemeinde?: { gemeinde: string } | null;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type VflzTeilstandortFragment = {
  bezeichnung?: string | null;
  combinedId: string;
  vflzId: string;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type VflzVersionFragment = {
  message: string;
  publizieren?: boolean | null;
  vflzCreatedDate?: string | null;
  vflzId: string;
  beurteilung?: { kbsInfo?: { color: string } | null } | null;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type SidebarPoolVflzQueryVariables = Exact<{
  page: Scalars["Int"]["input"];
  poolId: Scalars["ID"]["input"];
  perPage: Scalars["Int"]["input"];
}>;

export type SidebarPoolVflzQuery = {
  pool: {
    standorte: {
      numPages: number;
      results: Array<{
        combinedId: string;
        vflzId: string;
        bezeichnung?: string | null;
        beurteilung?: { kbsInfo?: { color: string } | null } | null;
        gemeinde?: { gemeinde: string } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      }>;
    };
  };
};

export type SidebarVflzPoolsQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type SidebarVflzPoolsQuery = {
  vflz: {
    pools: Array<{
      poolId: string;
      bezeichnung?: string | null;
      standorte: { numResultsTotal: number };
    }>;
  };
};

export type VflzLayoutFragment = {
  combinedId: string;
  vflId: string;
  vflzId: string;
  bezeichnung?: string | null;
  publizieren?: boolean | null;
  isCurrent: boolean;
  vflzCreatedDate?: string | null;
  teilstandorte: Array<{
    bezeichnung?: string | null;
    combinedId: string;
    vflzId: string;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  }>;
  versionen: Array<{
    vflzId: string;
    datPublizieren?: string | null;
    publizieren?: boolean | null;
    message: string;
    vflzCreatedDate?: string | null;
    beurteilung?: {
      kbsInfo?: { belastet: boolean; color: string } | null;
    } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  }>;
  beurteilung?: {
    beurteilung?: string | null;
    kbsInfo?: { color: string } | null;
  } | null;
  gemeinde?: { gemeinde: string; kanton?: string | null } | null;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type VflzMapFragment = {
  zentroid?: GeoJSONPoint | null;
  beurteilung?: { kbsInfo?: { color: string } | null } | null;
  vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
};

export type VflzMapEditorFragment = {
  vflzId: string;
  zentroid?: GeoJSONPoint | null;
  vflgeo?: {
    geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
  } | null;
  beurteilung?: { kbsInfo?: { color: string } | null } | null;
};

export type OleDifferenceQueryVariables = Exact<{
  A: Scalars["GeoJSONMultiPolygon"]["input"];
  B: Scalars["GeoJSONMultiPolygon"]["input"];
}>;

export type OleDifferenceQuery = { geo: any };

export type OleIntersectQueryVariables = Exact<{
  geoA: Scalars["GeoJSONMultiPolygon"]["input"];
  geoB: Scalars["GeoJSONMultiPolygon"]["input"];
}>;

export type OleIntersectQuery = { geo: any };

export type OleMakeValidQueryVariables = Exact<{
  geo: Scalars["GeoJSONMultiPolygon"]["input"];
}>;

export type OleMakeValidQuery = { geo: any };

export type OleUnionQueryVariables = Exact<{
  geoA: Scalars["GeoJSONMultiPolygon"]["input"];
  geoB: Scalars["GeoJSONMultiPolygon"]["input"];
}>;

export type OleUnionQuery = { geo: any };

export type OleSplitQueryVariables = Exact<{
  geo: Scalars["GeoJSONMultiPolygon"]["input"];
  blade: Scalars["GeoJSONLineString"]["input"];
}>;

export type OleSplitQuery = { geo: any };

export type ReportConfigQueryVariables = Exact<{ [key: string]: never }>;

export type ReportConfigQuery = {
  reportConfigurations: Array<{
    reportId: string;
    title: string;
    params: Array<{ name: string; paramType: ParamType }>;
  }>;
};

export type VflzOverviewFragment = {
  vflzId: string;
  lang: Language;
  bearbeitungsStand?: string | null;
  untersuchungsStand?: string | null;
  combinedId: string;
  bezeichnung?: string | null;
  publizieren?: boolean | null;
  zentroid?: GeoJSONPoint | null;
  isCurrent: boolean;
  vflzCreatedDate?: string | null;
  parzellen: Array<{
    gbNummer: string;
    gemeinde?: { displayValue: string } | null;
    nummerierungsbereich?: { bezeichnung?: string | null } | null;
  }>;
  eigentum: Array<{
    parzellen: Array<string>;
    subjekt?: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    } | null;
    gemeinde?: { bfsNummer?: number | null; displayValue: string } | null;
    nummerierungsbereich?: { bezeichnung?: string | null } | null;
  }>;
  sonstigeBeteiligte: Array<{
    beteiligter: {
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    };
  }>;
  geschaefte?: {
    numResultsTotal: number;
    results: Array<
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          dokument?: string | null;
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
    >;
  };
  beteiligteStandort: Array<{
    beteiligter: {
      isSachbearbeiter: boolean;
      subjekt: { name: string; vorname: string };
    };
  }>;
  beurteilung?: {
    beurteilung?: string | null;
    kbsInfo?: { color: string } | null;
  } | null;
  gemeinde?: { gemeinde: string; kanton?: string | null } | null;
  vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
  versionen: Array<{
    vflzId: string;
    datPublizieren?: string | null;
    publizieren?: boolean | null;
    beurteilung?: { kbsInfo?: { belastet: boolean } | null } | null;
  }>;
};

export type VflzSachbearbeiterFragment = {
  beteiligteStandort: Array<{
    beteiligter: {
      isSachbearbeiter: boolean;
      subjekt: { name: string; vorname: string };
    };
  }>;
};

export type SearchMapQueryVariables = Exact<{
  advanced: Scalars["Boolean"]["input"];
  extent?: InputMaybe<
    Array<Scalars["Float"]["input"]> | Scalars["Float"]["input"]
  >;
  query: Scalars["String"]["input"];
  filters: Array<SearchFilter> | SearchFilter;
  withPoints: Scalars["Boolean"]["input"];
}>;

export type SearchMapQuery = {
  search: {
    geo: {
      zentroid?: GeoJSONFeatureCollection;
      vflgeo?: GeoJSONFeatureCollection;
    };
  };
};

export type VflzStatusTextFragment = {
  isCurrent: boolean;
  vflzCreatedDate?: string | null;
  versionen: Array<{
    vflzId: string;
    datPublizieren?: string | null;
    publizieren?: boolean | null;
    beurteilung?: { kbsInfo?: { belastet: boolean } | null } | null;
  }>;
};

export type VflzStatusFragment = {
  isCurrent: boolean;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type VflzSummaryFragment = {
  vflzId: string;
  combinedId: string;
  bezeichnung?: string | null;
  publizieren?: boolean | null;
  isCurrent: boolean;
  vflzCreatedDate?: string | null;
  beurteilung?: {
    beurteilung?: string | null;
    kbsInfo?: { color: string } | null;
  } | null;
  gemeinde?: { gemeinde: string; kanton?: string | null } | null;
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
  versionen: Array<{
    vflzId: string;
    datPublizieren?: string | null;
    publizieren?: boolean | null;
    beurteilung?: { kbsInfo?: { belastet: boolean } | null } | null;
  }>;
};

export type BeteiligteFieldBeteiligterFragment = {
  isSachbearbeiter: boolean;
  subjekt: {
    subjId: string;
    vorname: string;
    name: string;
    taetigkeit: string;
  };
};

export type BeteiligteFieldBeteiligterGeschaeftFragment = {
  betTaskId: string;
  subjekt: {
    subjId: string;
    vorname: string;
    name: string;
    taetigkeit: string;
  };
};

export type BeteiligteFieldSubjektFragment = {
  subjId: string;
  vorname: string;
  name: string;
  taetigkeit: string;
};

export type SearchVflzSubjekteQueryVariables = Exact<{
  filter?: InputMaybe<Scalars["String"]["input"]>;
  isSachbearbeiter?: InputMaybe<Scalars["Boolean"]["input"]>;
}>;

export type SearchVflzSubjekteQuery = {
  subjekte: {
    results: Array<{
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    }>;
  };
};

export type CreateNotizMutationVariables = Exact<{
  data: CreateNotizInput;
}>;

export type CreateNotizMutation = { createTask: { taskId: string } };

export type CreateDokumentMutationVariables = Exact<{
  data: CreateDokumentInput;
}>;

export type CreateDokumentMutation = { createTask: { taskId: string } };

export type CreateAufgabeMutationVariables = Exact<{
  data: CreateAufgabeInput;
}>;

export type CreateAufgabeMutation = { createTask: { taskId: string } };

export type StartProzessMutationVariables = Exact<{
  data: StartProzessInput;
}>;

export type StartProzessMutation = {
  startProzess: { prozess: { taskId: string } };
};

export type StartFolgeschrittMutationVariables = Exact<{
  data: StartTaskInput;
}>;

export type StartFolgeschrittMutation = {
  startFolgeschritt: {
    task:
      | { taskId: string }
      | { taskId: string }
      | { taskId: string }
      | { taskId: string }
      | { taskId: string };
  };
};

export type TaskQueryVariables = Exact<{
  taskId: Scalars["ID"]["input"];
  withVflzInfo: Scalars["Boolean"]["input"];
}>;

export type TaskQuery = {
  task:
    | {
        type: TaskType;
        deletable: boolean;
        faelligkeitsDatum?: string | null;
        faelligkeitsStatus: FaelligkeitStatus;
        endDatum?: string | null;
        kategorie?: string | null;
        notiz?: string | null;
        oeffentlich: boolean;
        readOnly: boolean;
        startDatum: string;
        status: TaskStatus;
        taskId: string;
        title: string;
        events: Array<
          | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
          | {
              __typename: "BearbeitungsstandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "InKbsEingetragen";
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "ProzessGestartet";
              timestamp: string;
              title: string;
              taskId: string;
            }
          | {
              __typename: "StandortHistorisiert";
              timestamp: string;
              newVflzId: string;
            }
          | {
              __typename: "UntersuchungsStandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
        >;
        folgeschritte: Array<{
          optionId: string;
          title: string;
          type: TaskType;
        }>;
        sachbearbeitung: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        sonstigeBeteiligte: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        triggers: Array<
          | { __typename: "BearbeitungsstandSetzen"; code: string }
          | { __typename: "ProzessStarten"; title: string }
          | { __typename: "Publizieren" }
          | { __typename: "StandortHistorisieren"; value?: any | null }
          | { __typename: "UntersuchungsStandSetzen"; code: string }
        >;
        vflz: {
          latestVflzId: string;
          beteiligte: Array<{
            isSachbearbeiter: boolean;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          }>;
        };
        vflzInfo?: { combinedId: string; bezeichnung?: string | null };
      }
    | {
        type: TaskType;
        dokument?: string | null;
        url?: string | null;
        deletable: boolean;
        faelligkeitsDatum?: string | null;
        faelligkeitsStatus: FaelligkeitStatus;
        endDatum?: string | null;
        kategorie?: string | null;
        notiz?: string | null;
        oeffentlich: boolean;
        readOnly: boolean;
        startDatum: string;
        status: TaskStatus;
        taskId: string;
        title: string;
        events: Array<
          | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
          | {
              __typename: "BearbeitungsstandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "InKbsEingetragen";
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "ProzessGestartet";
              timestamp: string;
              title: string;
              taskId: string;
            }
          | {
              __typename: "StandortHistorisiert";
              timestamp: string;
              newVflzId: string;
            }
          | {
              __typename: "UntersuchungsStandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
        >;
        folgeschritte: Array<{
          optionId: string;
          title: string;
          type: TaskType;
        }>;
        sachbearbeitung: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        sonstigeBeteiligte: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        triggers: Array<
          | { __typename: "BearbeitungsstandSetzen"; code: string }
          | { __typename: "ProzessStarten"; title: string }
          | { __typename: "Publizieren" }
          | { __typename: "StandortHistorisieren"; value?: any | null }
          | { __typename: "UntersuchungsStandSetzen"; code: string }
        >;
        vflz: {
          latestVflzId: string;
          beteiligte: Array<{
            isSachbearbeiter: boolean;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          }>;
        };
        vflzInfo?: { combinedId: string; bezeichnung?: string | null };
      }
    | {
        type: TaskType;
        felder: FormularFeld[];
        eingaben: FormularEingaben;
        deletable: boolean;
        faelligkeitsDatum?: string | null;
        faelligkeitsStatus: FaelligkeitStatus;
        endDatum?: string | null;
        kategorie?: string | null;
        notiz?: string | null;
        oeffentlich: boolean;
        readOnly: boolean;
        startDatum: string;
        status: TaskStatus;
        taskId: string;
        title: string;
        events: Array<
          | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
          | {
              __typename: "BearbeitungsstandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "InKbsEingetragen";
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "ProzessGestartet";
              timestamp: string;
              title: string;
              taskId: string;
            }
          | {
              __typename: "StandortHistorisiert";
              timestamp: string;
              newVflzId: string;
            }
          | {
              __typename: "UntersuchungsStandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
        >;
        folgeschritte: Array<{
          optionId: string;
          title: string;
          type: TaskType;
        }>;
        sachbearbeitung: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        sonstigeBeteiligte: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        triggers: Array<
          | { __typename: "BearbeitungsstandSetzen"; code: string }
          | { __typename: "ProzessStarten"; title: string }
          | { __typename: "Publizieren" }
          | { __typename: "StandortHistorisieren"; value?: any | null }
          | { __typename: "UntersuchungsStandSetzen"; code: string }
        >;
        vflz: {
          latestVflzId: string;
          beteiligte: Array<{
            isSachbearbeiter: boolean;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          }>;
        };
        vflzInfo?: { combinedId: string; bezeichnung?: string | null };
      }
    | {
        type: TaskType;
        url?: string | null;
        deletable: boolean;
        faelligkeitsDatum?: string | null;
        faelligkeitsStatus: FaelligkeitStatus;
        endDatum?: string | null;
        kategorie?: string | null;
        notiz?: string | null;
        oeffentlich: boolean;
        readOnly: boolean;
        startDatum: string;
        status: TaskStatus;
        taskId: string;
        title: string;
        events: Array<
          | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
          | {
              __typename: "BearbeitungsstandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "InKbsEingetragen";
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "ProzessGestartet";
              timestamp: string;
              title: string;
              taskId: string;
            }
          | {
              __typename: "StandortHistorisiert";
              timestamp: string;
              newVflzId: string;
            }
          | {
              __typename: "UntersuchungsStandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
        >;
        folgeschritte: Array<{
          optionId: string;
          title: string;
          type: TaskType;
        }>;
        sachbearbeitung: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        sonstigeBeteiligte: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        triggers: Array<
          | { __typename: "BearbeitungsstandSetzen"; code: string }
          | { __typename: "ProzessStarten"; title: string }
          | { __typename: "Publizieren" }
          | { __typename: "StandortHistorisieren"; value?: any | null }
          | { __typename: "UntersuchungsStandSetzen"; code: string }
        >;
        vflz: {
          latestVflzId: string;
          beteiligte: Array<{
            isSachbearbeiter: boolean;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          }>;
        };
        vflzInfo?: { combinedId: string; bezeichnung?: string | null };
      }
    | {
        type: TaskType;
        deletable: boolean;
        faelligkeitsDatum?: string | null;
        faelligkeitsStatus: FaelligkeitStatus;
        endDatum?: string | null;
        kategorie?: string | null;
        notiz?: string | null;
        oeffentlich: boolean;
        readOnly: boolean;
        startDatum: string;
        status: TaskStatus;
        taskId: string;
        title: string;
        events: Array<
          | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
          | {
              __typename: "BearbeitungsstandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "InKbsEingetragen";
              timestamp: string;
              vflzId: string;
            }
          | {
              __typename: "ProzessGestartet";
              timestamp: string;
              title: string;
              taskId: string;
            }
          | {
              __typename: "StandortHistorisiert";
              timestamp: string;
              newVflzId: string;
            }
          | {
              __typename: "UntersuchungsStandGesetzt";
              code: string;
              timestamp: string;
              vflzId: string;
            }
        >;
        folgeschritte: Array<{
          optionId: string;
          title: string;
          type: TaskType;
        }>;
        sachbearbeitung: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        sonstigeBeteiligte: Array<{
          betTaskId: string;
          subjekt: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          };
        }>;
        triggers: Array<
          | { __typename: "BearbeitungsstandSetzen"; code: string }
          | { __typename: "ProzessStarten"; title: string }
          | { __typename: "Publizieren" }
          | { __typename: "StandortHistorisieren"; value?: any | null }
          | { __typename: "UntersuchungsStandSetzen"; code: string }
        >;
        vflz: {
          latestVflzId: string;
          beteiligte: Array<{
            isSachbearbeiter: boolean;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          }>;
        };
        vflzInfo?: { combinedId: string; bezeichnung?: string | null };
      };
};

export type UpdateAufgabeMutationVariables = Exact<{
  data: UpdateAufgabeInput;
  updateTasks: Scalars["Boolean"]["input"];
}>;

export type UpdateAufgabeMutation = {
  task:
    | {
        __typename: "Aufgabe";
        events: Array<
          | { __typename: "AusKbsGeloescht"; vflzId: string }
          | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
          | { __typename: "InKbsEingetragen"; vflzId: string }
          | { __typename: "ProzessGestartet" }
          | { __typename: "StandortHistorisiert"; newVflzId: string }
          | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
        >;
      }
    | {
        __typename: "WorkflowProblemGroup";
        faelligkeitsDatumProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
        statusProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
        openEventsProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
      };
};

export type UpdateDokumentMutationVariables = Exact<{
  data: UpdateDokumentInput;
}>;

export type UpdateDokumentMutation = {
  task: {
    __typename: "Dokument";
    events: Array<
      | { __typename: "AusKbsGeloescht"; vflzId: string }
      | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
      | { __typename: "InKbsEingetragen"; vflzId: string }
      | { __typename: "ProzessGestartet" }
      | { __typename: "StandortHistorisiert"; newVflzId: string }
      | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
    >;
  };
};

export type DeleteTaskMutationVariables = Exact<{
  taskId: Scalars["ID"]["input"];
}>;

export type DeleteTaskMutation = { deleteTask: string };

type TaskForm_Aufgabe_Fragment = {
  deletable: boolean;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  endDatum?: string | null;
  kategorie?: string | null;
  notiz?: string | null;
  oeffentlich: boolean;
  readOnly: boolean;
  startDatum: string;
  status: TaskStatus;
  taskId: string;
  title: string;
  type: TaskType;
  events: Array<
    | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
    | {
        __typename: "BearbeitungsstandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
    | { __typename: "InKbsEingetragen"; timestamp: string; vflzId: string }
    | {
        __typename: "ProzessGestartet";
        timestamp: string;
        title: string;
        taskId: string;
      }
    | {
        __typename: "StandortHistorisiert";
        timestamp: string;
        newVflzId: string;
      }
    | {
        __typename: "UntersuchungsStandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
  >;
  folgeschritte: Array<{ optionId: string; title: string; type: TaskType }>;
  sachbearbeitung: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  sonstigeBeteiligte: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  triggers: Array<
    | { __typename: "BearbeitungsstandSetzen"; code: string }
    | { __typename: "ProzessStarten"; title: string }
    | { __typename: "Publizieren" }
    | { __typename: "StandortHistorisieren"; value?: any | null }
    | { __typename: "UntersuchungsStandSetzen"; code: string }
  >;
  vflz: {
    latestVflzId: string;
    beteiligte: Array<{
      isSachbearbeiter: boolean;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    }>;
  };
  vflzInfo?: { combinedId: string; bezeichnung?: string | null };
};

type TaskForm_Dokument_Fragment = {
  dokument?: string | null;
  url?: string | null;
  deletable: boolean;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  endDatum?: string | null;
  kategorie?: string | null;
  notiz?: string | null;
  oeffentlich: boolean;
  readOnly: boolean;
  startDatum: string;
  status: TaskStatus;
  taskId: string;
  title: string;
  type: TaskType;
  events: Array<
    | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
    | {
        __typename: "BearbeitungsstandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
    | { __typename: "InKbsEingetragen"; timestamp: string; vflzId: string }
    | {
        __typename: "ProzessGestartet";
        timestamp: string;
        title: string;
        taskId: string;
      }
    | {
        __typename: "StandortHistorisiert";
        timestamp: string;
        newVflzId: string;
      }
    | {
        __typename: "UntersuchungsStandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
  >;
  folgeschritte: Array<{ optionId: string; title: string; type: TaskType }>;
  sachbearbeitung: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  sonstigeBeteiligte: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  triggers: Array<
    | { __typename: "BearbeitungsstandSetzen"; code: string }
    | { __typename: "ProzessStarten"; title: string }
    | { __typename: "Publizieren" }
    | { __typename: "StandortHistorisieren"; value?: any | null }
    | { __typename: "UntersuchungsStandSetzen"; code: string }
  >;
  vflz: {
    latestVflzId: string;
    beteiligte: Array<{
      isSachbearbeiter: boolean;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    }>;
  };
  vflzInfo?: { combinedId: string; bezeichnung?: string | null };
};

type TaskForm_Formular_Fragment = {
  felder: FormularFeld[];
  eingaben: FormularEingaben;
  deletable: boolean;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  endDatum?: string | null;
  kategorie?: string | null;
  notiz?: string | null;
  oeffentlich: boolean;
  readOnly: boolean;
  startDatum: string;
  status: TaskStatus;
  taskId: string;
  title: string;
  type: TaskType;
  events: Array<
    | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
    | {
        __typename: "BearbeitungsstandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
    | { __typename: "InKbsEingetragen"; timestamp: string; vflzId: string }
    | {
        __typename: "ProzessGestartet";
        timestamp: string;
        title: string;
        taskId: string;
      }
    | {
        __typename: "StandortHistorisiert";
        timestamp: string;
        newVflzId: string;
      }
    | {
        __typename: "UntersuchungsStandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
  >;
  folgeschritte: Array<{ optionId: string; title: string; type: TaskType }>;
  sachbearbeitung: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  sonstigeBeteiligte: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  triggers: Array<
    | { __typename: "BearbeitungsstandSetzen"; code: string }
    | { __typename: "ProzessStarten"; title: string }
    | { __typename: "Publizieren" }
    | { __typename: "StandortHistorisieren"; value?: any | null }
    | { __typename: "UntersuchungsStandSetzen"; code: string }
  >;
  vflz: {
    latestVflzId: string;
    beteiligte: Array<{
      isSachbearbeiter: boolean;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    }>;
  };
  vflzInfo?: { combinedId: string; bezeichnung?: string | null };
};

type TaskForm_Notiz_Fragment = {
  url?: string | null;
  deletable: boolean;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  endDatum?: string | null;
  kategorie?: string | null;
  notiz?: string | null;
  oeffentlich: boolean;
  readOnly: boolean;
  startDatum: string;
  status: TaskStatus;
  taskId: string;
  title: string;
  type: TaskType;
  events: Array<
    | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
    | {
        __typename: "BearbeitungsstandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
    | { __typename: "InKbsEingetragen"; timestamp: string; vflzId: string }
    | {
        __typename: "ProzessGestartet";
        timestamp: string;
        title: string;
        taskId: string;
      }
    | {
        __typename: "StandortHistorisiert";
        timestamp: string;
        newVflzId: string;
      }
    | {
        __typename: "UntersuchungsStandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
  >;
  folgeschritte: Array<{ optionId: string; title: string; type: TaskType }>;
  sachbearbeitung: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  sonstigeBeteiligte: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  triggers: Array<
    | { __typename: "BearbeitungsstandSetzen"; code: string }
    | { __typename: "ProzessStarten"; title: string }
    | { __typename: "Publizieren" }
    | { __typename: "StandortHistorisieren"; value?: any | null }
    | { __typename: "UntersuchungsStandSetzen"; code: string }
  >;
  vflz: {
    latestVflzId: string;
    beteiligte: Array<{
      isSachbearbeiter: boolean;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    }>;
  };
  vflzInfo?: { combinedId: string; bezeichnung?: string | null };
};

type TaskForm_Prozess_Fragment = {
  deletable: boolean;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  endDatum?: string | null;
  kategorie?: string | null;
  notiz?: string | null;
  oeffentlich: boolean;
  readOnly: boolean;
  startDatum: string;
  status: TaskStatus;
  taskId: string;
  title: string;
  type: TaskType;
  events: Array<
    | { __typename: "AusKbsGeloescht"; timestamp: string; vflzId: string }
    | {
        __typename: "BearbeitungsstandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
    | { __typename: "InKbsEingetragen"; timestamp: string; vflzId: string }
    | {
        __typename: "ProzessGestartet";
        timestamp: string;
        title: string;
        taskId: string;
      }
    | {
        __typename: "StandortHistorisiert";
        timestamp: string;
        newVflzId: string;
      }
    | {
        __typename: "UntersuchungsStandGesetzt";
        code: string;
        timestamp: string;
        vflzId: string;
      }
  >;
  folgeschritte: Array<{ optionId: string; title: string; type: TaskType }>;
  sachbearbeitung: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  sonstigeBeteiligte: Array<{
    betTaskId: string;
    subjekt: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    };
  }>;
  triggers: Array<
    | { __typename: "BearbeitungsstandSetzen"; code: string }
    | { __typename: "ProzessStarten"; title: string }
    | { __typename: "Publizieren" }
    | { __typename: "StandortHistorisieren"; value?: any | null }
    | { __typename: "UntersuchungsStandSetzen"; code: string }
  >;
  vflz: {
    latestVflzId: string;
    beteiligte: Array<{
      isSachbearbeiter: boolean;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    }>;
  };
  vflzInfo?: { combinedId: string; bezeichnung?: string | null };
};

export type TaskFormFragment =
  | TaskForm_Aufgabe_Fragment
  | TaskForm_Dokument_Fragment
  | TaskForm_Formular_Fragment
  | TaskForm_Notiz_Fragment
  | TaskForm_Prozess_Fragment;

type TaskEvents_Aufgabe_Fragment = {
  events: Array<
    | { __typename: "AusKbsGeloescht"; vflzId: string }
    | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
    | { __typename: "InKbsEingetragen"; vflzId: string }
    | { __typename: "ProzessGestartet" }
    | { __typename: "StandortHistorisiert"; newVflzId: string }
    | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
  >;
};

type TaskEvents_Dokument_Fragment = {
  events: Array<
    | { __typename: "AusKbsGeloescht"; vflzId: string }
    | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
    | { __typename: "InKbsEingetragen"; vflzId: string }
    | { __typename: "ProzessGestartet" }
    | { __typename: "StandortHistorisiert"; newVflzId: string }
    | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
  >;
};

type TaskEvents_Formular_Fragment = {
  events: Array<
    | { __typename: "AusKbsGeloescht"; vflzId: string }
    | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
    | { __typename: "InKbsEingetragen"; vflzId: string }
    | { __typename: "ProzessGestartet" }
    | { __typename: "StandortHistorisiert"; newVflzId: string }
    | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
  >;
};

type TaskEvents_Notiz_Fragment = {
  events: Array<
    | { __typename: "AusKbsGeloescht"; vflzId: string }
    | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
    | { __typename: "InKbsEingetragen"; vflzId: string }
    | { __typename: "ProzessGestartet" }
    | { __typename: "StandortHistorisiert"; newVflzId: string }
    | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
  >;
};

type TaskEvents_Prozess_Fragment = {
  events: Array<
    | { __typename: "AusKbsGeloescht"; vflzId: string }
    | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
    | { __typename: "InKbsEingetragen"; vflzId: string }
    | { __typename: "ProzessGestartet" }
    | { __typename: "StandortHistorisiert"; newVflzId: string }
    | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
  >;
};

export type TaskEventsFragment =
  | TaskEvents_Aufgabe_Fragment
  | TaskEvents_Dokument_Fragment
  | TaskEvents_Formular_Fragment
  | TaskEvents_Notiz_Fragment
  | TaskEvents_Prozess_Fragment;

export type ProblemTasksFragment = {
  __typename: "WorkflowProblemGroup";
  faelligkeitsDatumProblemTasks: Array<
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
  >;
  statusProblemTasks: Array<
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
  >;
  openEventsProblemTasks: Array<
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
    | { taskId: string; title: string }
  >;
};

export type UpdateFormularMutationVariables = Exact<{
  data: UpdateFormularInput;
}>;

export type UpdateFormularMutation = {
  task:
    | {
        __typename: "Formular";
        events: Array<
          | { __typename: "AusKbsGeloescht"; vflzId: string }
          | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
          | { __typename: "InKbsEingetragen"; vflzId: string }
          | { __typename: "ProzessGestartet" }
          | { __typename: "StandortHistorisiert"; newVflzId: string }
          | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
        >;
      }
    | { __typename: "ProblemGroup" };
};

export type UpdateNotizMutationVariables = Exact<{
  data: UpdateNotizInput;
}>;

export type UpdateNotizMutation = {
  task: {
    __typename: "Notiz";
    events: Array<
      | { __typename: "AusKbsGeloescht"; vflzId: string }
      | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
      | { __typename: "InKbsEingetragen"; vflzId: string }
      | { __typename: "ProzessGestartet" }
      | { __typename: "StandortHistorisiert"; newVflzId: string }
      | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
    >;
  };
};

export type UpdateProzessMutationVariables = Exact<{
  data: UpdateProzessInput;
  updateTasks: Scalars["Boolean"]["input"];
}>;

export type UpdateProzessMutation = {
  task:
    | {
        __typename: "Prozess";
        events: Array<
          | { __typename: "AusKbsGeloescht"; vflzId: string }
          | { __typename: "BearbeitungsstandGesetzt"; vflzId: string }
          | { __typename: "InKbsEingetragen"; vflzId: string }
          | { __typename: "ProzessGestartet" }
          | { __typename: "StandortHistorisiert"; newVflzId: string }
          | { __typename: "UntersuchungsStandGesetzt"; vflzId: string }
        >;
      }
    | {
        __typename: "WorkflowProblemGroup";
        faelligkeitsDatumProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
        statusProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
        openEventsProblemTasks: Array<
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
          | { taskId: string; title: string }
        >;
      };
};

type WorkflowItem_Aufgabe_Fragment = {
  deletable: boolean;
  taskId: string;
  parentId?: string | null;
  type: TaskType;
  title: string;
  status: TaskStatus;
  startDatum: string;
  endDatum?: string | null;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  notiz?: string | null;
  sachbearbeitung: Array<{ subjekt: { name: string; vorname: string } }>;
  vflz: { vflzId: string; combinedId: string; bezeichnung?: string | null };
};

type WorkflowItem_Dokument_Fragment = {
  dokument?: string | null;
  deletable: boolean;
  taskId: string;
  parentId?: string | null;
  type: TaskType;
  title: string;
  status: TaskStatus;
  startDatum: string;
  endDatum?: string | null;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  notiz?: string | null;
  sachbearbeitung: Array<{ subjekt: { name: string; vorname: string } }>;
  vflz: { vflzId: string; combinedId: string; bezeichnung?: string | null };
};

type WorkflowItem_Formular_Fragment = {
  deletable: boolean;
  taskId: string;
  parentId?: string | null;
  type: TaskType;
  title: string;
  status: TaskStatus;
  startDatum: string;
  endDatum?: string | null;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  notiz?: string | null;
  sachbearbeitung: Array<{ subjekt: { name: string; vorname: string } }>;
  vflz: { vflzId: string; combinedId: string; bezeichnung?: string | null };
};

type WorkflowItem_Notiz_Fragment = {
  deletable: boolean;
  taskId: string;
  parentId?: string | null;
  type: TaskType;
  title: string;
  status: TaskStatus;
  startDatum: string;
  endDatum?: string | null;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  notiz?: string | null;
  sachbearbeitung: Array<{ subjekt: { name: string; vorname: string } }>;
  vflz: { vflzId: string; combinedId: string; bezeichnung?: string | null };
};

type WorkflowItem_Prozess_Fragment = {
  deletable: boolean;
  taskId: string;
  parentId?: string | null;
  type: TaskType;
  title: string;
  status: TaskStatus;
  startDatum: string;
  endDatum?: string | null;
  faelligkeitsDatum?: string | null;
  faelligkeitsStatus: FaelligkeitStatus;
  notiz?: string | null;
  sachbearbeitung: Array<{ subjekt: { name: string; vorname: string } }>;
  vflz: { vflzId: string; combinedId: string; bezeichnung?: string | null };
};

export type WorkflowItemFragment =
  | WorkflowItem_Aufgabe_Fragment
  | WorkflowItem_Dokument_Fragment
  | WorkflowItem_Formular_Fragment
  | WorkflowItem_Notiz_Fragment
  | WorkflowItem_Prozess_Fragment;

export type GlobalWorkflowQueryVariables = Exact<{
  asTree: Scalars["Boolean"]["input"];
  page: Scalars["Int"]["input"];
  perPage: Scalars["Int"]["input"];
  reverse: Scalars["Boolean"]["input"];
  sortBy: SortTasks;
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
  filter?: InputMaybe<GeschaefteFilter>;
}>;

export type GlobalWorkflowQuery = {
  geschaefte: {
    numPages: number;
    numResultsTotal: number;
    page: number;
    results: Array<
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          dokument?: string | null;
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
      | {
          deletable: boolean;
          taskId: string;
          parentId?: string | null;
          type: TaskType;
          title: string;
          status: TaskStatus;
          startDatum: string;
          endDatum?: string | null;
          faelligkeitsDatum?: string | null;
          faelligkeitsStatus: FaelligkeitStatus;
          notiz?: string | null;
          sachbearbeitung: Array<{
            subjekt: { name: string; vorname: string };
          }>;
          vflz: {
            vflzId: string;
            combinedId: string;
            bezeichnung?: string | null;
          };
        }
    >;
  };
};

export type WorkflowFilterFragment = {
  teilstandorte: Array<{ combinedId: string }>;
};

export type VflzWorkflowQueryVariables = Exact<{
  asTree: Scalars["Boolean"]["input"];
  page?: InputMaybe<Scalars["Int"]["input"]>;
  perPage: Scalars["Int"]["input"];
  reverse: Scalars["Boolean"]["input"];
  sortBy: SortTasks;
  taskId?: InputMaybe<Scalars["ID"]["input"]>;
  vflzId: Scalars["ID"]["input"];
  filter?: InputMaybe<GeschaefteFilter>;
}>;

export type VflzWorkflowQuery = {
  vflz: {
    geschaefte: {
      numPages: number;
      numResultsTotal: number;
      page: number;
      results: Array<
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            dokument?: string | null;
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
      >;
    };
    prozesse: Array<{ optionId: string; title: string; type: TaskType }>;
    teilstandorte: Array<{ combinedId: string }>;
  };
};

export type ZeitraumFieldsFragment = {
  von?: string | null;
  vonjahr: boolean;
  bis?: string | null;
  bisjahr: boolean;
  bisheute: boolean;
};

export type ZeitraumFieldsMitGenauigkeitFragment = {
  von?: string | null;
  vonjahr: boolean;
  bis?: string | null;
  bisjahr: boolean;
  bisheute: boolean;
  genauigkeitVon?: string | null;
  genauigkeitBis?: string | null;
};

export type PublicationIconFragment = {
  evaluationStatus: {
    deletedPreviously: boolean;
    deleteNow: boolean;
    publishedPreviously: boolean;
    publishNow: boolean;
  };
};

export type CypressCreateVflzMutationVariables = Exact<{
  data: CreateVflzInput;
}>;

export type CypressCreateVflzMutation = {
  createVflz:
    { __typename: "ProblemGroup" } | { __typename: "Vflz"; vflzId: string };
};

export type CypressUpdateVflzDataMutationVariables = Exact<{
  data: UpdateVflzDataInput;
}>;

export type CypressUpdateVflzDataMutation = {
  reset: { __typename: "ProblemGroup" } | { __typename: "Vflz" };
};

export type CypressUpdateVflzEvaluationMutationVariables = Exact<{
  data: UpdateVflzEvaluationInput;
}>;

export type CypressUpdateVflzEvaluationMutation = {
  reset: { __typename: "ProblemGroup" } | { __typename: "Vflz" };
};

export type CypressUpdateVflzBeteiligteMutationVariables = Exact<{
  data: UpdateVflzBeteiligteInput;
}>;

export type CypressUpdateVflzBeteiligteMutation = {
  reset: { __typename: "ProblemGroup" } | { __typename: "Vflz" };
};

export type CypressUpdateVflzVollzugMutationVariables = Exact<{
  data: UpdateVflzVollzugInput;
}>;

export type CypressUpdateVflzVollzugMutation = {
  reset: { __typename: "ProblemGroup" } | { __typename: "Vflz" };
};

export type CypressUpdateSubjektMutationVariables = Exact<{
  data: UpdateSubjektInput;
}>;

export type CypressUpdateSubjektMutation = {
  reset: { __typename: "UpdateSubjektResult" };
};

export type CypressUpdateTaskFormularMutationVariables = Exact<{
  data: UpdateFormularInput;
}>;

export type CypressUpdateTaskFormularMutation = {
  reset: { __typename: "Formular" } | { __typename: "ProblemGroup" };
};

export type CypressUserSubjektMutationVariables = Exact<{
  data: UpdateUserInput;
}>;

export type CypressUserSubjektMutation = {
  reset: { __typename: "ProblemGroup" } | { __typename: "User" };
};

export type CreatePoolMutationVariables = Exact<{
  data: CreatePoolInput;
}>;

export type CreatePoolMutation = {
  createPool:
    | { __typename: "Pool"; poolId: string }
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      };
};

export type GetZeitraumFragment = {
  von?: string | null;
  bis?: string | null;
  vonjahr: boolean;
  bisjahr: boolean;
  bisheute: boolean;
};

export type TranslationsQueryVariables = Exact<{ [key: string]: never }>;

export type TranslationsQuery = {
  translations: {
    de: JSONTranslation;
    fr: JSONTranslation;
    it: JSONTranslation;
  };
};

export type InstanceSettingsQueryVariables = Exact<{ [key: string]: never }>;

export type InstanceSettingsQuery = {
  instanceSettings: Array<{
    category: SettingCategory;
    key: string;
    value: unknown;
    valueSchema: unknown;
  }>;
};

export type SavedSearchFragment = {
  savedSearchId: string;
  query: string;
  fields: Array<SearchField>;
  isGrouped: boolean;
  isShared: boolean;
  name: string;
  showOnDashboard: boolean;
  sortBy: Array<{ field: SearchField; reverse: boolean }>;
  user: { id: string; username: string };
};

export type SavedSearchesQueryVariables = Exact<{
  lang: Language;
}>;

export type SavedSearchesQuery = {
  savedSearches: Array<{
    savedSearchId: string;
    query: string;
    fields: Array<SearchField>;
    isGrouped: boolean;
    isShared: boolean;
    name: string;
    showOnDashboard: boolean;
    sortBy: Array<{ field: SearchField; reverse: boolean }>;
    user: { id: string; username: string };
  }>;
};

export type UpdateSavedSearchMutationVariables = Exact<{
  data: UpdateSavedSearchInput;
}>;

export type UpdateSavedSearchMutation = {
  savedSearch:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | { __typename: "SavedSearch" };
};

export type SearchGraphQueryVariables = Exact<{
  advanced?: InputMaybe<Scalars["Boolean"]["input"]>;
  query: Scalars["String"]["input"];
  filters?: InputMaybe<Array<SearchFilter> | SearchFilter>;
  page?: InputMaybe<Scalars["Int"]["input"]>;
  fields?: InputMaybe<Array<SearchField> | SearchField>;
  perPage?: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type SearchGraphQuery = {
  search: {
    __typename: "SearchResult";
    page: number;
    graph: {
      numPages: number;
      numResultsTotal: number;
      results: Array<{
        combinedId: string;
        vflzId: string;
        bezeichnung?: string | null;
        beurteilung?: { kbsInfo?: { color: string } | null } | null;
        gemeinde?: { gemeinde: string } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      }>;
    };
  };
};

export type UpdateInstanceSettingMutationVariables = Exact<{
  data: UpdateInstanceSettingInput;
}>;

export type UpdateInstanceSettingMutation = {
  updateInstanceSetting:
    | {
        __typename: "InstanceSetting";
        category: SettingCategory;
        key: string;
        value: unknown;
      }
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      };
};

export type MappingQueryVariables = Exact<{ [key: string]: never }>;

export type MappingQuery = { mappingCodelisten: unknown };

export type CodeListsQueryVariables = Exact<{
  cliIds: Array<Scalars["ID"]["input"]> | Scalars["ID"]["input"];
}>;

export type CodeListsQuery = {
  codeLists: {
    results: Array<{ entries: Array<{ code: string; isActive: boolean }> }>;
  };
};

export type UseCurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type UseCurrentUserQuery = {
  currentUser: {
    id: string;
    username: string;
    permissions: Array<Permission>;
    settings: Array<{ key: string; value: unknown }>;
  };
};

export type UpdateUserSettingMutationVariables = Exact<{
  data: UpdateUserSettingInput;
}>;

export type UpdateUserSettingMutation = {
  updateUserSetting: { key: string; value: unknown };
};

export type UseSettingQueryVariables = Exact<{ [key: string]: never }>;

export type UseSettingQuery = {
  instanceSettings: Array<{ key: string; value: unknown }>;
};

export type AdminCodeListsQueryVariables = Exact<{
  filter?: InputMaybe<Scalars["String"]["input"]>;
  lang?: InputMaybe<Language>;
  page?: InputMaybe<Scalars["Int"]["input"]>;
  perPage?: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type AdminCodeListsQuery = {
  codeLists: {
    numPages: number;
    results: Array<{
      cliId: string;
      readOnly: boolean;
      bezeichnung: {
        de?: string | null;
        fr?: string | null;
        it?: string | null;
      };
    }>;
  };
};

export type UpdateCodeListMutationVariables = Exact<{
  data: UpdateCodeListInput;
}>;

export type UpdateCodeListMutation = { updateCodeList: { cliId: string } };

export type CreateCodeListEntryMutationVariables = Exact<{
  data: CreateCodeListEntryInput;
}>;

export type CreateCodeListEntryMutation = {
  createCodeListEntry:
    | { __typename: "CodeListEntry" }
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      };
};

export type UpdateCodeListEntryMutationVariables = Exact<{
  data: UpdateCodeListEntryInput;
}>;

export type UpdateCodeListEntryMutation = {
  updateCodeListEntry:
    | { __typename: "CodeListEntry"; code: string }
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      };
};

export type AdminCodeListQueryVariables = Exact<{
  cliIds: Array<Scalars["ID"]["input"]> | Scalars["ID"]["input"];
}>;

export type AdminCodeListQuery = {
  codeLists: {
    results: Array<{
      cliId: string;
      readOnly: boolean;
      bezeichnung: {
        de?: string | null;
        fr?: string | null;
        it?: string | null;
      };
      entries: Array<{
        code: string;
        sortKey?: number | null;
        isActive: boolean;
        bezeichnung: {
          de?: string | null;
          fr?: string | null;
          it?: string | null;
        };
      }>;
    }>;
  };
};

export type UpdateTranslationMutationVariables = Exact<{
  data: UpdateTranslationInput;
}>;

export type UpdateTranslationMutation = { updateTranslation: string };

export type UserFragment = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName?: RoleName | null;
  isSachbearbeitung: boolean;
};

export type UsersQueryVariables = Exact<{ [key: string]: never }>;

export type UsersQuery = {
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleName?: RoleName | null;
    isSachbearbeitung: boolean;
  }>;
};

export type CreateUserMutationVariables = Exact<{
  data: CreateUserInput;
}>;

export type CreateUserMutation = {
  user:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        roleName?: RoleName | null;
        isSachbearbeitung: boolean;
      };
};

export type UpdateUserMutationVariables = Exact<{
  data: UpdateUserInput;
}>;

export type UpdateUserMutation = {
  user:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        roleName?: RoleName | null;
        isSachbearbeitung: boolean;
      };
};

export type DashboardReportConfigsQueryVariables = Exact<{
  [key: string]: never;
}>;

export type DashboardReportConfigsQuery = {
  reportConfigurations: Array<{
    reportId: string;
    title: string;
    params: Array<{ name: string; paramType: ParamType }>;
  }>;
};

export type DashboardStatisticQueryVariables = Exact<{
  stichtag: Scalars["Date"]["input"];
}>;

export type DashboardStatisticQuery = {
  dashboardStatistic: {
    standortTypen: Array<{ typ: StandortTyp; count: number }>;
    beurteilungen: Array<{ beurteilungGruppe: string; count: number }>;
    geschaefte: Array<{ faelligkeit: FaelligkeitStatus; count: number }>;
  };
};

export type PoolVflzQueryVariables = Exact<{
  page: Scalars["Int"]["input"];
  perPage?: InputMaybe<Scalars["Int"]["input"]>;
  poolId: Scalars["ID"]["input"];
}>;

export type PoolVflzQuery = {
  pool: {
    bezeichnung?: string | null;
    standorte: {
      numPages: number;
      numResultsTotal: number;
      results: Array<{
        vflId: string;
        vflzId: string;
        bezeichnung?: string | null;
        combinedId: string;
        beurteilung?: { kbsInfo?: { color: string } | null } | null;
      }>;
    };
  };
};

export type RemoveFromPoolMutationVariables = Exact<{
  poolId: Scalars["ID"]["input"];
  vflId: Scalars["ID"]["input"];
}>;

export type RemoveFromPoolMutation = { removeFromPool: { poolId: string } };

export type PoolQueryVariables = Exact<{
  poolId: Scalars["ID"]["input"];
}>;

export type PoolQuery = {
  pool: {
    poolId: string;
    bezeichnung?: string | null;
    bemerkungen?: string | null;
  };
};

export type DeletePoolMutationVariables = Exact<{
  poolId: Scalars["ID"]["input"];
}>;

export type DeletePoolMutation = { deletePool: string };

export type UpdatePoolMutationVariables = Exact<{
  data: UpdatePoolInfoInput;
}>;

export type UpdatePoolMutation = {
  updatePoolInfo:
    | { __typename: "Pool" }
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      };
};

export type FilterPoolsQueryVariables = Exact<{
  filter?: InputMaybe<Scalars["String"]["input"]>;
  page?: InputMaybe<Scalars["Int"]["input"]>;
  perPage?: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type FilterPoolsQuery = {
  pools: {
    numPages: number;
    numResultsTotal: number;
    results: Array<{
      poolId: string;
      bezeichnung?: string | null;
      standorte: { numResultsTotal: number };
    }>;
  };
};

export type ValidateSearchQueryVariables = Exact<{
  query: Scalars["String"]["input"];
}>;

export type ValidateSearchQuery = {
  validateSearchQuery?: {
    message: string;
    problemCode: ProblemCodeEnum;
    field: string;
    messageCode?: string | null;
    messageArgs?: unknown | null;
  } | null;
};

export type AutosuggestSearchQueryVariables = Exact<{
  input: Scalars["String"]["input"];
  pos: Scalars["Int"]["input"];
  lang: Language;
}>;

export type AutosuggestSearchQuery = {
  autosuggestSearchQuery: Array<{
    category?: SearchFieldCategory | null;
    fieldType?: FieldType | null;
    type: AutoSuggestType;
    value: string;
  }>;
};

export type SearchOptionsQueryVariables = Exact<{ [key: string]: never }>;

export type SearchOptionsQuery = {
  gemeinden: Array<{
    bfsNummer?: number | null;
    gemeinde: string;
    hGemId: string;
    label: string;
  }>;
  kbsInfos: Array<{ beurteilung: string; belastet: boolean }>;
};

export type TextSearchQueryVariables = Exact<{
  filters?: InputMaybe<Array<SearchFilter> | SearchFilter>;
  query: Scalars["String"]["input"];
  lang: Language;
}>;

export type TextSearchQuery = {
  search: {
    graph: {
      results: Array<{
        combinedId: string;
        vflzId: string;
        bezeichnung?: string | null;
        beurteilung?: { kbsInfo?: { color: string } | null } | null;
        gemeinde?: { gemeinde: string } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      }>;
    };
  };
};

export type UpdateUserPasswordMutationVariables = Exact<{
  data: UpdateCurrentUserPasswordInput;
}>;

export type UpdateUserPasswordMutation = {
  updateCurrentUserPassword?: {
    __typename: "ProblemGroup";
    problems: Array<{
      field: string;
      problemCode: ProblemCodeEnum;
      message: string;
    }>;
  } | null;
};

export type VflzBasedataFragment = {
  bezeichnung?: string | null;
  deponietyp?: string | null;
  flaeche?: number | null;
  flugplatz?: string | null;
  flurname?: string | null;
  inBetrieb?: boolean | null;
  ktu?: string | null;
  lang: Language;
  nachsorge?: boolean | null;
  ort?: string | null;
  postleitzahl?: string | null;
  strasse?: string | null;
  vftyp: string;
  vftypEnum: StandortTyp;
  zentroid?: GeoJSONPoint | null;
  bemerkungDatenimport?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  bemerkungStandort?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  gemeinde?: {
    displayValue: string;
    hGemId: string;
    kanton?: string | null;
  } | null;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
  zeitraum?: {
    von?: string | null;
    bis?: string | null;
    vonjahr: boolean;
    bisjahr: boolean;
    bisheute: boolean;
  } | null;
};

export type VflzAblagerungenFragment = {
  ablagerungen: Array<{
    intaId: string;
    tiefe?: string | null;
    volKompartiment?: number | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    kompartimentStoffklassen: Array<{
      kkskId: string;
      stoffklasse?: string | null;
      teilvol?: number | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      kompartimentStoffgruppen: Array<{
        kksgId: string;
        stoffgruppe?: string | null;
        teilvol?: number | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      }>;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
    }>;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
    } | null;
  }>;
};

type VflzBasisBetrieb_Betrieb_Fragment = {
  intbId: string;
  beurteilung?: string | null;
  brancheAsw?: string | null;
  brancheNoga?: string | null;
  eva?: string | null;
  firmaName?: string | null;
  firmaOrt?: string | null;
  firmaPlz?: string | null;
  firmaStrasse?: string | null;
  groesse?: number | null;
  mobileStoffe?: boolean | null;
  relevant?: boolean | null;
  untersuchungsStand?: string | null;
  zentroid?: GeoJSONPoint | null;
  begruendungBewertung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  bemerkung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  erfassungMutation?: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  } | null;
  zeitraum?: {
    von?: string | null;
    vonjahr: boolean;
    bis?: string | null;
    bisjahr: boolean;
    bisheute: boolean;
    genauigkeitVon?: string | null;
    genauigkeitBis?: string | null;
  } | null;
};

type VflzBasisBetrieb_Schiessanlage_Fragment = {
  intbId: string;
  beurteilung?: string | null;
  brancheAsw?: string | null;
  brancheNoga?: string | null;
  eva?: string | null;
  firmaName?: string | null;
  firmaOrt?: string | null;
  firmaPlz?: string | null;
  firmaStrasse?: string | null;
  groesse?: number | null;
  mobileStoffe?: boolean | null;
  relevant?: boolean | null;
  untersuchungsStand?: string | null;
  zentroid?: GeoJSONPoint | null;
  begruendungBewertung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  bemerkung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  erfassungMutation?: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  } | null;
  zeitraum?: {
    von?: string | null;
    vonjahr: boolean;
    bis?: string | null;
    bisjahr: boolean;
    bisheute: boolean;
    genauigkeitVon?: string | null;
    genauigkeitBis?: string | null;
  } | null;
};

export type VflzBasisBetriebFragment =
  VflzBasisBetrieb_Betrieb_Fragment | VflzBasisBetrieb_Schiessanlage_Fragment;

export type VflzBetriebeFragment = {
  betriebe: Array<{
    intbId: string;
    beurteilung?: string | null;
    brancheAsw?: string | null;
    brancheNoga?: string | null;
    eva?: string | null;
    firmaName?: string | null;
    firmaOrt?: string | null;
    firmaPlz?: string | null;
    firmaStrasse?: string | null;
    groesse?: number | null;
    mobileStoffe?: boolean | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    zentroid?: GeoJSONPoint | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
  schiessanlagen: Array<{
    hatKugelfang?: boolean | null;
    scheibenzahl?: number | null;
    schusszahl?: number | null;
    typ?: string | null;
    intbId: string;
    beurteilung?: string | null;
    brancheAsw?: string | null;
    brancheNoga?: string | null;
    eva?: string | null;
    firmaName?: string | null;
    firmaOrt?: string | null;
    firmaPlz?: string | null;
    firmaStrasse?: string | null;
    groesse?: number | null;
    mobileStoffe?: boolean | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    zentroid?: GeoJSONPoint | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
};

export type VflzUnfaelleFragment = {
  unfaelle: Array<{
    intuId: string;
    name?: string | null;
    zeitpunkt?: string | null;
    zeitpunktjahr: boolean;
    genauigkeitZeitpunkt?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    unfallstoffe: Array<{
      inumId: string;
      ausgelaufen?: number | null;
      stoff?: string | null;
      zurueckgewonnen?: number | null;
      stoffmng?: number | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
  }>;
};

export type VflzKinderspielplaetzeGruenflaechenFragment = {
  kinderspielplaetzeGruenflaechen: Array<{
    intkId: string;
    belastungUeberSanierungswert?: boolean | null;
    altersstufenKinder: Array<string>;
    eigentumsform?: string | null;
    eva?: string | null;
    name?: string | null;
    ort?: string | null;
    plz?: string | null;
    strasse?: string | null;
    kinderspielplatzGruenflacheTyp?: string | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    beurteilung?: string | null;
    zentroid?: GeoJSONPoint | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
};

export type VflzPfasFragment = {
  pfas: Array<{
    intpId: string;
    beschreibungenDetail?: string | null;
    beurteilung?: string | null;
    branche?: string | null;
    mengeKonzentrat?: number | null;
    mengeSchaumgemisch?: number | null;
    pfasTyp?: string | null;
    pfasHaltigeLoeschmittel: Array<string>;
    pfasLoeschmittel?: boolean | null;
    pfasFreieLoeschmittel: Array<string>;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    name?: string | null;
    ort?: string | null;
    plz?: string | null;
    strasse?: string | null;
    eva?: string | null;
    zentroid?: GeoJSONPoint | null;
    loeschschaumEinsatz: Array<{
      intpLoeschschaumEinsatzId: string;
      loeschschaumEinsatz: string;
      haeufigkeitNutzung?: string | null;
    }>;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzUmfeldFragment = {
  durchlaessigkeit?: string | null;
  gwsBereich?: string | null;
  gwsZone?: string | null;
  karstgeb?: string | null;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
};

export type VflzGrundwasserFragment = {
  grundwasser: Array<{
    gwasId: string;
    relativeLage?: string | null;
    flurabstand?: number | null;
    nutzung?: string | null;
    distanz?: number | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzOberflaechenGewaesserFragment = {
  oberflaechenGewaesser: Array<{
    ogwId: string;
    artGewaesser?: string | null;
    bauGewaesser?: string | null;
    relativeLage?: string | null;
    distanz?: number | null;
    name?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzUmweltFragment = {
  bemerkungUmwelt?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
};

export type VflzUmweltStoffeFragment = {
  umweltStoffe: Array<{
    stoffeId: string;
    beurteilung?: string | null;
    gefaehrdeteBereiche?: string | null;
    stoff?: string | null;
    stoffGruppe?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzNutzungenBodenFragment = {
  nutzungenBoden: Array<{
    nuboId: string;
    nutzungsart?: string | null;
    aktuelleNutzung?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzUmweltschaedenFragment = {
  umweltschaeden: Array<{
    vfusId: string;
    artSchaden?: string | null;
    schaeden?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzEinzelereignisseFragment = {
  einzelereignisse: Array<{
    veenId: string;
    einzelereignis?: string | null;
    datum?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzDataFormFragment = {
  vflzId: string;
  isCurrent: boolean;
  bezeichnung?: string | null;
  deponietyp?: string | null;
  flaeche?: number | null;
  flugplatz?: string | null;
  flurname?: string | null;
  inBetrieb?: boolean | null;
  ktu?: string | null;
  lang: Language;
  nachsorge?: boolean | null;
  ort?: string | null;
  postleitzahl?: string | null;
  strasse?: string | null;
  vftyp: string;
  vftypEnum: StandortTyp;
  zentroid?: GeoJSONPoint | null;
  durchlaessigkeit?: string | null;
  gwsBereich?: string | null;
  gwsZone?: string | null;
  karstgeb?: string | null;
  bemerkungDatenimport?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  bemerkungStandort?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  gemeinde?: {
    displayValue: string;
    hGemId: string;
    kanton?: string | null;
  } | null;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
  zeitraum?: {
    von?: string | null;
    bis?: string | null;
    vonjahr: boolean;
    bisjahr: boolean;
    bisheute: boolean;
  } | null;
  ablagerungen: Array<{
    intaId: string;
    tiefe?: string | null;
    volKompartiment?: number | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    kompartimentStoffklassen: Array<{
      kkskId: string;
      stoffklasse?: string | null;
      teilvol?: number | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      kompartimentStoffgruppen: Array<{
        kksgId: string;
        stoffgruppe?: string | null;
        teilvol?: number | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      }>;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
    }>;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
    } | null;
  }>;
  betriebe: Array<{
    intbId: string;
    beurteilung?: string | null;
    brancheAsw?: string | null;
    brancheNoga?: string | null;
    eva?: string | null;
    firmaName?: string | null;
    firmaOrt?: string | null;
    firmaPlz?: string | null;
    firmaStrasse?: string | null;
    groesse?: number | null;
    mobileStoffe?: boolean | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    zentroid?: GeoJSONPoint | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
  schiessanlagen: Array<{
    hatKugelfang?: boolean | null;
    scheibenzahl?: number | null;
    schusszahl?: number | null;
    typ?: string | null;
    intbId: string;
    beurteilung?: string | null;
    brancheAsw?: string | null;
    brancheNoga?: string | null;
    eva?: string | null;
    firmaName?: string | null;
    firmaOrt?: string | null;
    firmaPlz?: string | null;
    firmaStrasse?: string | null;
    groesse?: number | null;
    mobileStoffe?: boolean | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    zentroid?: GeoJSONPoint | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
  unfaelle: Array<{
    intuId: string;
    name?: string | null;
    zeitpunkt?: string | null;
    zeitpunktjahr: boolean;
    genauigkeitZeitpunkt?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    unfallstoffe: Array<{
      inumId: string;
      ausgelaufen?: number | null;
      stoff?: string | null;
      zurueckgewonnen?: number | null;
      stoffmng?: number | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
  }>;
  kinderspielplaetzeGruenflaechen: Array<{
    intkId: string;
    belastungUeberSanierungswert?: boolean | null;
    altersstufenKinder: Array<string>;
    eigentumsform?: string | null;
    eva?: string | null;
    name?: string | null;
    ort?: string | null;
    plz?: string | null;
    strasse?: string | null;
    kinderspielplatzGruenflacheTyp?: string | null;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    beurteilung?: string | null;
    zentroid?: GeoJSONPoint | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
  }>;
  pfas: Array<{
    intpId: string;
    beschreibungenDetail?: string | null;
    beurteilung?: string | null;
    branche?: string | null;
    mengeKonzentrat?: number | null;
    mengeSchaumgemisch?: number | null;
    pfasTyp?: string | null;
    pfasHaltigeLoeschmittel: Array<string>;
    pfasLoeschmittel?: boolean | null;
    pfasFreieLoeschmittel: Array<string>;
    relevant?: boolean | null;
    untersuchungsStand?: string | null;
    name?: string | null;
    ort?: string | null;
    plz?: string | null;
    strasse?: string | null;
    eva?: string | null;
    zentroid?: GeoJSONPoint | null;
    loeschschaumEinsatz: Array<{
      intpLoeschschaumEinsatzId: string;
      loeschschaumEinsatz: string;
      haeufigkeitNutzung?: string | null;
    }>;
    zeitraum?: {
      von?: string | null;
      vonjahr: boolean;
      bis?: string | null;
      bisjahr: boolean;
      bisheute: boolean;
      genauigkeitVon?: string | null;
      genauigkeitBis?: string | null;
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  grundwasser: Array<{
    gwasId: string;
    relativeLage?: string | null;
    flurabstand?: number | null;
    nutzung?: string | null;
    distanz?: number | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  oberflaechenGewaesser: Array<{
    ogwId: string;
    artGewaesser?: string | null;
    bauGewaesser?: string | null;
    relativeLage?: string | null;
    distanz?: number | null;
    name?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  bemerkungUmwelt?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  umweltStoffe: Array<{
    stoffeId: string;
    beurteilung?: string | null;
    gefaehrdeteBereiche?: string | null;
    stoff?: string | null;
    stoffGruppe?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  nutzungenBoden: Array<{
    nuboId: string;
    nutzungsart?: string | null;
    aktuelleNutzung?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  umweltschaeden: Array<{
    vfusId: string;
    artSchaden?: string | null;
    schaeden?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  einzelereignisse: Array<{
    veenId: string;
    einzelereignis?: string | null;
    datum?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type BemErfassungMutationFragment = {
  bem: string;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
};

export type ValidateVflzDataQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type ValidateVflzDataQuery = {
  validateVflzData:
    | { __typename: "ProblemGroup" }
    | {
        __typename: "ValidatedVflzData";
        ort: Array<string>;
        postleitzahl: Array<string>;
        flugplatz: Array<string>;
        gwsBereich: Array<string>;
        gwsZone: Array<string>;
        gemeinde: Array<{
          __typename: "Gemeinde";
          displayValue: string;
          hGemId: string;
          kanton?: string | null;
        }>;
      };
};

export type VflzDataQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzDataQuery = {
  vflz: {
    datRechtskraft?: string | null;
    datPublizieren?: string | null;
    isCurrent: boolean;
    message: string;
    readOnly: boolean;
    vftypEnum: StandortTyp;
    vflzId: string;
    combinedId: string;
    vflId: string;
    bezeichnung?: string | null;
    deponietyp?: string | null;
    flaeche?: number | null;
    flugplatz?: string | null;
    flurname?: string | null;
    inBetrieb?: boolean | null;
    ktu?: string | null;
    lang: Language;
    nachsorge?: boolean | null;
    ort?: string | null;
    postleitzahl?: string | null;
    strasse?: string | null;
    vftyp: string;
    zentroid?: GeoJSONPoint | null;
    durchlaessigkeit?: string | null;
    gwsBereich?: string | null;
    gwsZone?: string | null;
    karstgeb?: string | null;
    publizieren?: boolean | null;
    vflzCreatedDate?: string | null;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    bemerkungDatenimport?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    bemerkungStandort?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    gemeinde?: {
      displayValue: string;
      hGemId: string;
      kanton?: string | null;
      gemeinde: string;
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    zeitraum?: {
      von?: string | null;
      bis?: string | null;
      vonjahr: boolean;
      bisjahr: boolean;
      bisheute: boolean;
    } | null;
    ablagerungen: Array<{
      intaId: string;
      tiefe?: string | null;
      volKompartiment?: number | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      kompartimentStoffklassen: Array<{
        kkskId: string;
        stoffklasse?: string | null;
        teilvol?: number | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
        kompartimentStoffgruppen: Array<{
          kksgId: string;
          stoffgruppe?: string | null;
          teilvol?: number | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        zeitraum?: {
          von?: string | null;
          vonjahr: boolean;
          bis?: string | null;
          bisjahr: boolean;
          bisheute: boolean;
          genauigkeitVon?: string | null;
          genauigkeitBis?: string | null;
        } | null;
      }>;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
      } | null;
    }>;
    betriebe: Array<{
      intbId: string;
      beurteilung?: string | null;
      brancheAsw?: string | null;
      brancheNoga?: string | null;
      eva?: string | null;
      firmaName?: string | null;
      firmaOrt?: string | null;
      firmaPlz?: string | null;
      firmaStrasse?: string | null;
      groesse?: number | null;
      mobileStoffe?: boolean | null;
      relevant?: boolean | null;
      untersuchungsStand?: string | null;
      zentroid?: GeoJSONPoint | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      begruendungBewertung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
    }>;
    schiessanlagen: Array<{
      hatKugelfang?: boolean | null;
      scheibenzahl?: number | null;
      schusszahl?: number | null;
      typ?: string | null;
      intbId: string;
      beurteilung?: string | null;
      brancheAsw?: string | null;
      brancheNoga?: string | null;
      eva?: string | null;
      firmaName?: string | null;
      firmaOrt?: string | null;
      firmaPlz?: string | null;
      firmaStrasse?: string | null;
      groesse?: number | null;
      mobileStoffe?: boolean | null;
      relevant?: boolean | null;
      untersuchungsStand?: string | null;
      zentroid?: GeoJSONPoint | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      begruendungBewertung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
    }>;
    unfaelle: Array<{
      intuId: string;
      name?: string | null;
      zeitpunkt?: string | null;
      zeitpunktjahr: boolean;
      genauigkeitZeitpunkt?: string | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      unfallstoffe: Array<{
        inumId: string;
        ausgelaufen?: number | null;
        stoff?: string | null;
        zurueckgewonnen?: number | null;
        stoffmng?: number | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      }>;
    }>;
    kinderspielplaetzeGruenflaechen: Array<{
      intkId: string;
      belastungUeberSanierungswert?: boolean | null;
      altersstufenKinder: Array<string>;
      eigentumsform?: string | null;
      eva?: string | null;
      name?: string | null;
      ort?: string | null;
      plz?: string | null;
      strasse?: string | null;
      kinderspielplatzGruenflacheTyp?: string | null;
      relevant?: boolean | null;
      untersuchungsStand?: string | null;
      beurteilung?: string | null;
      zentroid?: GeoJSONPoint | null;
      begruendungBewertung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
    }>;
    pfas: Array<{
      intpId: string;
      beschreibungenDetail?: string | null;
      beurteilung?: string | null;
      branche?: string | null;
      mengeKonzentrat?: number | null;
      mengeSchaumgemisch?: number | null;
      pfasTyp?: string | null;
      pfasHaltigeLoeschmittel: Array<string>;
      pfasLoeschmittel?: boolean | null;
      pfasFreieLoeschmittel: Array<string>;
      relevant?: boolean | null;
      untersuchungsStand?: string | null;
      name?: string | null;
      ort?: string | null;
      plz?: string | null;
      strasse?: string | null;
      eva?: string | null;
      zentroid?: GeoJSONPoint | null;
      loeschschaumEinsatz: Array<{
        intpLoeschschaumEinsatzId: string;
        loeschschaumEinsatz: string;
        haeufigkeitNutzung?: string | null;
      }>;
      zeitraum?: {
        von?: string | null;
        vonjahr: boolean;
        bis?: string | null;
        bisjahr: boolean;
        bisheute: boolean;
        genauigkeitVon?: string | null;
        genauigkeitBis?: string | null;
      } | null;
      begruendungBewertung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      bemerkungDatenimport?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    grundwasser: Array<{
      gwasId: string;
      relativeLage?: string | null;
      flurabstand?: number | null;
      nutzung?: string | null;
      distanz?: number | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    oberflaechenGewaesser: Array<{
      ogwId: string;
      artGewaesser?: string | null;
      bauGewaesser?: string | null;
      relativeLage?: string | null;
      distanz?: number | null;
      name?: string | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    bemerkungUmwelt?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    umweltStoffe: Array<{
      stoffeId: string;
      beurteilung?: string | null;
      gefaehrdeteBereiche?: string | null;
      stoff?: string | null;
      stoffGruppe?: string | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    nutzungenBoden: Array<{
      nuboId: string;
      nutzungsart?: string | null;
      aktuelleNutzung?: string | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    umweltschaeden: Array<{
      vfusId: string;
      artSchaden?: string | null;
      schaeden?: string | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    einzelereignisse: Array<{
      veenId: string;
      einzelereignis?: string | null;
      datum?: string | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  };
};

export type UpdateVflzDataMutationVariables = Exact<{
  data: UpdateVflzDataInput;
}>;

export type UpdateVflzDataMutation = {
  updateVflzData:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        __typename: "Vflz";
        datRechtskraft?: string | null;
        datPublizieren?: string | null;
        isCurrent: boolean;
        message: string;
        readOnly: boolean;
        vftypEnum: StandortTyp;
        vflzId: string;
        combinedId: string;
        vflId: string;
        bezeichnung?: string | null;
        deponietyp?: string | null;
        flaeche?: number | null;
        flugplatz?: string | null;
        flurname?: string | null;
        inBetrieb?: boolean | null;
        ktu?: string | null;
        lang: Language;
        nachsorge?: boolean | null;
        ort?: string | null;
        postleitzahl?: string | null;
        strasse?: string | null;
        vftyp: string;
        zentroid?: GeoJSONPoint | null;
        durchlaessigkeit?: string | null;
        gwsBereich?: string | null;
        gwsZone?: string | null;
        karstgeb?: string | null;
        publizieren?: boolean | null;
        vflzCreatedDate?: string | null;
        teilstandorte: Array<{
          bezeichnung?: string | null;
          combinedId: string;
          vflzId: string;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        versionen: Array<{
          vflzId: string;
          datPublizieren?: string | null;
          publizieren?: boolean | null;
          message: string;
          vflzCreatedDate?: string | null;
          beurteilung?: {
            kbsInfo?: { belastet: boolean; color: string } | null;
          } | null;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        bemerkungDatenimport?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        bemerkungStandort?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        gemeinde?: {
          displayValue: string;
          hGemId: string;
          kanton?: string | null;
          gemeinde: string;
        } | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
        zeitraum?: {
          von?: string | null;
          bis?: string | null;
          vonjahr: boolean;
          bisjahr: boolean;
          bisheute: boolean;
        } | null;
        ablagerungen: Array<{
          intaId: string;
          tiefe?: string | null;
          volKompartiment?: number | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
          kompartimentStoffklassen: Array<{
            kkskId: string;
            stoffklasse?: string | null;
            teilvol?: number | null;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
            kompartimentStoffgruppen: Array<{
              kksgId: string;
              stoffgruppe?: string | null;
              teilvol?: number | null;
              erfassungMutation: {
                erfassungsDatum?: string | null;
                erfasser?: string | null;
                mutationsDatum?: string | null;
                mutierer?: string | null;
              };
            }>;
            zeitraum?: {
              von?: string | null;
              vonjahr: boolean;
              bis?: string | null;
              bisjahr: boolean;
              bisheute: boolean;
              genauigkeitVon?: string | null;
              genauigkeitBis?: string | null;
            } | null;
          }>;
          zeitraum?: {
            von?: string | null;
            vonjahr: boolean;
            bis?: string | null;
            bisjahr: boolean;
            bisheute: boolean;
          } | null;
        }>;
        betriebe: Array<{
          intbId: string;
          beurteilung?: string | null;
          brancheAsw?: string | null;
          brancheNoga?: string | null;
          eva?: string | null;
          firmaName?: string | null;
          firmaOrt?: string | null;
          firmaPlz?: string | null;
          firmaStrasse?: string | null;
          groesse?: number | null;
          mobileStoffe?: boolean | null;
          relevant?: boolean | null;
          untersuchungsStand?: string | null;
          zentroid?: GeoJSONPoint | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          begruendungBewertung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
          zeitraum?: {
            von?: string | null;
            vonjahr: boolean;
            bis?: string | null;
            bisjahr: boolean;
            bisheute: boolean;
            genauigkeitVon?: string | null;
            genauigkeitBis?: string | null;
          } | null;
        }>;
        schiessanlagen: Array<{
          hatKugelfang?: boolean | null;
          scheibenzahl?: number | null;
          schusszahl?: number | null;
          typ?: string | null;
          intbId: string;
          beurteilung?: string | null;
          brancheAsw?: string | null;
          brancheNoga?: string | null;
          eva?: string | null;
          firmaName?: string | null;
          firmaOrt?: string | null;
          firmaPlz?: string | null;
          firmaStrasse?: string | null;
          groesse?: number | null;
          mobileStoffe?: boolean | null;
          relevant?: boolean | null;
          untersuchungsStand?: string | null;
          zentroid?: GeoJSONPoint | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          begruendungBewertung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
          zeitraum?: {
            von?: string | null;
            vonjahr: boolean;
            bis?: string | null;
            bisjahr: boolean;
            bisheute: boolean;
            genauigkeitVon?: string | null;
            genauigkeitBis?: string | null;
          } | null;
        }>;
        unfaelle: Array<{
          intuId: string;
          name?: string | null;
          zeitpunkt?: string | null;
          zeitpunktjahr: boolean;
          genauigkeitZeitpunkt?: string | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
          unfallstoffe: Array<{
            inumId: string;
            ausgelaufen?: number | null;
            stoff?: string | null;
            zurueckgewonnen?: number | null;
            stoffmng?: number | null;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          }>;
        }>;
        kinderspielplaetzeGruenflaechen: Array<{
          intkId: string;
          belastungUeberSanierungswert?: boolean | null;
          altersstufenKinder: Array<string>;
          eigentumsform?: string | null;
          eva?: string | null;
          name?: string | null;
          ort?: string | null;
          plz?: string | null;
          strasse?: string | null;
          kinderspielplatzGruenflacheTyp?: string | null;
          relevant?: boolean | null;
          untersuchungsStand?: string | null;
          beurteilung?: string | null;
          zentroid?: GeoJSONPoint | null;
          begruendungBewertung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
          zeitraum?: {
            von?: string | null;
            vonjahr: boolean;
            bis?: string | null;
            bisjahr: boolean;
            bisheute: boolean;
            genauigkeitVon?: string | null;
            genauigkeitBis?: string | null;
          } | null;
        }>;
        pfas: Array<{
          intpId: string;
          beschreibungenDetail?: string | null;
          beurteilung?: string | null;
          branche?: string | null;
          mengeKonzentrat?: number | null;
          mengeSchaumgemisch?: number | null;
          pfasTyp?: string | null;
          pfasHaltigeLoeschmittel: Array<string>;
          pfasLoeschmittel?: boolean | null;
          pfasFreieLoeschmittel: Array<string>;
          relevant?: boolean | null;
          untersuchungsStand?: string | null;
          name?: string | null;
          ort?: string | null;
          plz?: string | null;
          strasse?: string | null;
          eva?: string | null;
          zentroid?: GeoJSONPoint | null;
          loeschschaumEinsatz: Array<{
            intpLoeschschaumEinsatzId: string;
            loeschschaumEinsatz: string;
            haeufigkeitNutzung?: string | null;
          }>;
          zeitraum?: {
            von?: string | null;
            vonjahr: boolean;
            bis?: string | null;
            bisjahr: boolean;
            bisheute: boolean;
            genauigkeitVon?: string | null;
            genauigkeitBis?: string | null;
          } | null;
          begruendungBewertung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          bemerkungDatenimport?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        grundwasser: Array<{
          gwasId: string;
          relativeLage?: string | null;
          flurabstand?: number | null;
          nutzung?: string | null;
          distanz?: number | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        oberflaechenGewaesser: Array<{
          ogwId: string;
          artGewaesser?: string | null;
          bauGewaesser?: string | null;
          relativeLage?: string | null;
          distanz?: number | null;
          name?: string | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        bemerkungUmwelt?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        umweltStoffe: Array<{
          stoffeId: string;
          beurteilung?: string | null;
          gefaehrdeteBereiche?: string | null;
          stoff?: string | null;
          stoffGruppe?: string | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        nutzungenBoden: Array<{
          nuboId: string;
          nutzungsart?: string | null;
          aktuelleNutzung?: string | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        umweltschaeden: Array<{
          vfusId: string;
          artSchaden?: string | null;
          schaeden?: string | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        einzelereignisse: Array<{
          veenId: string;
          einzelereignis?: string | null;
          datum?: string | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        beurteilung?: {
          beurteilung?: string | null;
          kbsInfo?: { color: string } | null;
        } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      };
};

export type KbsInfosQueryVariables = Exact<{ [key: string]: never }>;

export type KbsInfosQuery = {
  kbsInfos: Array<{ beurteilung: string; belastet: boolean; color: string }>;
};

export type VflzBeurteilungFragment = {
  bearbeitungsStand?: string | null;
  datPublizieren?: string | null;
  datRechtskraft?: string | null;
  isCurrent: boolean;
  publizieren?: boolean | null;
  rechtskraft?: boolean | null;
  untersuchungsStand?: string | null;
  beurteilung?: {
    beurteilung?: string | null;
    handlungsbedarf?: string | null;
    rechtlicherBezug?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    kbsInfo?: { belastet: boolean } | null;
  } | null;
  begruendungBewertung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
  evaluationStatus: { belastet: boolean };
};

export type VflzPrioUntersuchungFragment = {
  begruendungPrioUntersuchungsbedarf?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  beurteilung?: { prioUntersuch?: string | null } | null;
};

export type VflzSanierungszieleFragment = {
  begruendungPrioSanierungsbedarf?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  beurteilung?: { prioSanier?: string | null } | null;
  sanierungsziele: Array<{
    saniId: string;
    sanierungsziel?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzMassnahmenFragment = {
  massnahmen: Array<{
    angMassnahme?: string | null;
    datMassnahme?: string | null;
    massId: string;
    massnahme?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzEvaluationFormFragment = {
  vflzId: string;
  isCurrent: boolean;
  readOnly: boolean;
  bearbeitungsStand?: string | null;
  datPublizieren?: string | null;
  datRechtskraft?: string | null;
  publizieren?: boolean | null;
  rechtskraft?: boolean | null;
  untersuchungsStand?: string | null;
  beurteilung?: {
    beurteilung?: string | null;
    handlungsbedarf?: string | null;
    rechtlicherBezug?: string | null;
    prioUntersuch?: string | null;
    prioSanier?: string | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    kbsInfo?: { belastet: boolean } | null;
  } | null;
  begruendungBewertung?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  erfassungMutation: {
    erfassungsDatum?: string | null;
    erfasser?: string | null;
    mutationsDatum?: string | null;
    mutierer?: string | null;
  };
  evaluationStatus: { belastet: boolean };
  begruendungPrioUntersuchungsbedarf?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  begruendungPrioSanierungsbedarf?: {
    bem: string;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  } | null;
  sanierungsziele: Array<{
    saniId: string;
    sanierungsziel?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
  massnahmen: Array<{
    angMassnahme?: string | null;
    datMassnahme?: string | null;
    massId: string;
    massnahme?: string | null;
    bemerkung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
  }>;
};

export type VflzEvaluationQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzEvaluationQuery = {
  vflz: {
    vflzId: string;
    isCurrent: boolean;
    readOnly: boolean;
    combinedId: string;
    vflId: string;
    bearbeitungsStand?: string | null;
    datPublizieren?: string | null;
    datRechtskraft?: string | null;
    publizieren?: boolean | null;
    rechtskraft?: boolean | null;
    untersuchungsStand?: string | null;
    bezeichnung?: string | null;
    vflzCreatedDate?: string | null;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      handlungsbedarf?: string | null;
      rechtlicherBezug?: string | null;
      prioUntersuch?: string | null;
      prioSanier?: string | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
      kbsInfo?: { belastet: boolean; color: string } | null;
    } | null;
    begruendungBewertung?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    erfassungMutation: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    };
    evaluationStatus: {
      belastet: boolean;
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
    begruendungPrioUntersuchungsbedarf?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    begruendungPrioSanierungsbedarf?: {
      bem: string;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    } | null;
    sanierungsziele: Array<{
      saniId: string;
      sanierungsziel?: string | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    massnahmen: Array<{
      angMassnahme?: string | null;
      datMassnahme?: string | null;
      massId: string;
      massnahme?: string | null;
      bemerkung?: {
        bem: string;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
      } | null;
      erfassungMutation: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      };
    }>;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
  };
};

export type UpdateVflzEvaluationMutationVariables = Exact<{
  data: UpdateVflzEvaluationInput;
}>;

export type UpdateVflzEvaluationMutation = {
  updateVflzEvaluation:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        __typename: "Vflz";
        vflzId: string;
        isCurrent: boolean;
        readOnly: boolean;
        combinedId: string;
        vflId: string;
        bearbeitungsStand?: string | null;
        datPublizieren?: string | null;
        datRechtskraft?: string | null;
        publizieren?: boolean | null;
        rechtskraft?: boolean | null;
        untersuchungsStand?: string | null;
        bezeichnung?: string | null;
        vflzCreatedDate?: string | null;
        teilstandorte: Array<{
          bezeichnung?: string | null;
          combinedId: string;
          vflzId: string;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        versionen: Array<{
          vflzId: string;
          datPublizieren?: string | null;
          publizieren?: boolean | null;
          message: string;
          vflzCreatedDate?: string | null;
          beurteilung?: {
            kbsInfo?: { belastet: boolean; color: string } | null;
          } | null;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        beurteilung?: {
          beurteilung?: string | null;
          handlungsbedarf?: string | null;
          rechtlicherBezug?: string | null;
          prioUntersuch?: string | null;
          prioSanier?: string | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
          kbsInfo?: { belastet: boolean; color: string } | null;
        } | null;
        begruendungBewertung?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        erfassungMutation: {
          erfassungsDatum?: string | null;
          erfasser?: string | null;
          mutationsDatum?: string | null;
          mutierer?: string | null;
        };
        evaluationStatus: {
          belastet: boolean;
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
        begruendungPrioUntersuchungsbedarf?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        begruendungPrioSanierungsbedarf?: {
          bem: string;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        } | null;
        sanierungsziele: Array<{
          saniId: string;
          sanierungsziel?: string | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        massnahmen: Array<{
          angMassnahme?: string | null;
          datMassnahme?: string | null;
          massId: string;
          massnahme?: string | null;
          bemerkung?: {
            bem: string;
            erfassungMutation: {
              erfassungsDatum?: string | null;
              erfasser?: string | null;
              mutationsDatum?: string | null;
              mutierer?: string | null;
            };
          } | null;
          erfassungMutation: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          };
        }>;
        gemeinde?: { gemeinde: string; kanton?: string | null } | null;
      };
};

export type VflzGeoQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzGeoQuery = {
  vflz: {
    readOnly: boolean;
    vflzId: string;
    combinedId: string;
    vflId: string;
    zentroid?: GeoJSONPoint | null;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    vflgeo?: {
      geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
    } | null;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  };
};

export type UpdateVflzGeoMutationVariables = Exact<{
  data: UpdateVflzGeoInput;
}>;

export type UpdateVflzGeoMutation = {
  updateVflzGeo:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        __typename: "Vflz";
        isCurrent: boolean;
        readOnly: boolean;
        vflzId: string;
        combinedId: string;
        vflId: string;
        zentroid?: GeoJSONPoint | null;
        bezeichnung?: string | null;
        publizieren?: boolean | null;
        vflzCreatedDate?: string | null;
        vflgeo?: {
          geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null;
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
        } | null;
        teilstandorte: Array<{
          bezeichnung?: string | null;
          combinedId: string;
          vflzId: string;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        versionen: Array<{
          vflzId: string;
          datPublizieren?: string | null;
          publizieren?: boolean | null;
          message: string;
          vflzCreatedDate?: string | null;
          beurteilung?: {
            kbsInfo?: { belastet: boolean; color: string } | null;
          } | null;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        beurteilung?: {
          beurteilung?: string | null;
          kbsInfo?: { color: string } | null;
        } | null;
        gemeinde?: { gemeinde: string; kanton?: string | null } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      };
};

export type VflzOverviewQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
  withGeschaefte: Scalars["Boolean"]["input"];
}>;

export type VflzOverviewQuery = {
  vflz: {
    combinedId: string;
    vflId: string;
    vflzId: string;
    lang: Language;
    bearbeitungsStand?: string | null;
    untersuchungsStand?: string | null;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    zentroid?: GeoJSONPoint | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    parzellen: Array<{
      gbNummer: string;
      gemeinde?: { displayValue: string } | null;
      nummerierungsbereich?: { bezeichnung?: string | null } | null;
    }>;
    eigentum: Array<{
      parzellen: Array<string>;
      subjekt?: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      } | null;
      gemeinde?: { bfsNummer?: number | null; displayValue: string } | null;
      nummerierungsbereich?: { bezeichnung?: string | null } | null;
    }>;
    sonstigeBeteiligte: Array<{
      beteiligter: {
        subjekt: {
          subjId: string;
          vorname: string;
          name: string;
          taetigkeit: string;
        };
      };
    }>;
    geschaefte?: {
      numResultsTotal: number;
      results: Array<
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            dokument?: string | null;
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
        | {
            deletable: boolean;
            taskId: string;
            parentId?: string | null;
            type: TaskType;
            title: string;
            status: TaskStatus;
            startDatum: string;
            endDatum?: string | null;
            faelligkeitsDatum?: string | null;
            faelligkeitsStatus: FaelligkeitStatus;
            notiz?: string | null;
            sachbearbeitung: Array<{
              subjekt: { name: string; vorname: string };
            }>;
            vflz: {
              vflzId: string;
              combinedId: string;
              bezeichnung?: string | null;
            };
          }
      >;
    };
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    beteiligteStandort: Array<{
      beteiligter: {
        isSachbearbeiter: boolean;
        subjekt: { name: string; vorname: string };
      };
    }>;
    vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  };
};

export type VflzMapQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzMapQuery = {
  vflz: {
    zentroid?: GeoJSONPoint | null;
    beurteilung?: { kbsInfo?: { color: string } | null } | null;
    vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
  };
};

export type SubjektFieldsFragment = {
  subjId: string;
  anrede?: string | null;
  hasStandorte: boolean;
  kategorien: Array<string>;
  kuerzel?: string | null;
  land?: string | null;
  name: string;
  ort: string;
  postleitzahl: string;
  strasse: string;
  taetigkeit: string;
  vorname: string;
  bemerkung?: { bem: string } | null;
  kontakte: Array<{ kontaktId: string; kontaktTyp: string; kontakt: string }>;
};

export type CreateSubjektMutationVariables = Exact<{
  data: CreateSubjektInput;
}>;

export type CreateSubjektMutation = {
  createSubjekt: {
    subjekt: {
      subjId: string;
      anrede?: string | null;
      hasStandorte: boolean;
      kategorien: Array<string>;
      kuerzel?: string | null;
      land?: string | null;
      name: string;
      ort: string;
      postleitzahl: string;
      strasse: string;
      taetigkeit: string;
      vorname: string;
      bemerkung?: { bem: string } | null;
      kontakte: Array<{
        kontaktId: string;
        kontaktTyp: string;
        kontakt: string;
      }>;
    };
    problemGroup: {
      __typename: "ProblemGroup";
      problems: Array<{
        field: string;
        problemCode: ProblemCodeEnum;
        message: string;
      }>;
    };
  };
};

export type UpdateSubjektMutationVariables = Exact<{
  data: UpdateSubjektInput;
}>;

export type UpdateSubjektMutation = {
  updateSubjekt: {
    subjekt: {
      subjId: string;
      anrede?: string | null;
      hasStandorte: boolean;
      kategorien: Array<string>;
      kuerzel?: string | null;
      land?: string | null;
      name: string;
      ort: string;
      postleitzahl: string;
      strasse: string;
      taetigkeit: string;
      vorname: string;
      bemerkung?: { bem: string } | null;
      kontakte: Array<{
        kontaktId: string;
        kontaktTyp: string;
        kontakt: string;
      }>;
    };
    problemGroup: {
      __typename: "ProblemGroup";
      problems: Array<{
        field: string;
        problemCode: ProblemCodeEnum;
        message: string;
      }>;
    };
  };
};

export type DeleteSubjektMutationVariables = Exact<{
  subjId: Scalars["ID"]["input"];
}>;

export type DeleteSubjektMutation = { deleteSubjekt: string };

export type SubjektQueryVariables = Exact<{
  subjId: Scalars["ID"]["input"];
}>;

export type SubjektQuery = {
  subjekt: {
    subjId: string;
    anrede?: string | null;
    hasStandorte: boolean;
    kategorien: Array<string>;
    kuerzel?: string | null;
    land?: string | null;
    name: string;
    ort: string;
    postleitzahl: string;
    strasse: string;
    taetigkeit: string;
    vorname: string;
    bemerkung?: { bem: string } | null;
    kontakte: Array<{ kontaktId: string; kontaktTyp: string; kontakt: string }>;
  };
};

export type SubjektFieldFragment = {
  subjId: string;
  vorname: string;
  name: string;
  taetigkeit: string;
};

export type SearchSubjekteQueryVariables = Exact<{
  query?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type SearchSubjekteQuery = {
  subjekte: {
    results: Array<{
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    }>;
  };
};

export type SachbearbeitungQueryVariables = Exact<{ [key: string]: never }>;

export type SachbearbeitungQuery = {
  subjekte: {
    results: Array<{
      subjId: string;
      vorname: string;
      name: string;
      user?: { id: string } | null;
    }>;
  };
};

export type SachbearbeitungFragment = {
  sachbearbeitung: Array<{
    betArtId: string;
    beteiligter: {
      betId: string;
      subjekt: { subjId: string; vorname: string; name: string };
    };
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
  }>;
};

export type SonstigeFragment = {
  sonstigeBeteiligte: Array<{
    betArtId: string;
    beziehungsart: string;
    beteiligter: {
      betId: string;
      subjekt: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      };
    };
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
  }>;
};

export type EigentumFragment = {
  eigentum: Array<{
    beziehungsart?: string | null;
    parzellen: Array<string>;
    status: EigentumStatus;
    erfassungMutation?: {
      erfassungsDatum?: string | null;
      erfasser?: string | null;
      mutationsDatum?: string | null;
      mutierer?: string | null;
    } | null;
    gemeinde?: { hGemId: string } | null;
    nummerierungsbereich?: { hNbId: string } | null;
    subjekt?: {
      subjId: string;
      vorname: string;
      name: string;
      taetigkeit: string;
    } | null;
  }>;
  gemeindenUndNummerierungsbereiche: Array<{
    gemeinde?: { hGemId: string; displayValue: string } | null;
    nummerierungsbereich?: {
      hNbId: string;
      bezeichnung?: string | null;
    } | null;
  }>;
};

export type VflzParticipantsLayoutQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzParticipantsLayoutQuery = {
  vflz: {
    readOnly: boolean;
    combinedId: string;
    vflId: string;
    zentroid?: GeoJSONPoint | null;
    vflzId: string;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    sachbearbeitung: Array<{
      betArtId: string;
      beteiligter: {
        betId: string;
        subjekt: { subjId: string; vorname: string; name: string };
      };
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
    }>;
    sonstigeBeteiligte: Array<{
      betArtId: string;
      beziehungsart: string;
      beteiligter: {
        betId: string;
        subjekt: {
          subjId: string;
          vorname: string;
          name: string;
          taetigkeit: string;
        };
      };
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
    }>;
    eigentum: Array<{
      beziehungsart?: string | null;
      parzellen: Array<string>;
      status: EigentumStatus;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
      gemeinde?: { hGemId: string } | null;
      nummerierungsbereich?: { hNbId: string } | null;
      subjekt?: {
        subjId: string;
        vorname: string;
        name: string;
        taetigkeit: string;
      } | null;
    }>;
    gemeindenUndNummerierungsbereiche: Array<{
      gemeinde?: { hGemId: string; displayValue: string } | null;
      nummerierungsbereich?: {
        hNbId: string;
        bezeichnung?: string | null;
      } | null;
    }>;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    vflgeo?: { geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  };
};

export type UpdateVflzBeteiligteMutationVariables = Exact<{
  data: UpdateVflzBeteiligteInput;
}>;

export type UpdateVflzBeteiligteMutation = {
  updateVflzBeteiligte:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        __typename: "Vflz";
        readOnly: boolean;
        combinedId: string;
        vflId: string;
        zentroid?: GeoJSONPoint | null;
        vflzId: string;
        bezeichnung?: string | null;
        publizieren?: boolean | null;
        isCurrent: boolean;
        vflzCreatedDate?: string | null;
        sachbearbeitung: Array<{
          betArtId: string;
          beteiligter: {
            betId: string;
            subjekt: { subjId: string; vorname: string; name: string };
          };
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
        }>;
        sonstigeBeteiligte: Array<{
          betArtId: string;
          beziehungsart: string;
          beteiligter: {
            betId: string;
            subjekt: {
              subjId: string;
              vorname: string;
              name: string;
              taetigkeit: string;
            };
          };
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
        }>;
        eigentum: Array<{
          beziehungsart?: string | null;
          parzellen: Array<string>;
          status: EigentumStatus;
          erfassungMutation?: {
            erfassungsDatum?: string | null;
            erfasser?: string | null;
            mutationsDatum?: string | null;
            mutierer?: string | null;
          } | null;
          gemeinde?: { hGemId: string } | null;
          nummerierungsbereich?: { hNbId: string } | null;
          subjekt?: {
            subjId: string;
            vorname: string;
            name: string;
            taetigkeit: string;
          } | null;
        }>;
        gemeindenUndNummerierungsbereiche: Array<{
          gemeinde?: { hGemId: string; displayValue: string } | null;
          nummerierungsbereich?: {
            hNbId: string;
            bezeichnung?: string | null;
          } | null;
        }>;
        teilstandorte: Array<{
          bezeichnung?: string | null;
          combinedId: string;
          vflzId: string;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        versionen: Array<{
          vflzId: string;
          datPublizieren?: string | null;
          publizieren?: boolean | null;
          message: string;
          vflzCreatedDate?: string | null;
          beurteilung?: {
            kbsInfo?: { belastet: boolean; color: string } | null;
          } | null;
          evaluationStatus: {
            deletedPreviously: boolean;
            deleteNow: boolean;
            publishedPreviously: boolean;
            publishNow: boolean;
          };
        }>;
        beurteilung?: {
          beurteilung?: string | null;
          kbsInfo?: { color: string } | null;
        } | null;
        vflgeo?: {
          geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null;
        } | null;
        gemeinde?: { gemeinde: string; kanton?: string | null } | null;
        evaluationStatus: {
          deletedPreviously: boolean;
          deleteNow: boolean;
          publishedPreviously: boolean;
          publishNow: boolean;
        };
      };
};

export type CreateTeilstandortMutationVariables = Exact<{
  data: CreateTeilstandortInput;
}>;

export type CreateTeilstandortMutation = {
  createTeilstandort:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | { __typename: "Vflz"; vflzId: string };
};

export type VflzSplitQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzSplitQuery = {
  vflz: {
    isCurrent: boolean;
    readOnly: boolean;
    bezeichnung?: string | null;
    combinedId: string;
    flugplatz?: string | null;
    ktu?: string | null;
    vftyp: string;
    vflzId: string;
    zentroid?: GeoJSONPoint | null;
    gemeinde?: {
      displayValue: string;
      hGemId: string;
      kanton?: string | null;
    } | null;
    vflgeo?: {
      geometry?: GeoJSONPoint | GeoJSONMultiPolygon | null;
      erfassungMutation?: {
        erfassungsDatum?: string | null;
        erfasser?: string | null;
        mutationsDatum?: string | null;
        mutierer?: string | null;
      } | null;
    } | null;
    beurteilung?: { kbsInfo?: { color: string } | null } | null;
  };
};

export type ValidateCreateTeilstandortQueryVariables = Exact<{
  data: ValidateCreateTeilstandortInput;
}>;

export type ValidateCreateTeilstandortQuery = {
  validateCreateTeilstandort:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        combinedId: Array<string>;
        flugplatz: Array<string>;
        gemeinde: Array<{
          __typename: "Gemeinde";
          displayValue: string;
          hGemId: string;
          kanton?: string | null;
        }>;
      };
};

export type VflzWorkflowLayoutQueryVariables = Exact<{
  vflzId: Scalars["ID"]["input"];
}>;

export type VflzWorkflowLayoutQuery = {
  vflz: {
    combinedId: string;
    vflId: string;
    vflzId: string;
    bezeichnung?: string | null;
    publizieren?: boolean | null;
    isCurrent: boolean;
    vflzCreatedDate?: string | null;
    teilstandorte: Array<{
      bezeichnung?: string | null;
      combinedId: string;
      vflzId: string;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    versionen: Array<{
      vflzId: string;
      datPublizieren?: string | null;
      publizieren?: boolean | null;
      message: string;
      vflzCreatedDate?: string | null;
      beurteilung?: {
        kbsInfo?: { belastet: boolean; color: string } | null;
      } | null;
      evaluationStatus: {
        deletedPreviously: boolean;
        deleteNow: boolean;
        publishedPreviously: boolean;
        publishNow: boolean;
      };
    }>;
    beurteilung?: {
      beurteilung?: string | null;
      kbsInfo?: { color: string } | null;
    } | null;
    gemeinde?: { gemeinde: string; kanton?: string | null } | null;
    evaluationStatus: {
      deletedPreviously: boolean;
      deleteNow: boolean;
      publishedPreviously: boolean;
      publishNow: boolean;
    };
  };
};

export type CreateVflzMutationVariables = Exact<{
  data: CreateVflzInput;
}>;

export type CreateVflzMutation = {
  createVflz:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | { __typename: "Vflz"; vflzId: string };
};

export type ValidateCreateVflzQueryVariables = Exact<{
  data: ValidateCreateVflzInput;
}>;

export type ValidateCreateVflzQuery = {
  validateCreateVflz:
    | {
        __typename: "ProblemGroup";
        problems: Array<{
          field: string;
          problemCode: ProblemCodeEnum;
          message: string;
        }>;
      }
    | {
        combinedId: Array<string>;
        flugplatz: Array<string>;
        gemeinde: Array<{
          __typename: "Gemeinde";
          displayValue: string;
          hGemId: string;
          kanton?: string | null;
        }>;
      };
};
