# Speeky-Tester – Projektkontext für Claude Code

Offline-fähige **PWA zur Lautsprecher-Prüfung**. Die App misst über das Gerätemikrofon,
ob ein **extern abgespielter** Hochfrequenz-Testton (typ. 17–22 kHz, für Menschen meist
unhörbar) messbar ist, und protokolliert die Pegel. Der Ton wird **nicht** von der App
erzeugt – eine externe PA-Anlage spielt ihn ab; die App hört nur zu.

**UI-Sprachen:** Englisch und Deutsch (Umschalter im Header). Fallback: Englisch.
Browser-Sprache `de*` → initial Deutsch. Code/Bezeichner: Englisch.

## Stack

- **Vite 8 + React 19 + TypeScript** (strict, `tsc -b` im Build)
- **Dexie 4** über IndexedDB (`src/db/index.ts`) – gesamte Persistenz, kein Backend
- **Web Audio API** (`AnalyserNode`, FFT) für die Messung
- **vite-plugin-pwa** (`registerType: autoUpdate`, Workbox) – offline nach erstem Laden
- **Export:** jsPDF + jspdf-autotable (PDF), `docx` (Word), SheetJS/`xlsx` (Excel-Export + XLS-Import), PapaParse (CSV)
- **Capacitor 8** (optional) für native Android-Verpackung
- **react-router-dom 7** – Routing mit `basename` aus `import.meta.env.BASE_URL`
- **i18n:** eigene Lösung ohne Library (`src/i18n/`)

Es gibt **kein Backend und keine automatisierten Tests**. Alles läuft client-seitig im Browser.

## Befehle

```bash
npm run dev          # Dev-Server mit --host (LAN-Zugriff), Port 5173
npm run build        # tsc -b && vite build
npm run preview      # Prod-Build lokal testen, Port 4173
npm run lint         # ESLint
npm run build:pages  # Build mit BASE_PATH=/Speeky-Tester/ für GitHub Pages
npm run cap:android  # Build + cap sync + Android Studio öffnen
```

`vite.config.ts` setzt `base` aus `process.env.BASE_PATH` (Default `/Speeky-Tester/`).

**Deployment:** Push auf `main` → GitHub-Workflow (`.github/workflows/deploy-pages.yml`)
baut und veröffentlicht auf Branch `gh-pages` → https://huberion.github.io/Speeky-Tester/

## Architektur / Verzeichnisse

```
src/
  audio/analyzer.ts           AudioAnalyzer, FFT, SPL-Kalibrierung, formatFrequencyBand
  db/index.ts                 Dexie-Schema v2, Migrationen, CRUD
  types/index.ts              Zentrale Typen (Datenmodell)
  hooks/useSession.ts         Aktive Testsitzung (localStorage-Pointer)
  i18n/
    translations.ts           Alle UI-/Export-Strings EN + DE
    core.ts                   translate, useT, tGlobal, fmtDateTime, localeFor
    LanguageProvider.tsx      React-Provider + Sprachpersistenz
  pages/
    DashboardPage.tsx         Übersicht, Fortschritt, Mess-Links
    SpeakersPage.tsx          Sitzungen + Lautsprecher (Zentrale Verwaltung)
    MeasurePage.tsx           Listen- und Ad-hoc-Messung
    ProtocolPage.tsx          Messprotokoll der Sitzung
    ExportPage.tsx            PDF / Word / Excel / CSV
    SettingsPage.tsx          Defaults, SPL-Kalibrierung
  components/
    Layout.tsx                Navigation + Sprachumschalter
    ImportModal.tsx           CSV/XLS-Import (sitzungsgebunden)
  import/csvXls.ts            Parsen, Spalten-Mapping, Demo-Vorlagen, Duplikat-Warnung
  export/
    buildExportData.ts        Export-Daten aggregieren
    pdf.ts | docx.ts | csv.ts | xlsx.ts
  lib/measurementDisplay.ts     Ad-hoc vs. Listen-Anzeige, Export-Präfix
```

