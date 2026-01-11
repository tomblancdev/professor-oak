# Architecture: MCP as Gatekeeper

## Core Principle

```
┌─────────────────────────────────────────────────────────────┐
│                      PROFESSOR OAK MCP                       │
│         (ONLY way to interact with game structure)          │
├─────────────────────────────────────────────────────────────┤
│  Creates:           │  Manages:           │  Enforces:      │
│  - Folders          │  - YAML configs     │  - Naming       │
│  - Structure        │  - Progress         │  - Numbering    │
│  - Placeholders     │  - Pokedex          │  - Standards    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE (Native Tools)                     │
│              (Content generation ONLY)                       │
├─────────────────────────────────────────────────────────────┤
│  Writes:                    │  Uses:                        │
│  - Course content (.md)     │  - Read/Write/Edit tools      │
│  - Exercise content (.md)   │  - Agents for generation      │
│  - Quiz questions           │  - AskUserQuestion for quiz   │
└─────────────────────────────────────────────────────────────┘
```

---

## What Each Layer Does

| Layer | Responsibility | Tools |
|-------|----------------|-------|
| **Commands** | User entry points | `/learn`, `/quiz`, `/progress`, `/save`, `/extras` |
| **Professor Oak MCP** | Structure, standards, YAML, game logic | MCP tools |
| **PokéAPI MCP** | Pokemon data only | MCP tools |
| **Claude Native** | Content generation | Read, Write, Edit |
| **Agents** | Specialized generation | Quiz agent, Course agent |

---

## Decoupled MCP Servers

### MCP 1: `pokeapi-mcp`
**Purpose**: Pure PokéAPI wrapper, no game logic

| Tool | Purpose |
|------|---------|
| `getPokemon` | Get Pokemon by id/name |
| `getPokemonByStatRange` | Filter by stats |
| `getEvolutionChain` | Get evolution data |
| `getSpecies` | Get species/rarity info |
| `getSprite` | Get Pokemon image |

### MCP 2: `professor-oak-mcp`
**Purpose**: All game logic, uses pokeapi-mcp

| Category | Tools |
|----------|-------|
| Topic Management | `createTopic`, `createCourse`, `setRoadmap`, etc. |
| Progress | `getProgress`, `completeItem`, `checkLevelComplete` |
| Trainer | `getTrainer`, `addPoints`, `getRank` |
| Pokedex | `catchPokemon`, `evolvePokemon`, `getPokedex` |
| Quiz | `getQuizConfig`, `submitQuizResult` |
| Rewards | `generateBadge`, `awardBadge` |

---

## MCP Enforced Standards

| Standard | Enforced by MCP |
|----------|-----------------|
| Folder structure | `createTopic()`, `createSubtopic()` |
| Course numbering | `createCourse()` → auto-increments `01-`, `02-` |
| Exercise numbering | `createExercise()` → auto-increments |
| Level names | Only accepts: starter, beginner, advanced, expert |
| YAML schema | All YAML writes validated |
| Progress tracking | All completions go through MCP |
| Points calculation | Centralized in MCP |

---

## Flow Example: `/learn docker`

```
1. User: /learn docker

2. Command triggers Claude

3. Claude calls MCP: createTopic("docker")
   MCP creates:
   └── src/docker/
       ├── progress.yaml    (initialized)
       ├── rewards.yaml     (empty)
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

4. Claude uses AskUserQuestion: "What's your level?"
   User selects: "Starter"

5. Claude calls MCP: initializeLevel("docker", "starter")

6. Claude (AI) generates roadmap for starter level

7. Claude calls MCP: setRoadmap("docker", "starter", {...})
   MCP creates:
   └── src/docker/courses/starter/01-what-is-docker.md (placeholder)
   MCP updates: progress.yaml with roadmap entry

8. Claude (native Write tool) generates course CONTENT

9. Claude confirms to user: "Course created!"
```

---

## Flow Example: `/quiz docker`

```
1. User: /quiz docker

2. Claude calls MCP: getQuizConfig("docker")
   MCP returns: { level: "starter", tier: 2, questions: 4, pokemon: "Charmander" }

3. Claude (agent) generates quiz questions based on course content

4. Claude uses AskUserQuestion to present quiz interactively

5. User answers

6. Claude calls MCP: submitQuizResult("docker", { correct: 3, total: 4 })
   MCP:
   - Calculates points
   - Updates trainer.yaml
   - If passed: updates pokedex.yaml with catch
   - Returns: { passed: true, points: 72, caught: "Charmander" }

7. Claude displays result with Pokemon catch animation
```
