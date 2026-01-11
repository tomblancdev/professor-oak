/**
 * Rewards Tools
 *
 * Tools for managing badges and rewards.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { readYaml, writeYaml } from "../services/yaml.js";
import { POINTS, GYM_LEADERS, isValidLevel, LEVELS } from "../config/constants.js";
import type { Level } from "../config/constants.js";
import type { TopicRewards, Badge } from "../types/rewards.js";
import type { TopicProgress, LevelRoadmap } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";
import { calculateRank } from "../services/points.js";

const DATA_PATH = process.env.DATA_PATH || "/data";

/**
 * Get all topic directories that have rewards.yaml
 */
async function getTopicsWithRewards(): Promise<string[]> {
  const topics: string[] = [];
  const srcPath = path.join(DATA_PATH, "src");

  try {
    const entries = await fs.readdir(srcPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const rewardsPath = path.join(srcPath, entry.name, "rewards.yaml");
        try {
          await fs.access(rewardsPath);
          topics.push(entry.name);
        } catch {
          // No rewards.yaml, skip
        }
      }
    }
  } catch {
    // src directory doesn't exist
  }

  return topics;
}

/**
 * Check if all mandatory courses are completed for a level
 */
function areCoursesCompleted(roadmap: LevelRoadmap): {
  completed: boolean;
  total: number;
  done: number;
  missing: string[];
} {
  const mandatoryCourses = roadmap.courses.filter((c) => c.mandatory);
  const completedCourses = mandatoryCourses.filter((c) => c.completed);
  const missing = mandatoryCourses
    .filter((c) => !c.completed)
    .map((c) => c.id);

  return {
    completed: completedCourses.length === mandatoryCourses.length,
    total: mandatoryCourses.length,
    done: completedCourses.length,
    missing,
  };
}

/**
 * Check if all mandatory exercises are completed for a level
 */
function areExercisesCompleted(roadmap: LevelRoadmap): {
  completed: boolean;
  total: number;
  done: number;
  missing: string[];
} {
  const allExercises = Object.values(roadmap.exercices).flat();
  const mandatoryExercises = allExercises.filter((e) => e.mandatory);
  const completedExercises = mandatoryExercises.filter((e) => e.completed);
  const missing = mandatoryExercises
    .filter((e) => !e.completed)
    .map((e) => e.id);

  return {
    completed: completedExercises.length === mandatoryExercises.length,
    total: mandatoryExercises.length,
    done: completedExercises.length,
    missing,
  };
}

/**
 * Generate badge ID from level and topic
 */
function generateBadgeId(level: Level, topic: string): string {
  const gymLeader = GYM_LEADERS[level];
  const badgeName = gymLeader.badge.toLowerCase().replace(/ /g, "-");
  return `${badgeName}-${topic}`;
}

/**
 * Award a badge to trainer
 */
