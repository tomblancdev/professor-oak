/**
 * Rewards Tools Tests
 *
 * TDD tests for badge and rewards management tools.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";

// Set test data path before importing modules
const TEST_DATA_PATH = path.join(process.cwd(), "test-data-rewards");
process.env.DATA_PATH = TEST_DATA_PATH;

// Import after setting env
import {
  awardBadge,
  getBadges,
  checkBadgeEligibility,
  getRewards,
} from "../tools/rewards.js";
import type { TopicRewards } from "../types/rewards.js";
import type { TopicProgress, LevelRoadmap } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";

// Test fixtures
const createMockTopicProgress = (overrides: Partial<TopicProgress> = {}): TopicProgress => ({
  version: 1,
  topic: "docker",
  display_name: "Docker",
  description: "Learn Docker containerization",
  created_at: "2026-01-01",
  current_level: "starter",
  roadmap: {
    starter: {
      status: "active",
      courses: [
        { id: "01-introduction", name: "Introduction", mandatory: true, completed: true, completed_at: "2026-01-05" },
        { id: "02-installation", name: "Installation", mandatory: true, completed: true, completed_at: "2026-01-06" },
      ],
      exercices: {
        "01-introduction": [
          { id: "exercice-01", name: "hello-world", mandatory: true, completed: true, completed_at: "2026-01-05" },
        ],
        "02-installation": [
          { id: "exercice-01", name: "install-docker", mandatory: true, completed: true, completed_at: "2026-01-06" },
        ],
      },
      quizRequired: true,
      quizPassed: true,
    },
    beginner: {
      status: "pending",
      courses: [],
      exercices: {},
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

const createMockTopicRewards = (overrides: Partial<TopicRewards> = {}): TopicRewards => ({
  version: 1,
  topic: "docker",
  created_at: "2026-01-01",
  badges: [],
  milestones: [],
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
    first_badge: null,
    first_legendary: null,
  },
  point_history: [],
  ...overrides,
});

// Helper functions
async function writeTestYaml(relativePath: string, data: unknown) {
  const fullPath = path.join(TEST_DATA_PATH, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, YAML.stringify(data), "utf-8");
}

async function readTestYaml<T>(relativePath: string): Promise<T> {
  const fullPath = path.join(TEST_DATA_PATH, relativePath);
  const content = await fs.readFile(fullPath, "utf-8");
  return YAML.parse(content) as T;
}

describe("Rewards Tools", () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  });

  describe("awardBadge", () => {
    it("should award a badge when level is complete", async () => {
      // Setup - all requirements met
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.badge).toBeDefined();
      expect(result.badge.name).toBe("Boulder Badge");
      expect(result.badge.level).toBe("starter");
      expect(result.badge.gym_leader).toBe("Brock");
      expect(result.pointsAwarded).toBe(500);
    });

    it("should create badge with correct id format", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.badge.id).toBe("boulder-badge-docker");
    });

    it("should use custom badgeId when provided", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
        badgeId: "custom-badge-id",
      });

      // Verify
      expect(result.badge.id).toBe("custom-badge-id");
    });

    it("should update rewards.yaml with new badge", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      const rewards = await readTestYaml<TopicRewards>("src/docker/rewards.yaml");
      expect(rewards.badges).toHaveLength(1);
      expect(rewards.badges[0].name).toBe("Boulder Badge");
      expect(rewards.badges[0].earned_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should update trainer.yaml first_badge achievement", async () => {
      // Setup - trainer without first badge
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData({
        achievements: {
          first_pokemon: "Pidgey",
          first_badge: null,
          first_legendary: null,
        },
      }));

      // Execute
      await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.achievements.first_badge).toBe("Boulder Badge");
    });

    it("should not update first_badge if already set", async () => {
      // Setup - trainer already has first badge
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData({
        achievements: {
          first_pokemon: "Pidgey",
          first_badge: "Cascade Badge",
          first_legendary: null,
        },
      }));

      // Execute
      await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.achievements.first_badge).toBe("Cascade Badge");
    });

    it("should add 500 points to trainer", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData({ total_points: 100 }));

      // Execute
      await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.total_points).toBe(600); // 100 + 500
    });

    it("should fail if quiz not passed", async () => {
      // Setup - quiz not passed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.quizPassed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("quiz");
    });

    it("should fail if mandatory courses not completed", async () => {
      // Setup - course not completed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.courses[1].completed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("courses");
    });

    it("should fail if mandatory exercises not completed", async () => {
      // Setup - exercise not completed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.exercices["01-introduction"][0].completed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("exercises");
    });

    it("should fail if badge already earned for this level", async () => {
      // Setup - badge already exists
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
        ],
      }));
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("already earned");
    });

    it("should fail for non-existent topic", async () => {
      // Execute
      const result = await awardBadge({
        topic: "nonexistent",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail for invalid level", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "invalid-level",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid level");
    });
  });

  describe("getBadges", () => {
    it("should return all badges when no topic specified", async () => {
      // Setup - badges in multiple topics
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
        ],
      }));
      await writeTestYaml("src/python/rewards.yaml", createMockTopicRewards({
        topic: "python",
        badges: [
          {
            id: "cascade-badge-python",
            name: "Cascade Badge",
            level: "beginner",
            gym_leader: "Misty",
            earned_at: "2026-01-08",
            points_earned: 500,
            quiz_score: "4/4",
          },
        ],
      }));

      // Execute
      const result = await getBadges({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.badges).toHaveLength(2);
      expect(result.badges.map((b: { name: string }) => b.name)).toContain("Boulder Badge");
      expect(result.badges.map((b: { name: string }) => b.name)).toContain("Cascade Badge");
    });

    it("should return badges filtered by topic", async () => {
      // Setup
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
          {
            id: "cascade-badge-docker",
            name: "Cascade Badge",
            level: "beginner",
            gym_leader: "Misty",
            earned_at: "2026-01-10",
            points_earned: 500,
            quiz_score: "4/4",
          },
        ],
      }));
      await writeTestYaml("src/python/rewards.yaml", createMockTopicRewards({
        topic: "python",
        badges: [
          {
            id: "boulder-badge-python",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-08",
            points_earned: 500,
            quiz_score: "3/3",
          },
        ],
      }));

      // Execute
      const result = await getBadges({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.badges).toHaveLength(2);
      expect(result.badges.every((b: { topic: string }) => b.topic === "docker")).toBe(true);
    });

    it("should return empty array when no badges earned", async () => {
      // Setup
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getBadges({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.badges).toHaveLength(0);
    });

    it("should include badge metadata", async () => {
      // Setup
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
        ],
      }));

      // Execute
      const result = await getBadges({ topic: "docker" });

      // Verify
      expect(result.badges[0]).toMatchObject({
        id: "boulder-badge-docker",
        name: "Boulder Badge",
        level: "starter",
        gym_leader: "Brock",
        earned_at: "2026-01-05",
        points_earned: 500,
      });
    });

    it("should return error for non-existent topic", async () => {
      // Execute
      const result = await getBadges({ topic: "nonexistent" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return total count", async () => {
      // Setup
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
          {
            id: "cascade-badge-docker",
            name: "Cascade Badge",
            level: "beginner",
            gym_leader: "Misty",
            earned_at: "2026-01-10",
            points_earned: 500,
            quiz_score: "4/4",
          },
        ],
      }));

      // Execute
      const result = await getBadges({ topic: "docker" });

      // Verify
      expect(result.total).toBe(2);
    });
  });

  describe("checkBadgeEligibility", () => {
    it("should return eligible when all requirements met", async () => {
      // Setup - all requirements met
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(true);
    });

    it("should return not eligible when courses incomplete", async () => {
      // Setup - course not completed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.courses[1].completed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(false);
      expect(result.requirements.courses.completed).toBe(false);
      expect(result.missing).toContain("02-installation");
    });

    it("should return not eligible when exercises incomplete", async () => {
      // Setup - exercise not completed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.exercices["01-introduction"][0].completed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(false);
      expect(result.requirements.exercises.completed).toBe(false);
    });

    it("should return not eligible when quiz not passed", async () => {
      // Setup - quiz not passed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.quizPassed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(false);
      expect(result.requirements.quiz.passed).toBe(false);
    });

    it("should return not eligible if badge already earned", async () => {
      // Setup - badge already earned
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards({
        badges: [
          {
            id: "boulder-badge-docker",
            name: "Boulder Badge",
            level: "starter",
            gym_leader: "Brock",
            earned_at: "2026-01-05",
            points_earned: 500,
            quiz_score: "3/3",
          },
        ],
      }));

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(false);
      expect(result.alreadyEarned).toBe(true);
    });

    it("should return detailed requirements status", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.roadmap.starter.courses[1].completed = false;
      progress.roadmap.starter.exercices["02-installation"][0].completed = false;
      progress.roadmap.starter.quizPassed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.requirements).toEqual({
        courses: {
          completed: false,
          total: 2,
          done: 1,
        },
        exercises: {
          completed: false,
          total: 2,
          done: 1,
        },
        quiz: {
          required: true,
          passed: false,
        },
      });
    });

    it("should return missing items list", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.roadmap.starter.courses[1].completed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.missing).toContain("02-installation");
    });

    it("should return error for non-existent topic", async () => {
      // Execute
      const result = await checkBadgeEligibility({
        topic: "nonexistent",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for invalid level", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "invalid-level",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid level");
    });

    it("should handle level with no quiz required", async () => {
      // Setup - no quiz required
      const progress = createMockTopicProgress();
      progress.roadmap.starter.quizRequired = false;
      progress.roadmap.starter.quizPassed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(true);
      expect(result.requirements.quiz.required).toBe(false);
    });

    it("should return badge info for the level", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.badgeInfo).toEqual({
        name: "Boulder Badge",
        gym_leader: "Brock",
        points: 500,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle topic with no exercises", async () => {
      // Setup - no exercises defined
      const progress = createMockTopicProgress();
      progress.roadmap.starter.exercices = {};
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.requirements.exercises.completed).toBe(true);
      expect(result.requirements.exercises.total).toBe(0);
    });

    it("should only count mandatory exercises for eligibility", async () => {
      // Setup - optional exercise not completed
      const progress = createMockTopicProgress();
      progress.roadmap.starter.exercices["01-introduction"].push({
        id: "exercice-02",
        name: "optional-exercise",
        mandatory: false,
        completed: false,
      });
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await checkBadgeEligibility({
        topic: "docker",
        level: "starter",
      });

      // Verify - should still be eligible since optional exercises don't count
      expect(result.success).toBe(true);
      expect(result.eligible).toBe(true);
    });

    it("should create rewards.yaml if it does not exist when awarding badge", async () => {
      // Setup - no rewards.yaml
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      // Note: not creating rewards.yaml

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      expect(result.success).toBe(true);
      const rewards = await readTestYaml<TopicRewards>("src/docker/rewards.yaml");
      expect(rewards.badges).toHaveLength(1);
    });

    it("should add point history entry when awarding badge", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData({ point_history: [] }));

      // Execute
      await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.point_history).toHaveLength(1);
      expect(trainer.point_history[0].action).toBe("badge_earned");
      expect(trainer.point_history[0].badge).toBe("Boulder Badge");
      expect(trainer.point_history[0].points).toBe("+500");
    });

    it("should handle rank promotion when awarding badge", async () => {
      // Setup - just below next rank
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());
      await writeTestYaml("trainer.yaml", createMockTrainerData({
        total_points: 1600,
        rank: "Pokemon Trainer",
      }));

      // Execute
      const result = await awardBadge({
        topic: "docker",
        level: "starter",
      });

      // Verify - should promote to Great Trainer (2000 points)
      expect(result.success).toBe(true);
      expect(result.rankChange).toBeDefined();
      expect(result.rankChange?.previous).toBe("Pokemon Trainer");
      expect(result.rankChange?.new).toBe("Great Trainer");
    });
  });

  describe("getRewards", () => {
    it("should return rewards status for all levels", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.topic).toBe("docker");
      expect(result.levels).toHaveLength(4);
      expect(result.levels.map((l: any) => l.level)).toEqual([
        "starter",
        "beginner",
        "advanced",
        "expert",
      ]);
    });

    it("should show progress toward badges for each level", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      const starterLevel = result.levels[0];
      expect(starterLevel.progress).toBeDefined();
      expect(starterLevel.progress.courses).toEqual({
        completed: true,
        total: 2,
        done: 2,
      });
      expect(starterLevel.progress.exercises).toEqual({
        completed: true,
        total: 2,
        done: 2,
      });
      expect(starterLevel.progress.quiz).toEqual({
        required: true,
        passed: true,
      });
    });

    it("should show badge eligibility for each level", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      const starterLevel = result.levels[0];
      expect(starterLevel.badge.eligible).toBe(true);
      expect(starterLevel.badge.template).toEqual({
        name: "Boulder Badge",
        gym_leader: "Brock",
        points: 500,
      });
    });

    it("should include earned badges in response", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml(
        "src/docker/rewards.yaml",
        createMockTopicRewards({
          badges: [
            {
              id: "boulder-badge-docker",
              name: "Boulder Badge",
              level: "starter",
              gym_leader: "Brock",
              earned_at: "2026-01-05",
              points_earned: 500,
              quiz_score: "3/3",
            },
          ],
        })
      );

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      expect(result.badges.total_earned).toBe(1);
      expect(result.badges.earned).toHaveLength(1);
      expect(result.badges.earned[0].name).toBe("Boulder Badge");
      const starterLevel = result.levels[0];
      expect(starterLevel.badge.earned).toBeDefined();
      expect(starterLevel.badge.earned?.name).toBe("Boulder Badge");
    });

    it("should show null for unearned badges", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      const beginnerLevel = result.levels[1];
      expect(beginnerLevel.badge.earned).toBeNull();
    });

    it("should handle topic with no rewards.yaml", async () => {
      // Setup - progress but no rewards
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      // Not creating rewards.yaml

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.badges.total_earned).toBe(0);
      expect(result.badges.earned).toHaveLength(0);
    });

    it("should include milestones in response", async () => {
      // Setup
      await writeTestYaml("src/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml(
        "src/docker/rewards.yaml",
        createMockTopicRewards({
          milestones: [
            {
              id: "first-docker-course",
              name: "First Docker Course",
              description: "Completed first course",
              achieved_at: "2026-01-05",
              points_earned: 25,
            },
          ],
        })
      );

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      expect(result.milestones.total).toBe(1);
      expect(result.milestones.milestones).toHaveLength(1);
      expect(result.milestones.milestones[0].name).toBe("First Docker Course");
    });

    it("should return error for non-existent topic", async () => {
      // Execute
      const result = await getRewards({ topic: "nonexistent" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should show incomplete progress status for levels", async () => {
      // Setup - incomplete level
      const progress = createMockTopicProgress();
      progress.roadmap.beginner.courses = [
        {
          id: "01-intermediate",
          name: "Intermediate",
          mandatory: true,
          completed: false,
        },
      ];
      progress.roadmap.beginner.exercices = {
        "01-intermediate": [
          {
            id: "exercice-01",
            name: "exercise",
            mandatory: true,
            completed: false,
          },
        ],
      };
      progress.roadmap.beginner.quizPassed = false;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      const beginnerLevel = result.levels[1];
      expect(beginnerLevel.progress.courses.completed).toBe(false);
      expect(beginnerLevel.progress.exercises.completed).toBe(false);
      expect(beginnerLevel.progress.quiz.passed).toBe(false);
      expect(beginnerLevel.badge.eligible).toBe(false);
    });

    it("should handle uninitialized levels", async () => {
      // Setup - only starter level initialized
      const progress = createMockTopicProgress();
      progress.roadmap.beginner = undefined as any;
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      const beginnerLevel = result.levels[1];
      expect(beginnerLevel.status).toBe("not_initialized");
    });

    it("should maintain level status in response", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.roadmap.starter.status = "completed";
      progress.roadmap.beginner.status = "active";
      progress.roadmap.advanced.status = "pending";
      await writeTestYaml("src/docker/progress.yaml", progress);
      await writeTestYaml("src/docker/rewards.yaml", createMockTopicRewards());

      // Execute
      const result = await getRewards({ topic: "docker" });

      // Verify
      expect(result.levels[0].status).toBe("completed");
      expect(result.levels[1].status).toBe("active");
      expect(result.levels[2].status).toBe("pending");
    });
  });
});
