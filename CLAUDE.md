# Speeky-Tester – Projektkontext für Claude Code

Offline-fähige **PWA zur Lautsprecher-Prüfung**. Die App misst über das Geräte­mikrofon,
ob ein **extern abgespielter** Hochfrequenz-Testton (typ. 17–22 kHz, für Menschen meist
unhörbar) an einem Lautsprecher messbar ist, und protokolliert die Pegel. Der Ton wird
**nicht** von der App erzeugt – eine externe PA-Anlage spielt ihn ab; die App hört nur zu.

Sprache der App und UI: **Deutsch**. Code/Bezeichner: Englisch. Doku/Kommentare gemischt.

## Stack

- **Vite 8 + React 19 + TypeScript** (strict, `tsc -b` im Build)
- **Dexie 4** über IndexedDB (`src/db/index.ts`) – gesamte Persistenz, kein Backend
- **Web Audio API** (`AnalyserNode`, FFT) für die Messung
- **vite-plugin-pwa** (`registerType: autoUpdate`, Workbox) – offline nach erstem Laden
- **Export:** jsPDF + jspdf-autotable (PDF), `docx` (Word), PapaParse (CSV-Im-/Export), SheetJS/`xlsx` (XLS-Import)
- **Capacitor 8** (optional) für native Android-Verpackung
- **react-router-dom 7** – Routing mit `basename` aus `import.meta.env.BASE_URL`

Es gibt **kein Backend und keine Tests**. Alles läuft client-seitig im Browser.

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
Deployment: Push auf `main` → GitHub-Workflow (`.github/workflows/deploy-pages.yml`)
baut und veröffentlicht auf Branch `gh-pages` → https://huberion.github.io/Speeky-Tester/

## Architektur / Verzeichnisse

```
src/
  audio/analyzer.ts        Kern: AudioAnalyzer-Klasse, FFT-Auswertung, SPL-Kalibrierung
  db/index.ts              Dexie-Schema + alle DB-Zugriffsfunktionen
  types/index.ts           Zentrale Typen (Single Source of Truth für Datenmodell)
  hooks/useSession.ts      Aktive Testsitzung laden/wechseln (localStorage-Pointer)
  pages/                   Eine Datei pro Route (Dashboard, Speakers, Measure, Protocol, Export, Settings)
  components/              Layout (Navigation) + ImportModal
  import/csvXls.ts         CSV/XLS parsen, Spalten-Mapping raten, Duplikate warnen
  export/                  buildExportData → csv.ts | pdf.ts | docx.ts
  lib/measurementDisplay.ts  Anzeige-Helfer: Ad-hoc vs. Listen-Lautsprecher
```

Routing in `src/App.tsx`; alle Seiten liegen unter einem gemeinsamen `<Layout>`.

## Datenmodell (Dexie, DB-Name `speeky-tester`, **v2**)

Tabellen: `speakers`, `sessions`, `measurements`, `calibration`, `appSettings`.
Typen in `src/types/index.ts`. Wichtige Beziehungen:

- **Speaker** – gehört zu **genau einer Sitzung** (`sessionId`, Pflichtfeld) plus `name`, `location`, `note`. Lautsprecher sind also **sitzungsbezogen**, nicht global. Geladen über `getSpeakersForSession(sessionId)`.
- **TestSession** – eine Prüfsitzung mit eingefrorenen `settings` (Frequenz, Toleranz, SNR-Schwelle, Dauer). Wird beim Anlegen aus `appSettings` kopiert. Beim Anlegen kann optional die Lautsprecherliste einer anderen Sitzung übernommen werden (`createSession(name, copyFromSessionId?)` → `copySpeakersToSession`).
- **Measurement** – ein Messergebnis, gehört zu `sessionId`. Entweder einem `speakerId` zugeordnet **oder** „Ad-hoc" (dann `adhocLabel`/`adhocLocation`, kein `speakerId`).
- **Calibration** – optionaler SPL-Offset (Singleton: max. 1 Zeile).
- **AppSettings** – globale Defaults (Singleton).

Konventionen, die im Code vorausgesetzt werden:

