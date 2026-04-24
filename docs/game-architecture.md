# Gachapon Haeuschen - Game Architecture

## Ziel

Die Architektur soll das Spiel auf wenige stabile Grundsysteme stellen, damit spaeter sehr leicht neue Inhalte eingefuegt werden koennen:

- neue Figuren
- neue Moebel
- neue Abenteuer
- neue Forschung

Neue Inhalte sollen im Idealfall nur bedeuten:

1. neue Datei anlegen
2. im passenden `index.js` registrieren
3. fertig

## Designprinzipien

### 1. Datengetrieben statt Sonderlogik

Inhalte sollen moeglichst als Daten beschrieben werden, nicht als individuelle Logik pro Objekt.

Also lieber:

- `traits: ['curious', 'cozy']`
- `tags: ['study', 'lamp', 'soft']`
- `requirements: ['house_level_2']`

Statt:

- `if character.id === 'bunny_yellow'`
- `if furniture.id === 'lamp'`

### 2. Wenige universelle Systeme

Das Spiel sollte aus wenigen Systemen bestehen, die zusammenarbeiten:

- Figuren-System
- Moebel-System
- Abenteuer-System
- Forschungs-System
- Unlock-System
- Tag-/Trait-System

### 3. Inhalte erweitern, nicht Kernlogik duplizieren

Wenn neue Inhalte dazukommen, sollte fast nie neue Engine-Logik noetig sein.

Wenn wir merken, dass fuer ein neues Objekt extra Sondercode noetig waere, ist das meist ein Zeichen, dass das zugrunde liegende Schema zu eng ist.

### 4. Cozy first

Mechaniken sollen eher motivieren, kombinieren und sammeln als hart optimieren.

Das bedeutet:

- weiche Boni statt brutaler Min-Max-Statistik
- Freischaltungen und Interaktionen als Hauptbelohnung
- Deko als Weltlogik, nicht nur Zahlenbonus

### 5. Datenkapselung und klarer Datenfluss

State, abgeleitete Daten und Rendering sollen klar getrennt bleiben.

Das bedeutet:

- Save-State bleibt die einzige Quelle fuer persistente Wahrheit
- abgeleitete Ansichten werden ueber klar benannte Funktionen berechnet, zum Beispiel `getOutsideSummary(state)`
- Renderer bekommen moeglichst fertige View-Daten statt selbst ueberall in globale Strukturen zu greifen
- UI-Events sollen ueber gezielte Actions oder Update-Funktionen laufen statt ad hoc mehrere State-Bereiche direkt zu veraendern

Empfohlener Datenfluss:

1. `state`
2. `summary` oder `view model`
3. `render`
4. `user action`
5. gezieltes `state update`
6. erneutes `render`

Warnsignale fuer fehlende Kapselung:

- dieselbe Information wird in mehreren UI-Schichten getrennt entschieden oder dupliziert dargestellt
- ein Render-Modul kennt zu viele Details ueber globale State-Strukturen
- Event-Handler enthalten gleichzeitig DOM-Logik, Geschaeftslogik und Persistenz
- neue Features fuehren dazu, dass immer mehr Sonderfaelle in `main.js` landen

## Grundpfeiler

## 1. Figuren

Figuren sind sammelbare Bewohner mit:

- Identitaet
- Seltenheit
- Traits
- Rollen
- Vorlieben
- optionalen Gameplay-Boni

### Minimal-Schema

```js
export default {
  id: 'bunny_yellow',
  name: 'Momo',
  species: 'bunny',
  rarity: 'rare',
  palette: { /* farben */ },
  poses: ['idle', 'walk', 'think'],

  traits: ['cheerful', 'quick', 'curious'],
  roles: ['research', 'explore'],
  likes: {
    furniture_tags: ['nature', 'soft'],
    mission_tags: ['garden', 'walk'],
    species: ['slime']
  },

  bonus: {
    type: 'speed',
    target: 'research',
    value: 0.15,
    activatesAtLevel: 3
  },

  unlock: {
    available_from_start: true
  },

  lore: {
    short: 'Ein fruehlicher Hase, der nie still sitzt.'
  }
};
```

### Wichtige Regeln

- `traits` beschreiben Persoenlichkeit oder Verhalten
- `roles` beschreiben spielerische Eignung
- `likes` verbinden Figuren mit Moebeln, Missionen und anderen Figuren
- `bonus` bleibt klein und standardisiert

### Nicht tun

- keine individuellen Sonderfunktionen direkt an Figuren haengen
- keine missionsspezifische Custom-Logik pro Figur

## 2. Moebel

Moebel sind gleichzeitig:

