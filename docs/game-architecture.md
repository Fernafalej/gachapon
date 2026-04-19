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
