# Professor Oak - Implementation Plan

**Date:** 2026-01-11
**Author:** AI Engineering Specialist
**Status:** Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Setup](#2-project-setup)
3. [Phase 1: Foundation](#3-phase-1-foundation)
4. [Phase 2: Core MCP Server](#4-phase-2-core-mcp-server)
5. [Phase 3: Commands & Personas](#5-phase-3-commands--personas)
6. [Phase 4: Game Mechanics](#6-phase-4-game-mechanics)
7. [Phase 5: Polish & Extras](#7-phase-5-polish--extras)
8. [Testing Strategy](#8-testing-strategy)
9. [TypeScript Interfaces](#9-typescript-interfaces)
10. [File Templates](#10-file-templates)

---

## 1. Executive Summary

### Project Goal
Build a gamified learning system where users "catch" knowledge like Pokemon, earn badges, and progress through levels - all orchestrated through Claude Code with MCP servers.

### Architecture Overview
```
User -> Claude Code -> professor-oak-mcp -> YAML Files (Game State)
                |
                +-> pokeapi-mcp -> PokeAPI (Pokemon Data)
                |
                +-> Commands (.claude/commands/) -> Personas
```

### MVP Definition (Minimum to Start Using)
1. `professor-oak-mcp` with Topic Management + Progress tools
2. `/learn` and `/progress` commands
3. Basic `trainer.yaml` and `pokedex.yaml` structure
4. Professor Oak persona in CLAUDE.md

### Estimated Timeline
| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | 1-2 days | Project structure, devcontainer, CLAUDE.md |
| Phase 2: Core MCP | 3-5 days | Topic + Progress + Trainer tools |
| Phase 3: Commands | 2-3 days | /learn, /progress, /quiz commands + personas |
| Phase 4: Game Mechanics | 3-4 days | Quiz system, badges, Pokemon catching |
| Phase 5: Polish | 2-3 days | Wild encounters, extras, evolution |

---

## 2. Project Setup

### 2.1 Folder Structure

```
professor-oak/
├── .devcontainer/
│   └── devcontainer.json           # Dev environment
├── .claude/
│   └── commands/
│       ├── learn.md                # /learn command
│       ├── progress.md             # /progress command
│       ├── quiz.md                 # /quiz command
│       ├── pokedex.md              # /pokedex command
│       ├── wild.md                 # /wild command
│       ├── save.md                 # /save command
│       ├── extras.md               # /extras command
│       └── reset.md                # /reset command
├── mcp/
│   └── professor-oak-mcp/
│       ├── .devcontainer/
│       │   └── devcontainer.json   # MCP dev environment
│       ├── src/
│       │   ├── index.ts            # Server entry point
│       │   ├── tools/
│       │   │   ├── topic.ts        # Topic management tools
│       │   │   ├── progress.ts     # Progress tools
│       │   │   ├── trainer.ts      # Trainer tools
│       │   │   ├── pokedex.ts      # Pokedex tools
│       │   │   ├── quiz.ts         # Quiz tools
│       │   │   ├── rewards.ts      # Rewards tools
│       │   │   └── persona.ts      # Persona tools
│       │   ├── services/
│       │   │   ├── yaml.ts         # YAML read/write operations
│       │   │   ├── filesystem.ts   # File/folder operations
│       │   │   ├── validation.ts   # Input validation
│       │   │   └── points.ts       # Points calculation
│       │   ├── types/
│       │   │   ├── index.ts        # All TypeScript interfaces
│       │   │   ├── topic.ts        # Topic-related types
│       │   │   ├── progress.ts     # Progress-related types
│       │   │   ├── trainer.ts      # Trainer-related types
│       │   │   ├── pokedex.ts      # Pokedex-related types
│       │   │   ├── quiz.ts         # Quiz-related types
│       │   │   └── rewards.ts      # Rewards-related types
│       │   └── config/
│       │       ├── constants.ts    # Game constants (points, tiers, etc.)
│       │       ├── personas.ts     # Persona definitions
│       │       └── badges.ts       # Badge templates
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
├── personas/
│   ├── professor-oak.md            # Professor Oak system prompt
│   ├── nurse-joy.md                # Nurse Joy system prompt
│   ├── gym-leaders/
│   │   ├── brock.md                # Starter level
│   │   ├── misty.md                # Beginner level
│   │   ├── lt-surge.md             # Advanced level
│   │   └── sabrina.md              # Expert level
│   └── wild-encounter.md           # Wild encounter narrator
├── src/                            # Learning content (created by system)
│   └── [topic]/                    # Per-topic folders
├── researches/                     # Project research (existing)
├── CLAUDE.md                       # Project instructions
├── .claudeignore                   # Protected files
├── .mcp.json                       # MCP configuration
├── trainer.yaml                    # Global trainer stats
├── pokedex.yaml                    # Global Pokemon collection
└── quiz-history/                   # Monthly quiz history
    └── YYYY-MM.yaml
```

### 2.2 Development Environment (Devcontainer)

**File: `.devcontainer/devcontainer.json`**
```json
{
  "name": "Professor Oak Development",
  "dockerComposeFile": ["../mcp/professor-oak-mcp/docker-compose.yml"],
  "service": "dev",
  "workspaceFolder": "/workspace",
  "postCreateCommand": "cd /workspace/mcp/professor-oak-mcp && npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "redhat.vscode-yaml"
      ]
    }
  }
}
```

**File: `mcp/professor-oak-mcp/docker-compose.yml`**
```yaml
services:
  dev:
    build:
      context: .
      target: builder
    volumes:
      - ../../:/workspace:cached
      - node_modules:/workspace/mcp/professor-oak-mcp/node_modules
    stdin_open: true
    tty: true
    working_dir: /workspace/mcp/professor-oak-mcp
    command: sleep infinity

  mcp:
    build:
      context: .
      target: runtime
    volumes:
      - ../../:/data:rw
    environment:
      - DATA_PATH=/data
    stdin_open: true

volumes:
  node_modules:
```

### 2.3 Dependencies

**File: `mcp/professor-oak-mcp/package.json`**
```json
{
  "name": "professor-oak-mcp",
  "version": "1.0.0",
  "description": "MCP server for Professor Oak gamified learning system",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "yaml": "^2.3.4",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 2.4 MCP Configuration

**File: `.mcp.json`**
```json
{
  "mcpServers": {
    "professor-oak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "${workspaceFolder}:/data:rw",
        "professor-oak-mcp:latest"
      ]
    }
  }
}
```

---

## 3. Phase 1: Foundation

### 3.1 Tasks

| Task | Priority | Complexity | Dependencies |
|------|----------|------------|--------------|
| Create folder structure | P0 | Low | None |
| Set up devcontainer | P0 | Low | Folder structure |
| Create TypeScript project | P0 | Low | Devcontainer |
| Write CLAUDE.md | P0 | Medium | None |
| Create .claudeignore | P0 | Low | None |
| Initialize trainer.yaml | P1 | Low | None |
| Initialize pokedex.yaml | P1 | Low | None |
| Create persona files | P1 | Medium | None |

### 3.2 CLAUDE.md Template

**File: `CLAUDE.md`**
```markdown
# Professor Oak - Gamified Learning System

## Project Overview

This is a gamified learning system where you "catch" knowledge like Pokemon.

## Your Role

You are the learning orchestrator. Depending on the command, adopt different personas:

| Command | Persona | File |
|---------|---------|------|
| `/learn`, `/save` | Professor Oak | personas/professor-oak.md |
| `/progress` | Nurse Joy | personas/nurse-joy.md |
| `/quiz` | Gym Leader (by level) | personas/gym-leaders/*.md |
| `/wild` | Wild Encounter | personas/wild-encounter.md |

## Critical Rules

### File Access
- NEVER read or write these files directly - use MCP tools:
  - `trainer.yaml` -> Use `getTrainer()`, `addPoints()`
  - `pokedex.yaml` -> Use `getPokedex()`, `addPokemon()`
  - `**/progress.yaml` -> Use `getProgress()`, `completeItem()`
  - `**/rewards.yaml` -> Use `getRewards()`, `awardBadge()`

- You CAN read/write these files directly:
  - `src/**/courses/**/*.md` (course content)
  - `src/**/exercices/**/*.md` (exercise instructions)
  - `src/**/extras/**/*.md` (extra learnings)
  - `src/**/sandbox/*` (user work area)

### MCP Tools

Use `professor-oak-mcp` for all game logic:
- Topic Management: `createTopic`, `initializeLevel`, `setRoadmap`
- Progress: `getProgress`, `completeItem`, `getNextAction`
- Trainer: `getTrainer`, `addPoints`, `getRank`
- Pokedex: `getPokedex`, `addPokemon`, `evolvePokemon`
- Quiz: `startQuiz`, `submitQuizResult`
- Rewards: `awardBadge`, `getBadges`
- Persona: `getPersona`

### Persona Adoption

When a command triggers a persona:
1. Call `getPersona(personaName, context)` to get the system prompt
2. Adopt that persona's speaking style and behavior
3. Maintain the persona until the interaction completes
4. Return to neutral after the task

### Points & Levels

Points are earned through legitimate actions only:
- Completing courses: +25
- Completing exercises: +15/+30
- Passing quizzes: varies by tier
- Earning badges: +500

Levels: starter -> beginner -> advanced -> expert

### Naming Conventions

- Topics: kebab-case (docker-basics, python-async)
- Courses: [number]-[name].md (01-introduction.md)
- Exercises: exercice-[number]/ (exercice-01/)
```

### 3.3 Protected Files

**File: `.claudeignore`**
```gitignore
# Game state files - must use MCP tools
trainer.yaml
pokedex.yaml
**/progress.yaml
**/rewards.yaml

# Generated assets
**/rewards/*.svg
**/rewards/*.png

# Quiz history
quiz-history/
```

### 3.4 Initial YAML Files

**File: `trainer.yaml`**
```yaml
# Professor Oak - Trainer Profile
# DO NOT EDIT DIRECTLY - Use MCP tools

version: 1
trainer: null
started_at: null
total_points: 0
rank: "Rookie Trainer"

settings:
  wild_encounters: true
  notifications: true

achievements:
  first_pokemon: null
  first_badge: null
  first_legendary: null

point_history: []
```

**File: `pokedex.yaml`**
```yaml
# Professor Oak - Pokedex
# DO NOT EDIT DIRECTLY - Use MCP tools

version: 1
trainer: null
created_at: null

pokemon: []

stats:
  total_caught: 0
  total_evolved: 0
  legendaries: 0
  by_topic: {}
```

---

## 4. Phase 2: Core MCP Server

### 4.1 Implementation Priority

| Tool Category | Priority | Tools | Complexity |
|---------------|----------|-------|------------|
| Topic Management | P0 | createTopic, getTopic, listTopics | Medium |
| Progress | P0 | getProgress, completeItem, getNextAction | Medium |
| Trainer | P0 | getTrainer, addPoints, getRank | Low |
| Persona | P1 | getPersona | Low |
| Quiz | P1 | startQuiz, submitQuizResult, getQuizHistory | High |
| Pokedex | P1 | getPokedex, addPokemon | Medium |
| Rewards | P2 | awardBadge, getBadges, checkBadgeEligibility | Medium |
| Topic (Extended) | P2 | createSubtopic, setRoadmap, unlockNextLevel | Medium |
| Pokedex (Extended) | P3 | evolvePokemon, getPokedexStats | Medium |
| Extra Learning | P3 | createExtraLearning, listExtras | Low |

### 4.2 Server Entry Point

**File: `mcp/professor-oak-mcp/src/index.ts`**
```typescript
#!/usr/bin/env node

/**
 * Professor Oak MCP Server
 *
 * Gamified learning system with Pokemon-themed progress tracking.
 * This server handles all game logic and state management.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Tool registrations
import { registerTopicTools } from "./tools/topic.js";
import { registerProgressTools } from "./tools/progress.js";
import { registerTrainerTools } from "./tools/trainer.js";
import { registerPokedexTools } from "./tools/pokedex.js";
import { registerQuizTools } from "./tools/quiz.js";
import { registerRewardsTools } from "./tools/rewards.js";
import { registerPersonaTools } from "./tools/persona.js";

// Create server
const server = new McpServer({
  name: "professor-oak",
  version: "1.0.0",
});

// Register all tools
registerTopicTools(server);
registerProgressTools(server);
registerTrainerTools(server);
registerPokedexTools(server);
registerQuizTools(server);
registerRewardsTools(server);
registerPersonaTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Professor Oak MCP Server running!");
}

main().catch(console.error);
```

### 4.3 YAML Service

**File: `mcp/professor-oak-mcp/src/services/yaml.ts`**
```typescript
/**
 * YAML Service
 *
 * Handles reading and writing YAML files with proper error handling.
 * All game state is stored in YAML format.
 */

import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";

const DATA_PATH = process.env.DATA_PATH || "/data";

export interface YamlResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Read a YAML file and parse it
 */
export async function readYaml<T>(relativePath: string): Promise<YamlResult<T>> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const data = YAML.parse(content) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read ${relativePath}: ${error}`
    };
  }
}

/**
 * Write data to a YAML file
 */
export async function writeYaml<T>(
  relativePath: string,
  data: T,
  header?: string
): Promise<YamlResult<void>> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Format YAML with optional header
    let content = YAML.stringify(data, { lineWidth: 0 });
    if (header) {
      content = `# ${header}\n# DO NOT EDIT DIRECTLY - Use MCP tools\n\n${content}`;
    }

    await fs.writeFile(fullPath, content, "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write ${relativePath}: ${error}`
    };
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a directory structure
 */
export async function createDirectory(relativePath: string): Promise<YamlResult<void>> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create directory ${relativePath}: ${error}`
    };
  }
}
```

### 4.4 Topic Management Tools

**File: `mcp/professor-oak-mcp/src/tools/topic.ts`**
```typescript
/**
 * Topic Management Tools
 *
 * Tools for creating and managing learning topics.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readYaml, writeYaml, fileExists, createDirectory } from "../services/yaml.js";
import { LEVELS, isValidKebabCase } from "../config/constants.js";
import type { TopicProgress } from "../types/progress.js";

export function registerTopicTools(server: McpServer) {

  /**
   * Create a new learning topic
   */
  server.tool(
    "createTopic",
    `Create a new learning topic with full folder structure.
     Call this when a user starts learning a new subject.
     Creates: progress.yaml, rewards.yaml, courses/, exercices/, extras/ folders.
     Validates that name is kebab-case and unique.`,
    {
      name: z.string().describe("Topic name in kebab-case (e.g., 'docker', 'python-async')"),
      displayName: z.string().optional().describe("Human-readable name (e.g., 'Docker', 'Python Async')"),
      description: z.string().optional().describe("Short topic description"),
    },
    async ({ name, displayName, description }) => {
      // Validate kebab-case
      if (!isValidKebabCase(name)) {
        return jsonResponse({
          success: false,
          error: `Topic name must be kebab-case (lowercase letters, numbers, hyphens). Got: "${name}"`,
        });
      }

      // Check if topic already exists
      const topicPath = `src/${name}`;
      if (await fileExists(topicPath)) {
        return jsonResponse({
          success: false,
          error: `Topic "${name}" already exists at ${topicPath}`,
        });
      }

      // Create folder structure
      const folders = [
        `${topicPath}/courses/starter`,
        `${topicPath}/courses/beginner`,
        `${topicPath}/courses/advanced`,
        `${topicPath}/courses/expert`,
        `${topicPath}/exercices/starter`,
        `${topicPath}/exercices/beginner`,
        `${topicPath}/exercices/advanced`,
        `${topicPath}/exercices/expert`,
        `${topicPath}/extras`,
        `${topicPath}/rewards`,
      ];

      for (const folder of folders) {
        await createDirectory(folder);
      }

      // Initialize progress.yaml
      const progress: TopicProgress = {
        version: 1,
        topic: name,
        display_name: displayName || toTitleCase(name),
        description: description || "",
        created_at: new Date().toISOString().split("T")[0],
        current_level: null,
        roadmap: {},
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress, "Topic Progress");

      // Initialize rewards.yaml
      const rewards = {
        version: 1,
        topic: name,
        created_at: new Date().toISOString().split("T")[0],
        badges: [],
        milestones: [],
      };

      await writeYaml(`${topicPath}/rewards.yaml`, rewards, "Topic Rewards");

      return jsonResponse({
        success: true,
        path: topicPath,
        message: `Topic "${name}" created. Use initializeLevel to set starting level.`,
        nextStep: "initializeLevel",
      });
    }
  );

  /**
   * Get topic details
   */
  server.tool(
    "getTopic",
    `Get full details for a learning topic including roadmap and progress.
     Use this to check topic status before suggesting next actions.`,
    {
      topic: z.string().describe("Topic name (e.g., 'docker') or path (e.g., 'aws/ec2')"),
    },
    async ({ topic }) => {
      const topicPath = topic.includes("/")
        ? `src/${topic.split("/")[0]}/subtopics/${topic.split("/")[1]}`
        : `src/${topic}`;

      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({
          success: false,
          error: `Topic "${topic}" not found`,
        });
      }

      const data = result.data!;

      // Calculate stats
      let completedCourses = 0;
      let totalCourses = 0;
      let completedExercises = 0;
      let totalExercises = 0;

      for (const level of LEVELS) {
        const levelData = data.roadmap[level];
        if (levelData?.courses) {
          totalCourses += levelData.courses.length;
          completedCourses += levelData.courses.filter(c => c.completed).length;
        }
        if (levelData?.exercices) {
          for (const courseExercises of Object.values(levelData.exercices)) {
            totalExercises += courseExercises.length;
            completedExercises += courseExercises.filter(e => e.completed).length;
          }
        }
      }

      return jsonResponse({
        success: true,
        topic: data.topic,
        displayName: data.display_name,
        description: data.description,
        currentLevel: data.current_level,
        roadmap: data.roadmap,
        stats: {
          totalCourses,
          completedCourses,
          totalExercises,
          completedExercises,
          completion: totalCourses > 0
            ? Math.round((completedCourses / totalCourses) * 100)
            : 0,
        },
      });
    }
  );

  /**
   * List all topics
   */
  server.tool(
    "listTopics",
    `List all learning topics and their progress.
     Use this when user asks what they're learning or wants an overview.`,
    {
      includeProgress: z.boolean().optional().describe("Include completion stats per topic"),
    },
    async ({ includeProgress = false }) => {
      const srcPath = "src";
      const topics: any[] = [];

      try {
        const entries = await fs.readdir(path.join(DATA_PATH, srcPath), { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            const progressPath = `${srcPath}/${entry.name}/progress.yaml`;
            const result = await readYaml<TopicProgress>(progressPath);

            if (result.success) {
              const topic: any = {
                name: result.data!.topic,
                displayName: result.data!.display_name,
                path: `${srcPath}/${entry.name}`,
                currentLevel: result.data!.current_level,
              };

              if (includeProgress) {
                // Calculate completion
                let total = 0;
                let completed = 0;
                for (const level of LEVELS) {
                  const levelData = result.data!.roadmap[level];
                  if (levelData?.courses) {
                    total += levelData.courses.length;
                    completed += levelData.courses.filter(c => c.completed).length;
                  }
                }
                topic.completion = total > 0 ? Math.round((completed / total) * 100) : 0;
              }

              topics.push(topic);
            }
          }
        }
      } catch (error) {
        // No src folder yet - return empty list
      }

      return jsonResponse({
        success: true,
        topics,
        count: topics.length,
      });
    }
  );

  /**
   * Initialize level for a topic
   */
  server.tool(
    "initializeLevel",
    `Set the starting level for a topic and prepare for roadmap generation.
     Call this after creating a topic and the user selects their level.
     After this, Claude should generate and set a roadmap.`,
    {
      topic: z.string().describe("Topic name"),
      level: z.enum(["starter", "beginner", "advanced", "expert"]).describe("Starting level"),
    },
    async ({ topic, level }) => {
      const topicPath = `src/${topic}`;
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({
          success: false,
          error: `Topic "${topic}" not found`,
        });
      }

      const data = result.data!;

      if (data.current_level !== null) {
        return jsonResponse({
          success: false,
          error: `Topic "${topic}" already has level set to "${data.current_level}"`,
        });
      }

      // Update progress.yaml
      data.current_level = level;
      data.roadmap[level] = {
        status: "pending",
        courses: [],
        exercices: {},
      };

      await writeYaml(`${topicPath}/progress.yaml`, data, "Topic Progress");

      return jsonResponse({
        success: true,
        level,
        message: `Level set to "${level}". Claude should now generate roadmap.`,
        nextStep: "generateRoadmap",
      });
    }
  );

  /**
   * Set roadmap for a level
   */
  server.tool(
    "setRoadmap",
    `Save the Claude-generated roadmap for a level.
     Creates course placeholders and exercise folders.
     Claude generates course content after this.`,
    {
      topic: z.string().describe("Topic name"),
      level: z.enum(["starter", "beginner", "advanced", "expert"]),
      roadmap: z.object({
        courses: z.array(z.object({
          name: z.string().describe("Course name in kebab-case"),
          displayName: z.string().describe("Human-readable name"),
          mandatory: z.boolean().default(true),
        })),
        exercices: z.record(z.array(z.object({
          name: z.string().describe("Exercise name"),
          mandatory: z.boolean().default(false),
        }))).optional(),
        quizRequired: z.boolean().default(true),
      }),
    },
    async ({ topic, level, roadmap }) => {
      const topicPath = `src/${topic}`;
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({ success: false, error: `Topic "${topic}" not found` });
      }

      const data = result.data!;
      const coursesCreated: string[] = [];
      const exercisesCreated: string[] = [];

      // Create course placeholders
      for (let i = 0; i < roadmap.courses.length; i++) {
        const course = roadmap.courses[i];
        const number = String(i + 1).padStart(2, "0");
        const filename = `${number}-${course.name}.md`;
        const coursePath = `${topicPath}/courses/${level}/${filename}`;

        // Create placeholder file
        const placeholder = `# ${course.displayName}\n\n> Course content to be generated by Claude\n`;
        await fs.writeFile(path.join(DATA_PATH, coursePath), placeholder);

        coursesCreated.push(filename);

        // Create exercise folders if specified
        const courseExercises = roadmap.exercices?.[course.name] || [];
        for (let j = 0; j < courseExercises.length; j++) {
          const exercise = courseExercises[j];
          const exerciseNum = String(j + 1).padStart(2, "0");
          const exercisePath = `${topicPath}/exercices/${level}/${number}-${course.name}/exercice-${exerciseNum}`;

          await createDirectory(exercisePath);
          await createDirectory(`${exercisePath}/result`);
          await createDirectory(`${exercisePath}/sandbox`);

          // Create exercise placeholder
          const exercisePlaceholder = `# Exercise: ${exercise.name}\n\n> Instructions to be generated by Claude\n`;
          await fs.writeFile(
            path.join(DATA_PATH, `${exercisePath}/exercice.md`),
            exercisePlaceholder
          );

          exercisesCreated.push(`${number}-${course.name}/exercice-${exerciseNum}`);
        }
      }

      // Update progress.yaml with roadmap
      data.roadmap[level] = {
        status: "active",
        courses: roadmap.courses.map((c, i) => ({
          id: `${String(i + 1).padStart(2, "0")}-${c.name}`,
          name: c.displayName,
          mandatory: c.mandatory,
          completed: false,
        })),
        exercices: {},
        quizRequired: roadmap.quizRequired,
        quizPassed: false,
      };

      // Add exercises to roadmap
      for (const [courseName, exercises] of Object.entries(roadmap.exercices || {})) {
        const courseIndex = roadmap.courses.findIndex(c => c.name === courseName);
        if (courseIndex >= 0) {
          const courseId = `${String(courseIndex + 1).padStart(2, "0")}-${courseName}`;
          data.roadmap[level].exercices[courseId] = exercises.map((e, i) => ({
            id: `exercice-${String(i + 1).padStart(2, "0")}`,
            name: e.name,
            mandatory: e.mandatory,
            completed: false,
          }));
        }
      }

      await writeYaml(`${topicPath}/progress.yaml`, data, "Topic Progress");

      return jsonResponse({
        success: true,
        created: {
          courses: coursesCreated.length,
          exercises: exercisesCreated.length,
        },
        coursePaths: coursesCreated.map(c => `${topicPath}/courses/${level}/${c}`),
        message: "Roadmap set. Claude can now generate course content.",
      });
    }
  );
}

// Helper functions
function jsonResponse(data: any) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

function toTitleCase(str: string): string {
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

import * as fs from "fs/promises";
import * as path from "path";
const DATA_PATH = process.env.DATA_PATH || "/data";
```

### 4.5 Progress Tools

**File: `mcp/professor-oak-mcp/src/tools/progress.ts`**
```typescript
/**
 * Progress Tools
 *
 * Tools for tracking learning progress.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readYaml, writeYaml } from "../services/yaml.js";
import { LEVELS, POINTS } from "../config/constants.js";
import type { TopicProgress } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";

export function registerProgressTools(server: McpServer) {

  /**
   * Get progress for a topic
   */
  server.tool(
    "getProgress",
    `Get detailed progress for a topic or all topics.
     Use this when user asks about their progress or you need to suggest next steps.`,
    {
      topic: z.string().optional().describe("Topic name (optional - returns all if omitted)"),
      level: z.string().optional().describe("Filter by specific level"),
    },
    async ({ topic, level }) => {
      if (!topic) {
        // Return overall progress
        return await getOverallProgress();
      }

      const topicPath = `src/${topic}`;
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({
          success: false,
          error: `Topic "${topic}" not found`,
        });
      }

      const data = result.data!;
      const levels: any = {};

      for (const lvl of LEVELS) {
        const levelData = data.roadmap[lvl];

        if (!levelData) {
          levels[lvl] = { status: "locked" };
          continue;
        }

        const courses = levelData.courses || [];
        const completedCourses = courses.filter(c => c.completed).length;

        let totalExercises = 0;
        let completedExercises = 0;
        let mandatoryTotal = 0;
        let mandatoryCompleted = 0;

        for (const exercises of Object.values(levelData.exercices || {})) {
          totalExercises += exercises.length;
          completedExercises += exercises.filter(e => e.completed).length;
          mandatoryTotal += exercises.filter(e => e.mandatory).length;
          mandatoryCompleted += exercises.filter(e => e.mandatory && e.completed).length;
        }

        levels[lvl] = {
          status: levelData.status,
          completion: courses.length > 0
            ? Math.round((completedCourses / courses.length) * 100)
            : 0,
          courses: {
            total: courses.length,
            completed: completedCourses,
            items: courses,
          },
          exercices: {
            total: totalExercises,
            completed: completedExercises,
            mandatory: { total: mandatoryTotal, completed: mandatoryCompleted },
          },
          quiz: {
            required: levelData.quizRequired || false,
            passed: levelData.quizPassed || false,
          },
        };
      }

      return jsonResponse({
        success: true,
        topic: data.topic,
        currentLevel: data.current_level,
        levels,
        extras: {
          count: data.extras?.length || 0,
        },
      });
    }
  );

  /**
   * Complete a course or exercise
   */
  server.tool(
    "completeItem",
    `Mark a course or exercise as completed and award points.
     Call this after user finishes studying a course or completing an exercise.
     Automatically checks if level is now complete.`,
    {
      topic: z.string().describe("Topic name"),
      level: z.enum(["starter", "beginner", "advanced", "expert"]),
      type: z.enum(["course", "exercise"]),
      itemId: z.string().describe("Course ID (e.g., '01-first-container') or exercise ID"),
      courseId: z.string().optional().describe("Required if type is 'exercise'"),
    },
    async ({ topic, level, type, itemId, courseId }) => {
      const topicPath = `src/${topic}`;
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({ success: false, error: `Topic "${topic}" not found` });
      }

      const data = result.data!;
      const levelData = data.roadmap[level];

      if (!levelData) {
        return jsonResponse({ success: false, error: `Level "${level}" not found in roadmap` });
      }

      let pointsAwarded = 0;
      const today = new Date().toISOString().split("T")[0];

      if (type === "course") {
        const course = levelData.courses?.find(c => c.id === itemId);
        if (!course) {
          return jsonResponse({ success: false, error: `Course "${itemId}" not found` });
        }
        if (course.completed) {
          return jsonResponse({ success: false, error: `Course "${itemId}" already completed` });
        }

        course.completed = true;
        course.completed_at = today;
        pointsAwarded = POINTS.COURSE_COMPLETE;

      } else {
        if (!courseId) {
          return jsonResponse({ success: false, error: "courseId required for exercises" });
        }

        const exercises = levelData.exercices?.[courseId];
        if (!exercises) {
          return jsonResponse({ success: false, error: `No exercises for course "${courseId}"` });
        }

        const exercise = exercises.find(e => e.id === itemId);
        if (!exercise) {
          return jsonResponse({ success: false, error: `Exercise "${itemId}" not found` });
        }
        if (exercise.completed) {
          return jsonResponse({ success: false, error: `Exercise "${itemId}" already completed` });
        }

        exercise.completed = true;
        exercise.completed_at = today;
        pointsAwarded = exercise.mandatory
          ? POINTS.EXERCISE_MANDATORY
          : POINTS.EXERCISE_OPTIONAL;
      }

      // Save progress
      await writeYaml(`${topicPath}/progress.yaml`, data, "Topic Progress");

      // Award points
      await addPointsInternal(pointsAwarded, `${type}_complete`, topic, {
        [type]: itemId,
        level,
      });

      // Calculate level completion status
      const courses = levelData.courses || [];
      const completedCourses = courses.filter(c => c.completed).length;

      let mandatoryExercises = 0;
      let completedMandatory = 0;
      for (const exercises of Object.values(levelData.exercices || {})) {
        mandatoryExercises += exercises.filter(e => e.mandatory).length;
        completedMandatory += exercises.filter(e => e.mandatory && e.completed).length;
      }

      const levelComplete =
        completedCourses === courses.length &&
        completedMandatory === mandatoryExercises &&
        (levelData.quizPassed || !levelData.quizRequired);

      return jsonResponse({
        success: true,
        item: itemId,
        type,
        pointsAwarded,
        levelProgress: {
          completion: Math.round((completedCourses / courses.length) * 100),
          remaining: {
            courses: courses.length - completedCourses,
            mandatoryExercises: mandatoryExercises - completedMandatory,
            quizPassed: levelData.quizPassed || !levelData.quizRequired,
          },
        },
        levelComplete,
        message: `${type === "course" ? "Course" : "Exercise"} completed! +${pointsAwarded} points`,
      });
    }
  );

  /**
   * Get next action suggestion
   */
  server.tool(
    "getNextAction",
    `Get a smart suggestion for what the user should do next.
     Use this to guide the learning flow.`,
    {
      topic: z.string().describe("Topic name"),
    },
    async ({ topic }) => {
      const topicPath = `src/${topic}`;
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!result.success) {
        return jsonResponse({ success: false, error: `Topic "${topic}" not found` });
      }

      const data = result.data!;

      // No level set yet
      if (!data.current_level) {
        return jsonResponse({
          success: true,
          topic,
          nextAction: {
            type: "select_level",
            message: "Select your starting level: starter, beginner, advanced, or expert",
          },
        });
      }

      const level = data.current_level;
      const levelData = data.roadmap[level];

      if (!levelData || !levelData.courses || levelData.courses.length === 0) {
        return jsonResponse({
          success: true,
          topic,
          currentLevel: level,
          nextAction: {
            type: "generate_roadmap",
            message: "Generate a roadmap for this level",
          },
        });
      }

      // Find incomplete course
      const incompleteCourse = levelData.courses.find(c => !c.completed);
      if (incompleteCourse) {
        return jsonResponse({
          success: true,
          topic,
          currentLevel: level,
          nextAction: {
            type: "course",
            id: incompleteCourse.id,
            name: incompleteCourse.name,
            path: `${topicPath}/courses/${level}/${incompleteCourse.id}.md`,
            message: `Continue with course: ${incompleteCourse.name}`,
          },
          alternatives: [
            { type: "quiz", message: "Or take a quiz to test your knowledge" },
          ],
        });
      }

      // All courses done - check mandatory exercises
      for (const [courseId, exercises] of Object.entries(levelData.exercices || {})) {
        const incompleteExercise = exercises.find(e => e.mandatory && !e.completed);
        if (incompleteExercise) {
          return jsonResponse({
            success: true,
            topic,
            currentLevel: level,
            nextAction: {
              type: "exercise",
              id: incompleteExercise.id,
              course: courseId,
              name: incompleteExercise.name,
              path: `${topicPath}/exercices/${level}/${courseId}/${incompleteExercise.id}`,
              message: `Complete exercise: ${incompleteExercise.name}`,
            },
          });
        }
      }

      // All courses and mandatory exercises done - need quiz
      if (levelData.quizRequired && !levelData.quizPassed) {
        return jsonResponse({
          success: true,
          topic,
          currentLevel: level,
          nextAction: {
            type: "quiz",
            level,
            message: "Take the level quiz to earn your badge!",
          },
        });
      }

      // Level complete - unlock next
      const currentIndex = LEVELS.indexOf(level);
      if (currentIndex < LEVELS.length - 1) {
        return jsonResponse({
          success: true,
          topic,
          currentLevel: level,
          nextAction: {
            type: "next_level",
            nextLevel: LEVELS[currentIndex + 1],
            message: `Level complete! Ready for ${LEVELS[currentIndex + 1]}?`,
          },
        });
      }

      // Topic mastery achieved
      return jsonResponse({
        success: true,
        topic,
        currentLevel: level,
        nextAction: {
          type: "mastery",
          message: "Congratulations! You've mastered this topic!",
        },
      });
    }
  );
}

