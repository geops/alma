import ablagerungsstandort from "../../fixtures/vflz/data/ablagerungsstandort.json";
import betriebsstandort from "../../fixtures/vflz/data/betriebsstandort.json";
import kinderspielplatz from "../../fixtures/vflz/data/kinderspielplatz.json";
import pfasstandort from "../../fixtures/vflz/data/pfasstandort.json";
import schiessanlagenstandort from "../../fixtures/vflz/data/schiessanlagenstandort.json";
import unfallstandort from "../../fixtures/vflz/data/unfallstandort.json";

function expectUpdateVflzSuccess(result: { response?: { body: unknown } }) {
  expect(result?.response?.body).to.nested.include({
    "data.updateVflzData.__typename": "Vflz",
  });
}

function formFind(selector: string) {
  return cy.get("form[data-test=vflzDataForm]").find(selector);
}

function formFindFieldArrayAddButtonClick(selector: string) {
  formFind(`${selector} > [data-test=FieldArrayAddButton]`).last().click();
}

function formFindContains(selector: string, value: string) {
  formFind(selector).contains(value);
}

function formFindHasValue(selector: string, value: string) {
  formFind(selector).should("have.value", value);
}

function formFindMutationInfo(selector: string, value: string) {
  formFind(selector)
    .closest("fieldset")
    .find("div[data-test=MutationInfo]")
    .contains(value);
}

function formFindNotExist(selector: string) {
  formFind(selector).should("not.exist");
}

function formFindDataValidation(selector: string, value: string) {
  formFind(selector)
    .parent()
    .find(
      "[data-test=ValidationPopover-button] svg[data-test=ValidationPopover-info]",
    )
    .click();
  cy.get("[data-test=ValidationPopover-panel] button").contains(value).click();
  if (selector.includes("button")) {
    formFindContains(selector, value);
  } else {
    formFindHasValue(selector, value);
  }
  formFind(selector)
    .parent()
    .find(
      "[data-test=ValidationPopover-button] svg[data-test=ValidationPopover-success]",
    )
    .should("be.visible");
}

function formFindDataValidationEmpty(selector: string) {
  formFind(selector)
    .parent()
    .find(
      "[data-test=ValidationPopover-button] [data-test=ValidationPopover-info]",
    )
    .click();
  cy.get(
    "[data-test=ValidationPopover-panel] [data-test=Field-validatedDataEmpty]",
  ).should("be.visible");
}

function comboboxSelect(selector: string, value: string) {
  formFind(selector).next().click();
  cy.get("div[role=listbox] div[role=option]").contains(value).click();
}

function listboxSelect(selector: string, value: string) {
  formFind(selector).click();
  cy.get("div[role=listbox] div[role=option]").contains(value).click();
}

