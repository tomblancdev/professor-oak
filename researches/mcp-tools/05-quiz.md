# MCP Tools: Quiz

## Overview

| Tool | Purpose |
|------|---------|
| `startQuiz` | Initialize a quiz session |
| `getQuizParameters` | Get quiz config based on tier/level |
| `selectPokemon` | Select Pokemon for quiz encounter |
| `submitQuizResult` | Record quiz completion |
| `getQuizHistory` | Get past quiz attempts |

---

## `startQuiz`

**Purpose**: Initialize a new quiz session

**Input**:
```typescript
{
  topic: string,
  course?: string,          // Specific course, or random from level
  level?: string,           // Override current level
  type: "standard" | "wild" // Wild has higher risk/reward
}
```

**Logic**:
1. Determine quiz scope (course or level)
2. Select appropriate Pokemon based on level/tier
3. Calculate quiz parameters
4. Return quiz session data

**Returns**:
```typescript
{
  sessionId: "quiz-2026-01-11-001",
  type: "standard",

  topic: "docker",
  course: "01-first-container",
  level: "starter",

  pokemon: {
    pokedexNumber: 4,
    name: "Charmander",
    sprite: "https://...",
    tier: 2,
    tierName: "Medium"
  },

  parameters: {
    questionCount: 4,
    passThreshold: 75,          // 3/4 correct
    passCount: 3,               // Need 3 correct answers
    timeLimit: null             // Optional timer
  },

  gymLeader: {
    name: "Brock",
    greeting: "I am Brock! Let's test your Docker knowledge!",
    badge: "Boulder Badge"
  },

  points: {
    base: 25,
    catchBonus: 35,
    perCorrect: 4,
    maxPossible: 80
  },

  // For Claude to generate questions
  context: {
    coursePath: "src/docker/courses/starter/01-first-container.md",
    knowledgeScope: "Docker run command, container basics, port mapping"
  }
}
```

---

## `getQuizParameters`

**Purpose**: Get quiz configuration for a given tier/level

**Input**:
```typescript
{
  tier?: number,             // 1-5, or...
  level?: string             // Derive tier from level
}
```

**Returns**:
```typescript
{
  tier: 2,
  tierName: "Medium",

  questions: 4,
  passThreshold: 75,
  passCount: 3,

  points: {
    base: 25,
    catchBonus: 35,
    perCorrect: 4,
    maxTotal: 80,
    failMultiplier: 0.4
  },

  pokemonPool: {
    baseStatRange: [300, 400],
    examples: ["Pikachu", "Charmander", "Bulbasaur", "Squirtle"]
  },

  // Difficulty guidance for question generation
  difficulty: {
    questionTypes: ["recall", "understanding", "application"],
    avoidTypes: ["analysis", "synthesis"],    // Too advanced for tier
    hints: "Focus on direct knowledge recall and basic understanding"
  }
}
```

---

## `selectPokemon`

**Purpose**: Select an appropriate Pokemon for quiz encounter

**Input**:
```typescript
{
  level: string,
  topic?: string,           // For thematic selection if implemented
  excludeIds?: number[]     // Avoid recently caught Pokemon
}
```

**Logic**:
```typescript
// Level → Tier mapping
const levelTiers = {
  starter: [1, 2],
  beginner: [2, 3],
  advanced: [3, 4],
  expert: [4, 5]
};

// Select random tier from range
// Fetch Pokemon in that stat range from PokeAPI
// Exclude already-caught-too-recently
```

**Returns**:
```typescript
{
  pokemon: {
    pokedexNumber: 25,
    name: "Pikachu",
    sprite: "https://...",
    tier: 2,
    baseStatTotal: 320
  },

  encounter: {
    message: "A wild PIKACHU appeared!",
    difficulty: "★★☆☆☆"
  },

  alternates: [
    { pokedexNumber: 4, name: "Charmander" },
    { pokedexNumber: 7, name: "Squirtle" }
  ]
}
```

---

## `submitQuizResult`

**Purpose**: Record quiz completion and process rewards

**Input**:
```typescript
{
  sessionId: string,
  answers: {
    total: number,
    correct: number,
    details?: Array<{
      question: number,
      correct: boolean,
      topic?: string        // For targeted review suggestions
    }>
  }
}
```

**Logic**:
```typescript
// Calculate if passed
const passed = answers.correct >= session.parameters.passCount;

// Calculate points
if (passed) {
  points = base + catchBonus + (correct * perCorrect);
  if (perfect) points += perfectBonus;
  if (wild) points *= 1.5;
} else {
  points = (base * 0.4) + (correct * 2);
  if (wild) points *= 0.3;
}
```

**Side Effects**:
1. If passed:
   - Add Pokemon to Pokedex (via `addPokemon`)
   - Award points (via `addPoints`)
   - Update progress (via `completeItem` if course quiz)
   - Check level completion

2. If failed:
   - Award partial points
   - Generate review suggestions
   - Trigger Nurse Joy follow-up

**Returns**:
```typescript
// On Pass:
{
  sessionId: "quiz-2026-01-11-001",
  passed: true,

  score: {
    correct: 3,
    total: 4,
    percentage: 75
  },

  pokemon: {
    caught: true,
    name: "Charmander",
    pokedexNumber: 4,
    message: "🎉 Gotcha! CHARMANDER was caught!"
  },

  points: {
    earned: 72,
    breakdown: {
      base: 25,
      catchBonus: 35,
      correctAnswers: 12    // 3 × 4
    },
    newTotal: 1322
  },

  gymLeader: {
    message: "Excellent work, trainer! Your knowledge is rock-solid!"
  },

  levelProgress: {
    completion: 85,
    levelComplete: false,
    remaining: ["03-volumes", "quiz"]
  }
}

// On Fail:
{
  sessionId: "quiz-2026-01-11-001",
  passed: false,

  score: {
    correct: 2,
    total: 4,
    percentage: 50
  },

  pokemon: {
    caught: false,
    name: "Charmander",
    message: "💨 Oh no! CHARMANDER fled..."
  },

  points: {
    earned: 14,             // (25 × 0.4) + (2 × 2)
    newTotal: 1264
  },

  nurseJoy: {
    message: "Don't worry, trainer! Let's review what you missed.",
    suggestions: [
      {
        topic: "Port mapping",
        course: "01-first-container",
        section: "Port Binding"
      }
    ]
  },

  retryAvailable: true
}
```

