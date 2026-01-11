# MCP Tools: Progress

## Overview

| Tool | Purpose |
|------|---------|
| `getProgress` | Get progress for a topic |
| `getOverallProgress` | Global stats across all topics |
| `completeItem` | Mark course/exercise as done |
| `checkLevelComplete` | Check if level requirements met |
| `getLevelRequirements` | What's needed to complete a level |
| `getNextAction` | Smart suggestion for next step |
| `resetProgress` | Reset completion status |

---

## `getProgress`

**Purpose**: Get progress details for a topic or subtopic

**Input**:
```typescript
{
  topic: string,           // "docker" or "aws/ec2"
  level?: string           // Optional: filter by level
}
```

**Returns**:
```typescript
{
  topic: "docker",
  currentLevel: "beginner",

  levels: {
    starter: {
      status: "completed",
      completion: 100,
      completedAt: "2026-01-10"
    },
    beginner: {
      status: "active",
      completion: 65,
      courses: {
        total: 3,
        completed: 2,
        items: [
          { id: "01-first-container", completed: true },
          { id: "02-images-basics", completed: true },
          { id: "03-volumes", completed: false }
        ]
      },
      exercices: {
        total: 4,
        completed: 2,
        mandatory: { total: 3, completed: 2 }
      },
      quiz: {
        required: true,
        passed: false
      }
    },
    advanced: { status: "locked" },
    expert: { status: "locked" }
  },

  extras: {
    count: 3,
    points: 45
  },

  stats: {
    totalPoints: 320,
    pokemonCaught: 5,
    badgesEarned: 1,
    timeSpent: "4h 30m"   // Optional if we track this
  }
}
```

---

## `getOverallProgress`

**Purpose**: Get global progress across all topics (for /progress with no args)

**Input**:
```typescript
{
  includeExtras?: boolean   // Include extra learnings count
}
```

**Returns**:
```typescript
{
  trainer: {
    name: "Tom",
    rank: "Pokemon Trainer",
    totalPoints: 1250,
    nextRank: { name: "Great Trainer", pointsNeeded: 750 }
  },

  topics: [
    {
      name: "docker",
      displayName: "Docker",
      currentLevel: "beginner",
      completion: 65,
      badges: 1,
      pokemon: 5,
      extras: 3
    },
    {
      name: "aws",
      displayName: "AWS",
      currentLevel: "starter",
      completion: 20,
      badges: 0,
      pokemon: 2,
      extras: 1,
      subtopics: [
        { name: "ec2", completion: 40 },
        { name: "s3", completion: 0 }
      ]
    }
  ],

  totals: {
    topics: 2,
    badges: 1,
    pokemon: 7,
    extras: 4,
    completedLevels: 1
  }
}
```

---

## `completeItem`

**Purpose**: Mark a course or exercise as completed

**Input**:
```typescript
{
  topic: string,
  level: string,
  type: "course" | "exercise",
  itemId: string,           // "01-first-container" or "exercice-01"
  courseId?: string         // Required if type is "exercise"
}
```

**Validations**:
- Topic and level must exist
- Item must exist in roadmap
- Item must not already be completed

**Updates `progress.yaml`**:
```yaml
roadmap:
  beginner:
    courses:
      - id: 01-first-container
        completed: true           # ← Updated
        completed_at: 2026-01-11  # ← Added
```

**Side effects**:
1. Awards points (+25 for course, +15/+30 for exercise)
2. Updates trainer.yaml with points
3. Checks if level is now complete

**Returns**:
```typescript
{
  success: true,
  item: "01-first-container",
  type: "course",
  pointsAwarded: 25,

  levelProgress: {
    completion: 75,
    remaining: {
      courses: 1,
      mandatoryExercises: 1,
      quizPassed: false
    }
  },

  levelComplete: false,
  message: "Course completed! +25 points"
}
```

---

## `checkLevelComplete`

**Purpose**: Check if all requirements for current level are met

**Input**:
```typescript
{
  topic: string,
  level?: string    // Optional, defaults to current level
}
```

**Logic**:
```typescript
// Level is complete when:
// 1. All mandatory courses completed
// 2. All mandatory exercises completed
// 3. Level quiz passed (if required)
```

**Returns**:
```typescript
{
  topic: "docker",
  level: "starter",
  isComplete: false,

  requirements: {
    courses: { required: 3, completed: 3, met: true },
    mandatoryExercises: { required: 2, completed: 1, met: false },
    quiz: { required: true, passed: false, met: false }
  },

  missing: [
    { type: "exercise", id: "exercice-02", course: "02-installation" },
    { type: "quiz", level: "starter" }
  ],

  message: "Complete 1 more exercise and pass the quiz to earn your badge!"
}
```

---

## `getLevelRequirements`

**Purpose**: Get what's needed to complete a level (before starting)

**Input**:
```typescript
{
  topic: string,
  level: string
}
```

