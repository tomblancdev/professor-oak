/**
 * Progress Tools Tests
 *
 * TDD tests for progress tracking tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Set test data path before importing modules
const TEST_DATA_PATH = "/tmp/professor-oak-test";
process.env.DATA_PATH = TEST_DATA_PATH;

// Import after setting env
import {
  getProgressHandler,
  completeItemHandler,
  getNextActionHandler,
  getOverallProgressHandler,
} from "../tools/progress.js";
import type { TopicProgress } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";

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
        { id: "02-installation", name: "Installation", mandatory: true, completed: true, completed_at: "2026-01-06" },
      ],
      exercices: {
        "01-introduction": [
          { id: "exercice-01", name: "hello-world", mandatory: true, completed: true, completed_at: "2026-01-05" },
        ],
      },
      quizRequired: true,
      quizPassed: true,
      completed_at: "2026-01-07",
    },
    beginner: {
      status: "active",
      courses: [
        { id: "01-first-container", name: "Your First Container", mandatory: true, completed: true, completed_at: "2026-01-08" },
        { id: "02-images-basics", name: "Images Basics", mandatory: true, completed: false },
        { id: "03-volumes", name: "Volumes", mandatory: true, completed: false },
      ],
      exercices: {
        "01-first-container": [
          { id: "exercice-01", name: "run-hello-world", mandatory: true, completed: true, completed_at: "2026-01-08" },
          { id: "exercice-02", name: "run-nginx", mandatory: true, completed: false },
        ],
        "02-images-basics": [
          { id: "exercice-01", name: "pull-images", mandatory: false, completed: false },
        ],
      },
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
  extras: [
    { id: "extra-01", name: "docker-tips", display_name: "Docker Tips", tags: ["tips"], created_at: "2026-01-06", has_pokemon: false },
  ],
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

describe("Progress Tools", () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  });

  describe("getProgress", () => {
    it("should return overall progress when no topic specified", async () => {
      // Setup
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.trainer).toBeDefined();
      expect(result.trainer?.name).toBe("TestUser");
      expect(result.trainer?.rank).toBe("Pokemon Trainer");
      expect(result.trainer?.totalPoints).toBe(500);
    });

    it("should return detailed progress for a specific topic", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.topic).toBe("docker");
      expect(result.currentLevel).toBe("beginner");
      expect(result.levels).toBeDefined();
      expect(result.levels.starter.status).toBe("completed");
      expect(result.levels.beginner.status).toBe("active");
      expect(result.levels.advanced.status).toBe("pending");
    });

    it("should return locked status for uninitialized levels", async () => {
      // Setup - topic with no roadmap for advanced/expert
      const progress = createMockTopicProgress();
      delete progress.roadmap.advanced;
      delete progress.roadmap.expert;
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.levels.advanced.status).toBe("locked");
      expect(result.levels.expert.status).toBe("locked");
    });

    it("should calculate correct completion percentage", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify - beginner has 1/3 courses completed = 33%
      expect(result.levels.beginner.completion).toBe(33);
      expect(result.levels.beginner.courses.total).toBe(3);
      expect(result.levels.beginner.courses.completed).toBe(1);
    });

    it("should return error for non-existent topic", async () => {
      // Execute
      const result = await getProgressHandler({ topic: "nonexistent" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should include exercise statistics", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.levels.beginner.exercices.total).toBe(3);
      expect(result.levels.beginner.exercices.completed).toBe(1);
      expect(result.levels.beginner.exercices.mandatory.total).toBe(2);
      expect(result.levels.beginner.exercices.mandatory.completed).toBe(1);
    });

    it("should include quiz status", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.levels.beginner.quiz.required).toBe(true);
      expect(result.levels.beginner.quiz.passed).toBe(false);
      expect(result.levels.starter.quiz.passed).toBe(true);
    });

    it("should include extras count", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.extras.count).toBe(1);
    });
  });

  describe("completeItem", () => {
    it("should mark a course as completed", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "02-images-basics",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.item).toBe("02-images-basics");
      expect(result.type).toBe("course");
      expect(result.pointsAwarded).toBe(25);
      expect(result.message).toContain("+25 points");

      // Verify progress.yaml updated
      const progress = await readTestYaml<TopicProgress>("topics/docker/progress.yaml");
      const course = progress.roadmap.beginner.courses.find(c => c.id === "02-images-basics");
      expect(course?.completed).toBe(true);
      expect(course?.completed_at).toBeDefined();
    });

    it("should mark an exercise as completed with mandatory points", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "exercise",
        itemId: "exercice-02",
        courseId: "01-first-container",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(30); // Mandatory exercise
    });

    it("should mark an optional exercise with lower points", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "exercise",
        itemId: "exercice-01",
        courseId: "02-images-basics",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(15); // Optional exercise
    });

    it("should update trainer points", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData({ total_points: 500 }));

      // Execute
      await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "02-images-basics",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.total_points).toBe(525); // 500 + 25
      expect(trainer.point_history.length).toBeGreaterThan(1);
    });

    it("should return error for already completed item", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute - try to complete already completed course
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "01-first-container", // Already completed in mock
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("already completed");
    });

    it("should return error for non-existent item", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "99-nonexistent",
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should require courseId for exercises", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "exercise",
        itemId: "exercice-01",
        // Missing courseId
      });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("courseId");
    });

    it("should calculate level completion status", async () => {
      // Setup - create a topic where completing one more item would complete the level
      const progress = createMockTopicProgress();
      // Mark everything except one course as complete
      progress.roadmap.beginner.courses = [
        { id: "01-only-course", name: "Only Course", mandatory: true, completed: false },
      ];
      progress.roadmap.beginner.exercices = {};
      progress.roadmap.beginner.quizRequired = false;
      await writeTestYaml("topics/docker/progress.yaml", progress);
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "01-only-course",
      });

      // Verify
      expect(result.success).toBe(true);
      expect(result.levelComplete).toBe(true);
    });

    it("should return remaining items in level progress", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "02-images-basics",
      });

      // Verify
      expect(result.levelProgress.remaining.courses).toBe(1); // 03-volumes
      expect(result.levelProgress.remaining.mandatoryExercises).toBe(1); // exercice-02
      expect(result.levelProgress.remaining.quizPassed).toBe(false);
    });
  });

  describe("getNextAction", () => {
    it("should suggest level selection when no level set", async () => {
      // Setup
      const progress = createMockTopicProgress({ current_level: null });
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("select_level");
      expect(result.nextAction.message).toContain("Select");
    });

    it("should suggest roadmap generation when level has no courses", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.current_level = "advanced";
      progress.roadmap.advanced = { status: "active", courses: [], exercices: {} };
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("generate_roadmap");
    });

    it("should suggest incomplete course first", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("course");
      expect(result.nextAction.id).toBe("02-images-basics");
      expect(result.nextAction.name).toBe("Images Basics");
      expect(result.nextAction.path).toContain("topics/docker/courses/beginner");
    });

    it("should suggest mandatory exercise after all courses done", async () => {
      // Setup - all courses completed
      const progress = createMockTopicProgress();
      progress.roadmap.beginner.courses.forEach(c => {
        c.completed = true;
        c.completed_at = "2026-01-10";
      });
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("exercise");
      expect(result.nextAction.id).toBe("exercice-02"); // First incomplete mandatory
    });

    it("should suggest quiz when all courses and mandatory exercises done", async () => {
      // Setup - all courses and mandatory exercises done
      const progress = createMockTopicProgress();
      progress.roadmap.beginner.courses.forEach(c => {
        c.completed = true;
        c.completed_at = "2026-01-10";
      });
      // Mark mandatory exercises as complete
      progress.roadmap.beginner.exercices["01-first-container"].forEach(e => {
        e.completed = true;
        e.completed_at = "2026-01-10";
      });
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("quiz");
      expect(result.nextAction.level).toBe("beginner");
    });

    it("should suggest next level when current level complete", async () => {
      // Setup - everything in beginner level done including quiz
      const progress = createMockTopicProgress();
      progress.roadmap.beginner.courses.forEach(c => {
        c.completed = true;
        c.completed_at = "2026-01-10";
      });
      Object.values(progress.roadmap.beginner.exercices).forEach(exercises => {
        exercises.forEach(e => {
          if (e.mandatory) {
            e.completed = true;
            e.completed_at = "2026-01-10";
          }
        });
      });
      progress.roadmap.beginner.quizPassed = true;
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("next_level");
      expect(result.nextAction.nextLevel).toBe("advanced");
    });

    it("should indicate mastery when all levels complete", async () => {
      // Setup - current level is expert and everything done
      const progress = createMockTopicProgress();
      progress.current_level = "expert";
      progress.roadmap.expert = {
        status: "active",
        courses: [
          { id: "01-expert-course", name: "Expert Course", mandatory: true, completed: true, completed_at: "2026-01-10" },
        ],
        exercices: {},
        quizRequired: true,
        quizPassed: true,
      };
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.nextAction.type).toBe("mastery");
      expect(result.nextAction.message).toContain("mastered");
    });

    it("should return error for non-existent topic", async () => {
      // Execute
      const result = await getNextActionHandler({ topic: "nonexistent" });

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should include alternatives when available", async () => {
      // Setup
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getNextActionHandler({ topic: "docker" });

      // Verify - when suggesting a course, quiz might be an alternative
      expect(result.alternatives).toBeDefined();
    });
  });

  describe("getOverallProgress", () => {
    it("should return trainer information", async () => {
      // Setup
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.trainer.name).toBe("TestUser");
      expect(result.trainer.rank).toBe("Pokemon Trainer");
      expect(result.trainer.totalPoints).toBe(500);
    });

    it("should list all topics with progress", async () => {
      // Setup
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("topics/python/progress.yaml", createMockTopicProgress({
        topic: "python",
        display_name: "Python",
        current_level: "starter",
      }));

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.topics.length).toBe(2);
      expect(result.topics.map((t: { name: string }) => t.name)).toContain("docker");
      expect(result.topics.map((t: { name: string }) => t.name)).toContain("python");
    });

    it("should handle missing trainer file", async () => {
      // Setup - no trainer.yaml
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      expect(result.success).toBe(true);
      expect(result.trainer).toBeNull();
    });

    it("should calculate totals across topics", async () => {
      // Setup
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("topics/python/progress.yaml", createMockTopicProgress({
        topic: "python",
        display_name: "Python",
      }));

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      expect(result.totals).toBeDefined();
      expect(result.totals.topics).toBe(2);
    });

    it("should include completion percentage per topic", async () => {
      // Setup
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());

      // Execute
      const result = await getOverallProgressHandler({});

      // Verify
      const dockerTopic = result.topics.find((t: { name: string }) => t.name === "docker");
      expect(dockerTopic).toBeDefined();
      expect(dockerTopic.currentLevel).toBe("beginner");
      expect(typeof dockerTopic.completion).toBe("number");
    });
  });

  describe("Edge Cases", () => {
    it("should handle topic with no exercises", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.roadmap.beginner.exercices = {};
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.levels.beginner.exercices.total).toBe(0);
    });

    it("should handle topic with empty extras", async () => {
      // Setup
      const progress = createMockTopicProgress();
      progress.extras = [];
      await writeTestYaml("topics/docker/progress.yaml", progress);

      // Execute
      const result = await getProgressHandler({ topic: "docker" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.extras.count).toBe(0);
    });

    it("should handle rank promotion on points update", async () => {
      // Setup - trainer just below next rank threshold
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData({
        total_points: 1990, // Just below Great Trainer (2000)
        rank: "Pokemon Trainer",
      }));

      // Execute - complete item worth 25 points
      await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "02-images-basics",
      });

      // Verify
      const trainer = await readTestYaml<TrainerData>("trainer.yaml");
      expect(trainer.total_points).toBe(2015);
      expect(trainer.rank).toBe("Great Trainer");
    });

    it("should handle subtopic paths correctly", async () => {
      // Setup - subtopic structure
      await writeTestYaml("topics/aws/subtopics/ec2/progress.yaml", createMockTopicProgress({
        topic: "ec2",
        display_name: "EC2",
      }));

      // Execute - using path format aws/ec2
      const result = await getProgressHandler({ topic: "aws/ec2" });

      // Verify
      expect(result.success).toBe(true);
      expect(result.topic).toBe("ec2");
    });
  });
  describe("Security: Locked Level Bypass (Issue #73)", () => {
    it("should reject completing items in locked levels", async () => {
      // Setup - beginner level is locked (no status or pending)
      const progress = createMockTopicProgress();
      progress.roadmap.advanced = {
        status: "locked",
        courses: [
          { id: "01-advanced-course", name: "Advanced Course", mandatory: true, completed: false },
        ],
        exercices: {},
      };
      await writeTestYaml("topics/docker/progress.yaml", progress);
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute - try to complete item in locked level
      const result = await completeItemHandler({
        topic: "docker",
        level: "advanced",
        type: "course",
        itemId: "01-advanced-course",
      });

      // Verify - should be rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain("must be");
      expect(result.error).toContain("locked");
    });

    it("should reject completing items in pending levels", async () => {
      // Setup - level is pending (not active)
      const progress = createMockTopicProgress();
      progress.roadmap.advanced = {
        status: "pending",
        courses: [
          { id: "01-advanced-course", name: "Advanced Course", mandatory: true, completed: false },
        ],
        exercices: {},
      };
      await writeTestYaml("topics/docker/progress.yaml", progress);
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute - try to complete item in pending level
      const result = await completeItemHandler({
        topic: "docker",
        level: "advanced",
        type: "course",
        itemId: "01-advanced-course",
      });

      // Verify - should be rejected
      expect(result.success).toBe(false);
      expect(result.error).toContain("must be");
      expect(result.error).toContain("pending");
    });

    it("should allow completing items in active levels", async () => {
      // Setup - level is active
      await writeTestYaml("topics/docker/progress.yaml", createMockTopicProgress());
      await writeTestYaml("trainer.yaml", createMockTrainerData());

      // Execute - complete item in active level (beginner is active in mock)
      const result = await completeItemHandler({
        topic: "docker",
        level: "beginner",
        type: "course",
        itemId: "02-images-basics",
      });

      // Verify - should succeed
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBe(25);
    });
  });

  describe("Security: Path Traversal Validation (Issue #69)", () => {
    it("should reject path traversal in getProgress", async () => {
      const result = await getProgressHandler({ topic: "../etc/passwd" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid topic path");
    });

    it("should reject path traversal in completeItem", async () => {
      await writeTestYaml("trainer.yaml", createMockTrainerData());
      
      const result = await completeItemHandler({
        topic: "../secrets",
        level: "beginner",
        type: "course",
        itemId: "01-test",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid topic path");
    });

    it("should reject path traversal in getNextAction", async () => {
      const result = await getNextActionHandler({ topic: "docker/../../../etc" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid topic path");
    });

    it("should reject backslash paths", async () => {
      const result = await getProgressHandler({ topic: "docker\..\secrets" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid topic path");
    });
  });
});