async function getOverallProgress() {
  // Implementation for overall progress across all topics
  const topics: any[] = [];
  // ... similar to listTopics with progress

  const trainerResult = await readYaml<TrainerData>("trainer.yaml");
  const trainer = trainerResult.success ? trainerResult.data : null;

  return jsonResponse({
    success: true,
    trainer: trainer ? {
      name: trainer.trainer,
      rank: trainer.rank,
      totalPoints: trainer.total_points,
    } : null,
    topics,
  });
}

async function addPointsInternal(
  points: number,
  action: string,
  topic: string,
  details: any
) {
  const result = await readYaml<TrainerData>("trainer.yaml");
  if (!result.success) return;

  const data = result.data!;
  data.total_points += points;

  // Add to history
  if (!data.point_history) data.point_history = [];
  data.point_history.push({
    date: new Date().toISOString().split("T")[0],
    action,
    topic,
    points: `+${points}`,
    ...details,
  });

  // Check for rank promotion
  const newRank = calculateRank(data.total_points);
  if (newRank !== data.rank) {
    data.rank = newRank;
  }

  await writeYaml("trainer.yaml", data, "Professor Oak - Trainer Profile");
}

function calculateRank(points: number): string {
  if (points >= 10000) return "Pokemon Master";
  if (points >= 5000) return "Expert Trainer";
  if (points >= 2000) return "Great Trainer";
  if (points >= 500) return "Pokemon Trainer";
  return "Rookie Trainer";
}