Routing in `src/App.tsx`. **Sitzungsverwaltung** liegt im **Speakers-Tab** (`SpeakersPage`);
das **Dashboard** ist nur Übersicht (aktive Sitzung, Fortschritt, Links zu Messen).

## Mehrsprachigkeit (i18n)

- **Standardsprache:** Englisch. Deutsch umschaltbar im Header.
- Persistenz: `localStorage` Key `lang`. Initial: gespeicherte Sprache, sonst Browser (`de*` → Deutsch).
- **Komponenten:** `const { t, lang, setLang } = useT();` → `t('bereich.key', { var })`
- **Außerhalb React** (db, export, lib): `tGlobal('key')`, `fmtDateTime()`, `fmtDateNow()`, `localeFor()`
- **Neue Strings:** immer in `translations.ts` unter `resources.en` **und** `resources.de` eintragen.
- **Keine hardcodierten UI-Strings** in Komponenten/Exporten – fehlende Keys fallen auf EN, dann Key-String zurück.
- Ad-hoc-Defaults: `measure.adhocUnlabeled`, Export-Präfix: `doc.adhocPrefix` via `formatAdhocExportName()`.

## Datenmodell (Dexie, DB-Name `speeky-tester`, **Version 2**)

Tabellen: `speakers`, `sessions`, `measurements`, `calibration`, `appSettings`.
Typen in `src/types/index.ts`.

| Entität | Beschreibung |
|---------|--------------|
| **Speaker** | Gehört zu **einer Sitzung** (`sessionId` Pflicht): `name`, `location`, `note?` |
| **TestSession** | Prüfsitzung mit eingefrorenen `settings` (Frequenz, Toleranz, SNR-Schwelle, Dauer). Beim Anlegen aus `appSettings` kopiert. Optional Lautsprecher von anderer Sitzung übernehmen: `createSession(name, copyFromSessionId?)` |
| **Measurement** | Ergebnis einer Sitzung. Entweder `speakerId` (Liste) **oder** Ad-hoc (`adhocLabel?`, `adhocLocation?`, kein `speakerId`) |
| **Calibration** | Optionaler SPL-Offset (Singleton) |
| **AppSettings** | Globale Defaults (Singleton) |

### Konventionen

- **Aktive Sitzung:** ID in `localStorage` (`activeSessionId`). `ensureDefaultSession()` legt bei Bedarf eine an.
- **`deleteSession(id)`:** löscht kaskadierend Messungen **und** Lautsprecher der Sitzung. War die Sitzung aktiv → `activeSessionId` wird geleert, beim nächsten Zugriff neue Default-Sitzung.
- **Migration v1→v2:** Bestehende globale Lautsprecher werden der aktiven/ersten Sitzung zugeordnet; ggf. „Migriert …“-Sitzung angelegt. Bei Schema-Änderungen `version()` erhöhen + `upgrade()`.
- **Upsert pro Lautsprecher:** `addMeasurement()` überschreibt existierende Messung für `[sessionId+speakerId]`. Ad-hoc-Messungen werden immer neu angelegt.
- **Defaults:** 19000 Hz, ±50 Hz Toleranz, Pass-SNR 6 dB, Dauer 5000 ms (`DEFAULT_SETTINGS` in `db/index.ts` – bei Änderung alle Stellen prüfen).

### Wichtige DB-Funktionen

```text
getSpeakersForSession(sessionId)
copySpeakersToSession(fromId, toId)
getMeasurementsForSession(sessionId)
addMeasurement / updateMeasurement / deleteMeasurement
createSession(name, copyFromSessionId?)
deleteSession(id)
getAppSettings / saveAppSettings
getCalibration / saveCalibration / clearCalibration
```

## Messlogik (`src/audio/analyzer.ts`)

