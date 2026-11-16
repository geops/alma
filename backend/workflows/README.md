# Konfiguration von Prozessen

## Projekt-Setup

1. Das Repository von https://gitlab.geops.com/geops/alma auschecken.

2. Im Hauptordner einmal `make start-services` aufrufen, um alma zu starten.

## Import/Export von workflow-Dateien

Mit dem `alma workflow import` Befehl direkt im backend Container können die Prozessdefinition importiert oder exportiert werden. Die Konfigurationsdateien für die Prozesse liegen unter `backend/workflows` (im Repository) bzw. `src/workflows` (im Container). z.B.:

    $ docker compose run backend /app/venv/bin/alma workflow import --file src/workflows/auskunft.yml

importiert den Workflow in die lokale DB. Dabei werden ggf. fehlende IDs generiert und die Datei neu geschrieben (Ausgabe des Befehls beachten).

### Import über eine Konfigurationsdatei (pro Kunde)

Welche Prozesse bei einem Kunden aktiv sind, wird in einer Textdatei festgelegt (eine Prozessdatei pro Zeile):

    # Kommentar
    auskunft.yml
    001001/baugesuch.yml

- Jede Zeile ist ein Pfad relativ zum Workflows-Ordner. Leere Zeilen und Zeilen, die mit `#` beginnen, werden ignoriert.
- Globs (`*`) werden nicht unterstützt, absolute Pfade sind nicht erlaubt. Die Dateien werden in der angegebenen Reihenfolge importiert.
- Basisordner ist standardmässig `/app/src/workflows` (im Container). Mit `--workflows-dir` kann ein anderer Ordner angegeben werden.

Aufruf:

    $ docker compose run --rm --no-deps --entrypoint=/app/venv/bin/alma backend workflow import --config=/app/src/workflows/demo_config.txt --workflows-dir=/app/src/workflows

bzw. lokal `make import-workflows`. Die Standard-Konfiguration `backend/workflows/demo_config.txt` listet alle Prozesse von demo.

Übersetzungen im Konfigurations-Modus:

- Übersetzungen, die im UI bearbeitet wurden (`mutations_datum` gesetzt), bleiben erhalten.
- Nicht bearbeitete Übersetzungen werden aktualisiert, neue Schlüssel eingefügt.
- Übersetzungen werden nie gelöscht.

Unterschied `--file` / `--config`: `--file` importiert genau eine Datei, überschreibt alle Übersetzungen des Prozesses und schreibt generierte IDs zurück in die Datei (für die Entwicklung von Prozessen). `--config` schreibt nie in die Prozessdateien und ist für Deployments gedacht. Genau eine der beiden Optionen muss angegeben werden.

Mit dem Befehl `alma workflow export` kann einen Workflow aus der DB exportiert werden. `UUID` mit der UUID des Prozesses ersetzen (Spalte `key` in der Tabelle `alma.wf_config` vom Eintrag mit `type=workflow`):

    $ docker compose run backend /app/venv/bin/alma workflow export --key=UUID --file src/workflows/neue_datei.yml

Mit dem `alma workflow plot` Befehl kann ein einfacher Plot des Prozesses mit graphviz erzeugt werden:

    $ docker compose run backend /app/venv/bin/alma workflow plot --file src/workflows/auskunft.yml


# Format Prozesskonfiguration

Jeder Prozess wird in einer separaten YAML-Datei abgelegt. Der Name der Datei
kann frei gewählt werden.

Momentan sind nur Prozesse mit Teilaufgaben definiert, keine eigenständigen Aufgaben.

Eine gültige Prozess-Konfiguration enthält genau ein `workflow`-Objekt.

Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.

## Übersetzungen

Felder mit der Anmerkung "(**übersetzt**)" können in zwei Varianten eingegeben werden:

1. Als Text. Der selbe Text wird als Übersetzung für alle drei Sprachen (DE, FR, IT) hinterlegt.

2. Als Objekt mit den Feldern `de`, `fr`, `it` für die Übersetzung in die verschiedenen Sprachen.

Beispiel:

~~~yaml
workflow:
  title: Auskunft
~~~

oder:

~~~yaml
workflow:
  title:
    de: Auskunft
    fr: renseignements
    it: informazioni
~~~

## Objekt `workflow`

Ein Prozess, bestehend aus Aufgaben.

Felder:

- `key`: Instanz-übergreifender Identifier. Wird beim ersten Import des Prozesses in alma automatisch gesetzt. Bei neuen Prozessen/Aufgaben/Prozessschritten immer weglassen. Darf nicht von Hand angepasst werden.
- `title`: Name des Prozesses (**übersetzt**).
- `version`: Versionsnummer.
- `start_task_ref`: Referenz auf die default-Startaufgabe (Name aus `tasks`).
- `min_per_entity`: Wie oft der Prozess mindestens pro Standort existieren muss (Integer).
- `max_per_entity`: Wie oft der Prozess maximal pro Standort existieren kann (Integer order `null`).
- `tasks`: Mapping Namen zu `task`-Objekten. Jeder Name darf nur einmal vorkommen.
- `time_period`: Optional: Frist in Tagen. Wenn gesetzt, wird das Fälligkeitsdatum des Prozesses automatisch auf Startdatum + `time_period` gesetzt.

## Objekt `task`

Eine Aufgabe im Prozess.

Das Ende des Prozesses ist immer explizit als eine Aufgabe "END" (ohne
Teilschritte oder Verknüpfungen) definiert. Diese Aufgabe dient nur als
Verknüpfungs-Ziel und wird dem Benutzer nicht angezeigt:

```yaml
workflow:
  # ...
  tasks:
    # ...
    END:
      title: __END__
      steps: []
      links: []
```