---

## `getQuizHistory`

**Purpose**: Get past quiz attempts

**Input**:
```typescript
{
  topic?: string,
  course?: string,
  passed?: boolean,         // Filter by result
  limit?: number,
  offset?: number
}
```

**Returns**:
```typescript
{
  quizzes: [
    {
      sessionId: "quiz-2026-01-11-001",
      date: "2026-01-11",
      topic: "docker",
      course: "01-first-container",
      level: "starter",

      pokemon: {
        name: "Charmander",
        tier: 2
      },

      result: {
        passed: true,
        score: "3/4",
        percentage: 75,
        pointsEarned: 72
      },

      gymLeader: "Brock"
    },
    {
      sessionId: "quiz-2026-01-10-003",
      date: "2026-01-10",
      topic: "docker",
      course: "02-images",
      level: "starter",

      pokemon: {
        name: "Pidgey",
        tier: 1
      },

      result: {
        passed: false,
        score: "1/3",
        percentage: 33,
        pointsEarned: 8
      },

      gymLeader: "Brock"
    }
  ],

  stats: {
    total: 15,
    passed: 12,
    failed: 3,
    passRate: 80,
    averageScore: 78,
    pokemonCaught: 12
  },

  pagination: {
    total: 15,
    limit: 20,
    offset: 0
  }
}
```

---

## Quiz Flow Integration

### Standard Quiz Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User: /quiz docker                                        │
├─────────────────────────────────────────────────────────────┤
│ 2. Claude:                                                   │
│    - startQuiz({ topic: "docker", type: "standard" })       │
│    - getPersona("gym-leader", { level: "starter" })         │
│    - Spawn Gym Leader subagent                              │
├─────────────────────────────────────────────────────────────┤
│ 3. Gym Leader (Brock):                                      │
│    "I am Brock! A wild CHARMANDER appeared!"                │
│    Uses AskUserQuestion for each quiz question              │
├─────────────────────────────────────────────────────────────┤
│ 4. After all questions:                                     │
│    submitQuizResult({ sessionId, answers: {...} })          │
├─────────────────────────────────────────────────────────────┤
│ 5a. If PASS:                                                │
│     Brock: "Excellent! You caught CHARMANDER!"              │
│     → Pokemon added to Pokedex                              │
│     → Points awarded                                        │
├─────────────────────────────────────────────────────────────┤
│ 5b. If FAIL:                                                │
│     Brock: "Come back when you're stronger!"                │
│     → Nurse Joy appears                                     │
│     → Suggests review topics                                │
└─────────────────────────────────────────────────────────────┘
```

### Wild Encounter Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User: /wild                                               │
├─────────────────────────────────────────────────────────────┤
│ 2. Claude:                                                   │
│    - Select random topic from user's learning list          │
│    - startQuiz({ topic, type: "wild" })                     │
├─────────────────────────────────────────────────────────────┤
│ 3. Wild Encounter:                                          │
│    "🌿 A wild BULBASAUR appeared!"                          │
│    Quick 3-question quiz                                    │
├─────────────────────────────────────────────────────────────┤
│ 4. Results:                                                  │
│    PASS: Points × 1.5, catch Pokemon                        │
│    FAIL: Points × 0.3 (risky!)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Question Generation Guidelines

Claude generates questions based on quiz context. Guidelines stored for reference:

```typescript
const questionGuidelines = {
  tier1: {
    types: ["multiple_choice", "true_false"],
    focus: "Basic recall, definitions, simple facts",
    avoid: "Complex scenarios, multi-step problems"
  },
  tier2: {
    types: ["multiple_choice", "fill_blank"],
    focus: "Understanding concepts, simple application",
    avoid: "Edge cases, advanced patterns"
  },
  tier3: {
    types: ["multiple_choice", "code_snippet", "scenario"],
    focus: "Application, problem-solving, best practices",
    avoid: "Obscure details, trick questions"
  },
  tier4: {
    types: ["scenario", "debug", "architecture"],
    focus: "Complex scenarios, debugging, design decisions",
    avoid: "Memorization-only questions"
  },
  tier5: {
    types: ["scenario", "design", "compare_contrast"],
    focus: "Expert-level synthesis, trade-offs, edge cases",
    avoid: "Basic recall (too easy for legendary)"
  }
};
```

---

## Storage: Quiz entries in progress.yaml

```yaml
# In topic's progress.yaml
quizzes:
  - session_id: quiz-2026-01-11-001
    date: 2026-01-11
    course: 01-first-container
    level: starter
    type: standard

    pokemon:
      name: Charmander
      pokedex_number: 4
      tier: 2

    result:
      questions: 4
      correct: 3
      passed: true
      points_earned: 72

    gym_leader: Brock

  - session_id: quiz-2026-01-11-002
    date: 2026-01-11
    course: null                  # Wild encounter
    level: starter
    type: wild

    pokemon:
      name: Pidgey
      pokedex_number: 16
      tier: 1

    result:
      questions: 3
      correct: 3
      passed: true
      points_earned: 82          # 55 × 1.5 (wild bonus)
```
