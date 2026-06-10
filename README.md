# Speeky-Tester

Offline-fähige PWA zur Lautsprecher-Messung mit **externem Testton**. Die App erfasst über das Mikrofon, ob ein konfigurierbarer Ton (typisch 17–22 kHz, für Menschen meist unhörbar) messbar ist und protokolliert Pegelwerte (dBFS, SNR, optional geschätzter dB SPL).

## Funktionen

- Lautsprecherliste manuell pflegen oder per **CSV/XLS** importieren
- Messung pro Lautsprecher mit konfigurierbarer Frequenz und Messdauer
- Erkennung: Ton ja/nein, Pegel (dBFS), SNR, Peak, Mittelwert
- Optional: SPL-Kalibrierung für geschätzte dB-SPL-Werte
- Testsitzungen mit Fortschrittsanzeige
- Export als **PDF**, **Word (.docx)** und **CSV**
- Vollständig **offline** nach erstem Laden (Service Worker + IndexedDB)

## Schnellstart (Entwicklung)

```bash
npm install
npm run dev
```

Öffnen Sie `http://localhost:5173` im Browser (HTTPS oder localhost für Mikrofon-Zugriff).

## Produktions-Build

```bash
npm run build
npm run preview
```

## Als PWA installieren

1. App im Browser öffnen (nach `npm run build && npm run preview` oder auf einem Webserver)
2. **Android Chrome:** Menü → „Zum Startbildschirm hinzufügen“
3. **iOS Safari:** Teilen → „Zum Home-Bildschirm“

## Android-App (Capacitor, optional)

```bash
npm run build
npx cap add android    # einmalig
npx cap sync android
npx cap open android   # Android Studio
```

In Android Studio: APK bauen oder auf Gerät deployen. Mikrofon-Berechtigung ist in der Manifest-Datei erforderlich (wird von Capacitor standardmäßig gesetzt).

## Nutzung

1. Lautsprecher anlegen oder CSV/XLS importieren (Spalten: `name`, `location`, optional `note`)
2. Testsitzung auf dem Dashboard erstellen oder fortsetzen
3. Unter **Messen** Lautsprecher wählen, Frequenz einstellen
4. **Externen Testton** an der PA-Anlage starten
5. „Messung vorbereiten“ → Countdown → Aufnahme
6. Ergebnis speichern, Protokoll prüfen, exportieren

### CSV-Import Beispiel

```csv
name,location,note
LS-001,Eingang Nord,
LS-002,Flur 2.OG,Reparatur 2024
```

## Geräte-Hinweise

- Viele Smartphone-Mikrofone filtern oberhalb von **18–20 kHz** – Messungen bei 22 kHz können unzuverlässig sein
- **dB SPL** ohne Kalibriermikrofon ist nur näherungsweise (Kalibrierung unter Einstellungen)
- **iOS:** Mikrofon nur bei aktiver, fokussierter App verfügbar
- Der Testton wird **nicht** von der App erzeugt – ein externes System (PA-Anlage) muss den Ton abspielen

## Technologie

- Vite + React + TypeScript
- Dexie (IndexedDB)
- Web Audio API (FFT-Analyse)
- vite-plugin-pwa
- jsPDF, docx, SheetJS, PapaParse
- Capacitor (optional für native Android-Installation)
