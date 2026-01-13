/**
 * Topic Management Tools
 *
 * Tools for creating and managing learning topics.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { readYaml, writeYaml, fileExists, createDirectory } from "../services/yaml.js";
import { LEVELS, isValidKebabCase, isValidTopicPath } from "../config/constants.js";
import { getTopicPath, getProgressPath, getRewardsPath, TOPICS_BASE_PATH } from "../services/paths.js";
import type { TopicProgress, LevelRoadmap } from "../types/progress.js";

/**
 * Get the data path from environment variable.
 * Uses lazy evaluation to allow tests to set DATA_PATH before each test.
 */
function getDataPath(): string {
  return process.env.DATA_PATH || "/data";
}

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
      const topicPath = `topics/${name}`;
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
      // Security: Validate topic path to prevent path traversal attacks
      if (!isValidTopicPath(topic)) {
        return jsonResponse({
          success: false,
          error: "Invalid topic path: must not contain traversal characters.",
        });
      }

      const topicPath = topic.includes("/")
        ? `topics/${topic.split("/")[0]}/subtopics/${topic.split("/")[1]}`
        : `topics/${topic}`;

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
      const srcPath = "topics";
      const topics: TopicListItem[] = [];

      try {
        const fullSrcPath = path.join(getDataPath(), srcPath);
        const entries = await fs.readdir(fullSrcPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            const progressPath = `${srcPath}/${entry.name}/progress.yaml`;
            const result = await readYaml<TopicProgress>(progressPath);

            if (result.success && result.data) {
              const topic: TopicListItem = {
                name: result.data.topic,
                displayName: result.data.display_name,
                path: `${srcPath}/${entry.name}`,
                currentLevel: result.data.current_level,
              };

              if (includeProgress) {
                // Calculate completion
                let total = 0;
                let completed = 0;
                for (const level of LEVELS) {
                  const levelData = result.data.roadmap[level];
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
      } catch {
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
      // Security: Validate topic path to prevent path traversal attacks
      if (!isValidTopicPath(topic)) {
        return jsonResponse({
          success: false,
          error: `Invalid topic path: "${topic}". Path must not contain traversal characters (../, \) and must be valid kebab-case.`,
        });
      }

      const topicPath = `topics/${topic}`;
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
      // Security: Validate topic path to prevent path traversal attacks
      if (!isValidTopicPath(topic)) {
        return jsonResponse({
          success: false,
          error: `Invalid topic path: "${topic}". Path must not contain traversal characters (../, \) and must be valid kebab-case.`,
        });
      }

      const topicPath = `topics/${topic}`;
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

        // Ensure directory exists
        await createDirectory(`${topicPath}/courses/${level}`);

        // Create placeholder file
        const placeholder = `# ${course.displayName}\n\n> Course content to be generated by Claude\n`;
        await fs.writeFile(path.join(getDataPath(), coursePath), placeholder);

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
            path.join(getDataPath(), `${exercisePath}/exercice.md`),
            exercisePlaceholder
          );

          exercisesCreated.push(`${number}-${course.name}/exercice-${exerciseNum}`);
        }
      }

      // Update progress.yaml with roadmap
      const levelRoadmap: LevelRoadmap = {
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
          levelRoadmap.exercices[courseId] = exercises.map((e, i) => ({
            id: `exercice-${String(i + 1).padStart(2, "0")}`,
            name: e.name,
            mandatory: e.mandatory,
            completed: false,
          }));
        }
      }

      data.roadmap[level] = levelRoadmap;

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

// Types
interface TopicListItem {
  name: string;
  displayName: string;
  path: string;
  currentLevel: string | null;
  completion?: number;
}

// Helper functions
function jsonResponse(data: unknown) {
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