export async function awardBadge(input: {
  topic: string;
  level: string;
  badgeId?: string;
}): Promise<any> {
  // Validate level
  if (!isValidLevel(input.level)) {
    return {
      success: false,
      error: `Invalid level: ${input.level}. Must be one of: ${LEVELS.join(", ")}`,
    };
  }

  const level = input.level as Level;

  // Read progress.yaml
  const progressResult = await readYaml<TopicProgress>(
    `src/${input.topic}/progress.yaml`
  );

  if (!progressResult.success) {
    return {
      success: false,
      error: `Topic not found: ${input.topic}`,
    };
  }

  const progress = progressResult.data!;
  const roadmap = progress.roadmap[level];

  if (!roadmap) {
    return {
      success: false,
      error: `Level ${level} not initialized for topic ${input.topic}`,
    };
  }

  // Check if badge already earned
  let rewards: TopicRewards;
  const rewardsResult = await readYaml<TopicRewards>(
    `src/${input.topic}/rewards.yaml`
  );

  if (rewardsResult.success) {
    rewards = rewardsResult.data!;
    const existingBadge = rewards.badges.find((b) => b.level === level);
    if (existingBadge) {
      return {
        success: false,
        error: `Badge already earned for ${level} level in ${input.topic}`,
      };
    }
  } else {
    // Create new rewards file
    rewards = {
      version: 1,
      topic: input.topic,
      created_at: new Date().toISOString().split("T")[0],
      badges: [],
      milestones: [],
    };
  }

  // Check eligibility - courses
  const coursesStatus = areCoursesCompleted(roadmap);
  if (!coursesStatus.completed) {
    return {
      success: false,
      error: `Cannot award badge: ${coursesStatus.missing.length} mandatory courses not completed`,
      missing: coursesStatus.missing,
    };
  }

  // Check eligibility - exercises
  const exercisesStatus = areExercisesCompleted(roadmap);
  if (!exercisesStatus.completed) {
    return {
      success: false,
      error: `Cannot award badge: ${exercisesStatus.missing.length} mandatory exercises not completed`,
      missing: exercisesStatus.missing,
    };
  }

  // Check eligibility - quiz
  if (roadmap.quizRequired && !roadmap.quizPassed) {
    return {
      success: false,
      error: `Cannot award badge: quiz not passed for ${level} level`,
    };
  }

  // Read trainer data
  const trainerResult = await readYaml<TrainerData>("trainer.yaml");
  if (!trainerResult.success) {
    return {
      success: false,
      error: "Trainer data not found",
    };
  }

  const trainer = trainerResult.data!;
  const previousRank = trainer.rank;

  // Create badge
  const gymLeader = GYM_LEADERS[level];
  const badgeId = input.badgeId || generateBadgeId(level, input.topic);
  const today = new Date().toISOString().split("T")[0];

  const badge: Badge = {
    id: badgeId,
    name: gymLeader.badge,
    level: level,
    gym_leader: gymLeader.name,
    earned_at: today,
    points_earned: POINTS.BADGE_EARNED,
    quiz_score: "", // Will be updated from quiz data if available
  };

  // Add badge to rewards
  rewards.badges.push(badge);
  await writeYaml(
    `src/${input.topic}/rewards.yaml`,
    rewards,
    "Professor Oak - Topic Rewards"
  );

  // Update trainer
  trainer.total_points += POINTS.BADGE_EARNED;

  // Add point history entry
  trainer.point_history.push({
    date: today,
    action: "badge_earned",
    topic: input.topic,
    points: `+${POINTS.BADGE_EARNED}`,
    badge: gymLeader.badge,
    level: level,
  });

  // Update first_badge achievement if not set
  if (!trainer.achievements.first_badge) {
    trainer.achievements.first_badge = gymLeader.badge;
  }

  // Check for rank promotion
  const newRank = calculateRank(trainer.total_points);
  let rankChange: { previous: string; new: string } | undefined;

  if (newRank !== previousRank) {
    trainer.rank = newRank;
    rankChange = {
      previous: previousRank,
      new: newRank,
    };
  }

  await writeYaml("trainer.yaml", trainer, "Professor Oak - Trainer Profile");

  const response: any = {
    success: true,
    badge: {
      id: badge.id,
      name: badge.name,
      level: badge.level,
      gym_leader: badge.gym_leader,
      earned_at: badge.earned_at,
      topic: input.topic,
    },
    pointsAwarded: POINTS.BADGE_EARNED,
    message: `Congratulations! You earned the ${badge.name} from ${badge.gym_leader}!`,
  };

  if (rankChange) {
    response.rankChange = rankChange;
  }

  return response;
}

/**
 * Get earned badges
 */
export async function getBadges(input: { topic?: string }): Promise<any> {
  const allBadges: (Badge & { topic: string })[] = [];

  if (input.topic) {
    // Get badges for specific topic
    const rewardsResult = await readYaml<TopicRewards>(
      `src/${input.topic}/rewards.yaml`
    );

    if (!rewardsResult.success) {
      return {
        success: false,
        error: `Topic not found: ${input.topic}`,
      };
    }

    const rewards = rewardsResult.data!;
    for (const badge of rewards.badges) {
      allBadges.push({ ...badge, topic: input.topic });
    }
  } else {
    // Get badges from all topics
    const topics = await getTopicsWithRewards();

    for (const topic of topics) {
      const rewardsResult = await readYaml<TopicRewards>(
        `src/${topic}/rewards.yaml`
      );

      if (rewardsResult.success) {
        const rewards = rewardsResult.data!;
        for (const badge of rewards.badges) {
          allBadges.push({ ...badge, topic });
        }
      }
    }
  }

  return {
    success: true,
    badges: allBadges,
    total: allBadges.length,
  };
}