function jsonResponse(data: any) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}
```

### 4.6 Constants Configuration

**File: `mcp/professor-oak-mcp/src/config/constants.ts`**
```typescript
/**
 * Game Constants
 *
 * All point values, tier configurations, and static game data.
 */

// Valid levels in order
export const LEVELS = ["starter", "beginner", "advanced", "expert"] as const;
export type Level = typeof LEVELS[number];

// Point values
export const POINTS = {
  COURSE_COMPLETE: 25,
  EXERCISE_OPTIONAL: 15,
  EXERCISE_MANDATORY: 30,
  EXTRA_LEARNING: 15,
  EXTRA_WITH_QUIZ: 30,
  BADGE_EARNED: 500,
  LEVEL_COMPLETE: 200,
  POKEMON_EVOLVED: 100,
  FIRST_LEGENDARY: 500,
  LEGENDARY_PERFECT: 200,
  LEGENDARY_COLLECTION_5: 1000,
} as const;

// Quiz tiers
export const QUIZ_TIERS = {
  1: { questions: 3, passRate: 0.66, base: 15, catchBonus: 25, perCorrect: 3 },
  2: { questions: 4, passRate: 0.75, base: 25, catchBonus: 35, perCorrect: 4 },
  3: { questions: 5, passRate: 0.80, base: 35, catchBonus: 50, perCorrect: 5 },
  4: { questions: 6, passRate: 0.83, base: 50, catchBonus: 75, perCorrect: 6 },
  5: { questions: 8, passRate: 0.87, base: 100, catchBonus: 150, perCorrect: 10 },
} as const;

