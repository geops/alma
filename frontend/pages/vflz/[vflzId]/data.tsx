import { gql } from "graphql-request";
import isEqual from "lodash/isEqual";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import useSWR from "swr";

import AnchorNavigation, {
  type AnchorNavItem,
} from "@/components/AnchorNavigation";
import CodeCombobox from "@/components/CodeCombobox";
import CodeListbox from "@/components/CodeListbox";
import DatePicker from "@/components/DatePicker";
import FieldArray from "@/components/FieldArray";
import Fieldset from "@/components/Fieldset";
import Form, { useValidatedData } from "@/components/Form";
import Input from "@/components/Input";
import Listbox, { useBooleanOptions } from "@/components/Listbox";
import Message from "@/components/Message";
import { mutationInfoFragment } from "@/components/MutationInfo";
import Textarea from "@/components/Textarea";
import VflzActionMenu from "@/components/VflzActionMenu";
import VflzLayout from "@/components/VflzLayout";
import ZeitraumFields from "@/components/ZeitraumFields";
import client from "@/lib/client";
import getZeitraum from "@/lib/getZeitraum";
import { Language, StandortTyp } from "@/lib/graphql";
import { type tFunction, useI18n } from "@/lib/i18n";
import { ModelContext } from "@/lib/modelContext";
import removeErfassungMutation from "@/lib/removeErfassungMutation";
import toBemerkungInput from "@/lib/toBemerkungInput";
import useCurrentUser from "@/lib/useCurrentUser";
import useSetting from "@/lib/useSetting";

import type {
  AblagerungInput,
  BetriebInput,
  EinzelereignisInput,
  GrundwasserInput,
  KinderspielplatzGruenflaecheInput,
  KompartimentStoffgruppeInput,
  KompartimentStoffklasseInput,
  LoeschschaumEinsatzInput,
  MutationInfoFragment,
  NutzungBodenInput,
  OberflaechenGewaesserInput,
  PfasInput,
  SchiessanlageInput,
  UmweltschadenInput,
  UmweltStoffInput,
  UnfallInput,
  UnfallstoffInput,
  UpdateVflzDataInput,
  UpdateVflzDataMutation,
  ValidateVflzDataQuery,
  VflzDataFormFragment,
  VflzDataQuery,
} from "@/lib/graphql";

const emptyZeitraum = {
  bis: null,
  bisheute: false,
  bisjahr: false,
  von: null,
  vonjahr: false,
};

const emptyZeitraumMitGenauigkeit = {
  ...emptyZeitraum,
  genauigkeitBis: null,
  genauigkeitVon: null,
};

function round10m(value: null | number | undefined) {
  return value ? (Math.round(value / 10) * 10).toString() : "";
}

function VflzBasedata({
  vflzId,
  zeitraum,
}: {
  vflzId?: string;
  zeitraum: string;
}) {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();

  const booleanOptions = useBooleanOptions();

  const langOptions = Object.values(Language).map((value) => {
    return {
      label: t(`language.${value}`),
      value,
    };
  });

  return (
    <Fieldset
      className="space-y-8"
      id="basedata"
      legend={t("vflz.data.basedata")}
      mutationInfo={[
        getValues("erfassungMutation"),
        getValues("bemerkungStandort.erfassungMutation"),
        getValues("bemerkungDatenimport.erfassungMutation"),
      ]}
    >
      <div className="@container grid grid-cols-2 gap-x-8 gap-y-4">
        <Input name="bezeichnung" required />
        <CodeListbox name="flugplatz" />
        <CodeListbox name="ktu" />
        <Input name="flurname" />
        <Input name="strasse" />
        <ModelContext.Provider value="Vflz.gemeinde">
          <Input disabled name="gemeinde.displayValue" />
        </ModelContext.Provider>
        <div className="grid grid-cols-2 gap-x-4 @lg:grid-cols-4">
          <Input name="postleitzahl" />
          <Input className="@lg:col-span-3" name="ort" />
        </div>
        <Input
          data-test="vflzDataFormKanton"
          disabled
          label={t("vflz.kanton")}
          value={t(getValues("gemeinde.kanton") ?? "")}
        />
      </div>
      <div className="space-y-4">
        <Message>
          {t("vflz.data.geodata.messageStart")}
          <Link
            className="text-blue-8 underline"
            href={`/vflz/${vflzId}/geo#map`}
          >
            {t("vflz.data.geodata.messageLink")}
          </Link>
          {t("vflz.data.geodata.messageEnd")}
        </Message>
        <div className="grid grid-cols-4 gap-x-8">
          <ModelContext.Provider value="Vflz.zentroid.coordinates">
            <Input
              data-test="vflzDataFormEast"
              disabled
              label={t("fields.Vflz.zentroid.coordinates.0")}
              value={round10m(getValues("zentroid.coordinates.0"))}
            />
            <Input
              data-test="vflzDataFormNorth"
              disabled
              label={t("fields.Vflz.zentroid.coordinates.1")}
              value={round10m(getValues("zentroid.coordinates.1"))}
            />
            <Input disabled name="zentroid.coordinates.2" suffix="m" />
          </ModelContext.Provider>
          <Input disabled name="flaeche" suffix="m²" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8">
        <Input
          data-test="vflzDataFormZeitraum"
          disabled
          label={t("zeitraum.title")}
          value={zeitraum}
        />
        <Listbox name="lang" options={langOptions} />
      </div>
      <ModelContext.Provider value="Vflz.bemerkungStandort">
        <Textarea
          name="bemerkungStandort.bem"
          placeholder={t("vflz.bemerkungStandortPlaceholder")}
        />
      </ModelContext.Provider>
      <ModelContext.Provider value="Vflz.bemerkungDatenimport">
        <Textarea
          name="bemerkungDatenimport.bem"
          placeholder={t("vflz.bemerkungDatenimportPlaceholder")}
        />
      </ModelContext.Provider>
      {getValues("vftypEnum") === StandortTyp.Ablagerung ? (
        <div className="space-y-4">
          <h3 className="font-semibold">{t(getValues("vftyp"))}</h3>
          <div className="grid grid-cols-3 gap-x-5">
            <Listbox name="inBetrieb" options={booleanOptions} />
            <Listbox name="nachsorge" options={booleanOptions} />
            <CodeListbox name="deponietyp" />
          </div>
        </div>
      ) : null}
    </Fieldset>
  );
}

VflzBasedata.fragment = gql`
  fragment VflzBasedata on Vflz {
    bemerkungDatenimport {
      ...BemErfassungMutation
    }
    bemerkungStandort {
      ...BemErfassungMutation
    }
    bezeichnung
    deponietyp
    flaeche
    flugplatz
    flurname
    gemeinde {
      displayValue
      hGemId
      kanton
    }
    inBetrieb
    ktu
    lang
    nachsorge
    ort
    postleitzahl
    strasse
    vftyp
    vftypEnum
    zentroid
    erfassungMutation {
      ...MutationInfo
    }
    zeitraum {
      ...getZeitraum
    }
  }
  ${getZeitraum.fragment}
`;

VflzBasedata.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: [
      "bezeichnung",
      "flurname",
      "strasse",
      "gemeinde",
      "postleitzahl",
      "ort",
      "lang",
      "bemerkungStandort",
      "bemerkungDatenimport",
    ],
    id: "basedata",
    legend: t("vflz.data.basedata"),
  };
};

const emptyAblagerung = {
  bemerkung: null,
  bemerkungDatenimport: null,
  intaId: null,
  kompartimentStoffklassen: [],
  tiefe: null,
  volKompartiment: null,
  zeitraum: emptyZeitraum,
};

const emptyKompartimentStoffklasse = {
  kkskId: null,
  kompartimentStoffgruppen: [],
  stoffklasse: null,
  teilvol: null,
  zeitraum: emptyZeitraumMitGenauigkeit,
};

const emptyKompartimentStoffgruppe = {
  kksgId: null,
  stoffgruppe: null,
  teilvol: null,
};

