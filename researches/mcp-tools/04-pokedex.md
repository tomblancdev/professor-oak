# MCP Tools: Pokedex

## Overview

| Tool | Purpose |
|------|---------|
| `getPokedex` | Get full Pokedex or filtered view |
| `getPokemon` | Get details of a specific caught Pokemon |
| `addPokemon` | Add a caught Pokemon to Pokedex |
| `evolvePokemon` | Evolve a Pokemon (on review/deep learning) |
| `getPokedexStats` | Get collection statistics |

---

## `getPokedex`

**Purpose**: Get Pokedex entries (caught Pokemon = knowledge pieces)

**Input**:
```typescript
{
  topic?: string,           // Filter by topic
  level?: string,           // Filter by level caught at
  tier?: number,            // Filter by complexity tier (1-5)
  evolved?: boolean,        // Only evolved Pokemon
  limit?: number,           // Pagination
  offset?: number
}
```

**Returns**:
```typescript
{
  trainer: "Tom",

  entries: [
    {
      id: "pokemon-001",
      pokedexNumber: 4,
      name: "Charmander",
      sprite: "https://raw.githubusercontent.com/.../4.png",  // From PokeAPI

      knowledge: {
        topic: "docker",
        course: "01-first-container",
        title: "Docker Run Basics",
        level: "starter"
      },

      catchDetails: {
        tier: 2,
        caughtAt: "2026-01-11",
        quizScore: "3/4",
        pointsEarned: 72
      },

      evolution: {
        canEvolve: true,
        evolvesTo: "Charmeleon",
        requirement: "Review quiz or deep-dive course"
      }
    },
    {
      id: "pokemon-002",
      pokedexNumber: 5,
      name: "Charmeleon",
      sprite: "https://...",

      knowledge: {
        topic: "docker",
        course: "03-multi-stage",
        title: "Multi-Stage Builds",
        level: "beginner"
      },

      catchDetails: {
        tier: 3,
        caughtAt: "2026-01-12",
        quizScore: "4/5",
        pointsEarned: 105
      },

      evolution: {
        canEvolve: true,
        evolvesTo: "Charizard",
        evolvedFrom: "Charmander",
        requirement: "Master-level course"
      }
    }
  ],

  pagination: {
    total: 42,
    limit: 20,
    offset: 0,
    hasMore: true
  }
}
```

---

## `getPokemon`

**Purpose**: Get detailed info about a specific caught Pokemon

**Input**:
```typescript
{
  pokemonId: string    // "pokemon-001" or pokedex number
}
```

**Returns**:
```typescript
{
  id: "pokemon-001",
  pokedexNumber: 4,
  name: "Charmander",

  sprites: {
    front: "https://raw.githubusercontent.com/.../4.png",
    back: "https://raw.githubusercontent.com/.../back/4.png",
    shiny: "https://raw.githubusercontent.com/.../shiny/4.png"
  },

  pokeApiData: {
    baseStatTotal: 309,
    types: ["fire"],
    height: 6,
    weight: 85
  },

  knowledge: {
    topic: "docker",
    topicDisplay: "Docker",
    course: "01-first-container",
    courseTitle: "Your First Container",
    level: "starter",

    // The actual knowledge this Pokemon represents
    summary: "Docker run command basics, container lifecycle, port mapping",
    keyPoints: [
      "docker run creates and starts a container",
      "-p flag maps ports between host and container",
      "-d runs container in detached mode"
    ]
  },

  catchDetails: {
    tier: 2,
    tierName: "Medium",
    caughtAt: "2026-01-11",
    caughtDuring: "quiz",        // "quiz" | "wild"
    quizScore: "3/4",
    pointsEarned: 72,
    gymLeader: "Brock"
  },

  evolution: {
    stage: 1,                    // 1 = base, 2 = first evo, 3 = final
    canEvolve: true,
    evolvesTo: {
      name: "Charmeleon",
      pokedexNumber: 5,
      requirement: "Complete review quiz on this knowledge"
    },
    evolvedFrom: null
  },

  reviews: [
    {
      date: "2026-01-15",
      type: "review_quiz",
      score: "4/4",
      result: "Perfect! Ready to evolve!"
    }
  ]
}
```

---

## `addPokemon`

**Purpose**: Add a newly caught Pokemon to the Pokedex

**Input**:
```typescript
{
  pokedexNumber: number,      // Pokemon number from PokeAPI
  name: string,               // Pokemon name

  knowledge: {
    topic: string,
    course: string,
    level: string,
    title: string,            // Knowledge title
    summary: string,          // Brief summary
    keyPoints: string[]       // Key learning points
  },

  catchDetails: {
    tier: number,
    caughtDuring: "quiz" | "wild",
    quizScore: string,        // "3/4"
    pointsEarned: number,
    gymLeader?: string        // If caught during gym quiz
  }
}
```

**Side Effects**:
1. Generates unique pokemon ID
2. Fetches sprite URLs from PokeAPI (via pokeapi-mcp)
3. Updates `pokedex.yaml`
4. Returns caught Pokemon details