Felder:

- `key`, `version`: Siehe `workflow`.
- `title`: Name der Aufgabe (**übersetzt**).
- `start_task`: Ob der Prozess bei dieser Aufgabe gestartet werden kann (Boolean).
- `steps`: Geordnete Liste von Teilschritten (Objekte vom typ `form` oder `document`).
- `links`: Geordnete Liste von Verknüpfungen zu anderen Aufgaben (Objekte vom typ `link`).
- `triggers`: Liste von Events, die beim Abschluss der Aufgabe ausgelöst werden (optional, Objekte vom typ `event-trigger`).
- `time_period`: Optional: Frist in Tagen. Wenn gesetzt, wird das Fälligkeitsdatum der Aufgabe automatisch auf Startdatum + `time_period` gesetzt.

## Objekt `link`

Definiert eine Verknüpfung zwischen zwei Aufgaben. Beim Ausführen des Prozesses
werden die Links der Reihe nach ausgewertet. Die Verknüpfung des ersten Link,
bei dem die Bedingung (`condition`) erfüllt ist wird genommen, alle weiteren
werden ignoriert. Eine leere Bedingung ist immer erfüllt.

Felder:

- `task_ref`: Name des Tasks zu dem Verknüpft wird
- `condition`: Optional: Bedingung als [JMESPath]-Ausdruck.

## Objekt `triggers`

Definiert Events, die beim erstmaligen Abschliessen der Aufgabe ausgelöst werden.

Felder:

- `type`: Typ des triggers
- `value`: Je nach event-typ, siehe unten

Event-Typen:

- `StandortHistorisieren` - Standort wird historisiert. `value`: Kommentar für die Historisierung (text).
- `BearbeitungsstandSetzen` - Bearbeitungsstand wird gesetzt. `value`: Codewert (Format `code:<c_cli_id>:<code>`)
- `UntersuchungsStandSetzen` - UntersuchungsStand wird gesetzt. `value`: Codewert (Format `code:<c_cli_id>:<code>`)
- `ProzessStarten` - Ein Prozess wird am Standort gestartet. `value`: key (`uuid`) des Prozesses als text.
- `Publizieren` - Der Standort wird in den KbS eingetragen/entfernt.

## Felder für alle Teilschritte (`form` und `document`).

- `key`, `version`: Siehe `workflow`.
- `optional`: Optional (Boolean), wenn `true`, kann der Schritt vom Nutzer übersprungen werden (Default: `false`).
- `condition`: Optional: Bedingung als [JMESPath]-Ausdruck. Wenn die Bedingung
  nicht zutrifft, wird der Schritt übersprungen. Schritte mit leerer Bedingung werden nicht übersprungen.
- `time_period`: Optional: Frist in Tagen. Wenn gesetzt, wird das Fälligkeitsdatum des Teilschritts automatisch auf Startdatum + `time_period` gesetzt.

## Objekt `document`

Ein Ein- oder Ausgabedokument.

Felder:

- `title`: Name des Dokuments (**übersetzt**).
- `typ`: `"document"` (fester Wert).

## Objekt `form`

Ein Formular.

Felder:

- `title`: Name des Formulars (**übersetzt**).
- `typ`: `"form"` (fester Wert).
- `name`: Name des Formulars (Kleinschreibung, ohne Leerzeichen). Der Name muss
  über alle Formulare im Prozess hinweg eindeutig sein.
- `fields`: Liste von Formularfeldern (Objekt `field`).

## Objekt `field`

Ein Formularfeld.

Aktuell sind nur Multiple-Choice Felder (`type: str`, mit `choices`) und
checkboxen (`type: bool`), sowie Titel (`type: title`, Feld mit label aber ohne
wert) implementiert.

Felder:
- `name`: Name des Felds (Kleinschreibung, ohne Leerzeichen). Der Name muss
  über alle Felder im Formular hinweg eindeutig sein.
- `type`: Datentyp des Formularfelds (`str`, `bool` oder `title`).
- `label`: Beschreibung des Formularfelds (optional, **übersetzt**).
- `choices`: Liste von Auswahlmöglichkeiten (nur bei `type: str` erlaubt).
  Jeder Eintrag hat die Felder `label` (Beschreibung der Auswahl, **übersetzt**) und `value`
  (Wert, der dem Formularfeld bei Auswahl zugewiesen wird).


# Definition von Bedingungen (`condition`)

Die Felder `condition` bei `task`, `document` und `form` können eine Bedingung
in Form eines [JMESPath]-Ausdrucks enthalten. Dabei stehen folgende
Eingabedaten zur Verfügung:

## Formulardaten

Es kann auf die Formulardaten von allen vorhergegangenen Teilschritten im
Prozess zugegriffen werden. Zugriff über `form.<formular-name>.<feld-name>`.

Beispiel:

```yaml
condition: "form.entscheid_schriftliche_auskunft.auskunft_erwuenscht == `ja`"
```

Die Bedingung ist erfüllt, wenn im Formular `entscheid_schriftliche_auskunft`
beim Feld mit dem Namen `auskunft_erwuenscht` die Auswahl gewählt wurde, die
als `value` den Wert `"ja"` hat.

## Standortdaten

Es stehen ausgewählte Daten des Standorts zur Verfügung. Zugriff über `vflz.<feldname>`.

Felder:

- `vflz.beurteilung`: Codewert der Beurteilung des Standorts.

Beispiel:

```yaml
condition: "vflz.beurteilung == `01`"
```

Die Bedingung ist erfüllt, wenn der Standort die Beurteilung "unbelastet" hat.


[JMESPath]: https://jmespath.org/
