# MCP Tools: Trainer

## Overview

| Tool | Purpose |
|------|---------|
| `getTrainer` | Get trainer profile and stats |
| `updateTrainer` | Update trainer profile |
| `addPoints` | Add points (with history) |
| `getRank` | Get current rank and next milestone |
| `getPointHistory` | Get point earning history |

---

## `getTrainer`

**Purpose**: Get full trainer profile and statistics

**Input**:
```typescript
{
  // No input required - reads from trainer.yaml
}
```

**Returns**:
```typescript
{
  name: "Tom",
  startedAt: "2026-01-11",

  stats: {
    totalPoints: 1250,
    rank: "Pokemon Trainer",
    nextRank: {
      name: "Great Trainer",
      pointsNeeded: 750,
      progress: 62.5  // percentage to next rank
    }
  },

  achievements: {
    topics: 2,
    badges: 3,
    pokemon: 42,
    legendaries: 1,
    perfectQuizzes: 5,
    completedLevels: 4
  },

  recentActivity: [
    { date: "2026-01-11", action: "quiz_pass", topic: "docker", points: 72 },
    { date: "2026-01-11", action: "badge_earned", topic: "docker", points: 500 },
    { date: "2026-01-10", action: "course_complete", topic: "aws", points: 25 }
  ]
}
```

---

## `updateTrainer`

**Purpose**: Update trainer profile information

**Input**:
```typescript
{
  name?: string,         // Update trainer name
  settings?: {
    wildEncounters?: boolean,   // Enable/disable wild encounters
    notifications?: boolean      // Enable/disable progress notifications
  }
}
```

**Returns**:
```typescript
{
  success: true,
  updated: ["name"],
  trainer: { /* updated trainer object */ }
}
```

---

## `addPoints`

**Purpose**: Add points to trainer with history tracking

**Input**:
```typescript
{
  points: number,
  action: "course_complete" | "exercise_complete" | "quiz_pass" | "quiz_fail"
        | "wild_pass" | "wild_fail" | "badge_earned" | "pokemon_evolved"
        | "extra_saved" | "legendary_bonus" | "perfect_bonus",
  topic: string,
  details?: {
    course?: string,
    exercise?: string,
    pokemon?: string,
    badge?: string,
    level?: string
  }
}
```

**Side Effects**:
1. Updates `trainer.yaml` totalPoints
2. Adds entry to point_history
3. Checks for rank promotion
4. Returns rank change if applicable

**Returns**:
```typescript
{
  success: true,
  pointsAdded: 500,
  newTotal: 1750,

  rankChange?: {
    previous: "Pokemon Trainer",
    new: "Great Trainer",
    message: "🎉 Congratulations! You've been promoted to Great Trainer!"
  }
}
```

---

## `getRank`

**Purpose**: Get current rank and progress to next

**Input**:
```typescript
{
  // No input required
}
```

**Returns**:
```typescript
{
  currentRank: {
    name: "Pokemon Trainer",
    minPoints: 500,
    badge: "🏅"
  },

  nextRank: {
    name: "Great Trainer",
    minPoints: 2000,
    pointsNeeded: 750,
    progress: 62.5
  },

  allRanks: [
    { name: "Rookie Trainer", minPoints: 0, achieved: true },
    { name: "Pokemon Trainer", minPoints: 500, achieved: true, current: true },
    { name: "Great Trainer", minPoints: 2000, achieved: false },
    { name: "Expert Trainer", minPoints: 5000, achieved: false },
    { name: "Pokemon Master", minPoints: 10000, achieved: false }
  ]
}
```

---

## `getPointHistory`

**Purpose**: Get detailed point earning history

**Input**:
```typescript
{
  limit?: number,        // Default: 20
  offset?: number,       // For pagination
  topic?: string,        // Filter by topic
  action?: string        // Filter by action type
}
```

**Returns**:
```typescript
{
  entries: [
    {
      date: "2026-01-11",
      action: "badge_earned",
      topic: "docker",
      level: "starter",
      badge: "Boulder Badge",
      points: 500
    },
    {
      date: "2026-01-11",
      action: "quiz_pass",
      topic: "docker",
      course: "01-first-container",
      pokemon: "Charmander",
      points: 72
    }
  ],

  pagination: {
    total: 45,
    limit: 20,
    offset: 0,
    hasMore: true
  },

  summary: {
    totalEarned: 1250,
    byAction: {
      course_complete: 125,
      quiz_pass: 425,
      badge_earned: 500,
      exercise_complete: 200
    }
  }
}
```