- `FFT_SIZE = 8192`. Mikrofon **ohne** `echoCancellation`/`noiseSuppression`/`autoGainControl`.
- **Zielband:** Energie in Bins `frequencyHz ± toleranceHz` (konfigurierbar, Default ±50 Hz).
- **Rauschboden:** Median benachbarter Bins außerhalb des Bands.
- **SNR** = `levelDbfs − noiseFloorDbfs` (dBFS aus `20·log10` der normalisierten FFT-Amplitude).
- **Live-Erkennung:** `snrDb ≥ 3 && levelDbfs > −80`.
- **`measure()`:** ~50 ms Polling über `durationMs`, Mittelwert/Peak, Mehrheitsentscheid für `detected`.
- **Status:** `pass` wenn `detected && snrDb ≥ passSnrThreshold`; `inconclusive` wenn `!detected && snrDb < 3`; sonst `fail`.
- **SPL:** `applySplCalibration()` addiert Offset; ohne Kalibrierung `levelDbSpl` = `undefined`.

## Messablauf UI (`pages/MeasurePage.tsx`)

Zwei Modi: **`list`** (Lautsprecher aus Sitzungsliste) und **`adhoc`** (Schnellmessung).
Phasen: `select → countdown (3 s) → measuring → result`.

Nach Speichern im Listen-Modus: automatisch nächster ungetesteter Lautsprecher.
`AudioAnalyzer` in `useRef`, beim Unmount `stop()`.

URL-Parameter: `/measure?mode=adhoc` für direkten Ad-hoc-Start.

## Import / Export

**Import** (`import/csvXls.ts`):
- Spalten `name`, `location`, optional `note` (DE/EN-Header werden erraten)
- `downloadDemoCsv()` / `downloadDemoXlsx()` – lokalisierte Vorlagen
- Import immer in **aktive Sitzung** (`ImportModal` erhält `sessionId`)

**Export** (`export/`):
- Formate: PDF, Word, Excel, CSV
- Sprache der Export-Texte folgt `tGlobal()` / aktueller UI-Sprache
- Ad-hoc-Einträge: `[Ad-hoc]`-Präfix via `formatAdhocExportName()`

## Wichtige Stolpersteine

| Thema | Detail |
|-------|--------|
| Mikrofon | Braucht **HTTPS** oder `localhost`. LAN-IP (`http://192.168.x.x`) → iOS blockiert Messung |
| Ultraschall | Viele Mikrofone filtern >18–20 kHz – kein Software-Bug |
| iOS | Mikrofon nur bei aktiver App |
| Routing | Default-Base `/Speeky-Tester/` – Router-`basename` aus `BASE_URL` |
| PWA-Cache | Nach Deploy ggf. hart neu laden |
| Bundle | ~1,6 MB JS (SheetJS) – für Feld-PWA akzeptabel |

## CSV/XLS-Import

`guessColumnMapping()` erkennt u. a. `name`/`bezeichnung`/`lautsprecher`, `standort`/`location`/`raum`, `notiz`/`note`.
Zeilen ohne `name` werden verworfen. `findDuplicateWarnings()` warnt bei Name+Standort-Dubletten (Import trotzdem möglich).

## Speaker Copy (`SpeakersPage.handleCopy`)

Kopiert Lautsprecher in dieselbe Sitzung mit suffix `(Copy)` / `(Kopie)` – lokalisiert via `speakers.copySuffix`.
Nummerierung bei mehrfachen Kopien: `(Copy 2)`, `(Copy 3)` … Regex strippt vorhandene Suffixe vor Neuberechnung.

## Was bei Änderungen beachten

1. Neue UI-Texte → `translations.ts` (EN + DE)
2. Datenmodell-Änderung → Dexie `version()` + Migration
3. Default-Werte → `DEFAULT_SETTINGS` in `db/index.ts` und ggf. `SettingsPage`
4. Export-Spalten → `doc.col.*` Keys + alle vier Export-Module
5. README und diese Datei bei größeren Features aktualisieren