describe("Vflz data page", () => {
  beforeEach(() => {
    cy.intercept<{ query: string }>("POST", "/graphql", (req) => {
      if (req.body.query.includes("query VflzData")) {
        req.alias = "VflzData";
      } else if (req.body.query.includes("mutation updateVflzData")) {
        req.alias = "updateVflzData";
      }
    });

    let waitForResizeObserver = false;
    cy.on("uncaught:exception", (err) => {
      if (err.message.includes("ResizeObserver")) {
        waitForResizeObserver = true;
        return false;
      }
      if (err.message.includes("cancelRouteChange")) {
        return false;
      }
      return false;
    });
    if (waitForResizeObserver) {
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500); // wait for ResizeObserver to settle
    }
  });

  afterEach(() => {
    cy.triggerGarbageCollection();
  });

  // it.only("resets fixtures", () => {
  //   cy.resetFixture("ablagerungsstandort");
  //   cy.resetFixture("betriebsstandort");
  //   cy.resetFixture("unfallstandort");
  //   cy.resetFixture("schiessanlagenstandort");
  //   cy.resetFixture("kinderspielplatz");
  //   cy.resetFixture("pfasstandort");
  // });

  describe("Ablagerungsstandort", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
      cy.triggerGarbageCollection();
    });

    it("limits Kompartimente additions using the admin setting", () => {
      cy.resetFixture("ablagerungsstandort");
      cy.stubSettings([{ key: "ui.ablagerungen.maxKompartimente", value: 1 }]);
      cy.visit("/vflz/1/data");
      cy.wait("@VflzData");

      const addButton =
        "[data-test=vflzDataFormAblagerungen] > [data-test=FieldArrayAddButton]";
      formFind(addButton).should("not.exist");
      formFind('button[name="ablagerungen.0.remove"]').click();
      formFind(addButton).should("be.visible").click();
      formFind(addButton).should("not.exist");
    });

    it("reads and updates values for Ablagerungsstandort", () => {
      cy.resetFixture("ablagerungsstandort");
      cy.resetFixture("vollzug");
      cy.updateAdminSetting("ui.fields.Vflz.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Vflz.flugplatz.hidden", false);
      cy.updateAdminSetting("ui.fields.Vflz.flurname.hidden", false);
      cy.updateAdminSetting("ui.fields.Vflz.ktu.hidden", false);
      cy.updateAdminSetting("ui.fields.Vflz.lang.hidden", false);
      cy.updateAdminSetting("ui.fields.Ablagerung.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Ablagerung.tiefe.hidden", false);
      cy.updateAdminSetting("ui.fields.Ablagerung.bis.hidden", false);
      cy.updateAdminSetting("ui.fields.Ablagerung.von.hidden", false);
      cy.updateAdminSetting("ui.fields.KompartimentStoffgruppe.teilvol.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.teilvol.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.genauigkeitBis.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.genauigkeitVon.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.bis.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.von.hidden", false); // prettier-ignore

      cy.visit("/vflz/1/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* READ values */
      cy.get("[data-test=VflzLayout-header]")
        .should("contain", "A1")
        .and("contain", ablagerungsstandort.bezeichnung);
      cy.get("[data-test=VflzLayout-sidebar-versionen] tr")
        .eq(0)
        .should("contain", "01.10.2024")
        .and("contain", "Foobar");

      formFindHasValue("input[name=bezeichnung]", ablagerungsstandort.bezeichnung); // prettier-ignore
      formFindContains("button[name='flugplatz']", "Dubai");
      formFindContains("button[name=ktu]", "Basel-Landschaft");
      formFindHasValue("input[name=flurname]", ablagerungsstandort.flurname);
      formFindHasValue("input[name=strasse]", ablagerungsstandort.strasse);
      formFindHasValue("input[disabled][name='gemeinde.displayValue']", "Foo (0001)"); // prettier-ignore
      formFindHasValue("input[name=postleitzahl]", ablagerungsstandort.postleitzahl); // prettier-ignore
      formFindHasValue("input[name=ort]", ablagerungsstandort.ort);
      formFindHasValue("div[data-test=vflzDataFormKanton] input[disabled]", "ZH"); // prettier-ignore
      formFindHasValue("[data-test=vflzDataFormEast] input[disabled]", "2606760"); // prettier-ignore
      formFindHasValue("[data-test=vflzDataFormNorth] input[disabled]", "1228620"); // prettier-ignore
      formFindHasValue("input[disabled][name='zentroid.coordinates.2']", "430");
      formFindHasValue("input[disabled][name=flaeche]", "10000");
      formFindHasValue("[data-test=vflzDataFormZeitraum] input[disabled]", "01.08.1980 - 01.02.2010"); // prettier-ignore
      formFindContains("button[name=lang]", "Deutsch");
      formFindHasValue(
        "textarea[name='bemerkungStandort.bem']",
        ablagerungsstandort.bemerkungStandort.bem,
      );
      formFindHasValue(
        "textarea[name='bemerkungDatenimport.bem']",
        ablagerungsstandort.bemerkungDatenimport.bem,
      );
      formFindContains("button[name=inBetrieb]", "Ja");
      formFindContains("button[name=nachsorge]", "Nein");
      formFindContains("button[name=deponietyp]", "Deponietyp B");

      /* ablagerungen */
      formFindContains(
        "[data-test=vflzDataFormAblagerungen] h3",
        "101 m³, 01.08.1980 - 01.02.2010, 1 Stoffklasse",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.volKompartiment']",
        ablagerungsstandort.ablagerungen[0].volKompartiment.toString(),
      );
      formFindHasValue(
        "input[name='ablagerungen.0.tiefe']",
        ablagerungsstandort.ablagerungen[0].tiefe,
      );
      formFindHasValue(
        "input[name='ablagerungen.0.zeitraum.von']",
        "01.08.1980",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.zeitraum.bis']",
        "01.02.2010",
      );
      formFindHasValue(
        "textarea[name='ablagerungen.0.bemerkung.bem']",
        ablagerungsstandort.ablagerungen[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='ablagerungen.0.bemerkungDatenimport.bem']",
        ablagerungsstandort.ablagerungen[0].bemerkungDatenimport.bem,
      );

      cy.triggerGarbageCollection();
      /* kompartimentStoffklassen */
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.stoffklasse']",
        "Leere Grube",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.teilvol']",
        ablagerungsstandort.ablagerungen[0].kompartimentStoffklassen[0].teilvol.toString(),
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.von']",
        "01.08.1980",
      );
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.bis']",
        "01.02.2010",
      );
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitBis']",
        "gut bekannt",
      );

      cy.triggerGarbageCollection();
      /* kompartimentStoffgruppen */
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.stoffgruppe']",
        "Stoffe der Klasse IV: Stoffgruppe A1",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.teilvol']",
        ablagerungsstandort.ablagerungen[0].kompartimentStoffklassen[0].kompartimentStoffgruppen[0].teilvol.toString(),
      );

      cy.triggerGarbageCollection();
      /* Umwelt */
      formFindContains(
        "button[name='gwsBereich']",
        "Gewässerschutzbereich A (alt)",
      );
      formFindContains("button[name='gwsZone']", "Schutzzone S1");
      formFindContains("button[name='karstgeb']", "Ja");
      formFindContains(
        "button[name='durchlaessigkeit']",
        "erhöhte Durchlässigkeit durch technische Eingriffe",
      );
      formFindHasValue(
        "textarea[name='bemerkungUmwelt.bem']",
        ablagerungsstandort.bemerkungUmwelt.bem,
      );

      cy.triggerGarbageCollection();
      /* Grundwasser */
      formFindContains(
        "button[name='grundwasser.0.relativeLage']",
        "Standort liegt über GW",
      );
      formFindHasValue(
        "input[name='grundwasser.0.flurabstand']",
        ablagerungsstandort.grundwasser[0].flurabstand.toString(),
      );
      formFindContains("button[name='grundwasser.0.nutzung']", "Brauchwasser");
      formFindHasValue(
        "input[name='grundwasser.0.distanz']",
        ablagerungsstandort.grundwasser[0].distanz.toString(),
      );

      cy.triggerGarbageCollection();
      /* OberflaechenGewaesser */
      formFindHasValue(
        "input[name='oberflaechenGewaesser.0.name']",
        ablagerungsstandort.oberflaechenGewaesser[0].name,
      );
      formFindHasValue(
        "input[name='oberflaechenGewaesser.0.distanz']",
        ablagerungsstandort.oberflaechenGewaesser[0].distanz.toString(),
      );
      formFindContains(
        "button[name='oberflaechenGewaesser.0.artGewaesser']",
        "unbekannt",
      );
      formFindContains(
        "button[name='oberflaechenGewaesser.0.bauGewaesser']",
        "unbekannt",
      );
      formFindContains(
        "button[name='oberflaechenGewaesser.0.relativeLage']",
        "Gewässer unterhalb des Standorts",
      );

      cy.triggerGarbageCollection();
      /* UmweltStoffe */
      formFindContains("button[name='umweltStoffe.0.stoffGruppe']", "CKW");
      formFindContains("button[name='umweltStoffe.0.stoff']", "Vinylchlorid");
      formFindContains(
        "button[name='umweltStoffe.0.gefaehrdeteBereiche']",
        "Untergrund",
      );
      formFindContains(
        "button[name='umweltStoffe.0.beurteilung']",
        "Überwachungsbedarf",
      );

      cy.triggerGarbageCollection();
      /* NutzungenBode */
      formFindContains("button[name='nutzungenBoden.0.nutzungsart']", "Wald");
      formFindContains(
        "button[name='nutzungenBoden.0.aktuelleNutzung']",
        "geschlossener Wald",
      );

      cy.triggerGarbageCollection();
      /* Umweltschaeden */
      formFindContains(
        "button[name='umweltschaeden.0.artSchaden']",
        "Grundwasser",
      );
      formFindContains("button[name='umweltschaeden.0.schaeden']", "Trübung");
      formFindHasValue(
        "textarea[name='umweltschaeden.0.bemerkung.bem']",
        ablagerungsstandort.umweltschaeden[0].bemerkung.bem,
      );

      /* Einzelereignisse */
      formFindHasValue("input[name='einzelereignisse.0.datum']", "03.02.2020");
      formFindContains(
        "button[name='einzelereignisse.0.einzelereignis']",
        "Ablagerung: Geländeinstabilität (Sackung, Rutschung, Senkung, Setzung)",
      );
      formFindHasValue(
        "textarea[name='einzelereignisse.0.bemerkung.bem']",
        ablagerungsstandort.einzelereignisse[0].bemerkung.bem,
      );

      cy.triggerGarbageCollection();
      /* UPDATE values */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name=bezeichnung]").type(random);
      listboxSelect("button[name='flugplatz']", "Zürich");
      listboxSelect("button[name=ktu]", "SBB");
      formFind("input[name=flurname]").type(random);
      formFind("input[name=strasse]").type(random);
      formFind("input[name=postleitzahl]").type(random);
      formFind("input[name=ort]").type(random);
      listboxSelect("button[name=lang]", "Französisch");
      formFind("textarea[name='bemerkungStandort.bem']").type(random);
      formFind("textarea[name='bemerkungDatenimport.bem']").type(random);
      listboxSelect("button[name=inBetrieb]", "Nein");
      listboxSelect("button[name=nachsorge]", "Ja");
      listboxSelect("button[name=deponietyp]", "Deponietyp C");

      /* ablagerungen */
      formFind("input[name='ablagerungen.0.volKompartiment']").type("1");
      formFind("input[name='ablagerungen.0.tiefe']").type("1");
      formFind("input[name='ablagerungen.0.zeitraum.von']").type("{backspace}1"); // prettier-ignore
      formFind("input[name='ablagerungen.0.zeitraum.bis']").type("{backspace}1"); // prettier-ignore
      formFind("textarea[name='ablagerungen.0.bemerkung.bem']").type(random);
      formFind("textarea[name='ablagerungen.0.bemerkungDatenimport.bem']").type(random); // prettier-ignore

      cy.triggerGarbageCollection();
      /* kompartimentStoffklassen */
      listboxSelect(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.stoffklasse']",
        "Abgelagertes Material unbekannt",
      );
      formFind(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.teilvol']",
      ).type("1");
      formFind(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.von']",
      ).type("{backspace}1");
      listboxSelect(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFind(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.bis']",
      ).type("{backspace}1");
      listboxSelect(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );

      cy.triggerGarbageCollection();
      /* kompartimentStoffgruppen */
      comboboxSelect(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.stoffgruppe']",
        "Stoffe der Klasse I: Stoffgruppe A",
      );
      formFind(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.teilvol']",
      ).type("1");

      cy.triggerGarbageCollection();
      /* Umwelt */
      listboxSelect("button[name='gwsBereich']", "Gewässerschutzbereich Au");
      listboxSelect("button[name='gwsZone']", "Schutzzone S2");
      listboxSelect("button[name='karstgeb']", "vermutlich Nein");
      listboxSelect(
        "button[name='durchlaessigkeit']",
        "Fels mit grosser Durchlässigkeit",
      );
      formFind("textarea[name='bemerkungUmwelt.bem']").type(random);

      cy.triggerGarbageCollection();
      /* Grundwasser */
      listboxSelect(
        "button[name='grundwasser.0.relativeLage']",
        "Standort liegt am Rande eines GW",
      );
      formFind("input[name='grundwasser.0.flurabstand']").type("1");
      listboxSelect("button[name='grundwasser.0.nutzung']", "Landwirtschaft");
      formFind("input[name='grundwasser.0.distanz']").type("1");

      cy.triggerGarbageCollection();
      /* OberflaechenGewaesser */
      formFind("input[name='oberflaechenGewaesser.0.name']").type(random);
      formFind("input[name='oberflaechenGewaesser.0.distanz']").type("1");
      listboxSelect(
        "button[name='oberflaechenGewaesser.0.artGewaesser']",
        "kein Oberflächengewässer",
      );
      listboxSelect(
        "button[name='oberflaechenGewaesser.0.bauGewaesser']",
        "verbaut",
      );
      listboxSelect(
        "button[name='oberflaechenGewaesser.0.relativeLage']",
        "nicht relevant",
      );

      cy.triggerGarbageCollection();
      /* UmweltStoffe */
      listboxSelect("button[name='umweltStoffe.0.stoffGruppe']", "BTEX");
      listboxSelect("button[name='umweltStoffe.0.stoff']", "Benzol");
      listboxSelect(
        "button[name='umweltStoffe.0.gefaehrdeteBereiche']",
        "Boden",
      );
      listboxSelect(
        "button[name='umweltStoffe.0.beurteilung']",
        "Sanierungsbedarf",
      );

      cy.triggerGarbageCollection();
      /* NutzungenBode */
      listboxSelect(
        "button[name='nutzungenBoden.0.nutzungsart']",
        "Siedlungsgebiet",
      );
      listboxSelect(
        "button[name='nutzungenBoden.0.aktuelleNutzung']",
        "Wohn- / Schulanlage",
      );

      cy.triggerGarbageCollection();
      /* Umweltschaeden */
      listboxSelect("button[name='umweltschaeden.0.artSchaden']", "Luft");
      listboxSelect("button[name='umweltschaeden.0.schaeden']", "Ätzung");
      formFind("textarea[name='umweltschaeden.0.bemerkung.bem']").type(random);

      cy.triggerGarbageCollection();
      /* Einzelereignisse */
      formFind("input[name='einzelereignisse.0.datum']").type("{backspace}4");
      listboxSelect(
        "button[name='einzelereignisse.0.einzelereignis']",
        "Staubemissionen",
      );
      formFind("textarea[name='einzelereignisse.0.bemerkung.bem']").type(random); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      cy.get("[data-test=VflzLayout-header]").contains(ablagerungsstandort.bezeichnung + random); // prettier-ignore
      formFindMutationInfo("#basedata", "bearbeiten-sachdaten");
      formFindHasValue("input[name=bezeichnung]", ablagerungsstandort.bezeichnung + random); // prettier-ignore
      formFindHasValue("input[name=flurname]", ablagerungsstandort.flurname + random); // prettier-ignore
      formFindHasValue("input[name=strasse]", ablagerungsstandort.strasse + random); // prettier-ignore
      formFindHasValue("input[name=postleitzahl]", ablagerungsstandort.postleitzahl + random); // prettier-ignore
      formFindHasValue("input[name=ort]", ablagerungsstandort.ort + random);
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "01.08.1981 - 01.02.2011",
      );
      formFindContains("button[name='flugplatz']", "Zürich");
      formFindContains("button[name=ktu]", "SBB");
      formFindContains("button[name=lang]", "Französisch");
      formFindHasValue(
        "textarea[name='bemerkungStandort.bem']",
        ablagerungsstandort.bemerkungStandort.bem + random,
      );
      formFindHasValue(
        "textarea[name='bemerkungDatenimport.bem']",
        ablagerungsstandort.bemerkungDatenimport.bem + random,
      );
      formFindContains("button[name=inBetrieb]", "Nein");
      formFindContains("button[name=nachsorge]", "Ja");
      formFindContains("button[name=deponietyp]", "Deponietyp C");

      cy.triggerGarbageCollection();
      /* ablagerungen */
      formFindMutationInfo("#ablagerungen", "bearbeiten-sachdaten");
      formFindContains(
        "[data-test=vflzDataFormAblagerungen] h3",
        "1011 m³, 01.08.1981 - 01.02.2011, 1 Stoffklasse",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.volKompartiment']",
        `${ablagerungsstandort.ablagerungen[0].volKompartiment.toString()}1`,
      );
      formFindHasValue(
        "input[name='ablagerungen.0.tiefe']",
        `${ablagerungsstandort.ablagerungen[0].tiefe}1`,
      );
      formFindHasValue(
        "input[name='ablagerungen.0.zeitraum.von']",
        "01.08.1981",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.zeitraum.bis']",
        "01.02.2011",
      );
      formFindHasValue(
        "textarea[name='ablagerungen.0.bemerkung.bem']",
        ablagerungsstandort.ablagerungen[0].bemerkung.bem + random,
      );
      formFindHasValue(
        "textarea[name='ablagerungen.0.bemerkungDatenimport.bem']",
        ablagerungsstandort.ablagerungen[0].bemerkungDatenimport.bem + random,
      );

      cy.triggerGarbageCollection();
      /* kompartimentStoffklassen */
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.stoffklasse']",
        "Abgelagertes Material unbekannt",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.teilvol']",
        `${ablagerungsstandort.ablagerungen[0].kompartimentStoffklassen[0].teilvol.toString()}1`,
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.von']",
        "01.08.1981",
      );
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.bis']",
        "01.02.2011",
      );
      formFindContains(
        "button[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );

      cy.triggerGarbageCollection();
      /* kompartimentStoffgruppen */
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.stoffgruppe']",
        "Stoffe der Klasse I: Stoffgruppe A",
      );
      formFindHasValue(
        "input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.teilvol']",
        `${ablagerungsstandort.ablagerungen[0].kompartimentStoffklassen[0].kompartimentStoffgruppen[0].teilvol.toString()}1`,
      );

      cy.triggerGarbageCollection();
      /* Umwelt */
      formFindMutationInfo("#umwelt", "bearbeiten-sachdaten");
      formFindContains("button[name='gwsBereich']", "Gewässerschutzbereich Au");
      formFindContains("button[name='gwsZone']", "Schutzzone S2");
      formFindContains("button[name='karstgeb']", "vermutlich Nein");
      formFindContains(
        "button[name='durchlaessigkeit']",
        "Fels mit grosser Durchlässigkeit",
      );
      formFindHasValue(
        "textarea[name='bemerkungUmwelt.bem']",
        ablagerungsstandort.bemerkungUmwelt.bem + random,
      );

      cy.triggerGarbageCollection();
      /* Grundwasser */
      formFindMutationInfo("#grundwasser", "bearbeiten-sachdaten");
      formFindContains(
        "button[name='grundwasser.0.relativeLage']",
        "Standort liegt am Rande eines GW",
      );
      formFindHasValue("input[name='grundwasser.0.flurabstand']", "101"); // prettier-ignore
      formFindContains(
        "button[name='grundwasser.0.nutzung']",
        "Landwirtschaft",
      );
      formFindHasValue("input[name='grundwasser.0.distanz']", "101");

      cy.triggerGarbageCollection();
      /* OberflaechenGewaesser */
      formFindMutationInfo("#oberflaechen-gewaesser", "bearbeiten-sachdaten");
      formFindHasValue(
        "input[name='oberflaechenGewaesser.0.name']",
        ablagerungsstandort.oberflaechenGewaesser[0].name + random,
      );
      formFindHasValue("input[name='oberflaechenGewaesser.0.distanz']", "101");
      formFindContains(
        "button[name='oberflaechenGewaesser.0.artGewaesser']",
        "kein Oberflächengewässer",
      );
      formFindContains(
        "button[name='oberflaechenGewaesser.0.bauGewaesser']",
        "verbaut",
      );
      formFindContains(
        "button[name='oberflaechenGewaesser.0.relativeLage']",
        "nicht relevant",
      );

      cy.triggerGarbageCollection();
      /* UmweltStoffe */
      formFindMutationInfo("#umwelt-stoffe", "bearbeiten-sachdaten");
      formFindContains("button[name='umweltStoffe.0.stoffGruppe']", "BTEX");
      formFindContains("button[name='umweltStoffe.0.stoff']", "Benzol");
      formFindContains(
        "button[name='umweltStoffe.0.gefaehrdeteBereiche']",
        "Boden",
      );
      formFindContains(
        "button[name='umweltStoffe.0.beurteilung']",
        "Sanierungsbedarf",
      );

      cy.triggerGarbageCollection();
      /* NutzungenBode */
      formFindMutationInfo("#nutzungen-boden", "bearbeiten-sachdaten");
      formFindContains(
        "button[name='nutzungenBoden.0.nutzungsart']",
        "Siedlungsgebiet",
      );
      formFindContains(
        "button[name='nutzungenBoden.0.aktuelleNutzung']",
        "Wohn- / Schulanlage",
      );

      cy.triggerGarbageCollection();
      /* Umweltschaeden */
      formFindMutationInfo("#umweltschaeden", "bearbeiten-sachdaten");
      formFindContains("button[name='umweltschaeden.0.artSchaden']", "Luft");
      formFindContains("button[name='umweltschaeden.0.schaeden']", "Ätzung");
      formFindHasValue(
        "textarea[name='umweltschaeden.0.bemerkung.bem']",
        ablagerungsstandort.umweltschaeden[0].bemerkung.bem + random,
      );

      cy.triggerGarbageCollection();
      /* Einzelereignisse */
      formFindMutationInfo("#einzelereignisse", "bearbeiten-sachdaten");
      formFindHasValue("input[name='einzelereignisse.0.datum']", "03.02.2024");
      formFindContains(
        "button[name='einzelereignisse.0.einzelereignis']",
        "Staubemissionen",
      );
      formFindHasValue(
        "textarea[name='einzelereignisse.0.bemerkung.bem']",
        ablagerungsstandort.einzelereignisse[0].bemerkung.bem + random,
      );

      /* shows dialog if form has unsaved changes (form is dirty) */
      formFind("button[type=submit]").should("be.disabled");
      formFind("input[name=bezeichnung]").type("a");
      formFind("button[type=submit]").should("not.be.disabled");
      // catch uncaught exception to avoid failing test
      // uncaught exception is necessary to prevent route changes in Next.js
      // cy.on("uncaught:exception", (error) => {
      //   expect(error.message).to.include("cancelRouteChange");
      //   return false;
      // });

      cy.triggerGarbageCollection();
      // cancel navigation
      cy.get("header nav a[href='/']").click();
      cy.get("[data-test=DirtyFieldsDialog]").should("exist");
      cy.get("body").type("{Esc}"); // close dialog
      cy.get("[data-test=DirtyFieldsDialog]").should("not.exist");
      cy.url().should("eq", `${Cypress.config().baseUrl}/vflz/1/data#basedata`);

      // discard changes
      cy.get("header nav a[href='/']").click();
      cy.get("[data-test=DirtyFieldsDialog]").should("exist");
      cy.get("button[data-test=DirtyFieldsDialog-discard]").click();
      cy.get("[data-test=DirtyFieldsDialog]").should("not.exist");
      cy.url().should("eq", `${Cypress.config().baseUrl}/`);
    });

    it("adds, hides and validates fields for Ablagerungsstandort", () => {
      cy.resetFixture("ablagerungsstandort", {
        bemerkungStandort: null,
        bemerkungUmwelt: null,
        bezeichnung: null,
        deponietyp: null,
        durchlaessigkeit: null,
        flurname: null,
        gwsBereich: null,
        gwsZone: null,
        inBetrieb: null,
        karstgeb: null,
        lang: null,
        nachsorge: null,
        ort: null,
        postleitzahl: null,
        strasse: null,
      });
      cy.updateAdminSetting("ui.fields.Vflz.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Vflz.flugplatz.hidden", true);
      cy.updateAdminSetting("ui.fields.Vflz.flurname.hidden", true);
      cy.updateAdminSetting("ui.fields.Vflz.ktu.hidden", true);
      cy.updateAdminSetting("ui.fields.Vflz.lang.hidden", true);
      cy.updateAdminSetting("ui.fields.Ablagerung.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Ablagerung.bis.hidden", true);
      cy.updateAdminSetting("ui.fields.Ablagerung.tiefe.hidden", true);
      cy.updateAdminSetting("ui.fields.Ablagerung.von.hidden", true);
      cy.updateAdminSetting("ui.fields.KompartimentStoffgruppe.teilvol.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.bis.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.genauigkeitBis.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.genauigkeitVon.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.teilvol.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KompartimentStoffklasse.von.hidden", true); // prettier-ignore
      cy.visit("/vflz/1/data");
      cy.wait("@VflzData");

      /* check hidden fields */
      formFindNotExist("button[name='flugplatz']");
      formFindNotExist("input[name=flurname]");
      formFindNotExist("button[name=ktu]");
      formFindNotExist("button[name=lang]");
      formFindNotExist("textarea[name='bemerkungDatenimport.bem']");
      formFindNotExist("input[name='ablagerungen.0.zeitraum.bis']");
      formFindNotExist("input[name='ablagerungen.0.zeitraum.von']");
      formFindNotExist("textarea[name='ablagerungen.0.bemerkungDatenimport.bem']"); // prettier-ignore
      formFindNotExist("input[name='ablagerungen.0.tiefe']");
      formFindNotExist("input[name='ablagerungen.0.kompartimentStoffklassen.0.teilvol']"); // prettier-ignore
      formFindNotExist("input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.von']"); // prettier-ignore
      formFindNotExist("input[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.bis']"); // prettier-ignore
      formFindNotExist("[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitBis']"); // prettier-ignore
      formFindNotExist("[name='ablagerungen.0.kompartimentStoffklassen.0.zeitraum.genauigkeitVon']"); // prettier-ignore
      formFindNotExist("input[name='ablagerungen.0.kompartimentStoffklassen.0.kompartimentStoffgruppen.0.teilvol']"); // prettier-ignore

      /* check geo validation */
      formFind("button[type=submit]").should("be.disabled");
      formFindHasValue("input[name=postleitzahl]", "");
      formFindDataValidation("input[name=ort]", "ValidatedOrt");
      formFindHasValue("input[name=postleitzahl]", "0123");
      formFindDataValidation("input[disabled][name='gemeinde.displayValue']", "Bar (0002)"); // prettier-ignore
      formFindHasValue("div[data-test=vflzDataFormKanton] input[disabled]", "BL"); // prettier-ignore
      formFindDataValidation("button[name='gwsBereich']", "Gewässerschutzbereich B (alt)"); // prettier-ignore
      formFindDataValidation("button[name='gwsZone']", "Schutzzone S2");
      formFind("button[type=submit]").should("not.be.disabled");

      /* check client-side validation */
      formFind("a[href='#basedata'] svg[data-test=XCircleIcon]").should(
        "not.exist",
      );
      formFind("button[type=submit]").click();
      formFind("a[href='#basedata'] svg[data-test=XCircleIcon]").should(
        "exist",
      );
      formFind("input[name=bezeichnung]")
        .parent()
        .find("svg[data-test=XCircleIcon]");
      formFind("input[name=bezeichnung]").type("Test");
      formFind("input[name=bezeichnung]")
        .parent()
        .find("svg[data-test=XCircleIcon]")
        .should("not.exist");
      formFind("a[href='#basedata'] svg[data-test=XCircleIcon]").should(
        "not.exist",
      );

      /* add empty rows */
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormAblagerungen]");
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormKompartimentStoffklassen]"); // prettier-ignore
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormKompartimentStoffgruppen]"); // prettier-ignore
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormOberflaechenGewaesser]"); // prettier-ignore
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormUmweltStoffe]");
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormNutzungenBoden]"); // prettier-ignore
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormUmweltschaeden]"); // prettier-ignore
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormEinzelereignisse]"); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      /* check empty rows */
      formFind("[data-test=vflzDataFormAblagerungen] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormKompartimentStoffklassen] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormKompartimentStoffgruppen] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormOberflaechenGewaesser] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormUmweltStoffe] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormNutzungenBoden] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormUmweltschaeden] > div").should("have.length", 1); // prettier-ignore
      formFind("[data-test=vflzDataFormEinzelereignisse] > div").should("have.length", 1); // prettier-ignore
    });
  });

  describe("Betriebsstandort", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
      cy.triggerGarbageCollection();
    });

    it("reads and updates values for Betriebsstandort", () => {
      cy.resetFixture("betriebsstandort");
      cy.updateAdminSetting("ui.fields.Betrieb.begruendungBewertung.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.beurteilung.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.brancheNoga.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.eva.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaName.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaOrt.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaPlz.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaStrasse.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.genauigkeitBis.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.genauigkeitVon.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.groesse.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.groesse.isText", false);
      cy.updateAdminSetting("ui.fields.Betrieb.mobileStoffe.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.relevant.hidden", false);
      cy.updateAdminSetting("ui.fields.Betrieb.untersuchungsStand.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.zentroid.coordinates.0.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.zentroid.coordinates.1.hidden", false); // prettier-ignore

      cy.visit("/vflz/2/data");
      cy.wait("@VflzData");

      cy.get("[data-test=VflzLayout-sidebar-versionen] tr")
        .eq(0)
        .should("contain", "02.10.2024")
        .and("contain", "Foobaz");

      cy.triggerGarbageCollection();
      /* READ values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "2010 - 11.12.2013",
      );

      cy.triggerGarbageCollection();
      /* betriebe */
      formFindContains(
        "[data-test=vflzDataFormBetriebe] h3",
        betriebsstandort.betriebe[0].firmaName,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaName']",
        betriebsstandort.betriebe[0].firmaName,
      );
      formFindHasValue(
        "input[name='betriebe.0.eva']",
        betriebsstandort.betriebe[0].eva,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaStrasse']",
        betriebsstandort.betriebe[0].firmaStrasse,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaPlz']",
        betriebsstandort.betriebe[0].firmaPlz,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaOrt']",
        betriebsstandort.betriebe[0].firmaOrt,
      );
      formFindHasValue("input[name='betriebe.0.zeitraum.von']", "2010");
      formFindContains("button[name='betriebe.0.zeitraum.genauigkeitVon']", "schlecht bekannt"); // prettier-ignore
      formFindHasValue("input[name='betriebe.0.zeitraum.bis']", "11.12.2013");
      formFindContains("button[name='betriebe.0.zeitraum.genauigkeitBis']", "gut bekannt"); // prettier-ignore
      formFindHasValue(
        "input[name='betriebe.0.brancheAsw']",
        "010 - LANDWIRTSCHAFT",
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='betriebe.0.brancheNoga']",
        "A2 - Forstwirtschaft",
      );
      formFindContains("button[name='betriebe.0.groesse']", "1 Mitarbeitende");
      formFindContains("button[name='betriebe.0.relevant']", "nicht relevant");
      formFindContains("button[name='betriebe.0.mobileStoffe']", "nein");
      formFindContains("button[name='betriebe.0.untersuchungsStand']", "keine Untersuchung"); // prettier-ignore
      formFindContains("button[name='betriebe.0.beurteilung']", "unbelastet");
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkung.bem']",
        betriebsstandort.betriebe[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkungDatenimport.bem']",
        betriebsstandort.betriebe[0].bemerkungDatenimport.bem,
      );
      formFindHasValue(
        "textarea[name='betriebe.0.begruendungBewertung.bem']",
        betriebsstandort.betriebe[0].begruendungBewertung.bem,
      );
      formFindHasValue("input[name='betriebe.0.zentroid.coordinates.0']", "2606757"); // prettier-ignore
      formFindHasValue("input[name='betriebe.0.zentroid.coordinates.1']", "1228616"); // prettier-ignore

      cy.triggerGarbageCollection();
      /* UPDATE values */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name='betriebe.0.firmaName']").type(random);
      formFind("input[name='betriebe.0.eva']").type(random);
      formFind("input[name='betriebe.0.firmaStrasse']").type(random);
      formFind("input[name='betriebe.0.firmaPlz']").type(random);
      formFind("input[name='betriebe.0.firmaOrt']").type(random);
      formFind("input[name='betriebe.0.zeitraum.von']").type("{backspace}1");
      listboxSelect(
        "button[name='betriebe.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFind("input[name='betriebe.0.zeitraum.bis']").type("{backspace}4");
      listboxSelect(
        "button[name='betriebe.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );
      cy.triggerGarbageCollection();
      comboboxSelect("input[name='betriebe.0.brancheAsw']", "02 - GARTENBAU");
      comboboxSelect(
        "input[name='betriebe.0.brancheNoga']",
        "A1 - Landwirtschaft",
      );
      listboxSelect("button[name='betriebe.0.groesse']", "2-3 Mitarbeitende");
      listboxSelect("button[name='betriebe.0.relevant']", "relevant");
      listboxSelect("button[name='betriebe.0.mobileStoffe']", "ja");
      listboxSelect(
        "button[name='betriebe.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      listboxSelect(
        "button[name='betriebe.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFind("textarea[name='betriebe.0.bemerkung.bem']").type(random);
      formFind("textarea[name='betriebe.0.bemerkungDatenimport.bem']").type(random); // prettier-ignore
      formFind("textarea[name='betriebe.0.begruendungBewertung.bem']").type(random); // prettier-ignore
      formFind("input[name='betriebe.0.zentroid.coordinates.0']").type("{backspace}8"); // prettier-ignore
      formFind("input[name='betriebe.0.zentroid.coordinates.1']").type("{backspace}7"); // prettier-ignore

      cy.triggerGarbageCollection();
      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "2011 - 11.12.2014",
      );
      formFindMutationInfo("#betriebe", "bearbeiten-sachdaten");
      formFindContains(
        "[data-test=vflzDataFormBetriebe] h3",
        betriebsstandort.betriebe[0].firmaName + random,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaName']",
        betriebsstandort.betriebe[0].firmaName + random,
      );
      formFindHasValue(
        "input[name='betriebe.0.eva']",
        betriebsstandort.betriebe[0].eva + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='betriebe.0.firmaStrasse']",
        betriebsstandort.betriebe[0].firmaStrasse + random,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaPlz']",
        betriebsstandort.betriebe[0].firmaPlz + random,
      );
      formFindHasValue(
        "input[name='betriebe.0.firmaOrt']",
        betriebsstandort.betriebe[0].firmaOrt + random,
      );
      formFindHasValue("input[name='betriebe.0.zeitraum.von']", "2011");
      formFindContains("button[name='betriebe.0.zeitraum.genauigkeitVon']", "gut bekannt"); // prettier-ignore
      formFindHasValue("input[name='betriebe.0.zeitraum.bis']", "11.12.2014");
      formFindContains("button[name='betriebe.0.zeitraum.genauigkeitBis']", "schlecht bekannt"); // prettier-ignore
      formFindHasValue("input[name='betriebe.0.brancheAsw']", "02 - GARTENBAU");
      formFindHasValue(
        "input[name='betriebe.0.brancheNoga']",
        "A1 - Landwirtschaft",
      );
      cy.triggerGarbageCollection();
      formFindContains("button[name='betriebe.0.groesse']", "2-3 Mitarbeitende"); // prettier-ignore
      formFindContains("button[name='betriebe.0.relevant']", "relevant");
      formFindContains("button[name='betriebe.0.mobileStoffe']", "ja");
      formFindContains(
        "button[name='betriebe.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      formFindContains(
        "button[name='betriebe.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkung.bem']",
        betriebsstandort.betriebe[0].bemerkung.bem + random,
      );
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkungDatenimport.bem']",
        betriebsstandort.betriebe[0].bemerkungDatenimport.bem + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='betriebe.0.begruendungBewertung.bem']",
        betriebsstandort.betriebe[0].begruendungBewertung.bem + random,
      );
      formFindHasValue("input[name='betriebe.0.zentroid.coordinates.0']", "2606758"); // prettier-ignore
      formFindHasValue("input[name='betriebe.0.zentroid.coordinates.1']", "1228617"); // prettier-ignore
    });

    it("adds, hides and validates fields for Betriebsstandort", () => {
      cy.resetFixture("betriebsstandort");
      cy.updateAdminSetting("ui.fields.Betrieb.begruendungBewertung.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.beurteilung.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.brancheNoga.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.eva.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaName.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaOrt.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaPlz.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.firmaStrasse.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.genauigkeitBis.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.genauigkeitVon.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.groesse.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.groesse.isText", true);
      cy.updateAdminSetting("ui.fields.Betrieb.mobileStoffe.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.relevant.hidden", true);
      cy.updateAdminSetting("ui.fields.Betrieb.untersuchungsStand.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.zentroid.coordinates.0.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Betrieb.zentroid.coordinates.1.hidden", true); // prettier-ignore

      cy.visit("/vflz/2/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* CHECK hidden fields */
      formFindNotExist("textarea[name='betriebe.0.begruendungBewertung.bem']");
      formFindNotExist("textarea[name='betriebe.0.bemerkungDatenimport.bem']");
      formFindNotExist("button[name='betriebe.0.beurteilung']");
      formFindNotExist("input[name='betriebe.0.brancheNoga']");
      formFindNotExist("input[name='betriebe.0.eva']");
      formFindNotExist("input[name='betriebe.0.firmaName']");
      formFindNotExist("input[name='betriebe.0.firmaOrt']");
      formFindNotExist("input[name='betriebe.0.firmaPlz']");
      formFindNotExist("input[name='betriebe.0.firmaStrasse']");
      formFindNotExist("button[name='betriebe.0.zeitraum.genauigkeitBis']");
      formFindNotExist("button[name='betriebe.0.zeitraum.genauigkeitVon']");
      formFindNotExist("button[name='betriebe.0.groesse']");
      formFindNotExist("button[name='betriebe.0.mobileStoffe']");
      formFindNotExist("button[name='betriebe.0.relevant']");
      formFindNotExist("button[name='betriebe.0.untersuchungsStand']");
      formFindNotExist("input[name='betriebe.0.zentroid.coordinates.0']");
      formFindNotExist("input[name='betriebe.0.zentroid.coordinates.1']");

      cy.triggerGarbageCollection();
      /* UPDATE values and rows */
      const random = Math.random().toString(36).substring(2, 6);
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormBetriebe]");
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkung.bem']",
        betriebsstandort.betriebe[0].bemerkung.bem,
      );
      formFind("textarea[name='betriebe.0.bemerkung.bem']").type(random);

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK values and rows */
      formFind("[data-test=vflzDataFormBetriebe] > div").should("have.length", 1); // prettier-ignore
      formFindHasValue(
        "textarea[name='betriebe.0.bemerkung.bem']",
        betriebsstandort.betriebe[0].bemerkung.bem + random,
      );
    });
  });

  describe("Unfallstandort", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
      cy.triggerGarbageCollection();
    });

    it("reads and updates values for Unfallstandort", () => {
      cy.resetFixture("unfallstandort");
      cy.updateAdminSetting("ui.fields.Unfall.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Unfall.genauigkeitZeitpunkt.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Unfallstoff.unfallstoffe.hidden", false); // prettier-ignore

      cy.visit("/vflz/3/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* READ values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "02.02.2020",
      );

      /* unfaelle */
      formFindContains(
        "[data-test=vflzDataFormUnfaelle] h3",
        unfallstandort.unfaelle[0].name,
      );
      formFindHasValue(
        "input[name='unfaelle.0.name']",
        unfallstandort.unfaelle[0].name,
      );
      formFindHasValue("input[name='unfaelle.0.zeitpunkt']", "02.02.2020");
      formFindContains(
        "button[name='unfaelle.0.genauigkeitZeitpunkt']",
        "gut bekannt",
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='unfaelle.0.bemerkung.bem']",
        unfallstandort.unfaelle[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='unfaelle.0.bemerkungDatenimport.bem']",
        unfallstandort.unfaelle[0].bemerkungDatenimport.bem,
      );

      cy.triggerGarbageCollection();
      /* unfallstoffe */
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.stoff']",
        "Antimon",
      );
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.ausgelaufen']",
        unfallstandort.unfaelle[0].unfallstoffe[0].ausgelaufen.toString(),
      );
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.zurueckgewonnen']",
        unfallstandort.unfaelle[0].unfallstoffe[0].zurueckgewonnen.toString(),
      );
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.stoffmng']",
        unfallstandort.unfaelle[0].unfallstoffe[0].stoffmng.toString(),
      );

      cy.triggerGarbageCollection();
      /* UPDATE values */
      /* unfaelle */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name='unfaelle.0.name']").type(random);
      formFind("input[name='unfaelle.0.zeitpunkt']").type("{backspace}1");
      listboxSelect(
        "button[name='unfaelle.0.genauigkeitZeitpunkt']",
        "schlecht bekannt",
      );
      formFind("textarea[name='unfaelle.0.bemerkung.bem']").type(random);
      formFind("textarea[name='unfaelle.0.bemerkungDatenimport.bem']").type(random); // prettier-ignore

      cy.triggerGarbageCollection();
      /* unfallstoffe */
      comboboxSelect("input[name='unfaelle.0.unfallstoffe.0.stoff']", "Blei");
      formFind("input[name='unfaelle.0.unfallstoffe.0.ausgelaufen']").type("1");
      formFind("input[name='unfaelle.0.unfallstoffe.0.zurueckgewonnen']").type("1"); // prettier-ignore
      formFind("input[name='unfaelle.0.unfallstoffe.0.stoffmng']").type("1");

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "02.02.2021",
      );
      cy.triggerGarbageCollection();
      /* unfaelle */
      formFindMutationInfo("#unfaelle", "bearbeiten-sachdaten");
      formFindContains(
        "[data-test=vflzDataFormUnfaelle] h3",
        unfallstandort.unfaelle[0].name + random,
      );
      formFindHasValue(
        "input[name='unfaelle.0.name']",
        unfallstandort.unfaelle[0].name + random,
      );
      formFindHasValue("input[name='unfaelle.0.zeitpunkt']", "02.02.2021");
      formFindContains("button[name='unfaelle.0.genauigkeitZeitpunkt']", "schlecht bekannt"); // prettier-ignore
      formFindHasValue(
        "textarea[name='unfaelle.0.bemerkung.bem']",
        unfallstandort.unfaelle[0].bemerkung.bem + random,
      );
      formFindHasValue(
        "textarea[name='unfaelle.0.bemerkungDatenimport.bem']",
        unfallstandort.unfaelle[0].bemerkungDatenimport.bem + random,
      );

      cy.triggerGarbageCollection();
      /* unfallstoffe */
      formFindHasValue("input[name='unfaelle.0.unfallstoffe.0.stoff']", "Blei");
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.ausgelaufen']",
        "301",
      );
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.zurueckgewonnen']",
        "201",
      );
      formFindHasValue(
        "input[name='unfaelle.0.unfallstoffe.0.stoffmng']",
        "101",
      );
    });

    it("adds, hides and validates fields for Unfallstandort", () => {
      cy.resetFixture("unfallstandort");
      cy.updateAdminSetting("ui.fields.Unfall.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Unfall.genauigkeitZeitpunkt.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Unfallstoff.unfallstoffe.hidden", true); // prettier-ignore

      cy.visit("/vflz/3/data");
      cy.wait("@VflzData");
      cy.triggerGarbageCollection();

      /* check hidden fields */
      formFindNotExist("textarea[name='unfaelle.0.bemerkungDatenimport.bem']");
      formFindNotExist("button[name='unfaelle.0.genauigkeitZeitpunkt']");
      formFindNotExist("[data-test=vflzDataFormUnfallstoffe]");

      cy.triggerGarbageCollection();
      /* check geo validation */
      formFindDataValidationEmpty("input[name=postleitzahl]");
      formFindDataValidationEmpty("input[name=ort]");
      formFindDataValidationEmpty("input[disabled][name='gemeinde.displayValue']"); // prettier-ignore
      formFindDataValidation("button[name='gwsBereich']", "keine");
      formFindDataValidation("button[name='gwsZone']", "keine");

      /* add empty rows */
      cy.triggerGarbageCollection();
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormUnfaelle]");

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      /* check empty rows */
      formFind("[data-test=vflzDataFormUnfaelle] > div").should("have.length", 1); // prettier-ignore
    });
  });

  describe("Schiessanlagenstandort", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
      cy.triggerGarbageCollection();
    });

    it("reads and updates values for Schiessanlagenstandort", () => {
      cy.resetFixture("schiessanlagenstandort");
      cy.updateAdminSetting("ui.fields.Schiessanlage.begruendungBewertung.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.beurteilung.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.eva.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaName.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaOrt.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaPlz.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaStrasse.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.genauigkeitBis.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.genauigkeitVon.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.groesse.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.groesse.isText", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.hatKugelfang.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.mobileStoffe.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.relevant.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.scheibenzahl.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.schusszahl.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.typ.hidden", false);
      cy.updateAdminSetting("ui.fields.Schiessanlage.untersuchungsStand.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.zentroid.coordinates.0.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.zentroid.coordinates.1.hidden", false); // prettier-ignore

      cy.visit("/vflz/4/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* READ values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "01.01.2012 - 11.12.2014",
      );

      /* schiessanlagen */
      formFindContains(
        "[data-test=vflzDataFormSchiessanlagen] h3",
        schiessanlagenstandort.schiessanlagen[0].firmaName,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaName']",
        schiessanlagenstandort.schiessanlagen[0].firmaName,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.eva']",
        schiessanlagenstandort.schiessanlagen[0].eva,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaStrasse']",
        schiessanlagenstandort.schiessanlagen[0].firmaStrasse,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaPlz']",
        schiessanlagenstandort.schiessanlagen[0].firmaPlz,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaOrt']",
        schiessanlagenstandort.schiessanlagen[0].firmaOrt,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zeitraum.von']",
        "01.01.2012",
      );
      formFindContains(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zeitraum.bis']",
        "11.12.2014",
      );
      formFindContains(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitBis']",
        "geschätzt",
      );
      formFindHasValue(
        "input[disabled][name='schiessanlagen.0.brancheAsw']",
        "9143 - Schiessanlagen",
      );
      cy.triggerGarbageCollection();
      formFindContains("button[name='schiessanlagen.0.typ']", "Typ A");
      formFindContains("button[name='schiessanlagen.0.hatKugelfang']", "Ja");
      formFindHasValue(
        "input[name='schiessanlagen.0.scheibenzahl']",
        schiessanlagenstandort.schiessanlagen[0].scheibenzahl.toString(),
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.schusszahl']",
        schiessanlagenstandort.schiessanlagen[0].schusszahl.toString(),
      );
      formFindContains(
        "button[name='schiessanlagen.0.groesse']",
        "4-5 Mitarbeitende",
      );
      formFindContains("button[name='schiessanlagen.0.relevant']", "relevant");
      formFindContains("button[name='schiessanlagen.0.mobileStoffe']", "ja");
      formFindContains(
        "button[name='schiessanlagen.0.untersuchungsStand']",
        "keine Untersuchung",
      );
      formFindContains(
        "button[name='schiessanlagen.0.beurteilung']",
        "unbelastet",
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkung.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkungDatenimport.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkungDatenimport.bem,
      );
      formFindHasValue(
        "textarea[name='schiessanlagen.0.begruendungBewertung.bem']",
        schiessanlagenstandort.schiessanlagen[0].begruendungBewertung.bem,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zentroid.coordinates.0']",
        "2606757",
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zentroid.coordinates.1']",
        "1228616",
      );

      cy.triggerGarbageCollection();
      /* UPDATE values */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name='schiessanlagen.0.firmaName']").type(random);
      formFind("input[name='schiessanlagen.0.eva']").type(random);
      formFind("input[name='schiessanlagen.0.firmaStrasse']").type(random);
      formFind("input[name='schiessanlagen.0.firmaPlz']").type(random);
      formFind("input[name='schiessanlagen.0.firmaOrt']").type(random);
      formFind("[name='schiessanlagen.0.zeitraum.von']").type("{backspace}1");
      listboxSelect(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFind("[name='schiessanlagen.0.zeitraum.bis']").type("{backspace}5");
      listboxSelect(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitBis']",
        "gut bekannt",
      );
      listboxSelect("button[name='schiessanlagen.0.typ']", "Typ B");
      listboxSelect("button[name='schiessanlagen.0.hatKugelfang']", "Nein");
      formFind("[name='schiessanlagen.0.scheibenzahl']").type("{backspace}3");
      formFind("[name='schiessanlagen.0.schusszahl']").type("{backspace}4");
      listboxSelect(
        "button[name='schiessanlagen.0.groesse']",
        "2-3 Mitarbeitende",
      );
      cy.triggerGarbageCollection();
      listboxSelect(
        "button[name='schiessanlagen.0.relevant']",
        "nicht relevant",
      );
      listboxSelect("button[name='schiessanlagen.0.mobileStoffe']", "nein");
      listboxSelect(
        "button[name='schiessanlagen.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      listboxSelect(
        "button[name='schiessanlagen.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      cy.triggerGarbageCollection();
      formFind("textarea[name='schiessanlagen.0.bemerkung.bem']").type(random);
      formFind(
        "textarea[name='schiessanlagen.0.bemerkungDatenimport.bem']",
      ).type(random);
      formFind("[name='schiessanlagen.0.begruendungBewertung.bem']").type(random); // prettier-ignore
      formFind("[name='schiessanlagen.0.zentroid.coordinates.0']").type("{backspace}8"); // prettier-ignore
      formFind("[name='schiessanlagen.0.zentroid.coordinates.1']").type("{backspace}7"); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "01.01.2011 - 11.12.2015",
      );
      formFindMutationInfo("#schiessanlagen", "bearbeiten-sachdaten");
      formFindContains(
        "[data-test=vflzDataFormSchiessanlagen] h3",
        schiessanlagenstandort.schiessanlagen[0].firmaName + random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaName']",
        schiessanlagenstandort.schiessanlagen[0].firmaName + random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.eva']",
        schiessanlagenstandort.schiessanlagen[0].eva + random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaStrasse']",
        schiessanlagenstandort.schiessanlagen[0].firmaStrasse + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaPlz']",
        schiessanlagenstandort.schiessanlagen[0].firmaPlz + random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.firmaOrt']",
        schiessanlagenstandort.schiessanlagen[0].firmaOrt + random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zeitraum.von']",
        "01.01.2011",
      );
      formFindContains(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zeitraum.bis']",
        "11.12.2015",
      );
      cy.triggerGarbageCollection();
      formFindContains(
        "button[name='schiessanlagen.0.zeitraum.genauigkeitBis']",
        "gut bekannt",
      );
      formFindContains("button[name='schiessanlagen.0.typ']", "Typ B");
      formFindContains("button[name='schiessanlagen.0.hatKugelfang']", "Nein");
      formFindHasValue("input[name='schiessanlagen.0.scheibenzahl']", "13");
      formFindHasValue("input[name='schiessanlagen.0.schusszahl']", "24");
      formFindContains(
        "button[name='schiessanlagen.0.groesse']",
        "2-3 Mitarbeitende",
      );
      formFindContains(
        "button[name='schiessanlagen.0.relevant']",
        "nicht relevant",
      );
      cy.triggerGarbageCollection();
      formFindContains("button[name='schiessanlagen.0.mobileStoffe']", "nein");
      formFindContains(
        "button[name='schiessanlagen.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      formFindContains(
        "button[name='schiessanlagen.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkung.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkung.bem + random,
      );
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkungDatenimport.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkungDatenimport.bem +
          random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='schiessanlagen.0.begruendungBewertung.bem']",
        schiessanlagenstandort.schiessanlagen[0].begruendungBewertung.bem +
          random,
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zentroid.coordinates.0']",
        "2606758",
      );
      formFindHasValue(
        "input[name='schiessanlagen.0.zentroid.coordinates.1']",
        "1228617",
      );
    });

    it("adds, hides and validates fields for Schiessanlagenstandort", () => {
      cy.resetFixture("schiessanlagenstandort");
      cy.updateAdminSetting("ui.fields.Schiessanlage.begruendungBewertung.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.beurteilung.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.eva.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaName.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaOrt.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaPlz.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.firmaStrasse.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.genauigkeitBis.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.genauigkeitVon.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.groesse.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.groesse.isText", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.hatKugelfang.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.mobileStoffe.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.relevant.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.scheibenzahl.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.schusszahl.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.typ.hidden", true);
      cy.updateAdminSetting("ui.fields.Schiessanlage.untersuchungsStand.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.zentroid.coordinates.0.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.Schiessanlage.zentroid.coordinates.1.hidden", true); // prettier-ignore

      cy.visit("/vflz/4/data");
      cy.wait("@VflzData");
      cy.triggerGarbageCollection();

      /* CHECK hidden fields */
      formFindNotExist("textarea[name='schiessanlagen.0.begruendungBewertung.bem']"); // prettier-ignore
      formFindNotExist("textarea[name='schiessanlagen.0.bemerkungDatenimport.bem']"); // prettier-ignore
      formFindNotExist("button[name='schiessanlagen.0.beurteilung']");
      formFindNotExist("input[name='schiessanlagen.0.eva']");
      formFindNotExist("input[name='schiessanlagen.0.firmaName']");
      formFindNotExist("input[name='schiessanlagen.0.firmaOrt']");
      formFindNotExist("input[name='schiessanlagen.0.firmaPlz']");
      formFindNotExist("input[name='schiessanlagen.0.firmaStrasse']");
      formFindNotExist("button[name='schiessanlagen.0.zeitraum.genauigkeitBis']"); // prettier-ignore
      formFindNotExist("button[name='schiessanlagen.0.zeitraum.genauigkeitVon']"); // prettier-ignore
      formFindNotExist("button[name='schiessanlagen.0.groesse']");
      formFindNotExist("button[name='schiessanlagen.0.hatKugelfang']");
      formFindNotExist("button[name='schiessanlagen.0.mobileStoffe']");
      formFindNotExist("button[name='schiessanlagen.0.relevant']");
      formFindNotExist("input[name='schiessanlagen.0.scheibenzahl']");
      formFindNotExist("input[name='schiessanlagen.0.schusszahl']");
      formFindNotExist("button[name='schiessanlagen.0.typ']");
      formFindNotExist("button[name='schiessanlagen.0.untersuchungsStand']");
      formFindNotExist("input[name='schiessanlagen.0.zentroid.coordinates.0']");
      formFindNotExist("input[name='schiessanlagen.0.zentroid.coordinates.1']");

      cy.triggerGarbageCollection();
      /* UPDATE values and rows */
      const random = Math.random().toString(36).substring(2, 6);
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormSchiessanlagen]"); // prettier-ignore
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkung.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkung.bem,
      );
      formFind("textarea[name='schiessanlagen.0.bemerkung.bem']").type(random);

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK values and rows */
      formFind("[data-test=vflzDataFormSchiessanlagen] > div").should("have.length", 1); // prettier-ignore
      formFindHasValue(
        "textarea[name='schiessanlagen.0.bemerkung.bem']",
        schiessanlagenstandort.schiessanlagen[0].bemerkung.bem + random,
      );
    });
  });

  describe("Kinderspielplatz/Grünflächen", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
      cy.triggerGarbageCollection();
    });

    it("reads and updates values for Kinderspielplatz", () => {
      cy.resetFixture("kinderspielplatz");
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.eva.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.kinderspielplatzGruenflacheTyp.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.untersuchungsStand.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.beurteilung.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.begruendungBewertung.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.genauigkeitBis.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.genauigkeitVon.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.zentroid.coordinates.0.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.zentroid.coordinates.1.hidden", false); // prettier-ignore

      cy.visit("/vflz/5/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* READ values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "2010 - 11.12.2013",
      );

      cy.triggerGarbageCollection();
      /* kinderspielplaetzeGruenflaechen */
      formFindContains(
        "[data-test=vflzDataFormKinderspielplaetzeGruenflaechen] h3",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.name']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.eva']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].eva,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.strasse']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].strasse,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.plz']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].plz,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.ort']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].ort,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zeitraum.von']",
        "2010",
      );
      cy.triggerGarbageCollection();
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zeitraum.bis']",
        "11.12.2013",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitBis']",
        "gut bekannt",
      );
      // formFindContains("button[name='kinderspielplaetzeGruenflaechen.0.kinderspielplatzGruenflacheTyp']", "Typ A");
      // formFindContains("button[name='kinderspielplaetzeGruenflaechen.0.eigentumsform']", "Typ A");
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.belastungUeberSanierungswert']",
        "Ja",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.relevant']",
        "Ja",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.altersstufenKinder']",
        "Kleinkinder 1-3 Jahre",
      );
      cy.triggerGarbageCollection();
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.untersuchungsStand']",
        "Technische Untersuchung abgeschlossen",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.beurteilung']",
        "Belastet, sanierungsbedürftig",
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkung.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkungDatenimport.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].bemerkungDatenimport
          .bem,
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.begruendungBewertung.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].begruendungBewertung
          .bem,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.0']",
        "2606757",
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.1']",
        "1228616",
      );

      cy.triggerGarbageCollection();
      /* UPDATE values */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.name']").type(
        random,
      );
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.eva']").type(
        random,
      );
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.strasse']").type(
        random,
      );
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.plz']").type(
        random,
      );
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.ort']").type(
        random,
      );
      formFind("[name='kinderspielplaetzeGruenflaechen.0.zeitraum.von']").type(
        "{backspace}1",
      );
      cy.triggerGarbageCollection();
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFind("[name='kinderspielplaetzeGruenflaechen.0.zeitraum.bis']").type(
        "{backspace}5",
      );
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );
      // listboxSelect("button[name='kinderspielplaetzeGruenflaechen.0.kinderspielplatzGruenflacheTyp']", "Typ B");
      // listboxSelect("button[name='kinderspielplaetzeGruenflaechen.0.eigentumsform']", "Typ B");
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.belastungUeberSanierungswert']",
        "Nein",
      );
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.relevant']",
        "Nein",
      );
      // listboxSelect("button[name='kinderspielplaetzeGruenflaechen.0.altersstufenKinder']", "nein");
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      listboxSelect(
        "button[name='kinderspielplaetzeGruenflaechen.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      cy.triggerGarbageCollection();
      formFind(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkung.bem']",
      ).type(random);
      formFind(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkungDatenimport.bem']",
      ).type(random);
      formFind("[name='kinderspielplaetzeGruenflaechen.0.begruendungBewertung.bem']").type(random); // prettier-ignore
      formFind("[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.0']").type("{backspace}8"); // prettier-ignore
      formFind("[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.1']").type("{backspace}7"); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "2011 - 11.12.2015",
      );
      formFindMutationInfo(
        "#kinderspielplaetze-gruenflaechen",
        "bearbeiten-sachdaten",
      );
      formFindContains(
        "[data-test=vflzDataFormKinderspielplaetzeGruenflaechen] h3",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name + random,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.name']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name + random,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.eva']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].eva + random,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.strasse']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].strasse + random,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.plz']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].plz + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.ort']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].ort + random,
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zeitraum.von']",
        "2011",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zeitraum.bis']",
        "11.12.2015",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );
      // formFindContains("button[name='kinderspielplatzGruenflaechen.0.kinderspielplatzGruenflacheTyp']", "Typ B");
      // formFindContains("button[name='kinderspielplatzGruenflaechen.0.eigentumsform']", "Typ B");
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.belastungUeberSanierungswert']",
        "Nein",
      );
      cy.triggerGarbageCollection();
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.relevant']",
        "Nein",
      );
      // formFindContains(
      //   "button[name='kinderspielplaetzeGruenflaechen.0.altersstufenKinder']",
      //   "Kleinkinder 1-3 Jahre",
      // );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      formFindContains(
        "button[name='kinderspielplaetzeGruenflaechen.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkung.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].bemerkung.bem +
          random,
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.bemerkungDatenimport.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].bemerkungDatenimport
          .bem + random,
      );
      formFindHasValue(
        "textarea[name='kinderspielplaetzeGruenflaechen.0.begruendungBewertung.bem']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].begruendungBewertung
          .bem + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.0']",
        "2606758",
      );
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.zentroid.coordinates.1']",
        "1228617",
      );
    });

    it("adds, hides and validates fields for Kinderspielplatz", () => {
      cy.resetFixture("kinderspielplatz");
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.eva.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.kinderspielplatzGruenflacheTyp.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.untersuchungsStand.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.beurteilung.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.begruendungBewertung.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.genauigkeitBis.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.genauigkeitVon.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.zentroid.coordinates.0.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.KinderspielplatzGruenflaeche.zentroid.coordinates.1.hidden", true); // prettier-ignore

      cy.visit("/vflz/5/data");
      cy.wait("@VflzData");
      cy.triggerGarbageCollection();

      /* CHECK hidden fields */
      formFindNotExist("input[name='KinderspielplatzGruenflaeche.0.eva']");
      formFindNotExist(
        "button[name='KinderspielplatzGruenflaeche.0.kinderspielplatzGruenflacheTyp']",
      );
      formFindNotExist("button[name='KinderspielplatzGruenflaeche.0.untersuchungsStand']"); // prettier-ignore
      formFindNotExist("button[name='KinderspielplatzGruenflaeche.0.beurteilung']"); // prettier-ignore
      formFindNotExist("textarea[name='KinderspielplatzGruenflaeche.0.bemerkungDatenimport.bem']"); // prettier-ignore
      formFindNotExist("textarea[name='KinderspielplatzGruenflaeche.0.begruendungBewertung.bem']"); // prettier-ignore
      formFindNotExist("button[name='KinderspielplatzGruenflaeche.0.zeitraum.genauigkeitBis']"); // prettier-ignore
      formFindNotExist("button[name='KinderspielplatzGruenflaeche.0.zeitraum.genauigkeitVon']"); // prettier-ignore
      formFindNotExist("input[name='KinderspielplatzGruenflaeche.0.zentroid.coordinates.0']"); // prettier-ignore
      formFindNotExist("input[name='KinderspielplatzGruenflaeche.0.zentroid.coordinates.1']"); // prettier-ignore

      cy.triggerGarbageCollection();
      /* UPDATE values and rows */
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormKinderspielplaetzeGruenflaechen]"); // prettier-ignore
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.name']",
        kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name,
      );
      formFind("input[name='kinderspielplaetzeGruenflaechen.0.name']").type("2"); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK values and rows */
      formFind(
        "[data-test=vflzDataFormKinderspielplaetzeGruenflaechen] > div",
      ).should("have.length", 1);
      formFindHasValue(
        "input[name='kinderspielplaetzeGruenflaechen.0.name']",
        `${kinderspielplatz.kinderspielplaetzeGruenflaechen[0].name}2`,
      );
    });
  });

  describe("PFAS-Standort", () => {
    beforeEach(() => {
      cy.setUser("bearbeiten-sachdaten");
    });

    it("reads and updates values for PFAS-Standort", () => {
      cy.resetFixture("pfasstandort");
      cy.updateAdminSetting("ui.fields.PFAS.eva.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.untersuchungsStand.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.beurteilung.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.begruendungBewertung.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.bemerkungDatenimport.bem.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.genauigkeitBis.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.genauigkeitVon.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.zentroid.coordinates.0.hidden", false); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.zentroid.coordinates.1.hidden", false); // prettier-ignore

      cy.visit("/vflz/6/data");
      cy.wait("@VflzData");

      cy.triggerGarbageCollection();
      /* READ values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "01.10.2023 - 01.10.2024",
      );

      /* PFAS */
      formFindContains(
        "[data-test=vflzDataFormPFAS] h3",
        pfasstandort.pfas[0].name,
      );
      formFindHasValue("input[name='pfas.0.name']", pfasstandort.pfas[0].name);
      formFindHasValue("input[name='pfas.0.eva']", pfasstandort.pfas[0].eva);
      formFindHasValue(
        "input[name='pfas.0.strasse']",
        pfasstandort.pfas[0].strasse,
      );
      formFindHasValue("input[name='pfas.0.plz']", pfasstandort.pfas[0].plz);
      formFindHasValue("input[name='pfas.0.ort']", pfasstandort.pfas[0].ort);
      formFindHasValue("input[name='pfas.0.zeitraum.von']", "01.10.2023");
      formFindContains(
        "button[name='pfas.0.zeitraum.genauigkeitVon']",
        "gut bekannt",
      );
      formFindHasValue("input[name='pfas.0.zeitraum.bis']", "01.10.2024");
      formFindContains(
        "button[name='pfas.0.zeitraum.genauigkeitBis']",
        "gut bekannt",
      );
      formFindContains("button[name='pfas.0.branche']", "Feuerwehr");
      formFindContains("button[name='pfas.0.pfasTyp']", "Magazin");
      formFindContains("button[name='pfas.0.pfasLoeschmittel']", "Nein");
      formFindContains("button[name='pfas.0.relevant']", "Ja");
      formFindContains(
        "button[name='pfas.0.pfasHaltigeLoeschmittel']",
        "AFFF, FFFP",
      );
      cy.triggerGarbageCollection();
      formFindContains("button[name='pfas.0.pfasFreieLoeschmittel']", "MBS, P");
      formFindContains(
        "button[name='pfas.0.untersuchungsStand']",
        "Technische Untersuchung abgeschlossen",
      );
      formFindContains(
        "button[name='pfas.0.beurteilung']",
        "Belastet, sanierungsbedürftig",
      );
      formFindHasValue("input[name='pfas.0.mengeSchaumgemisch']", "1");
      formFindHasValue("input[name='pfas.0.mengeKonzentrat']", "2");
      formFindContains(
        "button[name='pfas.0.loeschschaumEinsatz.0.loeschschaumEinsatz']",
        "Handfeuerlöscher",
      );
      formFindContains(
        "button[name='pfas.0.loeschschaumEinsatz.0.haeufigkeitNutzung']",
        "Nie",
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='pfas.0.beschreibungenDetail']",
        pfasstandort.pfas[0].beschreibungenDetail,
      );
      formFindHasValue(
        "textarea[name='pfas.0.bemerkung.bem']",
        pfasstandort.pfas[0].bemerkung.bem,
      );
      formFindHasValue(
        "textarea[name='pfas.0.bemerkungDatenimport.bem']",
        pfasstandort.pfas[0].bemerkungDatenimport.bem,
      );
      formFindHasValue(
        "textarea[name='pfas.0.begruendungBewertung.bem']",
        pfasstandort.pfas[0].begruendungBewertung.bem,
      );
      formFindHasValue(
        "input[name='pfas.0.zentroid.coordinates.0']",
        "2606757",
      );
      formFindHasValue(
        "input[name='pfas.0.zentroid.coordinates.1']",
        "1228616",
      );

      cy.triggerGarbageCollection();
      /* UPDATE values */
      const random = Math.random().toString(36).substring(2, 6);
      formFind("input[name='pfas.0.name']").type(random);
      formFind("input[name='pfas.0.eva']").type(random);
      formFind("input[name='pfas.0.strasse']").type(random);
      formFind("input[name='pfas.0.plz']").type(random);
      formFind("input[name='pfas.0.ort']").type(random);
      formFind("[name='pfas.0.zeitraum.von']").type("{backspace}4");
      listboxSelect(
        "button[name='pfas.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFind("[name='pfas.0.zeitraum.bis']").type("{backspace}5");
      listboxSelect(
        "button[name='pfas.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );
      cy.triggerGarbageCollection();
      listboxSelect("button[name='pfas.0.branche']", "Zivilschutz");
      listboxSelect("button[name='pfas.0.pfasTyp']", "Brandereignis");
      listboxSelect("button[name='pfas.0.pfasLoeschmittel']", "Ja");
      listboxSelect("button[name='pfas.0.relevant']", "Nein");
      listboxSelect(
        "button[name='pfas.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      listboxSelect(
        "button[name='pfas.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFind("input[name='pfas.0.mengeSchaumgemisch']").type("1");
      formFind("input[name='pfas.0.mengeKonzentrat']").type("2");
      listboxSelect(
        "button[name='pfas.0.loeschschaumEinsatz.0.loeschschaumEinsatz']",
        "Beimischer",
      );
      cy.triggerGarbageCollection();
      listboxSelect(
        "button[name='pfas.0.loeschschaumEinsatz.0.haeufigkeitNutzung']",
        "Einmal in diesem Nutzungszeitraum",
      );
      formFind("textarea[name='pfas.0.beschreibungenDetail']").type(random);
      formFind("textarea[name='pfas.0.bemerkung.bem']").type(random);
      formFind("textarea[name='pfas.0.bemerkungDatenimport.bem']").type(random);
      formFind("[name='pfas.0.begruendungBewertung.bem']").type(random); // prettier-ignore
      formFind("[name='pfas.0.zentroid.coordinates.0']").type("{backspace}8"); // prettier-ignore
      formFind("[name='pfas.0.zentroid.coordinates.1']").type("{backspace}7"); // prettier-ignore

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK updated values */
      formFindHasValue(
        "[data-test=vflzDataFormZeitraum] input[disabled]",
        "01.10.2024 - 01.10.2025",
      );
      formFindMutationInfo("#pfas", "bearbeiten-sachdaten");
      formFindContains(
        "[data-test=vflzDataFormPFAS] h3",
        pfasstandort.pfas[0].name + random,
      );
      formFindHasValue(
        "input[name='pfas.0.name']",
        pfasstandort.pfas[0].name + random,
      );
      formFindHasValue(
        "input[name='pfas.0.eva']",
        pfasstandort.pfas[0].eva + random,
      );
      formFindHasValue(
        "input[name='pfas.0.strasse']",
        pfasstandort.pfas[0].strasse + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "input[name='pfas.0.plz']",
        pfasstandort.pfas[0].plz + random,
      );
      formFindHasValue(
        "input[name='pfas.0.ort']",
        pfasstandort.pfas[0].ort + random,
      );
      formFindHasValue("input[name='pfas.0.zeitraum.von']", "01.10.2024");
      formFindContains(
        "button[name='pfas.0.zeitraum.genauigkeitVon']",
        "schlecht bekannt",
      );
      formFindHasValue("input[name='pfas.0.zeitraum.bis']", "01.10.2025");
      formFindContains(
        "button[name='pfas.0.zeitraum.genauigkeitBis']",
        "schlecht bekannt",
      );
      cy.triggerGarbageCollection();
      formFindContains("button[name='pfas.0.branche']", "Zivilschutz");
      formFindContains("button[name='pfas.0.pfasTyp']", "Brandereignis");
      formFindContains("button[name='pfas.0.pfasLoeschmittel']", "Ja");
      formFindContains("button[name='pfas.0.relevant']", "Nein");
      formFindContains(
        "button[name='pfas.0.untersuchungsStand']",
        "Historische Untersuchung in Bearbeitung",
      );
      formFindContains(
        "button[name='pfas.0.beurteilung']",
        "Belastet, untersuchungsbedürftig",
      );
      formFindHasValue("input[name='pfas.0.mengeSchaumgemisch']", "11");
      formFindHasValue("input[name='pfas.0.mengeKonzentrat']", "22");
      formFindHasValue(
        "textarea[name='pfas.0.beschreibungenDetail']",
        pfasstandort.pfas[0].beschreibungenDetail + random,
      );
      formFindHasValue(
        "textarea[name='pfas.0.bemerkung.bem']",
        pfasstandort.pfas[0].bemerkung.bem + random,
      );
      formFindHasValue(
        "textarea[name='pfas.0.bemerkungDatenimport.bem']",
        pfasstandort.pfas[0].bemerkungDatenimport.bem + random,
      );
      cy.triggerGarbageCollection();
      formFindHasValue(
        "textarea[name='pfas.0.begruendungBewertung.bem']",
        pfasstandort.pfas[0].begruendungBewertung.bem + random,
      );
      formFindHasValue(
        "input[name='pfas.0.zentroid.coordinates.0']",
        "2606758",
      );
      formFindHasValue(
        "input[name='pfas.0.zentroid.coordinates.1']",
        "1228617",
      );
    });

    it("adds, hides and validates fields for PFAS-Standort", () => {
      cy.resetFixture("pfasstandort");
      cy.updateAdminSetting("ui.fields.PFAS.eva.hidden", true);
      cy.updateAdminSetting("ui.fields.PFAS.untersuchungsStand.hidden", true);
      cy.updateAdminSetting("ui.fields.PFAS.beurteilung.hidden", true);
      cy.updateAdminSetting("ui.fields.PFAS.begruendungBewertung.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.bemerkungDatenimport.bem.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.genauigkeitBis.hidden", true);
      cy.updateAdminSetting("ui.fields.PFAS.genauigkeitVon.hidden", true);
      cy.updateAdminSetting("ui.fields.PFAS.zentroid.coordinates.0.hidden", true); // prettier-ignore
      cy.updateAdminSetting("ui.fields.PFAS.zentroid.coordinates.1.hidden", true); // prettier-ignore

      cy.visit("/vflz/6/data");
      cy.wait("@VflzData");
      cy.triggerGarbageCollection();

      /* CHECK hidden fields */
      formFindNotExist("input[name='pfas.0.eva']");
      formFindNotExist("button[name='pfas.0.untersuchungsStand']");
      formFindNotExist("button[name='pfas.0.beurteilung']");
      formFindNotExist("textarea[name='pfas.0.bemerkungDatenimport.bem']");
      formFindNotExist("textarea[name='pfas.0.begruendungBewertung.bem']");
      formFindNotExist("button[name='pfas.0.zeitraum.genauigkeitBis']");
      formFindNotExist("button[name='pfas.0.zeitraum.genauigkeitVon']");
      formFindNotExist("input[name='pfas.0.zentroid.coordinates.0']");
      formFindNotExist("input[name='pfas.0.zentroid.coordinates.1']");

      cy.triggerGarbageCollection();
      /* UPDATE values and rows */
      formFindFieldArrayAddButtonClick("[data-test=vflzDataFormPFAS]");
      formFindHasValue("input[name='pfas.0.name']", pfasstandort.pfas[0].name);
      formFind("input[name='pfas.0.name']").type("2");

      formFind("button[type=submit]").click();
      cy.wait("@updateVflzData").then(expectUpdateVflzSuccess);

      cy.triggerGarbageCollection();
      /* CHECK values and rows */
      formFind("[data-test=vflzDataFormPFAS] > div").should("have.length", 1);
      formFindHasValue(
        "input[name='pfas.0.name']",
        `${pfasstandort.pfas[0].name}2`,
      );
    });
  });

  it("renders disabled form for viewVfl permission", () => {
    cy.setUser("lesen-sachdaten");
    cy.visit("/vflz/1/data");
    cy.wait("@VflzData");
    formFind("button[type=submit],fieldset,input,textarea").each((element) => {
      cy.wrap(element).should("have.attr", "disabled");
    });
  });
});
