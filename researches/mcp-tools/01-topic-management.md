# MCP Tools: Topic Management

## Overview

| Tool | Purpose |
|------|---------|
| `createTopic` | Create new learning topic |
| `initializeLevel` | Set starting level for a topic |
| `setRoadmap` | Save AI-generated roadmap |
| `unlockNextLevel` | Prepare next level after completion |
| `createExtraLearning` | Add ad-hoc knowledge |
| `listExtras` | Browse extra learnings |
| `createSubtopic` | Create subtopic under parent |
| `createCourse` | Create course placeholder |
| `createExercise` | Create exercise folder |
| `listTopics` | List all topics |
| `getTopic` | Get topic details |
| `deleteTopic` | Delete topic (with confirm) |

---

## `createTopic`

**Purpose**: Create a new learning topic (structure only, no roadmap yet)

**Input**:
```typescript
{
  name: string,           // kebab-case, e.g. "docker"
  displayName?: string,   // "Docker" (optional, derived from name)
  description?: string    // Short topic description
}
```

**Validations**:
- Name must be kebab-case
- Name must be unique (not exist in src/)
- Name cannot be reserved words (subtopics, courses, exercices, rewards)

**Creates**:
```
src/[name]/
├── progress.yaml
├── rewards.yaml
├── rewards/
├── extras/
├── courses/
│   ├── starter/
│   ├── beginner/
│   ├── advanced/
│   └── expert/
└── exercices/
    ├── starter/
    ├── beginner/
    ├── advanced/
    └── expert/
```

**Initializes `progress.yaml`**:
```yaml
topic: docker
display_name: Docker
description: "Learn Docker containerization"
created_at: 2026-01-11
current_level: null      # Not set until user selects
roadmap: {}              # Empty until setRoadmap called
progress: {}
extras: []
```

**Returns**:
```typescript
{
  success: true,
  path: "src/docker",
  message: "Topic 'docker' created. Use initializeLevel to set starting level."
}
```

---

## `initializeLevel`

**Purpose**: Set user's starting level and trigger roadmap generation

**Input**:
```typescript
{
  topic: string,
  level: "starter" | "beginner" | "advanced" | "expert"
}
```

**Validations**:
- Topic must exist
- Level must be valid
- Topic must not have a current_level set (first time only)

**Updates `progress.yaml`**:
```yaml
current_level: starter
level_started_at: 2026-01-11
```

**Returns**:
```typescript
{
  success: true,
  level: "starter",
  message: "Level set to 'starter'. Claude should now generate roadmap.",
  nextStep: "generateRoadmap"
}
```

**Flow after this**:
1. Claude calls `initializeLevel`
2. Claude generates roadmap suggestions (AI-powered)
3. Claude calls `setRoadmap` to save the generated roadmap

---

## `setRoadmap`

**Purpose**: Save Claude-generated roadmap for current level

**Input**:
```typescript
{
  topic: string,
  level: "starter" | "beginner" | "advanced" | "expert",
  roadmap: {
    courses: [
      { name: "what-is-docker", displayName: "What is Docker?", mandatory: true },
      { name: "installation", displayName: "Installing Docker", mandatory: true },
      { name: "first-container", displayName: "Your First Container", mandatory: true }
    ],
    exercices: {
      "installation": [
        { name: "install-docker", mandatory: true },
        { name: "verify-installation", mandatory: false }
      ],
      "first-container": [
        { name: "run-hello-world", mandatory: true },
        { name: "run-nginx", mandatory: true }
      ]
    },
    quizRequired: true
  }
}
```

**What MCP does**:
1. Validates roadmap structure
2. Creates all course placeholders with auto-numbering
3. Creates all exercise folders with auto-numbering
4. Updates `progress.yaml` with full roadmap