- Dekoration
- Weltbau
- leichte Gameplay-Verstaerker
- Freischalt- und Sammlerobjekte

### Minimal-Schema

```js
export default {
  id: 'reading_lamp',
  name: 'Leselampe',
  size: { w: 1, d: 1 },

  tags: ['cozy', 'light', 'study'],

  craft: {
    cost: { wood: 4, fabric: 2 },
    duration: 360,
    unlock_cost: { research: 8 }
  },

  effects: [
    { type: 'mission_weight', target: 'night_walk', value: 0.15 },
    { type: 'mood_bonus', target: 'study', value: 1 }
  ],

  set_tags: ['reading_corner'],

  unlock: {
    research_id: 'furniture_lighting_1'
  },

  draw(ctx, tx, ty) {
    // render
  }
};
```

### Deko-Philosophie

Moebel sollten in 3 Schichten funktionieren:

1. zuerst schoen aussehen
2. Figuren und Missionen thematisch beeinflussen
3. optional kleine systemische Boni geben

### Empfohlene Effektarten

- `mission_weight`
- `mood_bonus`
- `set_progress`
- `room_theme_score`
- `interaction_unlock`

### Nicht tun

- keine harten +50%-Output-Boni als Standard
- nicht jedes Moebel zwingend numerisch relevant machen

## 3. Abenteuer

Abenteuer sind das aktive Gameplay-System.

Sie sollen:

- Teamwahl erzeugen
- Entscheidungen erzeugen
- Belohnungen erzeugen
- Lore und Hausfortschritt verbinden

### Missionsaufbau

Ein Abenteuer besteht aus:

- Thema
- Anforderungen
- empfohlenen Traits/Rollen
- Event-Schritten
- Rewards

### Minimal-Schema

```js
export default {
  id: 'forest_walk',
  name: 'Waldspaziergang',
  tags: ['outdoor', 'nature', 'calm'],

  team: { min: 1, max: 3 },
  duration_base: 900,

  requirements: {
    house_level: 1,
    unlocked: []
  },

  recommended_traits: ['curious', 'calm'],
  recommended_roles: ['explore'],

  event_pool: ['berries_found', 'hidden_path', 'rest_spot'],

  rewards: {
    resources: { wood: 2, food: 1 },
    research: 0,
    unlocks: [],
    cosmetics: []
  },

  unlock: {
    available_from_start: true
  }
};
```

### Event-System

Abenteuer sollten nicht hart in der Mission selbst geskriptet sein, sondern ueber Event-Pools laufen.

Beispiel:

```js
export default {
  id: 'hidden_path',
  text: 'Zwischen zwei Baeumen taucht ein schmaler Pfad auf.',
  choices: [
    {
      id: 'take_path',
      label: 'Pfad nehmen',
      preferred_traits: ['curious', 'brave'],
      result: { success_weight: 2, rewards: { research: 1 } }
    },
    {
      id: 'stay_safe',
      label: 'Auf dem Weg bleiben',
      preferred_traits: ['calm'],
      result: { success_weight: 1, rewards: { food: 1 } }
    }
  ]
};
```

So koennen wir spaeter sehr leicht neue Abenteuer und neue Events bauen.

## 4. Forschung

Forschung ist das zentrale Freischaltsystem.

Sie sollte nicht nur Moebel freischalten, sondern allgemein neue Inhalte oeffnen:

- Moebel
- Abenteuer
- Raumtypen
- Gacha-Pools
- Komfortfunktionen

### Minimal-Schema

```js
export default {
  id: 'furniture_lighting_1',
  name: 'Sanftes Licht',
  category: 'furniture',
  cost: 10,

  requirements: [],

  unlocks: [
    { type: 'furniture', id: 'reading_lamp' },
    { type: 'furniture', id: 'floor_lamp' }
  ]
};
```

### Effektive Unlock-Typen

- `furniture`
- `adventure`
- `room_type`
- `gacha_pool`
- `feature`
- `cosmetic`

Damit brauchen wir spaeter nur noch ein einheitliches Unlock-System.

## 5. Tag-/Trait-System

Das ist der wichtigste gemeinsame Kleber der Architektur.

### Figuren nutzen

- `traits`
- `roles`
- `likes`

### Moebel nutzen

- `tags`
- `set_tags`

### Abenteuer nutzen

- `tags`
- `recommended_traits`
- `recommended_roles`

### Forschung nutzt

- `categories`
- `unlock types`

### Vorteile

- neue Inhalte koennen miteinander interagieren, ohne Sondercode
- Systeme bleiben lesbar
- UI kann leicht filtern und gruppieren

## 6. Freizeit-, Spiel- und Bindungssystem

