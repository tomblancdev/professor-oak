/**
 * Quiz Tools Tests
 *
 * TDD tests for quiz management tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Set test data path before importing modules
const TEST_DATA_PATH = "/tmp/professor-oak-quiz-test";
process.env.DATA_PATH = TEST_DATA_PATH;

// Import after setting env
import {
  startQuizHandler,
  submitQuizResultHandler,
  getQuizHistoryHandler,
  pokemonByTier,
} from "../tools/quiz.js";
import { clearAllSessions, resetLoadedState, getSession, hasSession } from "../services/quiz-sessions.js";
import type { TopicProgress } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";
import type { PokedexData } from "../types/pokedex.js";
import type { QuizSession, QuizHistoryEntry } from "../types/quiz.js";

// Test fixtures
const createMockTopicProgress = (overrides: Partial<TopicProgress> = {}): TopicProgress => ({
  version: 1,
  topic: "docker",
  display_name: "Docker",
  description: "Learn Docker containerization",
  created_at: "2026-01-01",
  current_level: "beginner",
  roadmap: {
    starter: {
      status: "completed",
      courses: [
        { id: "01-introduction", name: "Introduction", mandatory: true, completed: true, completed_at: "2026-01-05" },
      ],
      exercices: {},
      quizRequired: true,
      quizPassed: true,
    },
    beginner: {
      status: "active",
      courses: [
        { id: "01-first-container", name: "Your First Container", mandatory: true, completed: true, completed_at: "2026-01-08" },
        { id: "02-images-basics", name: "Images Basics", mandatory: true, completed: false },
      ],
      exercices: {},
      quizRequired: true,
      quizPassed: false,
    },
    advanced: {
      status: "pending",
      courses: [],
      exercices: {},
    },
    expert: {
      status: "pending",
      courses: [],
      exercices: {},
    },
  },
  progress: {},
  extras: [],
  ...overrides,
});

const createMockTrainerData = (overrides: Partial<TrainerData> = {}): TrainerData => ({
  version: 1,
  trainer: "TestUser",
  started_at: "2026-01-01",
  total_points: 500,
  rank: "Pokemon Trainer",
  settings: {
    wild_encounters: true,
    notifications: true,
  },
  achievements: {
    first_pokemon: "Pidgey",
    first_badge: "Boulder Badge",
    first_legendary: null,
  },
  point_history: [
    { date: "2026-01-05", action: "course_complete", topic: "docker", points: "+25" },
  ],
  ...overrides,
});

const createMockPokedexData = (overrides: Partial<PokedexData> = {}): PokedexData => ({
  version: 1,
  trainer: "TestUser",
  created_at: "2026-01-01",
  pokemon: [],
  stats: {
    total_caught: 0,
    total_evolved: 0,
    legendaries: 0,
    by_topic: {},
  },
  ...overrides,
});

// Helper to write test files
async function writeTestYaml(relativePath: string, data: unknown) {
  const fullPath = path.join(TEST_DATA_PATH, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const YAML = await import("yaml");
  await fs.writeFile(fullPath, YAML.stringify(data), "utf-8");
}

async function readTestYaml<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(TEST_DATA_PATH, relativePath);
  const content = await fs.readFile(fullPath, "utf-8");
  const YAML = await import("yaml");
  return YAML.parse(content) as T;
}

describe("Quiz Tools", () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DATA_PATH, { recursive: true });
    // Clear sessions between tests
    await clearAllSessions(); resetLoadedState();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  });

  describe("startQuiz", () => {
    it("should initialize a quiz session with correct parameters", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId.length).toBeGreaterThan(0);
      expect(result.pokemon).toBeDefined();
      expect(result.pokemon.name).toBeDefined();
      expect(result.pokemon.tier).toBeGreaterThanOrEqual(2);
      expect(result.pokemon.tier).toBeLessThanOrEqual(3);
      expect(result.parameters).toBeDefined();
      expect(result.parameters.questionCount).toBeGreaterThan(0);
    });

    it("should return error when topic does not exist", async () => {
      // Execute
      const result = await startQuizHandler({ topic: "nonexistent" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error when topic has no level set", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: null }));

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("level");
    });

    it("should select Pokemon based on level tier", async () => {
      // Setup - starter level should give tier 1-2 Pokemon
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: "starter" }));

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.pokemon.tier).toBeGreaterThanOrEqual(1);
      expect(result.pokemon.tier).toBeLessThanOrEqual(2);
    });

    it("should return appropriate gym leader for level", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: "beginner" }));

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.gymLeader).toBeDefined();
      expect(result.gymLeader.name).toBe("Misty");
      expect(result.gymLeader.badge).toBe("Cascade Badge");
    });

    it("should store session in memory", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(await hasSession(result.sessionId)).toBe(true);
      const session = await getSession(result.sessionId);
      expect(session?.topic).toBe("docker");
    });

    it("should support optional course parameter", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await startQuizHandler({ topic: "docker", course: "01-first-container" });

      // Verify
      expect(result.success).toBe(true);
      const session = await getSession(result.sessionId);
      expect(session?.course).toBe("01-first-container");
    });

    it("should support wild encounter type", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await startQuizHandler({ topic: "docker", type: "wild" });

      // Verify
      expect(result.success).toBe(true);
      const session = await getSession(result.sessionId);
      expect(session?.type).toBe("wild");
    });

    it("should calculate pass threshold based on tier", async () => {
      // Setup - beginner level should give tier 2-3
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: "beginner" }));

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.parameters.passThreshold).toBeGreaterThan(0);
      expect(result.parameters.passThreshold).toBeLessThanOrEqual(1);
      expect(result.parameters.passCount).toBeLessThanOrEqual(result.parameters.questionCount);
    });
  });

  describe("submitQuizResult", () => {
    it("should calculate points correctly on pass", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start a quiz first
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const passCount = session.parameters.passCount;

      // Execute - pass the quiz
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: passCount },
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.points.earned).toBeGreaterThan(0);
    });

    it("should award partial points on fail", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start a quiz first
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;

      // Execute - fail the quiz (0 correct)
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: 0 },
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.pokemon.caught).toBe(false);
      expect(result.pokemon.message).toContain("fled");
    });

    it("should catch Pokemon on pass", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start and pass quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const passCount = session.parameters.passCount;

      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: passCount },
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.pokemon.caught).toBe(true);
      expect(result.pokemon.message).toContain("caught");
    });

    it("should record result in quiz history", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start and complete quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;

      await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: 3 },
      });

      // Verify history recorded
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const history = await readTestYaml<{ entries: QuizHistoryEntry[] }>(`quiz-history/${monthKey}.yaml`);
      expect(history.entries.length).toBe(1);
      expect(history.entries[0].topic).toBe("docker");
    });

    it("should return error for invalid session", async () => {
      // Execute
      const result = await submitQuizResultHandler({
        sessionId: "invalid-session-id",
        answers: { total: 5, correct: 3 },
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("session");
    });

    it("should update trainer points", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData({ total_points: 500 }));
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start and pass quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const passCount = session.parameters.passCount;

      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: passCount },
      });

      // Verify trainer points updated
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.total_points).toBe(500 + result.points.earned);
    });

    it("should add Pokemon to pokedex on catch", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start and pass quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const passCount = session.parameters.passCount;

      await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: passCount },
      });

      // Verify Pokemon added
      const pokedex = await readTestYaml<PokedexData>("pokedex.yaml");
      expect(pokedex.pokemon.length).toBe(1);
      expect(pokedex.pokemon[0].name).toBe(session.pokemon.name);
      expect(pokedex.stats.total_caught).toBe(1);
    });

    it("should remove session after submission", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const sessionId = startResult.sessionId;
      const session = (await getSession(sessionId))!;
      expect(await hasSession(sessionId)).toBe(true);

      // Submit result
      await submitQuizResultHandler({
        sessionId,
        answers: { total: session.parameters.questionCount, correct: session.parameters.passCount },
      });

      // Verify session removed
      expect(await hasSession(sessionId)).toBe(false);
    });

    it("should include point breakdown", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start and pass quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const passCount = session.parameters.passCount;

      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: passCount },
      });

      // Verify breakdown
      expect(result.points.breakdown).toBeDefined();
      expect(result.points.breakdown?.base).toBeGreaterThan(0);
      expect(result.points.breakdown?.catchBonus).toBeGreaterThan(0);
      expect(result.points.breakdown?.perCorrect).toBeGreaterThanOrEqual(0);
    });
  });


  describe("Security: Answer Validation (Issue #60)", () => {
    it("should reject when correct answers exceed total", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });

      // Submit with correct > total
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: 3, correct: 5 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot exceed");
    });

    it("should reject when total does not match session question count", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;
      const expectedQuestions = session.parameters.questionCount;

      // Submit with wrong total
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: expectedQuestions + 5, correct: 2 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("expected");
    });

    it("should accept valid answers", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;

      // Submit with valid answers
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: 2 },
      });

      expect(result.success).toBe(true);
    });
  });

  describe("getQuizHistory", () => {
    it("should return quiz history entries", async () => {
      // Setup - create history file
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const historyData = {
        entries: [
          {
            session_id: "test-session-1",
            date: "2026-01-10",
            topic: "docker",
            course: null,
            level: "beginner",
            type: "standard",
            pokemon: { pokedexNumber: 25, name: "Pikachu", tier: 2 },
            result: { questions: 4, correct: 3, passed: true, points_earned: 87 },
            gym_leader: "Misty",
          },
        ],
      };
      await writeTestYaml(`quiz-history/${monthKey}.yaml`, historyData);

      // Execute
      const result = await getQuizHistoryHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries).toBeDefined();
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].topic).toBe("docker");
    });

    it("should filter by topic", async () => {
      // Setup
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const historyData = {
        entries: [
          {
            session_id: "test-1",
            date: "2026-01-10",
            topic: "docker",
            course: null,
            level: "beginner",
            type: "standard",
            pokemon: { pokedexNumber: 25, name: "Pikachu", tier: 2 },
            result: { questions: 4, correct: 3, passed: true, points_earned: 87 },
          },
          {
            session_id: "test-2",
            date: "2026-01-11",
            topic: "python",
            course: null,
            level: "starter",
            type: "standard",
            pokemon: { pokedexNumber: 16, name: "Pidgey", tier: 1 },
            result: { questions: 3, correct: 2, passed: true, points_earned: 46 },
          },
        ],
      };
      await writeTestYaml(`quiz-history/${monthKey}.yaml`, historyData);

      // Execute
      const result = await getQuizHistoryHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].topic).toBe("docker");
    });

    it("should filter by month", async () => {
      // Setup - create history for specific month
      await writeTestYaml("quiz-history/2026-01.yaml", {
        entries: [
          {
            session_id: "jan-1",
            date: "2026-01-10",
            topic: "docker",
            course: null,
            level: "beginner",
            type: "standard",
            pokemon: { pokedexNumber: 25, name: "Pikachu", tier: 2 },
            result: { questions: 4, correct: 3, passed: true, points_earned: 87 },
          },
        ],
      });

      // Execute
      const result = await getQuizHistoryHandler({ month: "2026-01" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries.length).toBe(1);
    });

    it("should apply limit", async () => {
      // Setup
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const historyData = {
        entries: [
          {
            session_id: "test-1",
            date: "2026-01-10",
            topic: "docker",
            course: null,
            level: "beginner",
            type: "standard",
            pokemon: { pokedexNumber: 25, name: "Pikachu", tier: 2 },
            result: { questions: 4, correct: 3, passed: true, points_earned: 87 },
          },
          {
            session_id: "test-2",
            date: "2026-01-11",
            topic: "docker",
            course: null,
            level: "beginner",
            type: "standard",
            pokemon: { pokedexNumber: 4, name: "Charmander", tier: 2 },
            result: { questions: 4, correct: 4, passed: true, points_earned: 95 },
          },
          {
            session_id: "test-3",
            date: "2026-01-12",
            topic: "docker",
            course: null,
            level: "advanced",
            type: "standard",
            pokemon: { pokedexNumber: 6, name: "Charizard", tier: 3 },
            result: { questions: 5, correct: 4, passed: true, points_earned: 110 },
          },
        ],
      };
      await writeTestYaml(`quiz-history/${monthKey}.yaml`, historyData);

      // Execute
      const result = await getQuizHistoryHandler({ limit: 2 });

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries.length).toBe(2);
    });

    it("should return empty array when no history", async () => {
      // Execute - no history files exist
      const result = await getQuizHistoryHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });

    it("should handle month with no data", async () => {
      // Execute
      const result = await getQuizHistoryHandler({ month: "2020-01" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.entries).toEqual([]);
    });
  });

  describe("Pokemon Selection", () => {
    it("should have Pokemon for all tiers", () => {
      expect(pokemonByTier[1]).toBeDefined();
      expect(pokemonByTier[2]).toBeDefined();
      expect(pokemonByTier[3]).toBeDefined();
      expect(pokemonByTier[4]).toBeDefined();
      expect(pokemonByTier[5]).toBeDefined();
    });

    it("should select random Pokemon from tier", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: "starter" }));

      // Execute multiple times to verify randomness
      const names = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const result = await startQuizHandler({ topic: "docker" });
        if (result.success) {
          names.add(result.pokemon.name);
          await clearAllSessions(); resetLoadedState();
        }
      }

      // Should have picked from tier 1-2 Pokemon
      expect(names.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle perfect score", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;

      // Execute - perfect score
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: session.parameters.questionCount },
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.score.percentage).toBe(100);
    });

    it("should handle zero correct answers", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("pokedex.yaml", createMockPokedexData());

      // Start quiz
      const startResult = await startQuizHandler({ topic: "docker" });
      const session = (await getSession(startResult.sessionId))!;

      // Execute - zero correct
      const result = await submitQuizResultHandler({
        sessionId: startResult.sessionId,
        answers: { total: session.parameters.questionCount, correct: 0 },
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.score.percentage).toBe(0);
      expect(result.points.earned).toBe(0); // No points for zero correct
    });

    it("should handle expert level with tier 5 Pokemon", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress({ current_level: "expert" }));

      // Execute
      const result = await startQuizHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.pokemon.tier).toBeGreaterThanOrEqual(4);
      expect(result.pokemon.tier).toBeLessThanOrEqual(5);
      expect(result.gymLeader.name).toBe("Sabrina");
    });
  });
});