**Creates** (auto-numbered):
```
src/docker/courses/starter/
├── 01-what-is-docker.md
├── 02-installation.md
└── 03-first-container.md

src/docker/exercices/starter/
├── 02-installation/
│   ├── exercice-01/    (install-docker)
│   └── exercice-02/    (verify-installation)
└── 03-first-container/
    ├── exercice-01/    (run-hello-world)
    └── exercice-02/    (run-nginx)
```

**Returns**:
```typescript
{
  success: true,
  created: {
    courses: 3,
    exercises: 4
  },
  message: "Roadmap set. Claude can now generate course content."
}
```

---

## `unlockNextLevel`

**Purpose**: Called when level completed, prepares for next level roadmap

**Input**:
```typescript
{
  topic: string
}
```

**Validations**:
- Current level must be completed (all mandatory courses + exercises + quiz)
- Must not already be at expert level

**Logic**:
```typescript
const levelOrder = ['starter', 'beginner', 'advanced', 'expert']
const currentIndex = levelOrder.indexOf(currentLevel)
const nextLevel = levelOrder[currentIndex + 1]
```

**Updates `progress.yaml`**:
```yaml
roadmap:
  starter:
    status: completed
    completed_at: 2026-01-11
  beginner:
    status: pending    # Ready for roadmap generation
```

**Returns**:
```typescript
{
  success: true,
  completedLevel: "starter",
  nextLevel: "beginner",
  message: "Starter completed! Claude should generate Beginner roadmap.",
  badgeEarned: "Boulder Badge"
}
```

---

## `createExtraLearning`

**Purpose**: Add ad-hoc learning outside structured courses (spontaneous knowledge)

**Use case**:
```
User: "Hey Claude, what is the LangChain Neo4j extension?"
Claude: *explains it*
User: "Save this to my knowledge base"
Claude: "Which topic should I file this under?"
  → langchain (exists)
  → neo4j (create new)
User: "neo4j"
Claude: createExtraLearning("neo4j", "langchain-extension", ...)
```

**Input**:
```typescript
{
  topic: string,              // "neo4j" or "langchain" - created if doesn't exist
  name: string,               // "langchain-extension" (kebab-case)
  displayName: string,        // "LangChain Neo4j Extension"
  content: string,            // The learning content (markdown)
  tags?: string[],            // ["integration", "graph-rag"]
  relatedTo?: string          // Optional link to a course
}
```

**Validations**:
- If topic doesn't exist → auto-create with minimal structure
- Name must be unique within topic extras

**Creates**:
```
src/[topic]/extras/2026-01-11-langchain-extension.md
```

**Points**:
| Action | Points |
|--------|--------|
| Create extra learning | +15 |
| With quiz (optional) | +30 bonus |
| Catch Pokemon (if quizzed) | +50-100 |

**Returns**:
```typescript
{
  success: true,
  path: "src/neo4j/extras/2026-01-11-langchain-extension.md",
  topicCreated: true,    // If topic was auto-created
  points: 15,
  message: "Extra learning saved! Take a quick quiz to catch a Pokemon?"
}
```

---

## `listExtras`

**Purpose**: List all extra learnings for a topic

**Input**:
```typescript
{
  topic?: string,    // Optional, if null returns all
  tags?: string[]    // Filter by tags
}
```

**Returns**:
```typescript
{
  extras: [
    {
      id: "2026-01-11-langchain-extension",
      topic: "neo4j",
      name: "LangChain Neo4j Extension",
      tags: ["integration", "graph-rag"],
      created_at: "2026-01-11",
      hasPokemon: true
    }
  ]
}
```

---

## `createSubtopic`

**Purpose**: Create a subtopic under an existing topic

**Input**:
```typescript
{
  parentTopic: string,    // "aws"
  name: string,           // "ec2"
  displayName?: string,   // "EC2"
  description?: string
}
```

**Validations**:
- Parent topic must exist
- Subtopic name must be unique within parent
- Creates under `subtopics/` folder