Spaeter sollte es ein bewusst cozyes Interaktionssystem geben, in dem man aktiv Zeit mit den Bewohnern verbringt.
Gemeint ist ein Feature aehnlich einer kleinen "Spiel- oder Pflegeecke", in der man mit den Tierchen spielen, sie beschaeftigen oder einfach mit ihnen interagieren kann.

Dieses System soll nicht primaer ein Optimierungswerkzeug sein, sondern:

- Bindung zu Figuren aufbauen
- Persoenlichkeit sichtbar machen
- kleine taegliche oder situative Interaktionen bieten
- neue Animationen, Reaktionen und Sammelziele freischalten

### Ziel des Systems

Das Feature soll den Bewohnern mehr Alltagsleben geben, besonders ausserhalb von Arbeit, Forschung und Abenteuer.

Es eignet sich gut fuer:

- streicheln oder antippen
- kleine Spielaktionen
- fuettern oder beschaeftigen
- Reaktionen zwischen Freunden oder Lieblingsfiguren
- spaetere Wetter-, Tageszeit- oder Stimmungsanbindung

### Architekturelle Einordnung

Wichtig ist, dass dieses System spaeter nicht als Sondermodus mit harter Einzellogik pro Figur gebaut wird.
Es sollte auf denselben Datenprinzipien beruhen wie der Rest:

- `traits` beeinflussen, wie Figuren auf Spiel oder Naehe reagieren
- `likes` bestimmen bevorzugte Aktivitaeten, Orte, Freunde oder Gegenstaende
- `tags` an Moebeln oder Stationen koennen Interaktionen freischalten
- `unlocks` koennen neue Freizeitaktionen, Animationen oder Minispiele oeffnen

### Moegliche spaetere Datenbausteine

```js
interaction_preferences: {
  activities: ['play', 'snack', 'nap'],
  furniture_tags: ['soft', 'toy', 'nature'],
  social: ['slime', 'bunny']
},

bond_rewards: [
  { type: 'animation', id: 'happy_spin' },
  { type: 'cosmetic', id: 'flower_hat' },
  { type: 'dialogue_pool', id: 'cozy_chat_1' }
]
```

### Designregel

Das Freizeit- und Bindungssystem soll vor allem Stimmung, Beziehung und Ausdruck staerken.
Wenn es Boni gibt, dann eher weich und indirekt:

- mehr Dialoge
- mehr Reaktionen
- kleine Komforteffekte
- kosmetische oder emotionale Freischaltungen

Nicht das Ziel:

- harter Pflichtmodus fuer optimale Produktion
- staendiges Mikromanagement
- starke Zahlenboni als Hauptgrund fuer Interaktion

## Unlock-System

Alle Freischaltungen sollten zentral ueber IDs laufen.

Beispiel:

```js
state.unlocks = {
  furniture: ['reading_lamp'],
  adventures: ['forest_walk'],
  research: ['furniture_lighting_1'],
  room_types: ['bedroom'],
  features: ['active_missions']
};
```

Dann muessen Figuren, Moebel, Abenteuer und Forschung nicht jeweils eigene Sonderlogik fuer Freischaltung mitbringen.

## Empfohlene Dateistruktur

```text
data/
  characters/
    index.js
    bunny_yellow.js
    ...
  furniture/
    index.js
    reading_lamp.js
    ...
  adventures/
    index.js
    forest_walk.js
    ...
  adventure_events/
    index.js
    hidden_path.js
    ...
  research/
    index.js
    furniture_lighting_1.js
    ...
```

## State-Ebenen

Der State sollte 2 Dinge trennen:

- `content definitions`
- `player progress`

Content-Definitionen leben in `data/...`
Spielerfortschritt lebt im Save-State.

Zusaetzlich sollte das Projekt 4 Verantwortungen sauber trennen:

- `state`: persistente Spielwerte und UI-Zustand
- `domain logic`: Regeln fuer Aktivitaeten, Unlocks, Produktion und Fortschritt
- `derived view data`: aufbereitete Daten fuer konkrete Screens oder Komponenten
- `rendering / ui binding`: DOM-Ausgabe und Event-Anbindung

Ein Screen wie die Aussenwelt sollte deshalb nicht direkt seine gesamte Anzeige aus dem Roh-State zusammenstueckeln, sondern ueber eine abgeleitete Funktion versorgt werden.
Beispiel:

- `state.js` haelt Rohdaten und gezielte Mutationen
- `activities.js` berechnet Aktivitaets- und Stationslogik
- `outside-world.js` rendert nur auf Basis einer `outside summary`
- `main.js` orchestriert Screen-Wechsel und globale App-Flows

