/**
 * Topic Management Tools Tests
 *
 * TDD tests for topic management MCP tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Set test DATA_PATH before importing modules
const TEST_DATA_PATH = path.join(process.cwd(), "test-data-topic");
process.env.DATA_PATH = TEST_DATA_PATH;

// Import after setting env
import { readYaml, writeYaml, fileExists, createDirectory } from "../services/yaml.js";
import { isValidKebabCase, isValidTopicPath, LEVELS } from "../config/constants.js";
import type { TopicProgress } from "../types/progress.js";

// Helper to clean up test directory
async function cleanTestDir() {
  try {
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
}

// Helper to create test directory
async function setupTestDir() {
  await cleanTestDir();
  await fs.mkdir(TEST_DATA_PATH, { recursive: true });
}

describe("Topic Management Tools", () => {
  beforeEach(async () => {
    await setupTestDir();
  });

  afterEach(async () => {
    await cleanTestDir();
  });

  describe("isValidKebabCase", () => {
    it("should accept valid kebab-case strings", () => {
      expect(isValidKebabCase("docker")).toBe(true);
      expect(isValidKebabCase("python-async")).toBe(true);
      expect(isValidKebabCase("docker-basics-101")).toBe(true);
      expect(isValidKebabCase("a1-b2-c3")).toBe(true);
    });

    it("should reject invalid kebab-case strings", () => {
      expect(isValidKebabCase("Docker")).toBe(false);
      expect(isValidKebabCase("python_async")).toBe(false);
      expect(isValidKebabCase("docker--basics")).toBe(false);
      expect(isValidKebabCase("-docker")).toBe(false);
      expect(isValidKebabCase("docker-")).toBe(false);
      expect(isValidKebabCase("")).toBe(false);
      expect(isValidKebabCase("docker basics")).toBe(false);
    });
  });

  describe("createTopic", () => {
    it("should create topic folder structure", async () => {
      const topicName = "docker";
      const topicPath = `src/${topicName}`;

      // Create the folder structure
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

      // Verify folders exist
      for (const folder of folders) {
        const exists = await fileExists(folder);
        expect(exists).toBe(true);
      }
    });

    it("should initialize progress.yaml with correct structure", async () => {
      const topicName = "docker";
      const topicPath = `src/${topicName}`;

      await createDirectory(topicPath);

      const progress: TopicProgress = {
        version: 1,
        topic: topicName,
        display_name: "Docker",
        description: "Learn Docker containerization",
        created_at: new Date().toISOString().split("T")[0],
        current_level: null,
        roadmap: {},
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress, "Topic Progress");

      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      expect(result.success).toBe(true);
      expect(result.data?.topic).toBe(topicName);
      expect(result.data?.display_name).toBe("Docker");
      expect(result.data?.current_level).toBeNull();
      expect(result.data?.roadmap).toEqual({});
    });

    it("should initialize rewards.yaml", async () => {
      const topicName = "docker";
      const topicPath = `src/${topicName}`;

      await createDirectory(topicPath);

      const rewards = {
        version: 1,
        topic: topicName,
        created_at: new Date().toISOString().split("T")[0],
        badges: [],
        milestones: [],
      };

      await writeYaml(`${topicPath}/rewards.yaml`, rewards, "Topic Rewards");

      const result = await readYaml<typeof rewards>(`${topicPath}/rewards.yaml`);
      expect(result.success).toBe(true);
      expect(result.data?.topic).toBe(topicName);
      expect(result.data?.badges).toEqual([]);
    });

    it("should reject invalid kebab-case names", () => {
      const invalidNames = ["Docker", "python_async", "docker--basics"];

      for (const name of invalidNames) {
        expect(isValidKebabCase(name)).toBe(false);
      }
    });

    it("should detect existing topic", async () => {
      const topicPath = "src/docker";
      await createDirectory(topicPath);

      const exists = await fileExists(topicPath);
      expect(exists).toBe(true);
    });

    it("should convert kebab-case to title case for display name", () => {
      const toTitleCase = (str: string): string => {
        return str
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

      expect(toTitleCase("docker")).toBe("Docker");
      expect(toTitleCase("python-async")).toBe("Python Async");
      expect(toTitleCase("docker-basics-101")).toBe("Docker Basics 101");
    });
  });

  describe("getTopic", () => {
    it("should return topic details from progress.yaml", async () => {
      const topicName = "docker";
      const topicPath = `src/${topicName}`;

      await createDirectory(topicPath);

      const progress: TopicProgress = {
        version: 1,
        topic: topicName,
        display_name: "Docker",
        description: "Learn Docker",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {
          starter: {
            status: "active",
            courses: [
              { id: "01-intro", name: "Introduction", mandatory: true, completed: true },
              { id: "02-basics", name: "Basics", mandatory: true, completed: false },
            ],
            exercices: {},
          },
        },
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress, "Topic Progress");

      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      expect(result.success).toBe(true);
      expect(result.data?.current_level).toBe("starter");
      expect(result.data?.roadmap.starter?.courses).toHaveLength(2);
    });

    it("should calculate completion stats", async () => {
      const topicPath = "src/docker";
      await createDirectory(topicPath);

      const progress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {
          starter: {
            status: "active",
            courses: [
              { id: "01-intro", name: "Intro", mandatory: true, completed: true },
              { id: "02-basics", name: "Basics", mandatory: true, completed: false },
            ],
            exercices: {
              "01-intro": [
                { id: "ex-01", name: "Ex 1", mandatory: true, completed: true },
                { id: "ex-02", name: "Ex 2", mandatory: false, completed: false },
              ],
            },
          },
        },
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress, "Topic Progress");

      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
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

      expect(totalCourses).toBe(2);
      expect(completedCourses).toBe(1);
      expect(totalExercises).toBe(2);
      expect(completedExercises).toBe(1);
      expect(Math.round((completedCourses / totalCourses) * 100)).toBe(50);
    });

    it("should handle non-existent topic", async () => {
      const result = await readYaml<TopicProgress>("src/nonexistent/progress.yaml");
      expect(result.success).toBe(false);
    });
  });

  describe("listTopics", () => {
    it("should list all topics in src folder", async () => {
      // Create multiple topics
      await createDirectory("src/docker");
      await createDirectory("src/python");

      const dockerProgress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {},
        progress: {},
        extras: [],
      };

      const pythonProgress: TopicProgress = {
        version: 1,
        topic: "python",
        display_name: "Python",
        description: "",
        created_at: "2026-01-11",
        current_level: "beginner",
        roadmap: {},
        progress: {},
        extras: [],
      };

      await writeYaml("src/docker/progress.yaml", dockerProgress);
      await writeYaml("src/python/progress.yaml", pythonProgress);

      // Read directories
      const srcPath = path.join(TEST_DATA_PATH, "src");
      const entries = await fs.readdir(srcPath, { withFileTypes: true });
      const topics = entries.filter(e => e.isDirectory()).map(e => e.name);

      expect(topics).toContain("docker");
      expect(topics).toContain("python");
      expect(topics).toHaveLength(2);
    });

    it("should include progress stats when requested", async () => {
      await createDirectory("src/docker");

      const progress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {
          starter: {
            status: "active",
            courses: [
              { id: "01-intro", name: "Intro", mandatory: true, completed: true },
              { id: "02-basics", name: "Basics", mandatory: true, completed: true },
              { id: "03-advanced", name: "Advanced", mandatory: true, completed: false },
              { id: "04-expert", name: "Expert", mandatory: true, completed: false },
            ],
            exercices: {},
          },
        },
        progress: {},
        extras: [],
      };

      await writeYaml("src/docker/progress.yaml", progress);

      const result = await readYaml<TopicProgress>("src/docker/progress.yaml");
      const courses = result.data!.roadmap.starter?.courses || [];
      const completed = courses.filter(c => c.completed).length;
      const completion = Math.round((completed / courses.length) * 100);

      expect(completion).toBe(50);
    });
  });

  describe("initializeLevel", () => {
    it("should set starting level in progress.yaml", async () => {
      const topicPath = "src/docker";
      await createDirectory(topicPath);

      const progress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: null,
        roadmap: {},
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress);

      // Update with level
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      const data = result.data!;

      data.current_level = "starter";
      data.roadmap["starter"] = {
        status: "pending",
        courses: [],
        exercices: {},
      };

      await writeYaml(`${topicPath}/progress.yaml`, data);

      const updated = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      expect(updated.data?.current_level).toBe("starter");
      expect(updated.data?.roadmap.starter?.status).toBe("pending");
    });

    it("should reject if level already set", async () => {
      const topicPath = "src/docker";
      await createDirectory(topicPath);

      const progress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {
          starter: { status: "active", courses: [], exercices: {} },
        },
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress);

      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      expect(result.data?.current_level).not.toBeNull();
    });

    it("should validate level is one of allowed values", () => {
      const validLevels = ["starter", "beginner", "advanced", "expert"];
      const invalidLevels = ["master", "pro", "newbie", ""];

      for (const level of validLevels) {
        expect(LEVELS.includes(level as any)).toBe(true);
      }

      for (const level of invalidLevels) {
        expect(LEVELS.includes(level as any)).toBe(false);
      }
    });
  });

  describe("setRoadmap", () => {
    it("should save roadmap to progress.yaml", async () => {
      const topicPath = "src/docker";
      await createDirectory(`${topicPath}/courses/starter`);
      await createDirectory(`${topicPath}/exercices/starter`);

      const progress: TopicProgress = {
        version: 1,
        topic: "docker",
        display_name: "Docker",
        description: "",
        created_at: "2026-01-11",
        current_level: "starter",
        roadmap: {
          starter: { status: "pending", courses: [], exercices: {} },
        },
        progress: {},
        extras: [],
      };

      await writeYaml(`${topicPath}/progress.yaml`, progress);

      // Update with roadmap
      const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      const data = result.data!;

      data.roadmap["starter"] = {
        status: "active",
        courses: [
          { id: "01-intro", name: "Introduction", mandatory: true, completed: false },
          { id: "02-basics", name: "Basics", mandatory: true, completed: false },
        ],
        exercices: {
          "01-intro": [
            { id: "exercice-01", name: "First Exercise", mandatory: true, completed: false },
          ],
        },
        quizRequired: true,
        quizPassed: false,
      };

      await writeYaml(`${topicPath}/progress.yaml`, data);

      const updated = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);
      expect(updated.data?.roadmap.starter?.status).toBe("active");
      expect(updated.data?.roadmap.starter?.courses).toHaveLength(2);
      expect(updated.data?.roadmap.starter?.quizRequired).toBe(true);
    });

    it("should create course placeholder files", async () => {
      const topicPath = "src/docker";
      const level = "starter";
      await createDirectory(`${topicPath}/courses/${level}`);

      const courses = [
        { name: "intro", displayName: "Introduction" },
        { name: "basics", displayName: "Basics" },
      ];

      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        const number = String(i + 1).padStart(2, "0");
        const filename = `${number}-${course.name}.md`;
        const coursePath = path.join(TEST_DATA_PATH, topicPath, "courses", level, filename);

        const placeholder = `# ${course.displayName}\n\n> Course content to be generated by Claude\n`;
        await fs.writeFile(coursePath, placeholder);
      }

      // Verify files created
      const files = await fs.readdir(path.join(TEST_DATA_PATH, topicPath, "courses", level));
      expect(files).toContain("01-intro.md");
      expect(files).toContain("02-basics.md");

      // Verify content
      const content = await fs.readFile(
        path.join(TEST_DATA_PATH, topicPath, "courses", level, "01-intro.md"),
        "utf-8"
      );
      expect(content).toContain("# Introduction");
    });

    it("should create exercise folders with structure", async () => {
      const topicPath = "src/docker";
      const level = "starter";
      const courseId = "01-intro";

      await createDirectory(`${topicPath}/exercices/${level}/${courseId}/exercice-01/result`);
      await createDirectory(`${topicPath}/exercices/${level}/${courseId}/exercice-01/sandbox`);

      // Create exercise placeholder
      const exercisePath = path.join(
        TEST_DATA_PATH,
        topicPath,
        "exercices",
        level,
        courseId,
        "exercice-01",
        "exercice.md"
      );

      const placeholder = `# Exercise: First Exercise\n\n> Instructions to be generated by Claude\n`;
      await fs.writeFile(exercisePath, placeholder);

      // Verify structure
      const exerciseDir = path.join(TEST_DATA_PATH, topicPath, "exercices", level, courseId, "exercice-01");
      const entries = await fs.readdir(exerciseDir);

      expect(entries).toContain("exercice.md");
      expect(entries).toContain("result");
      expect(entries).toContain("sandbox");
    });

    it("should auto-number courses based on input order", () => {
      const courses = [
        { name: "what-is-docker", displayName: "What is Docker?" },
        { name: "installation", displayName: "Installing Docker" },
        { name: "first-container", displayName: "Your First Container" },
      ];

      const numbered = courses.map((c, i) => ({
        id: `${String(i + 1).padStart(2, "0")}-${c.name}`,
        ...c,
      }));

      expect(numbered[0].id).toBe("01-what-is-docker");
      expect(numbered[1].id).toBe("02-installation");
      expect(numbered[2].id).toBe("03-first-container");
    });
  });
  describe("Security: Path Traversal Validation (Issue #69)", () => {
    describe("isValidTopicPath", () => {
      it("should accept valid topic names", () => {
        expect(isValidTopicPath("docker")).toBe(true);
        expect(isValidTopicPath("python-async")).toBe(true);
        expect(isValidTopicPath("docker-basics-101")).toBe(true);
      });

      it("should accept valid subtopic paths", () => {
        expect(isValidTopicPath("aws/ec2")).toBe(true);
        expect(isValidTopicPath("cloud/kubernetes")).toBe(true);
      });

      it("should reject path traversal attempts with ..", () => {
        expect(isValidTopicPath("../etc/passwd")).toBe(false);
        expect(isValidTopicPath("docker/../..")).toBe(false);
        expect(isValidTopicPath("..")).toBe(false);
        expect(isValidTopicPath("docker/..")).toBe(false);
        expect(isValidTopicPath("../docker")).toBe(false);
      });

      it("should reject backslash path separators", () => {
        expect(isValidTopicPath(String.raw`docker\secrets`)).toBe(false);
        expect(isValidTopicPath(String.raw`..\etc\passwd`)).toBe(false);
        expect(isValidTopicPath(String.raw`topic\subtopic`)).toBe(false);
      });

      it("should reject null bytes", () => {
        expect(isValidTopicPath("docker ")).toBe(false);
        expect(isValidTopicPath("topic /subtopic")).toBe(false);
      });

      it("should reject empty strings", () => {
        expect(isValidTopicPath("")).toBe(false);
        expect(isValidTopicPath("  ")).toBe(false);
      });

      it("should reject leading/trailing slashes", () => {
        expect(isValidTopicPath("/docker")).toBe(false);
        expect(isValidTopicPath("docker/")).toBe(false);
        expect(isValidTopicPath("/docker/")).toBe(false);
      });

      it("should reject multiple consecutive slashes", () => {
        expect(isValidTopicPath("aws//ec2")).toBe(false);
        expect(isValidTopicPath("docker///")).toBe(false);
      });

      it("should reject paths with more than 2 segments", () => {
        expect(isValidTopicPath("aws/ec2/instances")).toBe(false);
        expect(isValidTopicPath("a/b/c/d")).toBe(false);
      });

      it("should reject invalid kebab-case segments", () => {
        expect(isValidTopicPath("Docker")).toBe(false);
        expect(isValidTopicPath("aws/EC2")).toBe(false);
        expect(isValidTopicPath("docker_basics")).toBe(false);
        expect(isValidTopicPath("docker basics")).toBe(false);
      });
    });
  });
});