/**
 * Get rewards status for a topic
 */
export async function getRewards(input: {
  topic: string;
}): Promise<any> {
  // Read progress.yaml
  const progressResult = await readYaml<TopicProgress>(
    `src/${input.topic}/progress.yaml`
  );

  if (!progressResult.success) {
    return {
      success: false,
      error: `Topic not found: ${input.topic}`,
    };
  }

  const progress = progressResult.data!;

  // Read rewards.yaml
  const rewardsResult = await readYaml<TopicRewards>(
    `src/${input.topic}/rewards.yaml`
  );

  let rewards: TopicRewards | null = null;
  if (rewardsResult.success) {
    rewards = rewardsResult.data!;
  }

  // Calculate status for each level
  const levels = LEVELS as readonly Level[];
  const levelStatuses = levels.map((level) => {
    const roadmap = progress.roadmap[level];
    if (!roadmap) {
      return {
        level,
        status: "not_initialized",
      };
    }

    const coursesStatus = areCoursesCompleted(roadmap);
    const exercisesStatus = areExercisesCompleted(roadmap);
    const quizRequired = roadmap.quizRequired ?? false;
    const quizPassed = roadmap.quizPassed ?? false;

    const badgeEligible =
      coursesStatus.completed &&
      exercisesStatus.completed &&
      (!quizRequired || quizPassed);

    const earnedBadge = rewards?.badges.find((b) => b.level === level);

    return {
      level,
      status: roadmap.status,
      progress: {
        courses: {
          completed: coursesStatus.completed,
          total: coursesStatus.total,
          done: coursesStatus.done,
        },
        exercises: {
          completed: exercisesStatus.completed,
          total: exercisesStatus.total,
          done: exercisesStatus.done,
        },
        quiz: {
          required: quizRequired,
          passed: quizPassed,
        },
      },
      badge: {
        eligible: badgeEligible,
        earned: earnedBadge
          ? {
              id: earnedBadge.id,
              name: earnedBadge.name,
              earned_at: earnedBadge.earned_at,
              points: earnedBadge.points_earned,
            }
          : null,
        template: {
          name: GYM_LEADERS[level].badge,
          gym_leader: GYM_LEADERS[level].name,
          points: POINTS.BADGE_EARNED,
        },
      },
    };
  });

  return {
    success: true,
    topic: input.topic,
    levels: levelStatuses,
    badges: {
      total_earned: rewards?.badges.length ?? 0,
      earned: rewards?.badges ?? [],
    },
    milestones: {
      total: rewards?.milestones.length ?? 0,
      milestones: rewards?.milestones ?? [],
    },
  };
}

/**
 * Check if trainer qualifies for a badge
 */
