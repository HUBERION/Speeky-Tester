# Speeky-Tester

Offline-fähige **PWA** zur Lautsprecher-Prüfung mit **externem Testton**. Die App misst über das Mikrofon, ob ein konfigurierbarer Hochfrequenz-Ton (typisch 17–22 kHz, für Menschen meist unhörbar) messbar ist, und protokolliert Pegelwerte (dBFS, SNR, optional geschätzter dB SPL).

Der Testton wird **nicht** von der App erzeugt – eine externe PA-Anlage spielt ihn ab; die App hört nur zu.

**Live-Demo (HTTPS):** https://huberion.github.io/Speeky-Tester/

## Funktionen

- **Testsitzungen** – mehrere Projekte/Objekte parallel (z. B. Gebäude A vs. B)
- **Lautsprecher pro Sitzung** – eigene Liste je Sitzung, optional von einer anderen Sitzung übernehmen
- **Messung aus Liste** – nacheinander alle Lautsprecher einer Sitzung prüfen
- **Ad-hoc-Messung** – Schnelltest ohne Listeneintrag (Stichprobe, Test vor Ort)
- **Konfigurierbare Frequenz** und **Frequenz-Streuung** (z. B. 19.000 Hz ±50 Hz)
- **Erkennung:** Ton ja/nein, Pegel (dBFS), SNR, Peak, Mittelwert, Pass/Fail
- **Optional:** SPL-Kalibrierung für geschätzte dB-SPL-Werte
- **Import:** CSV/XLS mit Spalten-Mapping + Demo-Vorlagen zum Download
- **Lautsprecher kopieren** – Duplikat mit nummeriertem Namen (z. B. „LS-001 (Kopie 2)“)
- **Export:** PDF, Word (.docx), Excel (.xlsx), CSV
- **Mehrsprachig:** Deutsch / Englisch (Umschalter im Header)
- **Offline** nach erstem Laden (Service Worker + IndexedDB)
- **Optional:** native Android-App via Capacitor

## Schnellstart (Entwicklung)

```bash
npm install
npm run dev
```

Browser: `http://localhost:5173`

### Vom Smartphone im WLAN

Nach `npm run dev` die **Network**-URL aus der Konsole nutzen (z. B. `http://192.168.x.x:5173`).

**Wichtig:** Safari/iOS erlaubt Mikrofon-Zugriff nur über **HTTPS** oder `localhost` – nicht über eine nackte LAN-IP. Für iPhone-Tests daher GitHub Pages (HTTPS) oder die Android-App verwenden.

## Deployment (GitHub Pages)

Bei jedem Push auf `main` baut der Workflow (`.github/workflows/deploy-pages.yml`) und veröffentlicht auf den Branch `gh-pages`.

**Einmalig aktivieren** (Repo-Einstellungen):

1. https://github.com/HUBERION/Speeky-Tester/settings/pages
2. **Source:** Deploy from a branch → `gh-pages` → `/ (root)` → Save

URL: **https://huberion.github.io/Speeky-Tester/**

Lokaler Pages-Build:

```bash
npm run build:pages
npm run preview
```

## Nutzung

### 1. Sitzung & Lautsprecher (Tab „Lautsprecher“)

- Neue Testsitzung anlegen (optional Lautsprecherliste von einer anderen Sitzung **kopieren**)
- Sitzungen wechseln oder löschen (inkl. aller Lautsprecher und Messungen der Sitzung)
- Lautsprecher manuell anlegen, **importieren** (CSV/XLS) oder **kopieren**

### 2. Messen (Tab „Messen“)

| Modus | Beschreibung |
|--------|----------------|
| **Aus Liste** | Lautsprecher der aktiven Sitzung wählen, Messung zuordnen |
| **Ad-hoc** | Schnellmessung mit optionaler Bezeichnung/Standort |

Ablauf: Externen Testton an der PA starten → „Messung vorbereiten“ → 3-Sekunden-Countdown → Aufnahme → Ergebnis speichern.

### 3. Protokoll & Export

- Alle Messungen der Sitzung einsehen (Liste + Ad-hoc)
- Export als PDF, Word, Excel oder CSV

### CSV/XLS-Import

Erwartete Spalten (Header werden automatisch erkannt):

```csv
name,location,note
LS-001,Eingang Nord,
LS-002,Flur 2.OG,Reparatur 2024
```

Im Import-Dialog stehen **Demo-Vorlagen** (CSV/Excel) zum Download bereit.

## Android-App (Capacitor, optional)

```bash
npm run build
npx cap add android    # einmalig
npm run cap:sync
npm run cap:open android
```

Oder: `npm run cap:android`

## Geräte-Hinweise

- Viele Smartphone-Mikrofone filtern oberhalb von **18–20 kHz** – Messungen bei 22 kHz können unzuverlässig sein
- **dB SPL** ohne Kalibriermikrofon ist nur näherungsweise (Kalibrierung unter Einstellungen)
- **iOS:** Mikrofon nur bei aktiver, fokussierter App
- Nach App-Updates ggf. **hart neu laden** (PWA-Cache / Service Worker)

## Technologie

| Bereich | Stack |
|---------|--------|
| Frontend | Vite 8, React 19, TypeScript |
| Persistenz | Dexie (IndexedDB), kein Backend |
| Audio | Web Audio API (FFT) |
| Offline | vite-plugin-pwa |
| Export | jsPDF, docx, SheetJS (xlsx), PapaParse |
| i18n | Eigene EN/DE-Lösung (`src/i18n/`) |
| Native | Capacitor 8 (optional) |

## Projektstruktur (Kurz)

```
src/
  audio/analyzer.ts      FFT-Messung, SPL-Kalibrierung
  db/index.ts            Dexie-Schema, Migrationen, CRUD
  i18n/                  Übersetzungen EN/DE
  pages/                 Dashboard, Speakers, Measure, Protocol, Export, Settings
  import/csvXls.ts       Import + Demo-Vorlagen
  export/                PDF, Word, Excel, CSV
```

Ausführlicher Kontext für Entwicklung/KI: siehe [`CLAUDE.md`](CLAUDE.md).

## Befehle

```bash
npm run dev          # Dev-Server (--host, Port 5173)
npm run build        # Produktions-Build
npm run preview      # Build lokal testen (Port 4173)
npm run lint         # ESLint
npm run build:pages  # Build für GitHub Pages
npm run cap:android  # Android Studio öffnen
```