- **Aktive Sitzung** wird als ID in `localStorage` (`activeSessionId`) gehalten, nicht in der DB. `ensureDefaultSession()` legt bei Bedarf automatisch eine an.
- **`deleteSession()` löscht kaskadierend** die zugehörigen Messungen **und** Lautsprecher der Sitzung.
- **Schema-Migration v1→v2** (`db/index.ts`): vormals globale Lautsprecher werden der aktiven (bzw. ersten) Sitzung zugeordnet; existiert keine Sitzung, wird eine „Migriert …"-Sitzung angelegt. Bei weiteren Modelländerungen erneut `version()` hochziehen.
- **„Eine Messung pro Lautsprecher pro Sitzung":** `addMeasurement()` macht ein Upsert – existiert bereits eine Messung für `[sessionId+speakerId]`, wird sie **überschrieben**. Ad-hoc-Messungen (ohne `speakerId`) werden dagegen immer neu angelegt.
- Defaults: Frequenz **19000 Hz**, Toleranz **±50 Hz**, Pass-SNR **6 dB**, Dauer **5000 ms** (in `db/index.ts` und an mehreren Stellen dupliziert – bei Änderung alle prüfen).

## Messlogik (`src/audio/analyzer.ts`) – das Herzstück

- `FFT_SIZE = 8192`. Mikrofon wird ohne `echoCancellation`/`noiseSuppression`/`autoGainControl` geöffnet (würde die Hochton-Messung verfälschen).
- **Zielband:** Bins im Bereich `frequencyHz ± toleranceHz` → mittlere Amplitude = Signal.
- **Rauschboden:** Median der Nachbar-Bins außerhalb des Bands (mit Guard-Abstand `marginBins`).
- **SNR** = `levelDbfs − noiseFloorDbfs`. Amplituden (0–1 aus `getByteFrequencyData`) → dBFS via `20·log10`.
- **Live-Erkennung pro Frame:** `snrDb ≥ 3 && levelDbfs > −80`.
- **Messung** (`measure()`): pollt ~alle 50 ms über `durationMs`, mittelt Pegel/Noise/SNR, nimmt Peak.
  - `detected` = Mehrheit der Frames erkannt.
  - **Status:** `pass` wenn `detected && snrDb ≥ passSnrThreshold`; `inconclusive` wenn `!detected && snrDb < 3` (zu leise/kein Signal); sonst `fail`.
- **SPL-Kalibrierung** (`applySplCalibration`): nur ein additiver Offset `referenceDbSpl − referenceDbfs` auf den dBFS-Wert. Liefert `undefined` ohne Kalibrierung → `levelDbSpl` bleibt leer.

## Messablauf (UI, `pages/MeasurePage.tsx`)

Zwei Modi: **`list`** (Lautsprecher aus Liste) und **`adhoc`** (Schnellmessung).
Phasen: `select → countdown (3 s) → measuring → result`. Im Result speichert/​verwirft der
Nutzer. Nach dem Speichern im Listen-Modus springt die Auswahl automatisch zum nächsten
ungetesteten Lautsprecher. Der `AudioAnalyzer` lebt in einem `useRef` und wird beim Unmount
gestoppt.

## Wichtige Stolpersteine

- **Mikrofon braucht HTTPS oder `localhost`.** Über `http://192.168.x.x` (LAN-IP) blockiert
  Safari/iOS `getUserMedia` – die Seite lädt, aber die Messung schlägt fehl. Deshalb für
  Gerätetests GitHub Pages (HTTPS) oder die Android-App nutzen, nicht die nackte Dev-LAN-URL.
- **Hardware-Grenze:** Viele Smartphone-Mikrofone filtern oberhalb ~18–20 kHz. Messungen
  bei 22 kHz sind oft unzuverlässig – kein Code-Bug, sondern physikalische Grenze.
- **iOS:** Mikrofon nur bei aktiver, fokussierter App.
- **`base`/Routing:** Bei lokalem `preview` greift Default-Base `/Speeky-Tester/`. Der Router
  leitet die `basename` aus `BASE_URL` ab – beim Verlinken/Testen beachten.
- Beim Ändern des Datenmodells **Dexie-`version()` hochziehen** und ggf. Migration ergänzen.

## CSV/XLS-Import (`import/csvXls.ts`)

Erwartete Spalten: `name`, `location`, optional `note`. `guessColumnMapping()` errät
Spalten anhand deutscher/englischer Stichwörter (z. B. `standort`/`location`/`raum`).
Zeilen ohne `name` werden verworfen; `findDuplicateWarnings()` warnt bei Name+Standort-Dubletten.