export async function checkBadgeEligibility(input: {
  topic: string;
  level: string;
}): Promise<any> {
  // Validate level
  if (!isValidLevel(input.level)) {
    return {
      success: false,
      error: `Invalid level: ${input.level}. Must be one of: ${LEVELS.join(", ")}`,
    };
  }

  const level = input.level as Level;

  // Read progress.yaml
  const progressResult = await readYaml<TopicProgress>(
    `src/${input.topic}/progress.yaml`
  );

  if (!progressResult.success) {
    return {
      success: false,
      error: `Topic not found: ${input.topic}`,
    };
  }

  const progress = progressResult.data!;
  const roadmap = progress.roadmap[level];

  if (!roadmap) {
    return {
      success: false,
      error: `Level ${level} not initialized for topic ${input.topic}`,
    };
  }

  // Check if badge already earned
  const rewardsResult = await readYaml<TopicRewards>(
    `src/${input.topic}/rewards.yaml`
  );

  let alreadyEarned = false;
  if (rewardsResult.success) {
    const rewards = rewardsResult.data!;
    const existingBadge = rewards.badges.find((b) => b.level === level);
    if (existingBadge) {
      alreadyEarned = true;
    }
  }

  // Check courses
  const coursesStatus = areCoursesCompleted(roadmap);

  // Check exercises
  const exercisesStatus = areExercisesCompleted(roadmap);

  // Check quiz
  const quizRequired = roadmap.quizRequired ?? false;
  const quizPassed = roadmap.quizPassed ?? false;

  // Determine overall eligibility
  const eligible =
    !alreadyEarned &&
    coursesStatus.completed &&
    exercisesStatus.completed &&
    (!quizRequired || quizPassed);

  // Build missing items list
  const missing: string[] = [
    ...coursesStatus.missing,
    ...exercisesStatus.missing,
  ];
  if (quizRequired && !quizPassed) {
    missing.push("quiz");
  }

  // Get badge info
  const gymLeader = GYM_LEADERS[level];

  return {
    success: true,
    eligible,
    alreadyEarned,
    requirements: {
      courses: {
        completed: coursesStatus.completed,
        total: coursesStatus.total,
        done: coursesStatus.done,
      },
      exercises: {
        completed: exercisesStatus.completed,
        total: exercisesStatus.total,
        done: exercisesStatus.done,
      },
      quiz: {
        required: quizRequired,
        passed: quizPassed,
      },
    },
    missing: missing.length > 0 ? missing : undefined,
    badgeInfo: {
      name: gymLeader.badge,
      gym_leader: gymLeader.name,
      points: POINTS.BADGE_EARNED,
    },
  };
}

/**
 * JSON response helper for MCP tools
 */
function jsonResponse(data: any) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

/**
 * Register rewards tools with the MCP server
 */
export function registerRewardsTools(server: McpServer) {
  /**
   * getBadges - Get earned badges
   */
  server.tool(
    "getBadges",
    `Get all earned badges or filter by topic.
     Returns badge details including name, gym leader, earned date, and points.`,
    {
      topic: z.string().optional().describe("Filter by topic"),
    },
    async ({ topic }) => {
      const result = await getBadges({ topic });
      return jsonResponse(result);
    }
  );

  /**
   * awardBadge - Award a badge to trainer
   */
  server.tool(
    "awardBadge",
    `Award a badge to trainer for completing a level.
     Validates that all courses, mandatory exercises, and quiz are completed.
     Awards BADGE_EARNED points (500) and updates first_badge achievement.`,
    {
      topic: z.string().describe("Topic name (e.g., 'docker')"),
      level: z
        .string()
        .describe("Level name (starter, beginner, advanced, expert)"),
      badgeId: z
        .string()
        .optional()
        .describe("Custom badge ID (auto-generated if not provided)"),
    },
    async ({ topic, level, badgeId }) => {
      const result = await awardBadge({ topic, level, badgeId });
      return jsonResponse(result);
    }
  );

  /**
   * getRewards - Get rewards status for a topic
   */
  server.tool(
    "getRewards",
    `Get rewards status for a topic.
     Returns progress toward badges for each level, earned badges, and milestones.`,
    {
      topic: z.string().describe("Topic name (e.g., 'docker')"),
    },
    async ({ topic }) => {
      const result = await getRewards({ topic });
      return jsonResponse(result);
    }
  );

  /**
   * checkBadgeEligibility - Check if trainer qualifies for a badge
   */
  server.tool(
    "checkBadgeEligibility",
    `Check if trainer qualifies for a badge.
     Returns eligibility status, requirements, and missing items.`,
    {
      topic: z.string().describe("Topic name"),
      level: z
        .string()
        .describe("Level name (starter, beginner, advanced, expert)"),
    },
    async ({ topic, level }) => {
      const result = await checkBadgeEligibility({ topic, level });
      return jsonResponse(result);
    }
  );
}
