# Next Agent Handoff

Stand: 2026-04-21

## Projektstatus

Der lokale Projektstand ist weiter als `remote` und noch nicht gepusht.

Der spielbare Core-Loop steht als funktionaler Prototyp:

- Gacha
- Sammlung
- Aktivitaeten
- Ressourcenfluss
- Forschung
- Innenansicht
- Aussenansicht

Die Systembasis ist stabil genug, dass der aktuelle Hauptfokus nicht mehr auf dem Core-Loop liegt, sondern auf dem visuellen Feinschliff der Aussenwelt.

## Wichtige Strukturentscheidung

Die Aussenwelt wurde aus `js/main.js` nach `js/outside-world.js` ausgelagert.

Das bitte nicht wieder zurueckbauen.

## Relevante Dateien

Fuer den aktuellen Problemraum besonders relevant:

- `js/outside-world.js`
- `style.css`
- `js/main.js`

Es gibt ausserdem lokale Aenderungen in:

- `js/activities.js`
- `js/state.js`
- `js/ui.js`
- `docs/game-architecture.md`

## Nutzerfeedback zur Aussenwelt

Der Nutzer ist mit dem Look der Aussenwelt weiterhin unzufrieden.

Hauptkritik:

- wirkt kuenstlich
- wirkt "meist"
- nicht cute genug
- nicht sauber komponiert

Gewuenschte Richtung:

- Aussenwelt gestalterisch wie die Innenansicht denken
- Iso-Felder ueber den ganzen Bildschirm
- Haus sichtbar im Hintergrund
- spaeter groesser beziehungsweise scrollbar
- spaeter mit platzierbaren Gartenelementen

## Letzte visuelle Anpassungen

- Die transparente Hilfsform wurde entfernt.
- Das Haus wurde wieder als Hintergrundkulisse eingebaut.
- Das Dach soll vor dem Body liegen und etwas hoeher sitzen.
- Die sichtbare Menue-Zahl `25` war der Forschungszaehler und wurde aus der sichtbaren UI entfernt, damit sie nicht mehr verwirrt.

## Interaktion und Risiken

Workstations waren zwischenzeitlich nicht tappable wegen Layer- und `pointer-events`-Problemen. Das wurde zuletzt ueber Pointer-Event-Bereinigung gefixt.

Drag-and-Drop fuer Aussen-Worker wurde begonnen:

- Worker koennen gezogen werden
- Worker koennen auf Aussenstationen gedroppt werden
- die Logik dafuer sitzt in `js/outside-world.js` und `js/main.js`

Wichtig: Das im Browser verifizieren und nicht blind als "fertig" annehmen.

## Empfehlung fuer den naechsten Agenten

Der wichtigste offene Punkt ist die finale Aussenwelt-Darstellung.

Wenn weiteres CSS-Tuning weiterhin kuenstlich, unstimmig oder zusammengebastelt aussieht, dann nicht endlos weiter an HTML- und CSS-Kulissen ziehen. In dem Fall ernsthaft auf einen Canvas- oder Room-Renderer-Ansatz fuer die Aussenwelt wechseln.

## Ehrliche Abgabeformulierung

Der aktuelle Stand sollte ehrlich so beschrieben werden:

"Funktionaler, spielbarer Prototyp mit stabiler Systembasis, aber offenem visuellen Feinschliff der Aussenwelt."

## Ultrakurze Version

- Lokal weiter als `remote`, noch nicht gepusht.
- Core-Loop steht, Aussenwelt technisch modularisiert in `js/outside-world.js`.
- Nutzer hasst den aktuellen Aussenwelt-Look noch immer.
- Ziel: vollflaechige Iso-Aussenwelt wie innen, Haus sichtbar im Hintergrund, spaeter scrollbar plus Gartenplatzierung.
- Tap und Drag fuer Aussen-Worker wurden zuletzt angefasst, unbedingt im Browser pruefen.
- Wenn CSS weiter schlecht wirkt: Aussenwelt auf Canvas- oder Room-Renderer umstellen.