// Level to tier mapping
export const LEVEL_TIERS: Record<Level, [number, number]> = {
  starter: [1, 2],
  beginner: [2, 3],
  advanced: [3, 4],
  expert: [4, 5],
};

// Pokemon complexity tiers (base stat total ranges)
export const POKEMON_TIERS = {
  1: { min: 0, max: 300, name: "Easy" },
  2: { min: 300, max: 400, name: "Medium" },
  3: { min: 400, max: 500, name: "Hard" },
  4: { min: 500, max: 600, name: "Expert" },
  5: { min: 600, max: 999, name: "Legendary" },
} as const;

// Trainer ranks
export const TRAINER_RANKS = [
  { name: "Rookie Trainer", minPoints: 0 },
  { name: "Pokemon Trainer", minPoints: 500 },
  { name: "Great Trainer", minPoints: 2000 },
  { name: "Expert Trainer", minPoints: 5000 },
  { name: "Pokemon Master", minPoints: 10000 },
] as const;

// Gym leaders per level
export const GYM_LEADERS: Record<Level, { name: string; badge: string }> = {
  starter: { name: "Brock", badge: "Boulder Badge" },
  beginner: { name: "Misty", badge: "Cascade Badge" },
  advanced: { name: "Lt. Surge", badge: "Thunder Badge" },
  expert: { name: "Sabrina", badge: "Marsh Badge" },
};

