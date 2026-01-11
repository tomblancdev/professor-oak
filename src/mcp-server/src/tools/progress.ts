/**
 * Progress Tools
 *
 * Tools for tracking learning progress.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { readYaml, writeYaml } from "../services/yaml.js";
import { LEVELS, POINTS } from "../config/constants.js";
import { calculateRank } from "../services/points.js";
import type { TopicProgress, LevelRoadmap } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";

/**
 * Get the data path from environment variable.
 * Uses lazy evaluation to allow tests to set DATA_PATH before each test.
 */
function getDataPath(): string {
  return process.env.DATA_PATH || "/data";
}

// Types for handler responses
interface ProgressResponse {
  success: boolean;
  error?: string;
  topic?: string;
  currentLevel?: string | null;
  levels?: Record<string, LevelProgress>;
  extras?: { count: number };
}

interface LevelProgress {
  status: string;
  completion?: number;
  courses?: {
    total: number;
    completed: number;
    items?: Array<{ id: string; name: string; completed: boolean }>;
  };
  exercices?: {
    total: number;
    completed: number;
    mandatory: { total: number; completed: number };
  };
  quiz?: {
    required: boolean;
    passed: boolean;
  };
}

interface CompleteItemResponse {
  success: boolean;
  error?: string;
  item?: string;
  type?: string;
  pointsAwarded?: number;
  message?: string;
  levelProgress?: {
    completion: number;
    remaining: {
      courses: number;
      mandatoryExercises: number;
      quizPassed: boolean;
    };
  };
  levelComplete?: boolean;
}

interface NextActionResponse {
  success: boolean;
  error?: string;
  topic?: string;
  currentLevel?: string | null;
  nextAction?: {
    type: string;
    id?: string;
    name?: string;
    path?: string;
    message: string;
    level?: string;
    nextLevel?: string;
    course?: string;
  };
  alternatives?: Array<{ type: string; id?: string; message: string }>;
}

interface OverallProgressResponse {
  success: boolean;
  trainer: {
    name: string | null;
    rank: string;
    totalPoints: number;
  } | null;
  topics: Array<{
    name: string;
    displayName: string;
    path: string;
    currentLevel: string | null;
    completion: number;
  }>;
  totals: {
    topics: number;
  };
}

/**
 * Handler for getProgress tool
 */