**Returns**:
```typescript
{
  success: true,
  pokemon: {
    id: "pokemon-042",
    pokedexNumber: 25,
    name: "Pikachu",
    sprite: "https://...",
    // ... full pokemon object
  },

  message: "🎉 PIKACHU was added to your Pokedex!",

  pokedexProgress: {
    total: 42,
    byTopic: { docker: 12, aws: 8, python: 22 },
    legendaries: 1
  }
}
```

---

## `evolvePokemon`

**Purpose**: Evolve a Pokemon after review/deep learning

**Input**:
```typescript
{
  pokemonId: string,          // Pokemon to evolve
  trigger: {
    type: "review_quiz" | "deep_dive_course" | "perfect_score",
    details?: {
      quizScore?: string,
      courseId?: string
    }
  }
}
```

**Validation**:
- Pokemon must exist
- Pokemon must be able to evolve (not final form)
- Trigger requirements must be met

**Side Effects**:
1. Fetches evolved Pokemon data from PokeAPI
2. Updates pokemon entry in `pokedex.yaml`
3. Awards evolution points (+100)
4. Updates trainer.yaml

**Returns**:
```typescript
{
  success: true,

  evolution: {
    from: {
      name: "Charmander",
      pokedexNumber: 4
    },
    to: {
      name: "Charmeleon",
      pokedexNumber: 5,
      sprite: "https://..."
    }
  },

  pointsAwarded: 100,

  message: "🎉 Congratulations! Your CHARMANDER evolved into CHARMELEON!",

  nextEvolution: {
    canEvolve: true,
    evolvesTo: "Charizard",
    requirement: "Complete advanced course on this topic"
  }
}
```

---

## `getPokedexStats`

**Purpose**: Get collection statistics and achievements

**Input**:
```typescript
{
  topic?: string    // Optional: stats for specific topic
}
```

**Returns**:
```typescript
{
  totals: {
    caught: 42,
    evolved: 15,
    legendaries: 1,
    undiscovered: "???"      // Mystery count
  },

  byTopic: [
    {
      topic: "docker",
      displayName: "Docker",
      caught: 12,
      evolved: 5,
      completion: 80         // % of available Pokemon caught
    },
    {
      topic: "aws",
      displayName: "AWS",
      caught: 8,
      evolved: 3,
      completion: 40
    }
  ],

  byTier: {
    easy: 15,
    medium: 18,
    hard: 7,
    expert: 1,
    legendary: 1
  },

  achievements: {
    firstCatch: { date: "2026-01-11", pokemon: "Pidgey" },
    firstEvolution: { date: "2026-01-12", pokemon: "Pidgeotto" },
    firstLegendary: { date: "2026-01-20", pokemon: "Mewtwo" },
    perfectCatches: 5,       // Caught with perfect quiz score
    evolutionChains: 3       // Completed full evolution chains
  },

  rarest: [
    { name: "Mewtwo", tier: 5, caughtAt: "2026-01-20" },
    { name: "Dragonite", tier: 4, caughtAt: "2026-01-18" }
  ]
}
```

---

## Storage: pokedex.yaml

```yaml
# Top-level pokedex.yaml
trainer: Tom
created_at: 2026-01-11

pokemon:
  - id: pokemon-001
    pokedex_number: 4
    name: Charmander
    sprites:
      front: https://raw.githubusercontent.com/.../4.png
      shiny: https://raw.githubusercontent.com/.../shiny/4.png

    topic: docker
    course: 01-first-container
    level: starter
    title: "Docker Run Basics"
    summary: "Container creation and lifecycle management"
    key_points:
      - docker run creates containers
      - -p maps ports
      - -d runs detached

    tier: 2
    caught_at: 2026-01-11
    caught_during: quiz
    quiz_score: "3/4"
    points_earned: 72
    gym_leader: Brock

    evolved_from: null
    evolved_to: pokemon-002
    evolved_at: 2026-01-12

  - id: pokemon-002
    pokedex_number: 5
    name: Charmeleon
    sprites:
      front: https://raw.githubusercontent.com/.../5.png

    topic: docker
    course: 03-multi-stage
    level: beginner
    title: "Multi-Stage Builds"

    tier: 3
    caught_at: 2026-01-12
    caught_during: quiz

    evolved_from: pokemon-001
    evolved_to: null

stats:
  total_caught: 42
  total_evolved: 15
  legendaries: 1

  by_topic:
    docker: 12
    aws: 8
    python: 22
```

---

## PokeAPI Integration

The Pokedex tools rely on `pokeapi-mcp` for Pokemon data:

```typescript
// When catching a Pokemon
const pokemonData = await pokeapiMcp.getPokemon(pokemonId);

// Returns:
{
  id: 4,
  name: "charmander",
  sprites: {
    front_default: "https://...",
    back_default: "https://...",
    front_shiny: "https://..."
  },
  stats: [
    { stat: { name: "hp" }, base_stat: 39 },
    { stat: { name: "attack" }, base_stat: 52 },
    // ...
  ],
  types: [{ type: { name: "fire" } }]
}
```

**Base Stat Total Calculation**:
```typescript
const baseStatTotal = pokemon.stats.reduce(
  (sum, stat) => sum + stat.base_stat,
  0
);
// Charmander: 39+52+43+60+50+65 = 309 → Tier 2 (Medium)
```