### Empfohlene Save-Bereiche

```js
{
  resources: {},
  collection: {},
  house: {},
  activities: [],
  active_adventures: [],
  research: {},
  unlocks: {},
  mastery: {},
  cosmetics: {},
  settings: {}
}
```

## Refactoring-Leitlinie

Refactoring sollte nicht als spaete Aufraeumarbeit gesehen werden, sondern als Teil der Feature-Arbeit, sobald Grenzen unscharf werden.

### Wann wir refactoren sollten

- wenn dieselbe Information in mehreren UI-Schichten separat aufbereitet wird
- wenn ein Screen gleichzeitig State liest, Daten ableitet, rendert und Events bindet
- wenn neue Features vor allem dadurch entstehen, dass `main.js` weiter anwaechst
- wenn eine Aenderung ohne erkennbaren fachlichen Grund mehrere Dateien mit direktem State-Zugriff anfassen muss

### Ziel eines Refactorings

Ein Refactoring sollte mindestens eine Grenze wieder schaerfen:

- Datenlogik aus Rendering herausziehen
- abgeleitete Screen-Daten in eine benannte Summary-Funktion verschieben
- Event-Handling von DOM-Aufbau trennen
- einen Feature-Bereich in ein eigenes Modul schneiden

### Bevorzugte Reihenfolge

1. doppelte oder widerspruechliche Darstellung entfernen
2. Datenfluss vereinfachen
3. Modulgrenzen nachziehen
4. erst danach feinere kosmetische Aufraeumarbeiten machen

### Keine Big-Bang-Umbauten

Wir bevorzugen kleine, klare Schnitte statt kompletter Neuorganisation in einem Schritt.

Gut:

- `getOutsideSummary()` einfuehren oder schaerfen
- `renderOutsideScene()` in ein eigenes Modul verschieben
- direkte State-Zugriffe in UI-Helfern reduzieren

Weniger gut:

- mehrere Systeme gleichzeitig umbenennen und verschieben
- State-, Render- und Datenmodell parallel neu erfinden
- Refactoring ohne sichtbare Vereinfachung im Datenfluss

### Entscheidungsregel

Wenn ein neues Feature nur durch mehr Sonderfaelle im bestehenden Render-Code moeglich wird, sollten wir zuerst refactoren und erst dann erweitern.

## MVP

Fuer eine erste stabile Version reichen diese Systeme:

### Muss rein

- Figuren mit `traits`, `roles`, `likes`
- Moebel mit `tags`
- Forschung mit generischen `unlocks`
- 1 aktiver Missionstyp
- Abenteuer-Events mit Entscheidungen

### Kann spaeter kommen

- Kostueme / Hute
- Freundschaften
- Freizeit-/Spielmodus mit Bewohnern
- Raumtypen
- Set-Boni
- Figuren-Mastery
- saisonale Inhalte

## Erweiterungsstrategie

### Neue Figur hinzufuegen

1. Datei in `data/characters/`
2. in `data/characters/index.js` registrieren
3. fertig

### Neues Moebel hinzufuegen

1. Datei in `data/furniture/`
2. Tags und optionale Effects definieren
3. in `index.js` registrieren

### Neues Abenteuer hinzufuegen

1. Datei in `data/adventures/`
2. Event-Pool definieren
3. benoetigte Events in `data/adventure_events/` anlegen
4. registrieren

### Neue Forschung hinzufuegen

1. Datei in `data/research/`
2. `unlocks` definieren
3. registrieren

## Architektur-Regeln fuer die Zukunft

Vor jeder neuen Mechanik sollten wir pruefen:

1. Kann das ueber Tags/Traits/Unlocks ausgedrueckt werden?
2. Kann das als Daten statt Sonderlogik modelliert werden?
3. Ist es ein neues System oder nur neuer Content fuer ein bestehendes System?

Wenn es nur neuer Content ist, sollte keine groessere Codeaenderung noetig sein.

## Empfohlene naechste Umsetzungsschritte

1. Figuren-Schema auf `traits`, `roles`, `likes`, `lore` erweitern
2. Moebel-Schema auf `tags`, `effects`, `set_tags` erweitern
3. Forschungsdaten aus der aktuellen Moebel-Logik herausziehen
4. neues `adventures`-Datensystem anlegen
5. ein kleines Event-/Choice-System fuer aktive Missionen bauen

## Kurzfassung

Die Architektur sollte auf diesem Prinzip beruhen:

`wenige allgemeine Systeme + viele datengetriebene Inhalte`

Dann koennen wir spaeter sehr schnell skalieren, ohne das Spiel jedes Mal neu zu verdrahten.