export async function getProgressHandler(args: {
  topic?: string;
  level?: string;
}): Promise<ProgressResponse> {
  const { topic, level } = args;

  if (!topic) {
    // Return overall progress
    return await getOverallProgressHandler({});
  }

  // Determine topic path (handle subtopics like aws/ec2)
  const topicPath = topic.includes("/")
    ? `src/${topic.split("/")[0]}/subtopics/${topic.split("/")[1]}`
    : `src/${topic}`;

  const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: `Topic "${topic}" not found`,
    };
  }

  const data = result.data;
  const levels: Record<string, LevelProgress> = {};

  for (const lvl of LEVELS) {
    const levelData = data.roadmap[lvl];

    if (!levelData) {
      levels[lvl] = { status: "locked" };
      continue;
    }

    const courses = levelData.courses || [];
    const completedCourses = courses.filter((c) => c.completed).length;

    let totalExercises = 0;
    let completedExercises = 0;
    let mandatoryTotal = 0;
    let mandatoryCompleted = 0;

    for (const exercises of Object.values(levelData.exercices || {})) {
      totalExercises += exercises.length;
      completedExercises += exercises.filter((e) => e.completed).length;
      mandatoryTotal += exercises.filter((e) => e.mandatory).length;
      mandatoryCompleted += exercises.filter(
        (e) => e.mandatory && e.completed
      ).length;
    }

    levels[lvl] = {
      status: levelData.status,
      completion:
        courses.length > 0
          ? Math.round((completedCourses / courses.length) * 100)
          : 0,
      courses: {
        total: courses.length,
        completed: completedCourses,
        items: courses.map((c) => ({
          id: c.id,
          name: c.name,
          completed: c.completed,
        })),
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

  return {
    success: true,
    topic: data.topic,
    currentLevel: data.current_level,
    levels,
    extras: {
      count: data.extras?.length || 0,
    },
  };
}

/**
 * Handler for completeItem tool
 */
export async function completeItemHandler(args: {
  topic: string;
  level: string;
  type: "course" | "exercise";
  itemId: string;
  courseId?: string;
}): Promise<CompleteItemResponse> {
  const { topic, level, type, itemId, courseId } = args;

  const topicPath = `src/${topic}`;
  const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

  if (!result.success || !result.data) {
    return { success: false, error: `Topic "${topic}" not found` };
  }

  const data = result.data;
  const levelData = data.roadmap[level];

  if (!levelData) {
    return { success: false, error: `Level "${level}" not found in roadmap` };
  }

  let pointsAwarded = 0;
  const today = new Date().toISOString().split("T")[0];

  if (type === "course") {
    const course = levelData.courses?.find((c) => c.id === itemId);
    if (!course) {
      return { success: false, error: `Course "${itemId}" not found` };
    }
    if (course.completed) {
      return { success: false, error: `Course "${itemId}" already completed` };
    }

    course.completed = true;
    course.completed_at = today;
    pointsAwarded = POINTS.COURSE_COMPLETE;
  } else {
    // Exercise
    if (!courseId) {
      return { success: false, error: "courseId required for exercises" };
    }

    const exercises = levelData.exercices?.[courseId];
    if (!exercises) {
      return {
        success: false,
        error: `No exercises for course "${courseId}"`,
      };
    }

    const exercise = exercises.find((e) => e.id === itemId);
    if (!exercise) {
      return { success: false, error: `Exercise "${itemId}" not found` };
    }
    if (exercise.completed) {
      return {
        success: false,
        error: `Exercise "${itemId}" already completed`,
      };
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
  const completedCourses = courses.filter((c) => c.completed).length;

  let mandatoryExercises = 0;
  let completedMandatory = 0;
  for (const exercises of Object.values(levelData.exercices || {})) {
    mandatoryExercises += exercises.filter((e) => e.mandatory).length;
    completedMandatory += exercises.filter(
      (e) => e.mandatory && e.completed
    ).length;
  }

  const levelComplete =
    completedCourses === courses.length &&
    completedMandatory === mandatoryExercises &&
    (levelData.quizPassed || !levelData.quizRequired);

  return {
    success: true,
    item: itemId,
    type,
    pointsAwarded,
    levelProgress: {
      completion:
        courses.length > 0
          ? Math.round((completedCourses / courses.length) * 100)
          : 100,
      remaining: {
        courses: courses.length - completedCourses,
        mandatoryExercises: mandatoryExercises - completedMandatory,
        quizPassed: levelData.quizPassed || !levelData.quizRequired,
      },
    },
    levelComplete,
    message: `${type === "course" ? "Course" : "Exercise"} completed! +${pointsAwarded} points`,
  };
}

/**
 * Handler for getNextAction tool
 */
export async function getNextActionHandler(args: {
  topic: string;
}): Promise<NextActionResponse> {
  const { topic } = args;

  const topicPath = `src/${topic}`;
  const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

  if (!result.success || !result.data) {
    return { success: false, error: `Topic "${topic}" not found` };
  }

  const data = result.data;

  // No level set yet
  if (!data.current_level) {
    return {
      success: true,
      topic,
      nextAction: {
        type: "select_level",
        message:
          "Select your starting level: starter, beginner, advanced, or expert",
      },
    };
  }

  const level = data.current_level;
  const levelData = data.roadmap[level];

  if (!levelData || !levelData.courses || levelData.courses.length === 0) {
    return {
      success: true,
      topic,
      currentLevel: level,
      nextAction: {
        type: "generate_roadmap",
        message: "Generate a roadmap for this level",
      },
    };
  }

  // Find incomplete course
  const incompleteCourse = levelData.courses.find((c) => !c.completed);
  if (incompleteCourse) {
    return {
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
    };
  }

  // All courses done - check mandatory exercises
  for (const [courseId, exercises] of Object.entries(
    levelData.exercices || {}
  )) {
    const incompleteExercise = exercises.find((e) => e.mandatory && !e.completed);
    if (incompleteExercise) {
      return {
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
      };
    }
  }

  // All courses and mandatory exercises done - need quiz
  if (levelData.quizRequired && !levelData.quizPassed) {
    return {
      success: true,
      topic,
      currentLevel: level,
      nextAction: {
        type: "quiz",
        level,
        message: "Take the level quiz to earn your badge!",
      },
    };
  }

  // Level complete - unlock next
  const currentIndex = LEVELS.indexOf(level as (typeof LEVELS)[number]);
  if (currentIndex < LEVELS.length - 1) {
    return {
      success: true,
      topic,
      currentLevel: level,
      nextAction: {
        type: "next_level",
        nextLevel: LEVELS[currentIndex + 1],
        message: `Level complete! Ready for ${LEVELS[currentIndex + 1]}?`,
      },
    };
  }

  // Topic mastery achieved
  return {
    success: true,
    topic,
    currentLevel: level,
    nextAction: {
      type: "mastery",
      message: "Congratulations! You've mastered this topic!",
    },
  };
}

/**
 * Handler for getOverallProgress
 */
export async function getOverallProgressHandler(args: {
  includeExtras?: boolean;
}): Promise<OverallProgressResponse> {
  const topics: Array<{
    name: string;
    displayName: string;
    path: string;
    currentLevel: string | null;
    completion: number;
  }> = [];

  // Read trainer data
  const trainerResult = await readYaml<TrainerData>("trainer.yaml");
  const trainer = trainerResult.success && trainerResult.data
    ? {
        name: trainerResult.data.trainer,
        rank: trainerResult.data.rank,
        totalPoints: trainerResult.data.total_points,
      }
    : null;

  // Scan src directory for topics
  try {
    const srcPath = path.join(getDataPath(), "src");
    const entries = await fs.readdir(srcPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        const progressPath = `src/${entry.name}/progress.yaml`;
        const result = await readYaml<TopicProgress>(progressPath);

        if (result.success && result.data) {
          const data = result.data;

          // Calculate completion across all levels
          let totalCourses = 0;
          let completedCourses = 0;

          for (const lvl of LEVELS) {
            const levelData = data.roadmap[lvl];
            if (levelData?.courses) {
              totalCourses += levelData.courses.length;
              completedCourses += levelData.courses.filter(
                (c) => c.completed
              ).length;
            }
          }

          topics.push({
            name: data.topic,
            displayName: data.display_name,
            path: `src/${entry.name}`,
            currentLevel: data.current_level,
            completion:
              totalCourses > 0
                ? Math.round((completedCourses / totalCourses) * 100)
                : 0,
          });
        }
      }
    }
  } catch {
    // No src folder yet - return empty list
  }

  return {
    success: true,
    trainer,
    topics,
    totals: {
      topics: topics.length,
    },
  };
}

/**
 * Internal helper to add points to trainer
 */
async function addPointsInternal(
  points: number,
  action: string,
  topic: string,
  details: Record<string, string>
): Promise<void> {
  const result = await readYaml<TrainerData>("trainer.yaml");
  if (!result.success || !result.data) return;

  const data = result.data;
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

/**
 * JSON response helper for MCP tools
 */
function jsonResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

/**
 * Register progress tools with MCP server
 */
export function registerProgressTools(server: McpServer) {
  /**
   * Get progress for a topic
   */
  server.tool(
    "getProgress",
    `Get detailed progress for a topic or all topics.
     Use this when user asks about their progress or you need to suggest next steps.`,
    {
      topic: z
        .string()
        .optional()
        .describe("Topic name (optional - returns all if omitted)"),
      level: z.string().optional().describe("Filter by specific level"),
    },
    async (args) => {
      const result = await getProgressHandler(args);
      return jsonResponse(result);
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
      itemId: z
        .string()
        .describe(
          "Course ID (e.g., '01-first-container') or exercise ID"
        ),
      courseId: z
        .string()
        .optional()
        .describe("Required if type is 'exercise'"),
    },
    async (args) => {
      const result = await completeItemHandler(args);
      return jsonResponse(result);
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
    async (args) => {
      const result = await getNextActionHandler(args);
      return jsonResponse(result);
    }
  );

  /**
   * Get overall progress (internal tool)
   */
  server.tool(
    "getOverallProgress",
    `Get global stats across all topics.
     Use this for the /progress command without arguments.`,
    {
      includeExtras: z
        .boolean()
        .optional()
        .describe("Include extra learnings count"),
    },
    async (args) => {
      const result = await getOverallProgressHandler(args);
      return jsonResponse(result);
    }
  );
}