**Returns**:
```typescript
{
  topic: "docker",
  level: "beginner",
  status: "active",

  requirements: {
    courses: [
      { id: "01-first-container", name: "Your First Container", mandatory: true },
      { id: "02-images-basics", name: "Images Basics", mandatory: true },
      { id: "03-volumes", name: "Volumes", mandatory: true }
    ],
    exercises: {
      "01-first-container": [
        { id: "exercice-01", name: "run-hello-world", mandatory: true },
        { id: "exercice-02", name: "run-nginx", mandatory: true }
      ],
      "02-images-basics": [
        { id: "exercice-01", name: "pull-images", mandatory: false }
      ]
    },
    quiz: {
      required: true,
      tier: 2,
      questions: 4,
      passRate: "75%"
    }
  },

  rewards: {
    badge: "Cascade Badge",
    gymLeader: "Misty",
    estimatedPoints: 250
  }
}
```

---

## `getNextAction`

**Purpose**: Get the suggested next action for a topic (smart assistant)

**Input**:
```typescript
{
  topic: string
}
```

**Logic**:
- If no level set → suggest level selection
- If current course incomplete → suggest continue course
- If course done, exercise pending → suggest exercise
- If all courses/exercises done → suggest quiz
- If level complete → suggest next level

**Returns**:
```typescript
{
  topic: "docker",
  currentLevel: "beginner",

  nextAction: {
    type: "exercise",
    id: "exercice-01",
    course: "02-images-basics",
    path: "src/docker/exercices/beginner/02-images-basics/exercice-01",
    name: "Pull Images",
    message: "Ready to practice? Complete the 'Pull Images' exercise!"
  },

  alternatives: [
    { type: "course", id: "03-volumes", message: "Or continue with the Volumes course" },
    { type: "quiz", message: "Or take a quiz on what you've learned" }
  ]
}
```

---

## `resetProgress`

**Purpose**: Reset completion status at various scopes (global, topic, level, or course)

**Input**:
```typescript
{
  scope: "global" | "topic" | "level" | "course",
  topic?: string,           // Required for topic/level/course scope
  level?: string,           // Required for level/course scope
  courseId?: string,        // Required for course scope
  options?: {
    keepPoints?: boolean,   // Keep earned points (default: false)
    keepPokemon?: boolean,  // Keep caught Pokemon (default: true)
    keepBadges?: boolean,   // Keep earned badges (default: false)
    confirm?: boolean       // Must be true to execute (safety)
  }
}
```

**Scope behaviors**:

| Scope | Resets | Example |
|-------|--------|---------|
| `global` | All topics, all progress | Fresh start |
| `topic` | Single topic, all levels | Reset docker only |
| `level` | Single level in topic | Reset docker/beginner |
| `course` | Single course + its exercises | Reset 01-first-container |

**Validations**:
- `confirm: true` is required to execute
- Topic/level/course must exist
- Warns if resetting earned badges

**Side effects**:
1. Updates `progress.yaml` (marks items as incomplete)
2. Optionally removes points from `trainer.yaml`
3. Optionally removes badges from `rewards.yaml`
4. Does NOT delete course/exercise content files
5. Does NOT remove Pokemon by default (knowledge earned)

**Returns**:
```typescript
{
  success: true,
  scope: "level",
  target: {
    topic: "docker",
    level: "beginner"
  },

  reset: {
    courses: 3,
    exercises: 5,
    quizzes: 2
  },

  kept: {
    points: false,      // Points were removed
    pokemon: true,      // Pokemon kept
    badges: false       // Badge removed
  },

  pointsRemoved: 175,
  badgesRemoved: ["cascade-badge-docker"],

  message: "Reset docker/beginner: 3 courses, 5 exercises. -175 points. Cascade Badge removed."
}

// Or if confirm not provided:
{
  success: false,
  error: "confirmation_required",
  preview: {
    willReset: { courses: 3, exercises: 5, quizzes: 2 },
    willRemove: { points: 175, badges: ["Cascade Badge"] },
    willKeep: { pokemon: 5 }
  },
  message: "This will reset 3 courses and remove 175 points. Set confirm: true to proceed."
}
```

**Examples**:

```typescript
// Reset everything (fresh start)
resetProgress({
  scope: "global",
  options: { confirm: true }
})

// Reset just docker topic, keep Pokemon
resetProgress({
  scope: "topic",
  topic: "docker",
  options: { keepPokemon: true, confirm: true }
})

// Reset beginner level only
resetProgress({
  scope: "level",
  topic: "docker",
  level: "beginner",
  options: { confirm: true }
})

// Reset single course and its exercises
resetProgress({
  scope: "course",
  topic: "docker",
  level: "beginner",
  courseId: "01-first-container",
  options: { confirm: true }
})

// Preview what would be reset (no confirm)
resetProgress({
  scope: "topic",
  topic: "docker"
})
// Returns preview without executing
```