function VflzAblagerungen() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { pluralRules, t } = useI18n();
  const [maxKompartimente] = useSetting<"undefined" | number | undefined>(
    "ui.ablagerungen.maxKompartimente",
    undefined,
  );
  return (
    <Fieldset
      id="ablagerungen"
      legend={t("vflz.data.ablagerungen")}
      mutationInfo={(getValues("ablagerungen") || [])
        .map((a) => {
          return [
            a.erfassungMutation,
            a.bemerkung?.erfassungMutation,
            a.bemerkungDatenimport?.erfassungMutation,
            ...a.kompartimentStoffklassen
              .map((k) => {
                return [
                  k.erfassungMutation,
                  ...k.kompartimentStoffgruppen.map((g) => {
                    return g.erfassungMutation;
                  }),
                ];
              })
              .flat(),
          ];
        })
        .flat()}
    >
      <FieldArray<AblagerungInput>
        addLabel={t("ablagerung.addLabel")}
        data-test="vflzDataFormAblagerungen"
        getTitle={(a) => {
          const count = a.kompartimentStoffklassen?.length;
          return [
            a.volKompartiment && `${a.volKompartiment} m³`,
            getZeitraum(t, a),
            `${count} ${t(`kompartimentStoffklassen.${pluralRules.select(count)}`)}`,
          ]
            .filter(Boolean)
            .join(", ");
        }}
        maxItems={
          typeof maxKompartimente === "number" ? maxKompartimente : undefined
        }
        model="Ablagerung"
        name="ablagerungen"
        value={emptyAblagerung}
      >
        {(i1) => {
          return (
            <>
              <div className="grid grid-cols-4 gap-5">
                <Input
                  name={`ablagerungen.${i1}.volKompartiment`}
                  suffix="m³"
                  type="float"
                />
                <Input name={`ablagerungen.${i1}.tiefe`} suffix="m" />
                <ZeitraumFields name={`ablagerungen.${i1}.zeitraum`} />
              </div>
              <FieldArray<KompartimentStoffklasseInput>
                addLabel={t("kompartimentStoffklassen.addLabel")}
                data-test="vflzDataFormKompartimentStoffklassen"
                level={2}
                model="KompartimentStoffklasse"
                name={`ablagerungen.${i1}.kompartimentStoffklassen`}
                value={emptyKompartimentStoffklasse}
              >
                {(i2) => {
                  return (
                    <>
                      <div className="grid grid-cols-4 gap-5">
                        <CodeListbox
                          className="col-span-2"
                          name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.stoffklasse`}
                        />
                        <Input
                          name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.teilvol`}
                          suffix="m³"
                          type="float"
                        />
                        <div />
                        <ZeitraumFields
                          mitGenauigkeit
                          name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.zeitraum`}
                        />
                      </div>
                      <FieldArray<KompartimentStoffgruppeInput>
                        addLabel={t("kompartimentStoffgruppen.addLabel")}
                        data-test="vflzDataFormKompartimentStoffgruppen"
                        level={3}
                        model="KompartimentStoffgruppe"
                        name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.kompartimentStoffgruppen`}
                        value={emptyKompartimentStoffgruppe}
                      >
                        {(i3) => {
                          return (
                            <div className="grid grid-cols-4 gap-5">
                              <CodeCombobox
                                className="col-span-2"
                                name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.kompartimentStoffgruppen.${i3}.stoffgruppe`}
                              />
                              <Input
                                name={`ablagerungen.${i1}.kompartimentStoffklassen.${i2}.kompartimentStoffgruppen.${i3}.teilvol`}
                                suffix="m³"
                                type="float"
                              />
                            </div>
                          );
                        }}
                      </FieldArray>
                    </>
                  );
                }}
              </FieldArray>
              <ModelContext.Provider value="Ablagerung.bemerkung">
                <Textarea
                  name={`ablagerungen.${i1}.bemerkung.bem`}
                  placeholder={t("ablagerung.bemerkungPlaceholder")}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value="Ablagerung.bemerkungDatenimport">
                <Textarea
                  name={`ablagerungen.${i1}.bemerkungDatenimport.bem`}
                  placeholder={t("ablagerung.bemerkungDatenimportPlaceholder")}
                />
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzAblagerungen.fragment = gql`
  fragment VflzAblagerungen on Vflz {
    ablagerungen {
      intaId
      tiefe
      volKompartiment
      bemerkung {
        ...BemErfassungMutation
      }
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
      kompartimentStoffklassen {
        kkskId
        stoffklasse
        teilvol
        erfassungMutation {
          ...MutationInfo
        }
        kompartimentStoffgruppen {
          kksgId
          stoffgruppe
          teilvol
          erfassungMutation {
            ...MutationInfo
          }
        }
        zeitraum {
          ...ZeitraumFieldsMitGenauigkeit
        }
      }
      zeitraum {
        ...ZeitraumFields
      }
    }
  }
`;

VflzAblagerungen.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["ablagerungen", "inBetrieb", "nachsorge", "deponietyp"],
    id: "ablagerungen",
    legend: t("vflz.data.ablagerungen"),
  };
};

VflzAblagerungen.toInput = (
  ablagerungen: VflzDataQuery["vflz"]["ablagerungen"] = [],
): AblagerungInput[] => {
  return ablagerungen
    .map((ablagerung) => {
      const ablagerungOmit = removeErfassungMutation(ablagerung);
      return {
        ...ablagerungOmit,
        bemerkung: toBemerkungInput(ablagerung.bemerkung),
        bemerkungDatenimport: toBemerkungInput(ablagerung.bemerkungDatenimport),
        kompartimentStoffklassen: ablagerung.kompartimentStoffklassen
          .map((klasse) => {
            const klasseOmit = removeErfassungMutation(klasse);
            return {
              ...klasseOmit,
              kompartimentStoffgruppen: klasse.kompartimentStoffgruppen
                .map(removeErfassungMutation)
                .filter((g) => {
                  return !isEqual(g, emptyKompartimentStoffgruppe);
                }),
            };
          })
          .filter((klasse) => {
            return !isEqual(klasse, emptyKompartimentStoffklasse);
          }),
      };
    })
    .filter((ablagerung) => {
      return !isEqual(ablagerung, emptyAblagerung);
    });
};

const emptyBetrieb = {
  begruendungBewertung: null,
  bemerkung: null,
  bemerkungDatenimport: null,
  beurteilung: null,
  brancheAsw: null,
  brancheNoga: null,
  eva: null,
  firmaName: null,
  firmaOrt: null,
  firmaPlz: null,
  firmaStrasse: null,
  groesse: null,
  intbId: null,
  mobileStoffe: null,
  relevant: null,
  untersuchungsStand: null,
  zeitraum: emptyZeitraumMitGenauigkeit,
  zentroid: null,
};

const emptySchiessanlage = {
  ...emptyBetrieb,
  hatKugelfang: null,
  scheibenzahl: null,
  schusszahl: null,
  typ: null,
};

function VflzBetriebe({
  model = "Betrieb",
}: {
  model?: "Betrieb" | "Schiessanlage";
}) {
  const booleanOptions = useBooleanOptions();
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();

  const [groesseIsText] = useSetting(
    `ui.fields.${model}.groesse.isText`,
    false,
  );

  const groesseOptions = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      return i + 1;
    }).map((value) => {
      return {
        label: t(`basisBetrieb.groesse.${value}`),
        value,
      };
    });
  }, [t]);

  const relevantOptions = useMemo(() => {
    return [null, true, false].map((value) => {
      return {
        label: t(`basisBetrieb.relevant.${(value ?? "null").toString()}`),
        value,
      };
    });
  }, [t]);

  const mobileStoffeOptions = useMemo(() => {
    return [null, true, false].map((value) => {
      return {
        label: t(`basisBetrieb.mobileStoffe.${(value ?? "null").toString()}`),
        value,
      };
    });
  }, [t]);

  const name = model === "Betrieb" ? "betriebe" : "schiessanlagen";

  return (
    <Fieldset
      id={name}
      legend={t(`vflz.data.${name}`)}
      mutationInfo={(getValues(name) || [])
        .map((b) => {
          return [
            b.erfassungMutation,
            b.begruendungBewertung?.erfassungMutation,
            b.bemerkung?.erfassungMutation,
            b.bemerkungDatenimport?.erfassungMutation,
          ];
        })
        .flat()}
    >
      <FieldArray<BetriebInput | SchiessanlageInput>
        addLabel={t(
          model === "Betrieb" ? "betrieb.addLabel" : "schiessanlage.addLabel",
        )}
        data-test={
          model === "Betrieb"
            ? "vflzDataFormBetriebe"
            : "vflzDataFormSchiessanlagen"
        }
        getTitle={(b) => {
          return b.firmaName ?? "";
        }}
        model={model}
        name={name}
        value={model === "Betrieb" ? emptyBetrieb : emptySchiessanlage}
      >
        {(i1) => {
          return (
            <>
              <div className="@container grid grid-cols-2 gap-5">
                <Input name={`${name}.${i1}.firmaName`} />
                <Input name={`${name}.${i1}.eva`} />
                <Input name={`${name}.${i1}.firmaStrasse`} />
                <div className="grid grid-cols-2 gap-x-4 @lg:grid-cols-4">
                  <Input name={`${name}.${i1}.firmaPlz`} />
                  <Input
                    className="@lg:col-span-3"
                    name={`${name}.${i1}.firmaOrt`}
                  />
                </div>
              </div>
              <div className="flex gap-5 *:w-0 *:flex-1">
                <ZeitraumFields
                  mitGenauigkeit
                  name={`${name}.${i1}.zeitraum`}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <CodeCombobox
                  disabled={model === "Schiessanlage"}
                  name={`${name}.${i1}.brancheAsw`}
                />
                {model === "Betrieb" ? (
                  <CodeCombobox name={`${name}.${i1}.brancheNoga`} />
                ) : null}
                {model === "Schiessanlage" ? (
                  <>
                    <CodeListbox name={`${name}.${i1}.typ`} />
                    <Listbox
                      name={`${name}.${i1}.hatKugelfang`}
                      options={booleanOptions}
                    />
                    <Input name={`${name}.${i1}.scheibenzahl`} type="integer" />
                    <Input name={`${name}.${i1}.schusszahl`} type="integer" />
                  </>
                ) : null}
                {groesseIsText === true ? (
                  <Input name={`${name}.${i1}.groesse`} type="integer" />
                ) : (
                  <Listbox
                    name={`${name}.${i1}.groesse`}
                    options={groesseOptions}
                  />
                )}
                <Listbox
                  name={`${name}.${i1}.relevant`}
                  options={relevantOptions}
                />
                <Listbox
                  name={`${name}.${i1}.mobileStoffe`}
                  options={mobileStoffeOptions}
                />
                <CodeListbox name={`${name}.${i1}.untersuchungsStand`} />
                <CodeListbox name={`${name}.${i1}.beurteilung`} />
              </div>
              <ModelContext.Provider value={`${model}.bemerkung`}>
                <Textarea
                  name={`${name}.${i1}.bemerkung.bem`}
                  placeholder={t(
                    model === "Betrieb"
                      ? "betrieb.bemerkungPlaceholder"
                      : "schiessanlage.bemerkungPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value={`${model}.bemerkungDatenimport`}>
                <Textarea
                  name={`${name}.${i1}.bemerkungDatenimport.bem`}
                  placeholder={t(
                    model === "Betrieb"
                      ? "betrieb.bemerkungDatenimportPlaceholder"
                      : "schiessanlage.bemerkungDatenimportPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value={`${model}.begruendungBewertung`}>
                <Textarea
                  name={`${name}.${i1}.begruendungBewertung.bem`}
                  placeholder={t(
                    model === "Betrieb"
                      ? "betrieb.begruendungBewertungPlaceholder"
                      : "schiessanlage.begruendungBewertungPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value={`${model}.zentroid.coordinates`}>
                <div className="grid grid-cols-2 gap-5">
                  <Input name={`${name}.${i1}.zentroid.coordinates.0`} />
                  <Input name={`${name}.${i1}.zentroid.coordinates.1`} />
                </div>
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzBetriebe.fragment = gql`
  fragment VflzBasisBetrieb on BasisBetrieb {
    intbId
    beurteilung
    brancheAsw
    brancheNoga
    eva
    firmaName
    firmaOrt
    firmaPlz
    firmaStrasse
    groesse
    mobileStoffe
    relevant
    untersuchungsStand
    zentroid
    begruendungBewertung {
      ...BemErfassungMutation
    }
    bemerkung {
      ...BemErfassungMutation
    }
    erfassungMutation {
      ...MutationInfo
    }
    zeitraum {
      ...ZeitraumFieldsMitGenauigkeit
    }
  }
  fragment VflzBetriebe on Vflz {
    betriebe {
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      ...VflzBasisBetrieb
    }
    schiessanlagen {
      hatKugelfang
      scheibenzahl
      schusszahl
      typ
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      ...VflzBasisBetrieb
    }
  }
`;

VflzBetriebe.getNavItem = (
  t: tFunction,
  model: "Betrieb" | "Schiessanlage" = "Betrieb",
): AnchorNavItem => {
  return {
    fields: [model === "Betrieb" ? "betriebe" : "schiessanlagen"],
    id: model === "Betrieb" ? "betriebe" : "schiessanlagen",
    legend: t(
      `vflz.data.${model === "Betrieb" ? "betriebe" : "schiessanlagen"}`,
    ),
  };
};

VflzBetriebe.toInput = (
  betriebe:
    | VflzDataQuery["vflz"]["betriebe"]
    | VflzDataQuery["vflz"]["schiessanlagen"] = [],
): (BetriebInput | SchiessanlageInput)[] => {
  const emptyEntry =
    "schusszahl" in (betriebe.at(0) ?? {}) ? emptySchiessanlage : emptyBetrieb;
  return betriebe
    .map((b) => {
      const bOmit = removeErfassungMutation(b);
      return {
        ...bOmit,
        begruendungBewertung: toBemerkungInput(b.begruendungBewertung),
        bemerkung: toBemerkungInput(b.bemerkung),
        bemerkungDatenimport: toBemerkungInput(b.bemerkungDatenimport),
        zentroid: b.zentroid?.coordinates?.[0]
          ? { coordinates: b.zentroid.coordinates, type: "Point" as const }
          : null,
      };
    })
    .filter((betrieb) => {
      return !isEqual(betrieb, emptyEntry);
    });
};

const emptyUnfall = {
  bemerkung: null,
  bemerkungDatenimport: null,
  genauigkeitZeitpunkt: null,
  intuId: null,
  name: null,
  unfallstoffe: [],
  zeitpunkt: null,
  zeitpunktjahr: null,
};

const emptyUnfallstoff = {
  ausgelaufen: null,
  inumId: null,
  stoff: null,
  stoffmng: null,
  zurueckgewonnen: null,
};

function VflzUnfaelle() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="unfaelle"
      legend={t("vflz.data.unfaelle")}
      mutationInfo={(getValues("unfaelle") || [])
        .map((u) => {
          return [
            u.erfassungMutation,
            u.bemerkung?.erfassungMutation,
            u.bemerkungDatenimport?.erfassungMutation,
            ...u.unfallstoffe.map((s) => {
              return s.erfassungMutation;
            }),
          ];
        })
        .flat()}
    >
      <FieldArray<UnfallInput>
        addLabel={t("unfall.addLabel")}
        data-test="vflzDataFormUnfaelle"
        getTitle={(u) => {
          return u.name ?? "";
        }}
        model="Unfall"
        name="unfaelle"
        value={emptyUnfall}
      >
        {(i1) => {
          return (
            <>
              <div className="grid grid-cols-2 gap-5">
                <Input name={`unfaelle.${i1}.name`} />
                <div />
                <DatePicker hasJahr name={`unfaelle.${i1}.zeitpunkt`} />
                <CodeListbox name={`unfaelle.${i1}.genauigkeitZeitpunkt`} />
              </div>
              <FieldArray<UnfallstoffInput>
                addLabel={t("unfallstoffe.addLabel")}
                data-test="vflzDataFormUnfallstoffe"
                level={2}
                model="Unfallstoff"
                name={`unfaelle.${i1}.unfallstoffe`}
                value={emptyUnfallstoff}
              >
                {(i2) => {
                  return (
                    <div className="grid grid-cols-4 gap-5">
                      <CodeCombobox
                        className="col-span-2"
                        name={`unfaelle.${i1}.unfallstoffe.${i2}.stoff`}
                      />
                      <div className="col-span-2" />
                      <Input
                        name={`unfaelle.${i1}.unfallstoffe.${i2}.ausgelaufen`}
                        suffix="l"
                        type="float"
                      />
                      <Input
                        name={`unfaelle.${i1}.unfallstoffe.${i2}.zurueckgewonnen`}
                        suffix="l"
                        type="float"
                      />
                      <Input
                        name={`unfaelle.${i1}.unfallstoffe.${i2}.stoffmng`}
                        suffix="l"
                        type="float"
                      />
                    </div>
                  );
                }}
              </FieldArray>
              <ModelContext.Provider value="Unfall.bemerkung">
                <Textarea
                  name={`unfaelle.${i1}.bemerkung.bem`}
                  placeholder={t("unfall.bemerkungPlaceholder")}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value="Unfall.bemerkungDatenimport">
                <Textarea
                  name={`unfaelle.${i1}.bemerkungDatenimport.bem`}
                  placeholder={t("unfall.bemerkungDatenimportPlaceholder")}
                />
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzUnfaelle.fragment = gql`
  fragment VflzUnfaelle on Vflz {
    unfaelle {
      intuId
      name
      zeitpunkt
      zeitpunktjahr
      genauigkeitZeitpunkt
      bemerkung {
        ...BemErfassungMutation
      }
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
      unfallstoffe {
        inumId
        ausgelaufen
        stoff
        zurueckgewonnen
        stoffmng
        erfassungMutation {
          ...MutationInfo
        }
      }
    }
  }
`;

VflzUnfaelle.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["unfaelle"],
    id: "unfaelle",
    legend: t("vflz.data.unfaelle"),
  };
};

VflzUnfaelle.toInput = (
  unfaelle: VflzDataQuery["vflz"]["unfaelle"] = [],
): UnfallInput[] => {
  return unfaelle
    .map((unfall) => {
      return removeErfassungMutation({
        ...unfall,
        bemerkung: toBemerkungInput(unfall.bemerkung),
        bemerkungDatenimport: toBemerkungInput(unfall.bemerkungDatenimport),
        unfallstoffe: unfall.unfallstoffe
          .map(removeErfassungMutation)
          .filter((unfallstoff) => {
            return !isEqual(unfallstoff, emptyUnfallstoff);
          }),
      });
    })
    .filter((unfall) => {
      return !isEqual(unfall, emptyUnfall);
    });
};

const emptyKinderspielplatzGruenflaeche = {
  altersstufenKinder: [],
  begruendungBewertung: null,
  belastungUeberSanierungswert: null,
  bemerkung: null,
  bemerkungDatenimport: null,
  beurteilung: null,
  eigentumsform: null,
  eva: null,
  intkId: null,
  kinderspielplatzGruenflacheTyp: null,
  name: null,
  ort: null,
  plz: null,
  relevant: null,
  strasse: null,
  untersuchungsStand: null,
  zeitraum: emptyZeitraumMitGenauigkeit,
  zentroid: null,
};

function VflzKinderspielplaetzeGruenflaechen() {
  const booleanOptions = useBooleanOptions();
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="kinderspielplaetze-gruenflaechen"
      legend={t(`vflz.data.kinderspielplaetzeGruenflaechen`)}
      mutationInfo={(getValues("kinderspielplaetzeGruenflaechen") || [])
        .map((k) => {
          return [
            k.erfassungMutation,
            k.begruendungBewertung?.erfassungMutation,
            k.bemerkung?.erfassungMutation,
            k.bemerkungDatenimport?.erfassungMutation,
          ];
        })
        .flat()}
    >
      <FieldArray<KinderspielplatzGruenflaecheInput>
        addLabel={t("kinderspielplatzGruenflaeche.addLabel")}
        data-test="vflzDataFormKinderspielplaetzeGruenflaechen"
        getTitle={(k) => {
          return k.name ?? "";
        }}
        model="KinderspielplatzGruenflaeche"
        name="kinderspielplaetzeGruenflaechen"
        value={emptyKinderspielplatzGruenflaeche}
      >
        {(i1) => {
          return (
            <>
              <div className="@container grid grid-cols-2 gap-5">
                <Input name={`kinderspielplaetzeGruenflaechen.${i1}.name`} />
                <Input name={`kinderspielplaetzeGruenflaechen.${i1}.eva`} />
                <Input name={`kinderspielplaetzeGruenflaechen.${i1}.strasse`} />
                <div className="grid grid-cols-2 gap-x-4 @lg:grid-cols-4">
                  <Input name={`kinderspielplaetzeGruenflaechen.${i1}.plz`} />
                  <Input
                    className="@lg:col-span-3"
                    name={`kinderspielplaetzeGruenflaechen.${i1}.ort`}
                  />
                </div>
              </div>
              <div className="flex gap-5 *:w-0 *:flex-1">
                <ZeitraumFields
                  mitGenauigkeit
                  name={`kinderspielplaetzeGruenflaechen.${i1}.zeitraum`}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <CodeListbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.kinderspielplatzGruenflacheTyp`}
                />
                <CodeListbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.eigentumsform`}
                />
                <Listbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.belastungUeberSanierungswert`}
                  options={booleanOptions}
                />
                <Listbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.relevant`}
                  options={booleanOptions}
                />
                <CodeListbox
                  className="col-span-2"
                  multiple
                  name={`kinderspielplaetzeGruenflaechen.${i1}.altersstufenKinder`}
                />
                <CodeListbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.untersuchungsStand`}
                />
                <CodeListbox
                  name={`kinderspielplaetzeGruenflaechen.${i1}.beurteilung`}
                />
              </div>
              <ModelContext.Provider
                value={`KinderspielplatzGruenflaeche.bemerkung`}
              >
                <Textarea
                  name={`kinderspielplaetzeGruenflaechen.${i1}.bemerkung.bem`}
                  placeholder={t(
                    "kinderspielplatzGruenflaeche.bemerkungPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider
                value={`KinderspielplatzGruenflaeche.bemerkungDatenimport`}
              >
                <Textarea
                  name={`kinderspielplaetzeGruenflaechen.${i1}.bemerkungDatenimport.bem`}
                  placeholder={t(
                    "kinderspielplatzGruenflaeche.bemerkungDatenimportPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider
                value={`KinderspielplatzGruenflaeche.begruendungBewertung`}
              >
                <Textarea
                  name={`kinderspielplaetzeGruenflaechen.${i1}.begruendungBewertung.bem`}
                  placeholder={t(
                    "kinderspielplatzGruenflaeche.begruendungBewertungPlaceholder",
                  )}
                />
              </ModelContext.Provider>
              <ModelContext.Provider
                value={`KinderspielplatzGruenflaeche.zentroid.coordinates`}
              >
                <div className="grid grid-cols-2 gap-5">
                  <Input
                    name={`kinderspielplaetzeGruenflaechen.${i1}.zentroid.coordinates.0`}
                  />
                  <Input
                    name={`kinderspielplaetzeGruenflaechen.${i1}.zentroid.coordinates.1`}
                  />
                </div>
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzKinderspielplaetzeGruenflaechen.fragment = gql`
  fragment VflzKinderspielplaetzeGruenflaechen on Vflz {
    kinderspielplaetzeGruenflaechen {
      intkId
      belastungUeberSanierungswert
      altersstufenKinder
      eigentumsform
      eva
      name
      ort
      plz
      strasse
      kinderspielplatzGruenflacheTyp
      relevant
      untersuchungsStand
      beurteilung
      zentroid
      begruendungBewertung {
        ...BemErfassungMutation
      }
      bemerkung {
        ...BemErfassungMutation
      }
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
      zeitraum {
        ...ZeitraumFieldsMitGenauigkeit
      }
    }
  }
`;

VflzKinderspielplaetzeGruenflaechen.getNavItem = (
  t: tFunction,
): AnchorNavItem => {
  return {
    fields: ["kinderspielplaetzeGruenflaechen"],
    id: "kinderspielplaetze-gruenflaechen",
    legend: t("vflz.data.kinderspielplaetzeGruenflaechen"),
  };
};

VflzKinderspielplaetzeGruenflaechen.toInput = (
  items: VflzDataQuery["vflz"]["kinderspielplaetzeGruenflaechen"] = [],
): KinderspielplatzGruenflaecheInput[] => {
  return items
    .map((k) => {
      return removeErfassungMutation({
        ...k,
        begruendungBewertung: toBemerkungInput(k.begruendungBewertung),
        bemerkung: toBemerkungInput(k.bemerkung),
        bemerkungDatenimport: toBemerkungInput(k.bemerkungDatenimport),
        zentroid: k.zentroid?.coordinates?.[0]
          ? { coordinates: k.zentroid.coordinates, type: "Point" as const }
          : null,
      });
    })
    .filter((k) => {
      return !isEqual(k, emptyKinderspielplatzGruenflaeche);
    });
};

const emptyPFAS: PfasInput = {
  begruendungBewertung: null,
  bemerkung: null,
  bemerkungDatenimport: null,
  beschreibungenDetail: null,
  beurteilung: null,
  branche: null,
  eva: null,
  intpId: null,
  loeschschaumEinsatz: [],
  mengeKonzentrat: null,
  mengeSchaumgemisch: null,
  name: null,
  ort: null,
  pfasFreieLoeschmittel: [],
  pfasHaltigeLoeschmittel: [],
  pfasLoeschmittel: null,
  pfasTyp: null,
  plz: null,
  relevant: null,
  strasse: null,
  untersuchungsStand: null,
  zeitraum: emptyZeitraumMitGenauigkeit,
  zentroid: null,
};

const emptyLoeschschaumEinsatz: LoeschschaumEinsatzInput = {
  haeufigkeitNutzung: null,
  intpLoeschschaumEinsatzId: null,
  loeschschaumEinsatz: null,
};

function VflzPFAS() {
  const booleanOptions = useBooleanOptions();
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="pfas"
      legend={t(`vflz.data.pfas`)}
      mutationInfo={(getValues("pfas") || [])
        .map((pfas) => {
          return [
            pfas.erfassungMutation,
            pfas.begruendungBewertung?.erfassungMutation,
            pfas.bemerkung?.erfassungMutation,
            pfas.bemerkungDatenimport?.erfassungMutation,
          ];
        })
        .flat()}
    >
      <FieldArray<PfasInput>
        addLabel={t("pfas.addLabel")}
        data-test="vflzDataFormPFAS"
        getTitle={(pfas) => {
          return pfas.name ?? "";
        }}
        model="PFAS"
        name="pfas"
        value={emptyPFAS}
      >
        {(i1) => {
          return (
            <>
              <div className="@container grid grid-cols-2 gap-5">
                <Input name={`pfas.${i1}.name`} />
                <Input name={`pfas.${i1}.eva`} />
                <Input name={`pfas.${i1}.strasse`} />
                <div className="grid grid-cols-2 gap-x-4 @lg:grid-cols-4">
                  <Input name={`pfas.${i1}.plz`} />
                  <Input className="@lg:col-span-3" name={`pfas.${i1}.ort`} />
                </div>
              </div>
              <div className="flex gap-5 *:w-0 *:flex-1">
                <ZeitraumFields mitGenauigkeit name={`pfas.${i1}.zeitraum`} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <CodeListbox name={`pfas.${i1}.branche`} />
                <CodeListbox name={`pfas.${i1}.pfasTyp`} />
                <Listbox
                  name={`pfas.${i1}.pfasLoeschmittel`}
                  options={booleanOptions}
                />
                <Listbox
                  name={`pfas.${i1}.relevant`}
                  options={booleanOptions}
                />
                <CodeListbox
                  multiple
                  name={`pfas.${i1}.pfasHaltigeLoeschmittel`}
                />
                <CodeListbox
                  multiple
                  name={`pfas.${i1}.pfasFreieLoeschmittel`}
                />
                <Input
                  name={`pfas.${i1}.mengeSchaumgemisch`}
                  suffix="m3"
                  type="integer"
                />
                <Input
                  name={`pfas.${i1}.mengeKonzentrat`}
                  suffix="ltr"
                  type="integer"
                />
              </div>
              <FieldArray<LoeschschaumEinsatzInput>
                addLabel={t("loeschschaumEinsatz.addLabel")}
                data-test="vflzDataFormLoeschschaumEinsatz"
                level={2}
                model="LoeschschaumEinsatz"
                name={`pfas.${i1}.loeschschaumEinsatz`}
                value={emptyLoeschschaumEinsatz}
              >
                {(i2) => {
                  return (
                    <div className="grid grid-cols-2 gap-5">
                      <CodeListbox
                        name={`pfas.${i1}.loeschschaumEinsatz.${i2}.loeschschaumEinsatz`}
                      />
                      <CodeListbox
                        className="mr-8"
                        name={`pfas.${i1}.loeschschaumEinsatz.${i2}.haeufigkeitNutzung`}
                      />
                    </div>
                  );
                }}
              </FieldArray>
              <Textarea name={`pfas.${i1}.beschreibungenDetail`} />
              <div className="grid grid-cols-2 gap-5">
                <CodeListbox name={`pfas.${i1}.untersuchungsStand`} />
                <CodeListbox name={`pfas.${i1}.beurteilung`} />
              </div>
              <ModelContext.Provider value={`PFAS.bemerkung`}>
                <Textarea
                  name={`pfas.${i1}.bemerkung.bem`}
                  placeholder={t("pfas.bemerkungPlaceholder")}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value="PFAS.bemerkungDatenimport">
                <Textarea
                  name={`pfas.${i1}.bemerkungDatenimport.bem`}
                  placeholder={t("pfas.bemerkungDatenimportPlaceholder")}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value="PFAS.begruendungBewertung">
                <Textarea
                  name={`pfas.${i1}.begruendungBewertung.bem`}
                  placeholder={t("pfas.begruendungBewertungPlaceholder")}
                />
              </ModelContext.Provider>
              <ModelContext.Provider value="PFAS.zentroid.coordinates">
                <div className="grid grid-cols-2 gap-5">
                  <Input name={`pfas.${i1}.zentroid.coordinates.0`} />
                  <Input name={`pfas.${i1}.zentroid.coordinates.1`} />
                </div>
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzPFAS.fragment = gql`
  fragment VflzPFAS on Vflz {
    pfas {
      intpId
      beschreibungenDetail
      beurteilung
      branche
      loeschschaumEinsatz {
        intpLoeschschaumEinsatzId
        loeschschaumEinsatz
        haeufigkeitNutzung
      }
      mengeKonzentrat
      mengeSchaumgemisch
      pfasTyp
      pfasHaltigeLoeschmittel
      pfasLoeschmittel
      pfasFreieLoeschmittel
      relevant
      untersuchungsStand
      name
      ort
      plz
      strasse
      eva
      zentroid
      zeitraum {
        ...ZeitraumFieldsMitGenauigkeit
      }
      begruendungBewertung {
        ...BemErfassungMutation
      }
      bemerkung {
        ...BemErfassungMutation
      }
      bemerkungDatenimport {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzPFAS.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["pfas"],
    id: "pfas",
    legend: t("vflz.data.pfas"),
  };
};

VflzPFAS.toInput = (items: VflzDataQuery["vflz"]["pfas"] = []): PfasInput[] => {
  return items
    .map((pfas) => {
      const pfasOmit = removeErfassungMutation(pfas);
      return {
        ...pfasOmit,
        begruendungBewertung: toBemerkungInput(pfas.begruendungBewertung),
        bemerkung: toBemerkungInput(pfas.bemerkung),
        bemerkungDatenimport: toBemerkungInput(pfas.bemerkungDatenimport),
        loeschschaumEinsatz: pfas.loeschschaumEinsatz.filter((einsatz) => {
          return !isEqual(einsatz, emptyLoeschschaumEinsatz);
        }),
        zentroid: pfas.zentroid?.coordinates?.[0]
          ? { coordinates: pfas.zentroid.coordinates, type: "Point" as const }
          : null,
      };
    })
    .filter((pfas) => {
      return !isEqual(pfas, emptyPFAS);
    });
};

function VflzUmfeld() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="umfeld"
      legend={t("vflz.data.umfeld")}
      mutationInfo={[getValues("erfassungMutation")]}
    >
      <div className="mb-5 grid grid-cols-2 gap-5">
        <CodeListbox name="gwsBereich" />
        <CodeListbox name="gwsZone" />
        <CodeListbox name="karstgeb" />
        <CodeListbox name="durchlaessigkeit" />
      </div>
    </Fieldset>
  );
}

VflzUmfeld.fragment = gql`
  fragment VflzUmfeld on Vflz {
    durchlaessigkeit
    gwsBereich
    gwsZone
    karstgeb
    erfassungMutation {
      ...MutationInfo
    }
  }
`;

VflzUmfeld.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["durchlaessigkeit", "gwsBereich", "gwsZone", "karstgeb"],
    id: "umfeld",
    legend: t("vflz.data.umfeld"),
  };
};

const emptyGrundwasser = {
  distanz: null,
  flurabstand: null,
  gwasId: null,
  nutzung: null,
  relativeLage: null,
};

function VflzGrundwasser() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="grundwasser"
      legend={t("vflz.data.grundwasser")}
      mutationInfo={[
        ...(getValues("grundwasser") || []).map((g) => {
          return g.erfassungMutation;
        }),
      ]}
    >
      <FieldArray<GrundwasserInput>
        addLabel={t("grundwasser.addLabel")}
        data-test="vflzDataFormGrundwasser"
        model="Grundwasser"
        name="grundwasser"
        value={emptyGrundwasser}
      >
        {(i1) => {
          return (
            <div className="mr-8 grid grid-cols-2 gap-5">
              <CodeListbox name={`grundwasser.${i1}.relativeLage`} />
              <Input
                name={`grundwasser.${i1}.flurabstand`}
                suffix="m"
                type="float"
              />
              <CodeListbox name={`grundwasser.${i1}.nutzung`} />
              <Input
                name={`grundwasser.${i1}.distanz`}
                suffix="m"
                type="integer"
              />
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzGrundwasser.fragment = gql`
  fragment VflzGrundwasser on Vflz {
    grundwasser {
      gwasId
      relativeLage
      flurabstand
      nutzung
      distanz
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzGrundwasser.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["grundwasser"],
    id: "grundwasser",
    legend: t("vflz.data.grundwasser"),
  };
};

VflzGrundwasser.toInput = (
  grundwasser: VflzDataQuery["vflz"]["grundwasser"] = [],
): GrundwasserInput[] => {
  return grundwasser.map(removeErfassungMutation).filter((g) => {
    return !isEqual(g, emptyGrundwasser);
  });
};

const emptyOberflaechenGewaesser = {
  artGewaesser: null,
  bauGewaesser: null,
  distanz: null,
  name: null,
  ogwId: null,
  relativeLage: null,
};

function VflzOberflaechenGewaesser() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="oberflaechen-gewaesser"
      legend={t("vflz.data.oberflaechenGewaesser")}
      mutationInfo={[
        ...(getValues("oberflaechenGewaesser") || []).map((u) => {
          return u.erfassungMutation;
        }),
      ]}
    >
      <FieldArray<OberflaechenGewaesserInput>
        addLabel={t("oberflaechenGewaesser.addLabel")}
        data-test="vflzDataFormOberflaechenGewaesser"
        model="OberflaechenGewaesser"
        name="oberflaechenGewaesser"
        value={emptyOberflaechenGewaesser}
      >
        {(i1) => {
          return (
            <div className="mr-8 grid grid-cols-2 gap-5">
              <Input
                className="col-span-2"
                name={`oberflaechenGewaesser.${i1}.name`}
              />
              <Input
                name={`oberflaechenGewaesser.${i1}.distanz`}
                suffix="m"
                type="integer"
              />
              <CodeListbox name={`oberflaechenGewaesser.${i1}.artGewaesser`} />
              <CodeListbox name={`oberflaechenGewaesser.${i1}.bauGewaesser`} />
              <CodeListbox name={`oberflaechenGewaesser.${i1}.relativeLage`} />
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzOberflaechenGewaesser.fragment = gql`
  fragment VflzOberflaechenGewaesser on Vflz {
    oberflaechenGewaesser {
      ogwId
      artGewaesser
      bauGewaesser
      relativeLage
      distanz
      name
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzOberflaechenGewaesser.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["oberflaechenGewaesser"],
    id: "oberflaechen-gewaesser",
    legend: t("vflz.data.oberflaechenGewaesser"),
  };
};

VflzOberflaechenGewaesser.toInput = (
  oberflaechenGewaesser: VflzDataQuery["vflz"]["oberflaechenGewaesser"] = [],
): OberflaechenGewaesserInput[] => {
  return oberflaechenGewaesser.map(removeErfassungMutation).filter((og) => {
    return !isEqual(og, emptyOberflaechenGewaesser);
  });
};

function VflzUmwelt() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="umwelt"
      legend={t("vflz.data.umwelt")}
      mutationInfo={[getValues("bemerkungUmwelt.erfassungMutation")]}
    >
      <ModelContext.Provider value="Vflz.bemerkungUmwelt">
        <Textarea
          name="bemerkungUmwelt.bem"
          placeholder={t("vflz.bemerkungUmweltPlaceholder")}
        />
      </ModelContext.Provider>
    </Fieldset>
  );
}

VflzUmwelt.fragment = gql`
  fragment VflzUmwelt on Vflz {
    bemerkungUmwelt {
      ...BemErfassungMutation
    }
  }
`;

VflzUmwelt.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["bemerkungUmwelt"],
    id: "umwelt",
    legend: t("vflz.data.umwelt"),
  };
};

const emptyUmweltStoff = {
  beurteilung: null,
  gefaehrdeteBereiche: null,
  stoff: null,
  stoffeId: null,
  stoffGruppe: null,
};

function VflzUmweltStoffe() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="umwelt-stoffe"
      legend={t("vflz.data.umweltStoffe")}
      mutationInfo={[
        ...(getValues("umweltStoffe") || []).map((u) => {
          return u.erfassungMutation;
        }),
      ]}
    >
      <FieldArray<UmweltStoffInput>
        addLabel={t("umweltStoffe.addLabel")}
        data-test="vflzDataFormUmweltStoffe"
        model="UmweltStoff"
        name="umweltStoffe"
        value={emptyUmweltStoff}
      >
        {(i1) => {
          return (
            <div className="mr-8 grid grid-cols-2 gap-5">
              <CodeListbox name={`umweltStoffe.${i1}.stoffGruppe`} />
              <CodeListbox name={`umweltStoffe.${i1}.stoff`} />
              <CodeListbox name={`umweltStoffe.${i1}.gefaehrdeteBereiche`} />
              <CodeListbox name={`umweltStoffe.${i1}.beurteilung`} />
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzUmweltStoffe.fragment = gql`
  fragment VflzUmweltStoffe on Vflz {
    umweltStoffe {
      stoffeId
      beurteilung
      gefaehrdeteBereiche
      stoff
      stoffGruppe
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzUmweltStoffe.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["umweltStoffe"],
    id: "umwelt-stoffe",
    legend: t("vflz.data.umweltStoffe"),
  };
};

VflzUmweltStoffe.toInput = (
  umweltStoffe: VflzDataQuery["vflz"]["umweltStoffe"] = [],
): UmweltStoffInput[] => {
  return umweltStoffe.map(removeErfassungMutation).filter((umweltStoff) => {
    return !isEqual(umweltStoff, emptyUmweltStoff);
  });
};

const emptyNutzungBoden = {
  aktuelleNutzung: null,
  nuboId: null,
  nutzungsart: null,
};

function VflzNutzungenBoden() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="nutzungen-boden"
      legend={t("vflz.data.nutzungenBoden")}
      mutationInfo={[
        ...(getValues("nutzungenBoden") || []).map((u) => {
          return u.erfassungMutation;
        }),
      ]}
    >
      <FieldArray<NutzungBodenInput>
        addLabel={t("nutzungenBoden.addLabel")}
        data-test="vflzDataFormNutzungenBoden"
        model="NutzungBoden"
        name="nutzungenBoden"
        value={emptyNutzungBoden}
      >
        {(i1) => {
          return (
            <div className="mr-8 grid grid-cols-2 gap-5">
              <CodeListbox name={`nutzungenBoden.${i1}.nutzungsart`} />
              <CodeListbox name={`nutzungenBoden.${i1}.aktuelleNutzung`} />
            </div>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzNutzungenBoden.fragment = gql`
  fragment VflzNutzungenBoden on Vflz {
    nutzungenBoden {
      nuboId
      nutzungsart
      aktuelleNutzung
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzNutzungenBoden.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["nutzungenBoden"],
    id: "nutzungen-boden",
    legend: t("vflz.data.nutzungenBoden"),
  };
};

VflzNutzungenBoden.toInput = (
  nutzungenBoden: VflzDataQuery["vflz"]["nutzungenBoden"] = [],
): NutzungBodenInput[] => {
  return nutzungenBoden.map(removeErfassungMutation).filter((nutzungBoden) => {
    return !isEqual(nutzungBoden, emptyNutzungBoden);
  });
};

const emptyUmweltschaden = {
  artSchaden: null,
  bemerkung: null,
  schaeden: null,
  vfusId: null,
};

function VflzUmweltschaeden() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="umweltschaeden"
      legend={t("vflz.data.umweltschaeden")}
      mutationInfo={
        [
          ...(getValues("umweltschaeden") || [])
            .map((u) => {
              return [u.erfassungMutation, u.bemerkung?.erfassungMutation];
            })
            .flat(),
        ] as MutationInfoFragment[]
      }
    >
      <FieldArray<UmweltschadenInput>
        addLabel={t("umweltschaeden.addLabel")}
        data-test="vflzDataFormUmweltschaeden"
        model="Umweltschaden"
        name="umweltschaeden"
        value={emptyUmweltschaden}
      >
        {(i1) => {
          return (
            <>
              <div className="mr-8 grid grid-cols-2 gap-5">
                <CodeListbox name={`umweltschaeden.${i1}.artSchaden`} />
                <CodeListbox name={`umweltschaeden.${i1}.schaeden`} />
              </div>
              <ModelContext.Provider value="Umweltschaden.bemerkung">
                <Textarea
                  name={`umweltschaeden.${i1}.bemerkung.bem`}
                  placeholder={t("umweltschaeden.bemerkungPlaceholder")}
                />
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzUmweltschaeden.fragment = gql`
  fragment VflzUmweltschaeden on Vflz {
    umweltschaeden {
      vfusId
      artSchaden
      schaeden
      bemerkung {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzUmweltschaeden.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["umweltschaeden"],
    id: "umweltschaeden",
    legend: t("vflz.data.umweltschaeden"),
  };
};

VflzUmweltschaeden.toInput = (
  umweltschaeden: VflzDataQuery["vflz"]["umweltschaeden"] = [],
): UmweltschadenInput[] => {
  return umweltschaeden
    .map((umweltschaden) => {
      return removeErfassungMutation({
        ...umweltschaden,
        bemerkung: toBemerkungInput(umweltschaden.bemerkung),
      });
    })
    .filter((umweltschaden) => {
      return !isEqual(umweltschaden, emptyUmweltschaden);
    });
};

const emptyEinzelereignis = {
  bemerkung: null,
  datum: null,
  einzelereignis: null,
  veenId: null,
};

function VflzEinzelereignisse() {
  const { getValues } = useFormContext<VflzDataFormFragment>();
  const { t } = useI18n();
  return (
    <Fieldset
      id="einzelereignisse"
      legend={t("vflz.data.einzelereignisse")}
      mutationInfo={
        [
          ...(getValues("einzelereignisse") || [])
            .map((u) => {
              return [u.erfassungMutation, u.bemerkung?.erfassungMutation];
            })
            .flat(),
        ] as MutationInfoFragment[]
      }
    >
      <FieldArray<EinzelereignisInput>
        addLabel={t("einzelereignisse.addLabel")}
        data-test="vflzDataFormEinzelereignisse"
        model="Einzelereignis"
        name="einzelereignisse"
        value={emptyEinzelereignis}
      >
        {(i1) => {
          return (
            <>
              <div className="mr-8 grid grid-cols-2 gap-5">
                <DatePicker name={`einzelereignisse.${i1}.datum`} />
                <CodeListbox name={`einzelereignisse.${i1}.einzelereignis`} />
              </div>
              <ModelContext.Provider value="Einzelereignis.bemerkung">
                <Textarea
                  name={`einzelereignisse.${i1}.bemerkung.bem`}
                  placeholder={t("einzelereignisse.bemerkungPlaceholder")}
                />
              </ModelContext.Provider>
            </>
          );
        }}
      </FieldArray>
    </Fieldset>
  );
}

VflzEinzelereignisse.fragment = gql`
  fragment VflzEinzelereignisse on Vflz {
    einzelereignisse {
      veenId
      einzelereignis
      datum
      bemerkung {
        ...BemErfassungMutation
      }
      erfassungMutation {
        ...MutationInfo
      }
    }
  }
`;

VflzEinzelereignisse.getNavItem = (t: tFunction): AnchorNavItem => {
  return {
    fields: ["einzelereignisse"],
    id: "einzelereignisse",
    legend: t("vflz.data.einzelereignisse"),
  };
};

VflzEinzelereignisse.toInput = (
  einzelereignisse: VflzDataQuery["vflz"]["einzelereignisse"] = [],
): EinzelereignisInput[] => {
  return einzelereignisse
    .map((einzelereignis) => {
      const einzelereignisOmit = removeErfassungMutation(einzelereignis);
      return {
        ...einzelereignisOmit,
        bemerkung: toBemerkungInput(einzelereignis.bemerkung),
      };
    })
    .filter((einzelereignis) => {
      return !isEqual(einzelereignis, emptyEinzelereignis);
    });
};

const vflzDataformFragment = gql`
  fragment VflzDataForm on Vflz {
    vflzId
    isCurrent
    ...VflzBasedata
    ...VflzAblagerungen
    ...VflzBetriebe
    ...VflzUnfaelle
    ...VflzKinderspielplaetzeGruenflaechen
    ...VflzPFAS
    ...VflzUmfeld
    ...VflzGrundwasser
    ...VflzOberflaechenGewaesser
    ...VflzUmwelt
    ...VflzUmweltStoffe
    ...VflzNutzungenBoden
    ...VflzUmweltschaeden
    ...VflzEinzelereignisse
  }
  ${mutationInfoFragment}
  ${VflzBasedata.fragment}
  ${VflzAblagerungen.fragment}
  ${VflzBetriebe.fragment}
  ${VflzUnfaelle.fragment}
  ${VflzKinderspielplaetzeGruenflaechen.fragment}
  ${VflzPFAS.fragment}
  ${VflzUmfeld.fragment}
  ${VflzGrundwasser.fragment}
  ${VflzOberflaechenGewaesser.fragment}
  ${VflzUmwelt.fragment}
  ${VflzUmweltStoffe.fragment}
  ${VflzNutzungenBoden.fragment}
  ${VflzUmweltschaeden.fragment}
  ${VflzEinzelereignisse.fragment}
  ${ZeitraumFields.fragment}
  ${ZeitraumFields.fragmentMitGenauigkeit}
  fragment BemErfassungMutation on Bemerkung {
    bem
    erfassungMutation {
      ...MutationInfo
    }
  }
`;

const queryValidateVflzData = gql`
  query validateVflzData($vflzId: ID!) {
    validateVflzData(vflzId: $vflzId) {
      __typename
      ... on ValidatedVflzData {
        ort
        postleitzahl
        flugplatz
        gemeinde {
          __typename
          displayValue
          hGemId
          kanton
        }
        gwsBereich
        gwsZone
      }
    }
  }
`;

const queryVflzData = gql`
  query VflzData($vflzId: ID!) {
    vflz(vflzId: $vflzId) {
      ...VflzDataForm
      ...VflzLayout
      datRechtskraft
      datPublizieren
      isCurrent
      message
      readOnly
      vftypEnum
    }
  }
  ${vflzDataformFragment}
  ${VflzLayout.fragment}
`;

const updateVflzDataMutation = gql`
  mutation updateVflzData($data: UpdateVflzDataInput!) {
    updateVflzData(data: $data) {
      __typename
      ... on Vflz {
        ...VflzDataForm
        ...VflzLayout
        datRechtskraft
        datPublizieren
        isCurrent
        message
        readOnly
        vftypEnum
      }
      ... on ProblemGroup {
        ...FormProblems
      }
    }
  }
  ${vflzDataformFragment}
  ${Form.fragment}
  ${VflzLayout.fragment}
`;

function getVflzData(
  data: VflzDataQuery["vflz"],
): Required<UpdateVflzDataInput> {
  return {
    ablagerungen: VflzAblagerungen.toInput(data.ablagerungen),
    bemerkungDatenimport: toBemerkungInput(data.bemerkungDatenimport),
    bemerkungStandort: toBemerkungInput(data.bemerkungStandort),
    bemerkungUmwelt: toBemerkungInput(data.bemerkungUmwelt),
    betriebe: VflzBetriebe.toInput(data.betriebe),
    bezeichnung: data.bezeichnung ?? null,
    deponietyp: data.deponietyp ?? null,
    durchlaessigkeit: data.durchlaessigkeit ?? null,
    einzelereignisse: VflzEinzelereignisse.toInput(data.einzelereignisse), // prettier-ignore
    flugplatz: data.flugplatz ?? null,
    flurname: data.flurname ?? null,
    gemeinde: data.gemeinde ? { hGemId: data.gemeinde.hGemId } : null,
    grundwasser: VflzGrundwasser.toInput(data.grundwasser),
    gwsBereich: data.gwsBereich ?? null,
    gwsZone: data.gwsZone ?? null,
    inBetrieb: data.inBetrieb ?? null,
    karstgeb: data.karstgeb ?? null,
    kinderspielplaetzeGruenflaechen:
      VflzKinderspielplaetzeGruenflaechen.toInput(data.kinderspielplaetzeGruenflaechen), // prettier-ignore
    ktu: data.ktu ?? null,
    lang: data.lang ?? null,
    nachsorge: data.nachsorge ?? null,
    nutzungenBoden: VflzNutzungenBoden.toInput(data.nutzungenBoden),
    oberflaechenGewaesser: VflzOberflaechenGewaesser.toInput(data.oberflaechenGewaesser), // prettier-ignore
    ort: data.ort ?? null,
    pfas: VflzPFAS.toInput(data.pfas),
    postleitzahl: data.postleitzahl ?? null,
    schiessanlagen: VflzBetriebe.toInput(data.schiessanlagen),
    strasse: data.strasse ?? null,
    umweltschaeden: VflzUmweltschaeden.toInput(data.umweltschaeden), // prettier-ignore
    umweltStoffe: VflzUmweltStoffe.toInput(data.umweltStoffe),
    unfaelle: VflzUnfaelle.toInput(data.unfaelle),
    vflzId: data.vflzId,
  };
}

function VflzValidatedData() {
  const { vflzId } = useRouter().query;
  const { setValidatedData } = useValidatedData();

  const { data } = useSWR<ValidateVflzDataQuery>(
    vflzId && [queryValidateVflzData, { vflzId }],
    {
      refreshInterval: (result) => {
        if (result?.validateVflzData.__typename === "ValidatedVflzData") {
          return 0;
        }
        return 1000; // 1 second
      },
    },
  );

  useEffect(() => {
    if (data?.validateVflzData.__typename === "ValidatedVflzData") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { __typename, ...validatedData } = data.validateVflzData;
      setValidatedData(validatedData);
    }
  }, [data?.validateVflzData, setValidatedData]);

  return null;
}

export default function VflzDataPage() {
  const { permissions } = useCurrentUser();
  const { t } = useI18n();
  const { vflzId } = useRouter().query;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, error, mutate } = useSWR<VflzDataQuery>(
    vflzId && [queryVflzData, { vflzId }],
  );

  const anchorNavItems: AnchorNavItem[] = [
    VflzBasedata.getNavItem(t),
    data?.vflz.vftypEnum === StandortTyp.Ablagerung
      ? VflzAblagerungen.getNavItem(t)
      : null,
    data?.vflz.vftypEnum === StandortTyp.Betrieb
      ? VflzBetriebe.getNavItem(t)
      : null,
    data?.vflz.vftypEnum === StandortTyp.Schiessanlage
      ? VflzBetriebe.getNavItem(t, "Schiessanlage")
      : null,
    data?.vflz.vftypEnum === StandortTyp.Unfall
      ? VflzUnfaelle.getNavItem(t)
      : null,
    data?.vflz.vftypEnum === StandortTyp.KinderspielplatzGruenflaeche
      ? VflzKinderspielplaetzeGruenflaechen.getNavItem(t)
      : null,
    data?.vflz.vftypEnum === StandortTyp.Pfas ? VflzPFAS.getNavItem(t) : null,
    VflzUmfeld.getNavItem(t),
    VflzGrundwasser.getNavItem(t),
    VflzOberflaechenGewaesser.getNavItem(t),
    VflzUmwelt.getNavItem(t),
    VflzUmweltStoffe.getNavItem(t),
    VflzNutzungenBoden.getNavItem(t),
    VflzUmweltschaeden.getNavItem(t),
    VflzEinzelereignisse.getNavItem(t),
  ].filter(Boolean) as AnchorNavItem[];

  return (
    <VflzLayout error={error as unknown} vflz={data?.vflz}>
      <Form<VflzDataQuery["vflz"]>
        className="flex grow space-x-5"
        data-test="vflzDataForm"
        disabled={data?.vflz.readOnly || !permissions.canEditVfl}
        model="Vflz"
        onSubmit={async (values) => {
          const { updateVflzData } =
            await client.request<UpdateVflzDataMutation>(
              updateVflzDataMutation,
              { data: getVflzData(values) },
            );
          if (updateVflzData.__typename === "Vflz") {
            await mutate({ vflz: updateVflzData }, { revalidate: false });
          } else {
            return updateVflzData; // ProblemGroup
          }
        }}
        values={data?.vflz}
      >
        <AnchorNavigation items={anchorNavItems} />
        <div className="grow space-y-5">
          <VflzValidatedData />
          <VflzBasedata
            vflzId={vflzId?.toString()}
            zeitraum={getZeitraum(t, data?.vflz)}
          />
          {data?.vflz.vftypEnum === StandortTyp.Ablagerung ? (
            <VflzAblagerungen />
          ) : null}
          {data?.vflz.vftypEnum === StandortTyp.Betrieb ? (
            <VflzBetriebe />
          ) : null}
          {data?.vflz.vftypEnum === StandortTyp.Schiessanlage ? (
            <VflzBetriebe model="Schiessanlage" />
          ) : null}
          {data?.vflz.vftypEnum === StandortTyp.Unfall ? (
            <VflzUnfaelle />
          ) : null}
          {data?.vflz.vftypEnum === StandortTyp.KinderspielplatzGruenflaeche ? (
            <VflzKinderspielplaetzeGruenflaechen />
          ) : null}
          {data?.vflz.vftypEnum === StandortTyp.Pfas ? <VflzPFAS /> : null}
          <VflzUmfeld />
          <VflzGrundwasser />
          <VflzOberflaechenGewaesser />
          <VflzUmwelt />
          <VflzUmweltStoffe />
          <VflzNutzungenBoden />
          <VflzUmweltschaeden />
          <VflzEinzelereignisse />
          {permissions.canEditVfl ? (
            <VflzActionMenu
              canEditVollzug={data?.vflz.isCurrent && permissions.canEditVfl}
              mutatePage={mutate}
            />
          ) : null}
        </div>
      </Form>
    </VflzLayout>
  );
}