**Creates**:
```
src/[parentTopic]/subtopics/[name]/
├── progress.yaml
├── rewards.yaml
├── rewards/
├── extras/
├── courses/
│   ├── starter/
│   ├── beginner/
│   ├── advanced/
│   └── expert/
└── exercices/
    ├── starter/
    ├── beginner/
    ├── advanced/
    └── expert/
```

**Returns**:
```typescript
{
  success: true,
  path: "src/aws/subtopics/ec2",
  fullPath: "aws/ec2",    // For pokedex references
  message: "Subtopic 'ec2' created under 'aws'"
}
```

---

## `createCourse`

**Purpose**: Create a course placeholder (used by setRoadmap internally, or for adding single courses)

**Input**:
```typescript
{
  topic: string,          // "docker" or "aws/ec2"
  level: "starter" | "beginner" | "advanced" | "expert",
  name: string,           // "what-is-docker" (kebab-case)
  displayName?: string,   // "What is Docker?"
  mandatory?: boolean     // Default: true
}
```

**Validations**:
- Topic/subtopic must exist
- Level must be valid
- Name must be kebab-case
- Auto-increments number based on existing courses

**Creates**:
```
src/[topic]/courses/[level]/[number]-[name].md
```

**Returns**:
```typescript
{
  success: true,
  path: "src/docker/courses/starter/01-what-is-docker.md",
  courseId: "01-what-is-docker",
  number: 1,
  message: "Course created. Claude can now write content."
}
```

---

## `createExercise`

**Purpose**: Create an exercise folder structure for a course

**Input**:
```typescript
{
  topic: string,          // "docker" or "aws/ec2"
  level: "starter" | "beginner" | "advanced" | "expert",
  courseId: string,       // "01-what-is-docker"
  name?: string,          // Optional exercise name
  mandatory?: boolean     // Default: false
}
```

**Creates**:
```
src/[topic]/exercices/[level]/[courseId]/exercice-[XX]/
├── exercice.md      # Placeholder for instructions
├── result/          # Empty folder for solution
└── sandbox/         # Empty folder for user work
```

**Returns**:
```typescript
{
  success: true,
  path: "src/docker/exercices/starter/01-what-is-docker/exercice-01",
  exerciseId: "exercice-01",
  number: 1,
  message: "Exercise created. Claude can now write instructions."
}
```

---

## `listTopics`

**Purpose**: List all topics and subtopics

**Input**:
```typescript
{
  includeProgress?: boolean   // Include completion stats
}
```

**Returns**:
```typescript
{
  topics: [
    {
      name: "docker",
      displayName: "Docker",
      path: "src/docker",
      currentLevel: "beginner",
      completion: 45,           // If includeProgress=true
      subtopics: []
    },
    {
      name: "aws",
      displayName: "AWS",
      path: "src/aws",
      currentLevel: "starter",
      completion: 20,
      subtopics: [
        { name: "ec2", displayName: "EC2", completion: 30 },
        { name: "s3", displayName: "S3", completion: 0 }
      ]
    }
  ]
}
```

---

## `getTopic`

**Purpose**: Get full topic details including roadmap

**Input**:
```typescript
{
  topic: string   // "docker" or "aws/ec2"
}
```

**Returns**:
```typescript
{
  name: "docker",
  displayName: "Docker",
  description: "...",
  currentLevel: "beginner",
  roadmap: {
    starter: {
      courses: [...],
      exercices: {...},
      completed: true
    },
    beginner: {
      courses: [...],
      exercices: {...},
      completed: false
    }
  },
  stats: {
    totalCourses: 8,
    completedCourses: 3,
    totalExercises: 12,
    completedExercises: 5,
    completion: 45
  }
}
```

---

## `deleteTopic`

**Purpose**: Delete a topic (with safety checks)

**Input**:
```typescript
{
  topic: string,
  confirm: boolean   // Must be true to delete
}
```

**Validations**:
- Topic must exist
- Confirm must be true
- Warns if progress exists

**Returns**:
```typescript
{
  success: true,
  deleted: "src/docker",
  warning: "Deleted topic with 45% progress"
}
```