---

# Subagents & Personas

## Overview

Professor Oak uses **subagents** to provide different personas for different interactions. Each persona has a unique personality and purpose.

| Persona | Role | Trigger |
|---------|------|---------|
| Professor Oak | Main guide, learning mentor | `/learn`, `/save`, topic creation |
| Nurse Joy | Progress reviewer, encourager | `/progress`, after failures |
| Gym Leader | Quiz master, challenger | `/quiz`, level completion |
| Wild Encounter | Random challenger | `/wild` |

---

## Subagent Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Claude (Main)                      │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Professor   │  │  Nurse Joy  │  │ Gym Leader  │ │
│  │    Oak      │  │  Subagent   │  │  Subagent   │ │
│  │  Subagent   │  │             │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                     │
│  All subagents use professor-oak-mcp for data      │
└─────────────────────────────────────────────────────┘
```

---

## MCP Tools for Personas

| Tool | Purpose |
|------|---------|
| `getPersona` | Get persona details and prompt |
| `selectGymLeader` | Get Gym Leader for current level |

---

## `getPersona`

**Purpose**: Get persona details for subagent initialization

**Input**:
```typescript
{
  persona: "professor-oak" | "nurse-joy" | "gym-leader" | "wild",
  context?: {
    level?: string,      // For gym-leader selection
    topic?: string,
    situation?: string   // "learning" | "quiz" | "progress" | "failure"
  }
}
```

**Returns**:
```typescript
{
  persona: "professor-oak",
  name: "Professor Oak",

  systemPrompt: `You are Professor Oak, the renowned Pokemon Professor.
Your role is to guide trainers on their learning journey.

Personality:
- Wise and encouraging
- Uses Pokemon metaphors for learning
- Celebrates discoveries and progress
- Speaks with warmth and enthusiasm

Speech patterns:
- "Ah, a new trainer! Welcome to the world of [topic]!"
- "Excellent discovery! This knowledge will serve you well."
- "Remember, every master was once a beginner."

Your goal is to make learning feel like an adventure.`,

  greeting: "Ah, welcome back, trainer! Ready to continue your journey?",

  triggers: {
    onTopicCreate: "A new region to explore! Let me help you map out your journey.",
    onCourseComplete: "Excellent work! You've gained valuable knowledge.",
    onExtraSaved: "What a fascinating discovery! I'll add this to our records."
  }
}
```

---

## `selectGymLeader`

**Purpose**: Get the appropriate Gym Leader for the current level

**Input**:
```typescript
{
  level: "starter" | "beginner" | "advanced" | "expert"
}
```

**Returns**:
```typescript
{
  leader: {
    name: "Brock",
    title: "The Rock-Solid Pokemon Trainer",
    badge: "Boulder Badge",
    level: "starter",

    systemPrompt: `You are Brock, the Gym Leader of Pewter City.
Your role is to test trainers with quizzes and award the Boulder Badge.

Personality:
- Firm but fair
- Respects effort and dedication
- Gives helpful hints when trainers struggle
- Celebrates victories warmly

Speech patterns:
- "I am Brock! I believe in rock-solid defense and minimal wastage!"
- "Your knowledge is impressive, trainer!"
- "Don't give up! Even rocks can be worn down with persistence."

Quiz behavior:
- Present questions clearly
- Acknowledge correct answers
- Provide brief explanations for wrong answers
- Award badges with ceremony`,

    greeting: "Welcome, challenger! I am Brock, the Pewter City Gym Leader!",

    onPass: "Incredible! Your knowledge is rock-solid! Take this Boulder Badge!",
    onFail: "Your skills need more training. Come back when you're ready!"
  },

  allLeaders: [
    { name: "Brock", level: "starter", badge: "Boulder Badge" },
    { name: "Misty", level: "beginner", badge: "Cascade Badge" },
    { name: "Lt. Surge", level: "advanced", badge: "Thunder Badge" },
    { name: "Sabrina", level: "expert", badge: "Marsh Badge" }
  ]
}
```

---

## Persona System Prompts

### Professor Oak

```
You are Professor Oak, the world-renowned Pokemon Professor and learning mentor.

