/**
 * Trainer Tools Tests
 *
 * TDD tests for trainer management tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";

// Mock the DATA_PATH for tests
const TEST_DATA_PATH = path.join(process.cwd(), "test-data-trainer");

// Set environment variable before importing modules
process.env.DATA_PATH = TEST_DATA_PATH;

// Import tools after setting env
import {
  getTrainer,
  updateTrainer,
  addPoints,
  getRank,
  getPointHistory,
} from "../tools/trainer.js";
import type { TrainerData } from "../types/trainer.js";

// Helper to create initial trainer.yaml
async function createTrainerFile(data: Partial<TrainerData> = {}) {
  const defaultData: TrainerData = {
    version: 1,
    trainer: null,
    started_at: null,
    total_points: 0,
    rank: "Rookie Trainer",
    settings: {
      wild_encounters: true,
      notifications: true,
    },
    achievements: {
      first_pokemon: null,
      first_badge: null,
      first_legendary: null,
    },
    point_history: [],
    ...data,
  };

  await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  await fs.writeFile(
    path.join(TEST_DATA_PATH, "trainer.yaml"),
    YAML.stringify(defaultData),
    "utf-8"
  );
  return defaultData;
}

// Helper to read trainer.yaml
async function readTrainerFile(): Promise<TrainerData> {
  const content = await fs.readFile(
    path.join(TEST_DATA_PATH, "trainer.yaml"),
    "utf-8"
  );
  return YAML.parse(content) as TrainerData;
}

describe("Trainer Tools", () => {
  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    try {
      await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  describe("getTrainer", () => {
    it("should return trainer profile without history by default", async () => {
      await createTrainerFile({
        trainer: "Tom",
        started_at: "2026-01-11",
        total_points: 500,
        rank: "Pokemon Trainer",
        point_history: [
          {
            date: "2026-01-11",
            action: "quiz_pass",
            topic: "docker",
            points: "+72",
          },
        ],
      });

      const result = await getTrainer({});

      expect(result.success).toBe(true);
      expect(result.name).toBe("Tom");
      expect(result.rank).toBe("Pokemon Trainer");
      expect(result.totalPoints).toBe(500);
      expect(result.settings).toEqual({
        wild_encounters: true,
        notifications: true,
      });
      expect(result.achievements).toBeDefined();
      expect(result.point_history).toBeUndefined();
    });

    it("should return trainer profile with history when includeHistory is true", async () => {
      await createTrainerFile({
        trainer: "Tom",
        total_points: 500,
        point_history: [
          {
            date: "2026-01-11",
            action: "quiz_pass",
            topic: "docker",
            points: "+72",
          },
          {
            date: "2026-01-10",
            action: "course_complete",
            topic: "docker",
            points: "+25",
          },
        ],
      });

      const result = await getTrainer({ includeHistory: true });

      expect(result.success).toBe(true);
      expect(result.point_history).toBeDefined();
      expect(result.point_history).toHaveLength(2);
    });

    it("should auto-create trainer.yaml when it does not exist", async () => {
      const result = await getTrainer({});

      expect(result.success).toBe(true);
      expect(result.name).toBeNull();
      expect(result.rank).toBe("Rookie Trainer");
      expect(result.totalPoints).toBe(0);
    });
  });

  describe("updateTrainer", () => {
    it("should update trainer name", async () => {
      await createTrainerFile();

      const result = await updateTrainer({ name: "Ash" });

      expect(result.success).toBe(true);
      expect(result.updated).toContain("name");

      const trainerData = await readTrainerFile();
      expect(trainerData.trainer).toBe("Ash");
    });

    it("should set started_at when setting name for first time", async () => {
      await createTrainerFile({ trainer: null, started_at: null });

      const result = await updateTrainer({ name: "Ash" });

      expect(result.success).toBe(true);

      const trainerData = await readTrainerFile();
      expect(trainerData.trainer).toBe("Ash");
      expect(trainerData.started_at).not.toBeNull();
      expect(trainerData.started_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should not update started_at when name is already set", async () => {
      await createTrainerFile({
        trainer: "Tom",
        started_at: "2026-01-01",
      });

      const result = await updateTrainer({ name: "Ash" });

      expect(result.success).toBe(true);

      const trainerData = await readTrainerFile();
      expect(trainerData.trainer).toBe("Ash");
      expect(trainerData.started_at).toBe("2026-01-01");
    });

    it("should update settings", async () => {
      await createTrainerFile();

      const result = await updateTrainer({
        settings: {
          wild_encounters: false,
          notifications: false,
        },
      });

      expect(result.success).toBe(true);
      expect(result.updated).toContain("settings");

      const trainerData = await readTrainerFile();
      expect(trainerData.settings.wild_encounters).toBe(false);
      expect(trainerData.settings.notifications).toBe(false);
    });

    it("should update only provided settings fields", async () => {
      await createTrainerFile({
        settings: {
          wild_encounters: true,
          notifications: true,
        },
      });

      const result = await updateTrainer({
        settings: {
          wild_encounters: false,
        },
      });

      expect(result.success).toBe(true);

      const trainerData = await readTrainerFile();
      expect(trainerData.settings.wild_encounters).toBe(false);
      expect(trainerData.settings.notifications).toBe(true);
    });

    it("should update both name and settings at once", async () => {
      await createTrainerFile();

      const result = await updateTrainer({
        name: "Ash",
        settings: { wild_encounters: false },
      });

      expect(result.success).toBe(true);
      expect(result.updated).toContain("name");
      expect(result.updated).toContain("settings");

      const trainerData = await readTrainerFile();
      expect(trainerData.trainer).toBe("Ash");
      expect(trainerData.settings.wild_encounters).toBe(false);
    });
  });

  describe("addPoints", () => {
    it("should add points and update total", async () => {
      await createTrainerFile({ total_points: 100 });

      const result = await addPoints({
        points: 25,
        action: "course_complete",
        topic: "docker",
      });

      expect(result.success).toBe(true);
      expect(result.pointsAdded).toBe(25);
      expect(result.newTotal).toBe(125);

      const trainerData = await readTrainerFile();
      expect(trainerData.total_points).toBe(125);
    });

    it("should add entry to point_history with timestamp", async () => {
      await createTrainerFile({ total_points: 0, point_history: [] });

      const result = await addPoints({
        points: 72,
        action: "quiz_pass",
        topic: "docker",
        details: { pokemon: "Charmander" },
      });

      expect(result.success).toBe(true);

      const trainerData = await readTrainerFile();
      expect(trainerData.point_history).toHaveLength(1);
      expect(trainerData.point_history[0]).toMatchObject({
        action: "quiz_pass",
        topic: "docker",
        points: "+72",
        pokemon: "Charmander",
      });
      expect(trainerData.point_history[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should check for rank promotion", async () => {
      await createTrainerFile({
        total_points: 450,
        rank: "Rookie Trainer",
      });

      const result = await addPoints({
        points: 100,
        action: "badge_earned",
        topic: "docker",
      });

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(550);
      expect(result.rankChange).toBeDefined();
      expect(result.rankChange?.previous).toBe("Rookie Trainer");
      expect(result.rankChange?.new).toBe("Pokemon Trainer");
    });

    it("should not include rankChange if no promotion", async () => {
      await createTrainerFile({
        total_points: 100,
        rank: "Rookie Trainer",
      });

      const result = await addPoints({
        points: 25,
        action: "course_complete",
        topic: "docker",
      });

      expect(result.success).toBe(true);
      expect(result.rankChange).toBeUndefined();
    });

    it("should handle promotion to Pokemon Master", async () => {
      await createTrainerFile({
        total_points: 9500,
        rank: "Expert Trainer",
      });

      const result = await addPoints({
        points: 600,
        action: "badge_earned",
        topic: "docker",
      });

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(10100);
      expect(result.rankChange?.new).toBe("Pokemon Master");
    });
  });

  describe("getRank", () => {
    it("should return current rank info", async () => {
      await createTrainerFile({
        total_points: 1250,
        rank: "Pokemon Trainer",
      });

      const result = await getRank({});

      expect(result.success).toBe(true);
      expect(result.currentRank).toBe("Pokemon Trainer");
      expect(result.totalPoints).toBe(1250);
    });

    it("should return next rank info with points needed", async () => {
      await createTrainerFile({
        total_points: 1250,
        rank: "Pokemon Trainer",
      });

      const result = await getRank({});

      expect(result.success).toBe(true);
      expect(result.nextRank).toBeDefined();
      expect(result.nextRank?.name).toBe("Great Trainer");
      expect(result.nextRank?.pointsNeeded).toBe(750); // 2000 - 1250
    });

    it("should return null nextRank when at max rank", async () => {
      await createTrainerFile({
        total_points: 15000,
        rank: "Pokemon Master",
      });

      const result = await getRank({});

      expect(result.success).toBe(true);
      expect(result.currentRank).toBe("Pokemon Master");
      expect(result.nextRank).toBeNull();
    });

    it("should return correct rank for boundary values", async () => {
      // Test exact boundary at 500 points
      await createTrainerFile({
        total_points: 500,
        rank: "Pokemon Trainer",
      });

      const result = await getRank({});

      expect(result.success).toBe(true);
      expect(result.currentRank).toBe("Pokemon Trainer");
      expect(result.nextRank?.name).toBe("Great Trainer");
      expect(result.nextRank?.pointsNeeded).toBe(1500); // 2000 - 500
    });

    it("should return all ranks with Rookie Trainer", async () => {
      await createTrainerFile({
        total_points: 0,
        rank: "Rookie Trainer",
      });

      const result = await getRank({});

      expect(result.success).toBe(true);
      expect(result.currentRank).toBe("Rookie Trainer");
      expect(result.nextRank?.name).toBe("Pokemon Trainer");
      expect(result.nextRank?.pointsNeeded).toBe(500);
    });
  });

  describe("getPointHistory", () => {
    it("should return point history entries", async () => {
      await createTrainerFile({
        point_history: [
          {
            date: "2026-01-11",
            action: "quiz_pass",
            topic: "docker",
            points: "+72",
          },
          {
            date: "2026-01-10",
            action: "course_complete",
            topic: "aws",
            points: "+25",
          },
        ],
      });

      const result = await getPointHistory({});

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
    });

    it("should filter by topic", async () => {
      await createTrainerFile({
        point_history: [
          {
            date: "2026-01-11",
            action: "quiz_pass",
            topic: "docker",
            points: "+72",
          },
          {
            date: "2026-01-10",
            action: "course_complete",
            topic: "aws",
            points: "+25",
          },
          {
            date: "2026-01-09",
            action: "course_complete",
            topic: "docker",
            points: "+25",
          },
        ],
      });

      const result = await getPointHistory({ topic: "docker" });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.entries.every((e: any) => e.topic === "docker")).toBe(true);
    });

    it("should respect limit parameter", async () => {
      await createTrainerFile({
        point_history: [
          { date: "2026-01-11", action: "a", topic: "t", points: "+1" },
          { date: "2026-01-10", action: "b", topic: "t", points: "+2" },
          { date: "2026-01-09", action: "c", topic: "t", points: "+3" },
          { date: "2026-01-08", action: "d", topic: "t", points: "+4" },
          { date: "2026-01-07", action: "e", topic: "t", points: "+5" },
        ],
      });

      const result = await getPointHistory({ limit: 3 });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(3);
    });

    it("should respect offset parameter", async () => {
      await createTrainerFile({
        point_history: [
          { date: "2026-01-11", action: "a", topic: "t", points: "+1" },
          { date: "2026-01-10", action: "b", topic: "t", points: "+2" },
          { date: "2026-01-09", action: "c", topic: "t", points: "+3" },
          { date: "2026-01-08", action: "d", topic: "t", points: "+4" },
          { date: "2026-01-07", action: "e", topic: "t", points: "+5" },
        ],
      });

      const result = await getPointHistory({ offset: 2, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].action).toBe("c");
      expect(result.entries[1].action).toBe("d");
    });

    it("should return empty entries when history is empty", async () => {
      await createTrainerFile({ point_history: [] });

      const result = await getPointHistory({});

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should use default limit of 20", async () => {
      const history = Array.from({ length: 30 }, (_, i) => ({
        date: "2026-01-01",
        action: `action-${i}`,
        topic: "t",
        points: "+1",
      }));
      await createTrainerFile({ point_history: history });

      const result = await getPointHistory({});

      expect(result.success).toBe(true);
      expect(result.entries).toHaveLength(20);
    });
  });
  describe("Security: Negative Points Validation (Issue #53)", () => {
    it("should reject negative points", async () => {
      await createTrainerFile({ total_points: 500 });

      const result = await addPoints({
        points: -100,
        action: "malicious_action",
        topic: "docker",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("should reject zero points", async () => {
      await createTrainerFile({ total_points: 500 });

      const result = await addPoints({
        points: 0,
        action: "no_points",
        topic: "docker",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("positive");
    });

    it("should not modify points when validation fails", async () => {
      await createTrainerFile({ total_points: 500 });

      await addPoints({
        points: -100,
        action: "malicious_action",
        topic: "docker",
      });

      // Verify points were not changed
      const trainerData = await readTrainerFile();
      expect(trainerData.total_points).toBe(500);
    });

    it("should reject NaN as points", async () => {
      await createTrainerFile({ total_points: 500 });

      const result = await addPoints({
        points: NaN,
        action: "invalid",
        topic: "docker",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("valid number");
    });

    it("should reject Infinity as points", async () => {
      await createTrainerFile({ total_points: 500 });

      const result = await addPoints({
        points: Infinity,
        action: "invalid",
        topic: "docker",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("valid number");
    });

    it("should accept valid positive points", async () => {
      await createTrainerFile({ total_points: 500 });

      const result = await addPoints({
        points: 100,
        action: "course_complete",
        topic: "docker",
      });

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(600);
    });
  });
});