// Validation helpers
export function isValidKebabCase(str: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

export function isValidLevel(level: string): level is Level {
  return LEVELS.includes(level as Level);
}
```

---

## 5. Phase 3: Commands & Personas

### 5.1 Command Files

**File: `.claude/commands/learn.md`**
```markdown
Start or continue a learning journey with Professor Oak.

## Arguments
- Topic: $ARGUMENTS (required for new topics, optional to continue)

## Flow

1. **If no argument provided:**
   - Call `listTopics({ includeProgress: true })`
   - Show topics list and ask which to continue

2. **If argument provided:**
   - Call `getTopic("$ARGUMENTS")`
   - If topic doesn't exist:
     - Call `getPersona("professor-oak", {})`
     - Adopt Professor Oak persona
     - Call `createTopic("$ARGUMENTS")`
     - Ask user for level preference (starter/beginner/advanced/expert)
     - Call `initializeLevel(topic, level)`
     - Generate roadmap based on topic and level
     - Call `setRoadmap()` with generated roadmap
     - Generate first course content
   - If topic exists:
     - Call `getPersona("professor-oak", { topic: "$ARGUMENTS" })`
     - Call `getNextAction("$ARGUMENTS")`
     - Present next step with Professor Oak persona

## Persona
Adopt Professor Oak's warm, wise personality. See personas/professor-oak.md
```

**File: `.claude/commands/progress.md`**
```markdown
Check learning progress with Nurse Joy.

## Arguments
- Topic: $ARGUMENTS (optional - shows all topics if omitted)

## Flow

1. Call `getPersona("nurse-joy", {})`
2. Adopt Nurse Joy persona
3. If no argument:
   - Call `getProgress()` for overall stats
   - Show trainer stats, all topics, badges, Pokemon count
4. If topic provided:
   - Call `getProgress("$ARGUMENTS")`
   - Show detailed topic progress with level breakdown

## Display Format
```
Nurse Joy: "Let me check your progress, trainer!"

[Overall Stats Bar]
Trainer: Tom | Rank: Pokemon Trainer | Points: 1,250

[Topic Bars with Completion %]
Docker      ████████░░ 80%  [Beginner] Badges: 2
Python      ██████░░░░ 60%  [Advanced] Badges: 3
```

## Persona
Adopt Nurse Joy's caring, supportive personality. See personas/nurse-joy.md
```

**File: `.claude/commands/quiz.md`**
```markdown
Take a quiz to catch Pokemon and prove your knowledge.

## Arguments
- $ARGUMENTS: [topic] [course] (optional)

## Flow

1. Parse arguments to determine quiz scope
2. Call `startQuiz({ topic, course, type: "standard" })`
3. Get the appropriate Gym Leader:
   - Call `getPersona("gym-leader", { level: [from startQuiz response] })`
4. Adopt Gym Leader persona (Brock/Misty/Lt. Surge/Sabrina)
5. Display Pokemon encounter and quiz parameters
6. Generate questions based on course content
7. Use interactive questioning to administer quiz
8. Call `submitQuizResult({ sessionId, answers })`
9. Display result:
   - **PASS:** Show Pokemon catch ceremony, update Pokedex
   - **FAIL:** Transition to Nurse Joy for encouragement

## Quiz Format
```
Gym Leader: "I am [Name]! A wild [POKEMON] appeared!"

Q1/4: [Question]
A) Option 1
B) Option 2
C) Option 3
D) Option 4

[User selects answer]
```

## Personas
- Gym Leaders: See personas/gym-leaders/[name].md
- On failure: Transition to Nurse Joy
```

### 5.2 Persona Files

**File: `personas/professor-oak.md`**
```markdown
# Professor Oak

You are Professor Oak, the world-renowned Pokemon Professor and learning mentor.

## Role
Guide trainers through their learning journey, help them discover new topics, organize their knowledge, and celebrate their progress.

## Personality
- Warm, wise, and encouraging
- Uses Pokemon metaphors naturally
- Gets excited about new discoveries
- Patient with beginners, challenging with experts

## Speech Patterns
- "Ah!" and "Excellent!" as exclamations
- References to Pokemon world (regions, catching, training)
- Asks thoughtful questions to guide learning
- "Your Pokedex grows stronger!"
- "Every trainer starts somewhere"
- "Knowledge is like a Pokemon - it evolves with care"

## Behaviors

### When creating topics
"Ah! A new region to explore! Let me help you map out your journey through [TOPIC]."

### When saving extras
"What a fascinating discovery! I'll add this to your Pokedex immediately!"

### When suggesting next steps
"Your journey continues! The path ahead leads to [NEXT_STEP]."

### Always
End with encouragement or a hint about what's ahead.

## MCP Tools Available
All professor-oak-mcp tools for topic management, progress, and learning.

## Example Dialogue

**New Topic:**
"Ah, welcome trainer! So you wish to explore the region of Docker? Excellent choice!
Every great journey begins with a single step. Tell me - are you a complete newcomer
to this land, or do you have some experience already?

Let's assess your starting point:
- Starter: No prior knowledge
- Beginner: Know the basics
- Advanced: Solid foundation
- Expert: Deep experience"

**Continuing:**
"Welcome back, trainer! I see you've been making excellent progress in Docker.
Your last course was on container networking - shall we continue from there?"
```

**File: `personas/gym-leaders/brock.md`**
```markdown
# Brock - Starter Level Gym Leader

You are Brock, the Gym Leader of Pewter City.

## Role
Test trainers with quizzes on starter-level knowledge and award the Boulder Badge.

## Personality
- Firm but fair
- Welcoming to new trainers
- Focus on rock-solid fundamentals
- Respects effort and dedication

## Speech Patterns
- "I am Brock! I believe in rock-solid defense!"
- "Your knowledge is impressive, trainer!"
- "Don't give up! Even rocks can be worn down with persistence."
- "I believe in building a strong foundation!"

## Quiz Behavior
1. Present questions clearly
2. Acknowledge correct answers briefly ("Solid answer!")
3. Provide brief explanations for wrong answers
4. Award badges with ceremony

## Badge: Boulder Badge
Level: Starter
Points: +500

## Ceremony (on badge earn)
```
Gym Leader Brock steps forward...

"I am Brock, the Pewter City Gym Leader!
Your [TOPIC] fundamentals are rock-solid!"

*Brock presents the Boulder Badge*

You earned the BOULDER BADGE!

"This badge proves you've mastered the basics.
The path ahead grows steeper, but you're ready!"

+500 points
Beginner level unlocked!
```

## On Pass
"Excellent work, trainer! Your knowledge is rock-solid! Take this Boulder Badge!"

## On Fail
"Your skills need more training. Come back when you're ready, trainer!"
```

---

## 6. Phase 4: Game Mechanics

### 6.1 Quiz Tools Implementation

**File: `mcp/professor-oak-mcp/src/tools/quiz.ts`**
```typescript
/**
 * Quiz Tools
 *
 * Tools for managing quizzes and Pokemon catching.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readYaml, writeYaml } from "../services/yaml.js";
import { QUIZ_TIERS, LEVEL_TIERS, GYM_LEADERS, POINTS } from "../config/constants.js";
import { v4 as uuidv4 } from "uuid";

// In-memory session storage (could be file-based for persistence)
const quizSessions = new Map<string, QuizSession>();

interface QuizSession {
  sessionId: string;
  topic: string;
  course: string | null;
  level: string;
  type: "standard" | "wild";
  pokemon: {
    pokedexNumber: number;
    name: string;
    tier: number;
  };
  parameters: {
    questionCount: number;
    passThreshold: number;
    passCount: number;
  };
  startedAt: string;
}

export function registerQuizTools(server: McpServer) {

  /**
   * Start a quiz session
   */
  server.tool(
    "startQuiz",
    `Initialize a new quiz session. Returns Pokemon, parameters, and context for question generation.
     Claude generates questions based on the returned context.`,
    {
      topic: z.string().describe("Topic name"),
      course: z.string().optional().describe("Specific course (optional - random if omitted)"),
      type: z.enum(["standard", "wild"]).default("standard"),
    },
    async ({ topic, course, type }) => {
      const topicPath = `src/${topic}`;
      const progressResult = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

      if (!progressResult.success) {
        return jsonResponse({ success: false, error: `Topic "${topic}" not found` });
      }

      const progress = progressResult.data!;
      const level = progress.current_level;

      if (!level) {
        return jsonResponse({ success: false, error: "No level set for this topic" });
      }

      // Determine tier based on level
      const [minTier, maxTier] = LEVEL_TIERS[level as keyof typeof LEVEL_TIERS];
      const tier = Math.floor(Math.random() * (maxTier - minTier + 1)) + minTier;

      // Select a Pokemon (simplified - could call PokeAPI MCP)
      const pokemon = selectPokemonForTier(tier);

      // Get quiz parameters
      const params = QUIZ_TIERS[tier as keyof typeof QUIZ_TIERS];

      // Create session
      const sessionId = `quiz-${new Date().toISOString().split("T")[0]}-${uuidv4().slice(0, 8)}`;
      const session: QuizSession = {
        sessionId,
        topic,
        course: course || null,
        level,
        type,
        pokemon: {
          pokedexNumber: pokemon.id,
          name: pokemon.name,
          tier,
        },
        parameters: {
          questionCount: params.questions,
          passThreshold: Math.round(params.passRate * 100),
          passCount: Math.ceil(params.questions * params.passRate),
        },
        startedAt: new Date().toISOString(),
      };

      quizSessions.set(sessionId, session);

      // Calculate max points
      const maxPoints = params.base + params.catchBonus + (params.questions * params.perCorrect);

      return jsonResponse({
        success: true,
        sessionId,
        type,
        topic,
        course: course || "level-wide",
        level,
        pokemon: {
          pokedexNumber: pokemon.id,
          name: pokemon.name,
          sprite: pokemon.sprite,
          tier,
          tierName: ["Easy", "Medium", "Hard", "Expert", "Legendary"][tier - 1],
        },
        parameters: {
          questionCount: params.questions,
          passThreshold: session.parameters.passThreshold,
          passCount: session.parameters.passCount,
        },
        gymLeader: GYM_LEADERS[level as keyof typeof GYM_LEADERS],
        points: {
          base: params.base,
          catchBonus: params.catchBonus,
          perCorrect: params.perCorrect,
          maxPossible: maxPoints,
        },
        context: {
          coursePath: course
            ? `${topicPath}/courses/${level}/${course}.md`
            : `${topicPath}/courses/${level}/`,
          knowledgeScope: "Generate questions based on course content",
        },
      });
    }
  );

  /**
   * Submit quiz result
   */
  server.tool(
    "submitQuizResult",
    `Record quiz completion and process rewards.
     Returns catch result, points, and level progress.`,
    {
      sessionId: z.string().describe("Quiz session ID from startQuiz"),
      answers: z.object({
        total: z.number(),
        correct: z.number(),
        details: z.array(z.object({
          question: z.number(),
          correct: z.boolean(),
        })).optional(),
      }),
    },
    async ({ sessionId, answers }) => {
      const session = quizSessions.get(sessionId);

      if (!session) {
        return jsonResponse({ success: false, error: "Quiz session not found" });
      }

      const { topic, level, pokemon, type, parameters } = session;
      const tier = pokemon.tier as keyof typeof QUIZ_TIERS;
      const params = QUIZ_TIERS[tier];

      const passed = answers.correct >= parameters.passCount;
      const perfect = answers.correct === answers.total;

      // Calculate points
      let points = 0;
      if (passed) {
        points = params.base + params.catchBonus + (answers.correct * params.perCorrect);
        if (perfect) points += 50; // Perfect bonus
        if (type === "wild") points = Math.round(points * 1.5);
      } else {
        points = Math.round(params.base * 0.4) + (answers.correct * 2);
        if (type === "wild") points = Math.round(points * 0.3);
      }

      // Record in quiz history
      await recordQuizHistory(session, answers, passed, points);

      // Award points
      await addPointsInternal(
        points,
        passed ? "quiz_pass" : "quiz_fail",
        topic,
        { pokemon: pokemon.name, score: `${answers.correct}/${answers.total}` }
      );

      // If passed, add Pokemon to Pokedex
      if (passed) {
        await addPokemonToPokedex(pokemon, session);
      }

      // Clean up session
      quizSessions.delete(sessionId);

      if (passed) {
        return jsonResponse({
          success: true,
          sessionId,
          passed: true,
          score: {
            correct: answers.correct,
            total: answers.total,
            percentage: Math.round((answers.correct / answers.total) * 100),
          },
          pokemon: {
            caught: true,
            name: pokemon.name,
            pokedexNumber: pokemon.pokedexNumber,
            message: `Gotcha! ${pokemon.name.toUpperCase()} was caught!`,
          },
          points: {
            earned: points,
            breakdown: {
              base: params.base,
              catchBonus: params.catchBonus,
              correctAnswers: answers.correct * params.perCorrect,
              ...(perfect && { perfectBonus: 50 }),
              ...(type === "wild" && { wildMultiplier: 1.5 }),
            },
          },
          gymLeader: {
            name: GYM_LEADERS[level as keyof typeof GYM_LEADERS].name,
            message: "Excellent work, trainer! Your knowledge is impressive!",
          },
        });
      } else {
        return jsonResponse({
          success: true,
          sessionId,
          passed: false,
          score: {
            correct: answers.correct,
            total: answers.total,
            percentage: Math.round((answers.correct / answers.total) * 100),
          },
          pokemon: {
            caught: false,
            name: pokemon.name,
            message: `Oh no! ${pokemon.name.toUpperCase()} fled...`,
          },
          points: {
            earned: points,
          },
          nurseJoy: {
            message: "Don't worry, trainer! Let's review what you missed.",
            suggestions: [], // Could add specific review suggestions
          },
          retryAvailable: true,
        });
      }
    }
  );
}