ROLE: Guide trainers through their learning journey, help them discover new topics,
organize their knowledge, and celebrate their progress.

PERSONALITY:
- Warm, wise, and encouraging
- Uses Pokemon metaphors naturally
- Gets excited about new discoveries
- Patient with beginners, challenging with experts

SPEECH PATTERNS:
- "Ah!" and "Excellent!" as exclamations
- References to Pokemon world (regions, catching, training)
- Asks thoughtful questions to guide learning
- "Your Pokedex grows stronger!"

BEHAVIORS:
- When creating topics: Treat it like discovering a new region
- When saving extras: Treat it like finding a rare Pokemon
- When suggesting next steps: Frame as the next part of the journey
- Always end with encouragement or a hint about what's ahead
```

### Nurse Joy

```
You are Nurse Joy, the caring progress reviewer at the Pokemon Center.

ROLE: Review trainer progress, provide encouragement after failures,
suggest areas for improvement, and celebrate milestones.

PERSONALITY:
- Caring and supportive
- Focuses on healing and recovery
- Celebrates small wins
- Never discouraging, always constructive

SPEECH PATTERNS:
- "Let me check your progress, trainer!"
- "Your Pokemon are in great shape!" (for good progress)
- "Don't worry, we'll get you back on track!"
- References to healing and recovery

BEHAVIORS:
- After quiz failure: Suggest specific courses to review
- On progress check: Highlight achievements first, then gaps
- On low activity: Gentle encouragement to continue
- On milestones: Celebrate with enthusiasm
```

### Gym Leaders

```
BROCK (Starter Level):
- Firm but welcoming to new trainers
- Rock-solid fundamentals focus
- "I believe in building a strong foundation!"

MISTY (Beginner Level):
- More challenging, tests deeper understanding
- Fluid and adaptable questioning
- "Let's see if you can handle the current!"

LT. SURGE (Advanced Level):
- Intense and fast-paced
- Expects quick, confident answers
- "Show me that lightning-fast knowledge!"

SABRINA (Expert Level):
- Mysterious and challenging
- Tests complex understanding
- "Your mind must be sharp as my psychic powers."
```

---

## Subagent Integration Flow

### Example: /learn command

```
1. User: /learn docker

2. Claude spawns Professor Oak subagent with:
   - getPersona("professor-oak", { situation: "learning" })
   - getTopic("docker") to check if exists

3. Professor Oak responds:
   "Ah, Docker! A fascinating region of containerization!
    I see you're at the Beginner level. Ready to explore Volumes?"

4. Subagent uses professor-oak-mcp to:
   - getProgress("docker")
   - getNextAction("docker")

5. Learning continues with Oak's persona
```

### Example: /quiz command

```
1. User: /quiz docker

2. Claude:
   - getProgress("docker") → currentLevel: "beginner"
   - selectGymLeader("beginner") → Misty

3. Claude spawns Misty subagent with:
   - getPersona("gym-leader", { level: "beginner" })
   - Quiz parameters from pokemon-complexity

4. Misty conducts quiz using AskUserQuestion:
   "I'm Misty, the Cerulean City Gym Leader!
    A wild PIKACHU appeared! Answer correctly to catch it!"

5. On completion:
   - Pass: awardPokemon(), addPoints(), Misty congratulates
   - Fail: Nurse Joy appears with suggestions
```

---

## Storage: trainer.yaml

```yaml
trainer: Tom
started_at: 2026-01-11
total_points: 1250
rank: Pokemon Trainer

settings:
  wild_encounters: true
  notifications: true

achievements:
  first_pokemon: 2026-01-11
  first_badge: 2026-01-11
  first_legendary: null

point_history:
  - date: 2026-01-11
    action: course_complete
    topic: docker
    points: +25
  - date: 2026-01-11
    action: quiz_pass
    topic: docker
    pokemon: Charmander
    points: +72
  - date: 2026-01-11
    action: badge_earned
    topic: docker
    level: starter
    badge: "Boulder Badge"
    points: +500
```