// Helper functions
function selectPokemonForTier(tier: number) {
  // Simplified Pokemon selection - in production, call PokeAPI MCP
  const pokemonByTier: Record<number, Array<{ id: number; name: string; sprite: string }>> = {
    1: [
      { id: 16, name: "Pidgey", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/16.png" },
      { id: 19, name: "Rattata", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/19.png" },
    ],
    2: [
      { id: 4, name: "Charmander", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
      { id: 25, name: "Pikachu", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
    ],
    3: [
      { id: 6, name: "Charizard", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png" },
      { id: 130, name: "Gyarados", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/130.png" },
    ],
    4: [
      { id: 149, name: "Dragonite", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/149.png" },
      { id: 248, name: "Tyranitar", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/248.png" },
    ],
    5: [
      { id: 150, name: "Mewtwo", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png" },
      { id: 384, name: "Rayquaza", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/384.png" },
    ],
  };

  const options = pokemonByTier[tier] || pokemonByTier[2];
  return options[Math.floor(Math.random() * options.length)];
}

async function recordQuizHistory(session: QuizSession, answers: any, passed: boolean, points: number) {
  const month = new Date().toISOString().slice(0, 7);
  const historyPath = `quiz-history/${month}.yaml`;

  let history = { month, entries: [] as any[] };
  const result = await readYaml<typeof history>(historyPath);
  if (result.success) {
    history = result.data!;
  }

  history.entries.push({
    session_id: session.sessionId,
    date: new Date().toISOString().split("T")[0],
    topic: session.topic,
    course: session.course,
    level: session.level,
    type: session.type,
    pokemon: session.pokemon,
    result: {
      questions: answers.total,
      correct: answers.correct,
      passed,
      points_earned: points,
    },
    gym_leader: GYM_LEADERS[session.level as keyof typeof GYM_LEADERS]?.name,
  });

  await writeYaml(historyPath, history, "Quiz History");
}

async function addPokemonToPokedex(pokemon: any, session: QuizSession) {
  const result = await readYaml<PokedexData>("pokedex.yaml");
  if (!result.success) return;

  const pokedex = result.data!;
  const pokemonId = `pokemon-${String(pokedex.pokemon.length + 1).padStart(3, "0")}`;

  pokedex.pokemon.push({
    id: pokemonId,
    pokedex_number: pokemon.pokedexNumber,
    name: pokemon.name,
    sprites: { front: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokedexNumber}.png` },
    topic: session.topic,
    course: session.course,
    level: session.level,
    tier: pokemon.tier,
    caught_at: new Date().toISOString().split("T")[0],
    caught_during: session.type,
  });

  pokedex.stats.total_caught++;
  pokedex.stats.by_topic[session.topic] = (pokedex.stats.by_topic[session.topic] || 0) + 1;

  await writeYaml("pokedex.yaml", pokedex, "Professor Oak - Pokedex");
}

function jsonResponse(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}
```

---

## 7. Phase 5: Polish & Extras

### 7.1 Remaining Tools

| Tool | Priority | File |
|------|----------|------|
| `evolvePokemon` | P3 | tools/pokedex.ts |
| `createExtraLearning` | P3 | tools/topic.ts |
| `listExtras` | P3 | tools/topic.ts |
| `generateBadgeAsset` | P3 | tools/rewards.ts |
| `resetProgress` | P3 | tools/progress.ts |

### 7.2 Wild Encounter Command

**File: `.claude/commands/wild.md`**
```markdown
Trigger a random wild Pokemon encounter!

## Arguments
None

## Flow

1. Call `listTopics()` to get user's topics
2. Select random topic with progress
3. Call `startQuiz({ topic, type: "wild" })`
4. Call `getPersona("wild-encounter", {})`
5. Adopt wild encounter narrator style
6. Quick 3-question quiz format
7. Higher risk/reward scoring:
   - Pass: Points x 1.5
   - Fail: Points x 0.3
8. Call `submitQuizResult()`

## Display Format
```
*rustling in the tall grass*

A wild PIKACHU appeared!
Difficulty: **

Quick! Answer correctly to catch it!

Q1/3: [Question]
```

## Persona
Dramatic, exciting narrator style. See personas/wild-encounter.md
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File: `mcp/professor-oak-mcp/src/__tests__/yaml.test.ts`**
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readYaml, writeYaml, fileExists } from "../services/yaml.js";
import * as fs from "fs/promises";
import * as path from "path";

const TEST_DATA_PATH = "/tmp/professor-oak-test";

describe("YAML Service", () => {
  beforeEach(async () => {
    process.env.DATA_PATH = TEST_DATA_PATH;
    await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  });

  it("should write and read YAML files", async () => {
    const data = { name: "test", value: 42 };
    await writeYaml("test.yaml", data);

    const result = await readYaml<typeof data>("test.yaml");
    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
  });

  it("should handle missing files gracefully", async () => {
    const result = await readYaml("nonexistent.yaml");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to read");
  });

  it("should check file existence", async () => {
    expect(await fileExists("test.yaml")).toBe(false);
    await writeYaml("test.yaml", { test: true });
    expect(await fileExists("test.yaml")).toBe(true);
  });
});
```

### 8.2 Integration Tests

```typescript
// Test the full topic creation flow
describe("Topic Creation Flow", () => {
  it("should create topic with full structure", async () => {
    // Call createTopic
    // Verify folder structure
    // Verify progress.yaml initialized
    // Verify rewards.yaml initialized
  });

  it("should prevent duplicate topics", async () => {
    // Create topic
    // Try to create again
    // Verify error returned
  });
});
```

### 8.3 Mock Data

**File: `mcp/professor-oak-mcp/src/__tests__/fixtures/trainer.yaml`**
```yaml
version: 1
trainer: TestUser
started_at: "2026-01-01"
total_points: 500
rank: "Pokemon Trainer"
settings:
  wild_encounters: true
point_history:
  - date: "2026-01-01"
    action: quiz_pass
    topic: docker
    points: "+72"
```

### 8.4 Manual Testing

```bash
# 1. Build the MCP server
cd mcp/professor-oak-mcp
npm run build

# 2. Test with JSON-RPC
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | docker run --rm -i professor-oak-mcp

# 3. Test specific tool
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"listTopics","arguments":{}}}' | docker run --rm -i -v $(pwd):/data professor-oak-mcp

# 4. Debug with Claude Code
claude --mcp-debug
```

---

## 9. TypeScript Interfaces

### 9.1 Core Types

**File: `mcp/professor-oak-mcp/src/types/index.ts`**
```typescript
// Re-export all types
export * from "./topic.js";
export * from "./progress.js";
export * from "./trainer.js";
export * from "./pokedex.js";
export * from "./quiz.js";
export * from "./rewards.js";
```

**File: `mcp/professor-oak-mcp/src/types/progress.ts`**
```typescript
export interface TopicProgress {
  version: number;
  topic: string;
  display_name: string;
  description: string;
  created_at: string;
  current_level: string | null;
  roadmap: Record<string, LevelRoadmap>;
  progress: Record<string, any>;
  extras: ExtraLearning[];
}

export interface LevelRoadmap {
  status: "pending" | "active" | "completed";
  courses: CourseProgress[];
  exercices: Record<string, ExerciseProgress[]>;
  quizRequired?: boolean;
  quizPassed?: boolean;
  completed_at?: string;
}

export interface CourseProgress {
  id: string;
  name: string;
  mandatory: boolean;
  completed: boolean;
  completed_at?: string;
}

export interface ExerciseProgress {
  id: string;
  name: string;
  mandatory: boolean;
  completed: boolean;
  completed_at?: string;
}

export interface ExtraLearning {
  id: string;
  name: string;
  display_name: string;
  tags: string[];
  created_at: string;
  has_pokemon: boolean;
}
```

**File: `mcp/professor-oak-mcp/src/types/trainer.ts`**
```typescript
export interface TrainerData {
  version: number;
  trainer: string | null;
  started_at: string | null;
  total_points: number;
  rank: string;
  settings: TrainerSettings;
  achievements: TrainerAchievements;
  point_history: PointHistoryEntry[];
}

export interface TrainerSettings {
  wild_encounters: boolean;
  notifications: boolean;
}

export interface TrainerAchievements {
  first_pokemon: string | null;
  first_badge: string | null;
  first_legendary: string | null;
}

export interface PointHistoryEntry {
  date: string;
  action: string;
  topic: string;
  points: string;
  pokemon?: string;
  badge?: string;
  level?: string;
  course?: string;
  exercise?: string;
}
```

**File: `mcp/professor-oak-mcp/src/types/pokedex.ts`**
```typescript
export interface PokedexData {
  version: number;
  trainer: string | null;
  created_at: string | null;
  pokemon: PokemonEntry[];
  stats: PokedexStats;
}

export interface PokemonEntry {
  id: string;
  pokedex_number: number;
  name: string;
  sprites: {
    front: string;
    back?: string;
    shiny?: string;
  };
  topic: string;
  course: string | null;
  level: string;
  title?: string;
  summary?: string;
  key_points?: string[];
  tier: number;
  caught_at: string;
  caught_during: "quiz" | "wild";
  quiz_score?: string;
  points_earned?: number;
  gym_leader?: string;
  evolved_from?: string;
  evolved_to?: string;
  evolved_at?: string;
}

export interface PokedexStats {
  total_caught: number;
  total_evolved: number;
  legendaries: number;
  by_topic: Record<string, number>;
}
```

---

## 10. File Templates

### 10.1 Course Placeholder

**Template: Course file created by `setRoadmap`**
```markdown
# [Course Display Name]

> This course is part of the [Topic] [Level] curriculum.

## Learning Objectives

By the end of this course, you will:
- [ ] Objective 1
- [ ] Objective 2
- [ ] Objective 3

## Content

[Course content to be generated by Claude]

---

*Course content will be generated based on your roadmap.*
```

### 10.2 Exercise Placeholder

**Template: Exercise file created by `setRoadmap`**
```markdown
# Exercise: [Exercise Name]

## Objective

[What the learner should accomplish]

## Instructions

1. Step 1
2. Step 2
3. Step 3

## Expected Result

[What success looks like]

## Hints

<details>
<summary>Hint 1</summary>
[First hint]
</details>

---

*Use the `sandbox/` folder to work on this exercise.*
*Check `result/` for the expected solution.*
```

### 10.3 Progress YAML

**Template: `progress.yaml` for new topic**
```yaml
version: 1
topic: [topic-name]
display_name: "[Topic Display Name]"
description: "[Short description]"
created_at: [YYYY-MM-DD]
current_level: null

roadmap: {}

progress: {}

extras: []
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create folder structure
- [ ] Set up devcontainer for MCP
- [ ] Create TypeScript project with dependencies
- [ ] Write CLAUDE.md with all rules
- [ ] Create .claudeignore
- [ ] Initialize trainer.yaml
- [ ] Initialize pokedex.yaml
- [ ] Create persona files (Professor Oak, Nurse Joy, Gym Leaders)

### Phase 2: Core MCP
- [ ] Implement YAML service
- [ ] Implement Topic tools (createTopic, getTopic, listTopics, initializeLevel, setRoadmap)
- [ ] Implement Progress tools (getProgress, completeItem, getNextAction)
- [ ] Implement Trainer tools (getTrainer, addPoints, getRank)
- [ ] Write unit tests for each tool
- [ ] Build and test Docker image

### Phase 3: Commands & Personas
- [ ] Create /learn command
- [ ] Create /progress command
- [ ] Create /quiz command
- [ ] Implement getPersona tool
- [ ] Test persona adoption in Claude Code

### Phase 4: Game Mechanics
- [ ] Implement Quiz tools (startQuiz, submitQuizResult)
- [ ] Implement Pokedex tools (getPokedex, addPokemon)
- [ ] Implement Rewards tools (awardBadge, getBadges)
- [ ] Create /pokedex command
- [ ] Test full quiz flow with Pokemon catching

### Phase 5: Polish
- [ ] Implement wild encounters (/wild command)
- [ ] Implement extra learnings (/save, /extras)
- [ ] Implement evolution mechanics
- [ ] Implement /reset command
- [ ] Badge SVG generation (optional)
- [ ] Integration testing
- [ ] Documentation updates

---

## Next Steps

1. **Start with Phase 1** - Set up the project structure and devcontainer
2. **Build MVP** - Implement Topic + Progress tools for basic `/learn` flow
3. **Test Early** - Get the MCP server working with Claude Code as soon as possible
4. **Iterate** - Add game mechanics incrementally based on usage

The MVP goal is to have:
- `/learn docker` creates topic, asks for level, generates roadmap
- `/progress` shows what's been learned
- Claude can write course content and mark items complete

Once MVP works, add quiz system for the full gamification experience.

---

*End of Implementation Plan*
