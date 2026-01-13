/**
 * Trainer Tools
 *
 * Tools for managing trainer profile and points.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readYaml, writeYaml, fileExists } from "../services/yaml.js";
import { TRAINER_RANKS } from "../config/constants.js";
import { calculateRank, pointsToNextRank } from "../services/points.js";
import type { TrainerData, PointHistoryEntry } from "../types/trainer.js";

/**
 * Response types for trainer handlers
 */
interface GetTrainerResponse {
  success: boolean;
  error?: string;
  name?: string | null;
  rank?: string;
  totalPoints?: number;
  startedAt?: string | null;
  settings?: {
    wild_encounters: boolean;
    notifications: boolean;
  };
  achievements?: {
    first_pokemon: string | null;
    first_badge: string | null;
    first_legendary: string | null;
  };
  point_history?: PointHistoryEntry[];
}

interface UpdateTrainerResponse {
  success: boolean;
  error?: string;
  updated?: string[];
  trainer?: {
    name: string | null;
    startedAt: string | null;
    settings: {
      wild_encounters: boolean;
      notifications: boolean;
    };
  };
}

interface AddPointsResponse {
  success: boolean;
  error?: string;
  pointsAdded?: number;
  newTotal?: number;
  rankChange?: {
    previous: string;
    new: string;
  };
}

interface GetRankResponse {
  success: boolean;
  error?: string;
  currentRank?: string;
  totalPoints?: number;
  nextRank?: {
    name: string;
    pointsNeeded: number;
  } | null;
}

interface GetPointHistoryResponse {
  success: boolean;
  error?: string;
  entries?: PointHistoryEntry[];
  total?: number;
  limit?: number;
  offset?: number;
}

/**
 * Get trainer profile and stats
 */
export async function getTrainer(input: {
  includeHistory?: boolean;
}): Promise<GetTrainerResponse> {
  // Initialize trainer.yaml if it doesn't exist
  const exists = await fileExists("trainer.yaml");
  if (!exists) {
    const initialTrainer: TrainerData = {
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
    };
    await writeYaml("trainer.yaml", initialTrainer, "Professor Oak - Trainer");
  }

  const result = await readYaml<TrainerData>("trainer.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;

  const response: GetTrainerResponse = {
    success: true,
    name: data.trainer,
    rank: data.rank,
    totalPoints: data.total_points,
    startedAt: data.started_at,
    settings: data.settings,
    achievements: data.achievements,
  };

  if (input.includeHistory) {
    response.point_history = data.point_history;
  }

  return response;
}

/**
 * Update trainer profile settings
 */
export async function updateTrainer(input: {
  name?: string;
  settings?: {
    wild_encounters?: boolean;
    notifications?: boolean;
  };
}): Promise<UpdateTrainerResponse> {
  const result = await readYaml<TrainerData>("trainer.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  const updated: string[] = [];

  // Update name
  if (input.name !== undefined) {
    // If first time setting name, set started_at
    if (data.trainer === null && data.started_at === null) {
      data.started_at = new Date().toISOString().split("T")[0];
    }
    data.trainer = input.name;
    updated.push("name");
  }

  // Update settings
  if (input.settings !== undefined) {
    if (input.settings.wild_encounters !== undefined) {
      data.settings.wild_encounters = input.settings.wild_encounters;
    }
    if (input.settings.notifications !== undefined) {
      data.settings.notifications = input.settings.notifications;
    }
    updated.push("settings");
  }

  // Save changes
  await writeYaml("trainer.yaml", data, "Professor Oak - Trainer Profile");

  return {
    success: true,
    updated,
    trainer: {
      name: data.trainer,
      startedAt: data.started_at,
      settings: data.settings,
    },
  };
}

/**
 * Add points for an action
 */
export async function addPoints(input: {
  points: number;
  action: string;
  topic: string;
  details?: Record<string, string>;
}): Promise<AddPointsResponse> {
  // Security: Validate that points is a positive number (Issue #53)
  if (typeof input.points !== "number" || !Number.isFinite(input.points)) {
    return {
      success: false,
      error: "Points must be a valid number",
    };
  }

  if (input.points <= 0) {
    return {
      success: false,
      error: "Points must be a positive number (greater than 0)",
    };
  }

  const result = await readYaml<TrainerData>("trainer.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  const previousRank = data.rank;
  const previousTotal = data.total_points;

  // Add points
  data.total_points += input.points;

  // Add to history
  const historyEntry: PointHistoryEntry = {
    date: new Date().toISOString().split("T")[0],
    action: input.action,
    topic: input.topic,
    points: `+${input.points}`,
    ...input.details,
  };

  if (!data.point_history) {
    data.point_history = [];
  }
  data.point_history.push(historyEntry);

  // Check for rank promotion
  const newRank = calculateRank(data.total_points);
  let rankChange: { previous: string; new: string } | undefined;

  if (newRank !== previousRank) {
    data.rank = newRank;
    rankChange = {
      previous: previousRank,
      new: newRank,
    };
  }

  // Save changes
  await writeYaml("trainer.yaml", data, "Professor Oak - Trainer Profile");

  const response: AddPointsResponse = {
    success: true,
    pointsAdded: input.points,
    newTotal: data.total_points,
  };

  if (rankChange) {
    response.rankChange = rankChange;
  }

  return response;
}

/**
 * Get current rank and progress to next
 */
export async function getRank(input: {}): Promise<GetRankResponse> {
  const result = await readYaml<TrainerData>("trainer.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  const currentRank = calculateRank(data.total_points);
  const nextRankInfo = pointsToNextRank(data.total_points);

  return {
    success: true,
    currentRank,
    totalPoints: data.total_points,
    nextRank: nextRankInfo
      ? {
          name: nextRankInfo.rank,
          pointsNeeded: nextRankInfo.points,
        }
      : null,
  };
}

/**
 * Get point history with filtering
 */
export async function getPointHistory(input: {
  topic?: string;
  limit?: number;
  offset?: number;
}): Promise<GetPointHistoryResponse> {
  const result = await readYaml<TrainerData>("trainer.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  let entries = data.point_history || [];

  // Filter by topic if provided
  if (input.topic) {
    entries = entries.filter((e) => e.topic === input.topic);
  }

  // Apply pagination
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  const paginatedEntries = entries.slice(offset, offset + limit);

  return {
    success: true,
    entries: paginatedEntries,
    total: entries.length,
    limit,
    offset,
  };
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
 * Register trainer tools with the MCP server
 */
export function registerTrainerTools(server: McpServer) {
  /**
   * getTrainer - Get trainer profile and stats
   */
  server.tool(
    "getTrainer",
    `Get trainer profile and stats.
     Returns name, rank, totalPoints, achievements, and settings.
     Optionally includes point history.`,
    {
      includeHistory: z
        .boolean()
        .optional()
        .describe("Include point_history in response"),
    },
    async ({ includeHistory }) => {
      const result = await getTrainer({ includeHistory });
      return jsonResponse(result);
    }
  );

  /**
   * updateTrainer - Update trainer profile settings
   */
  server.tool(
    "updateTrainer",
    `Update trainer profile settings.
     Can update name and/or settings (wild_encounters, notifications).
     If first time setting name, sets started_at automatically.`,
    {
      name: z.string().optional().describe("Trainer name"),
      settings: z
        .object({
          wild_encounters: z.boolean().optional(),
          notifications: z.boolean().optional(),
        })
        .optional()
        .describe("Trainer settings"),
    },
    async ({ name, settings }) => {
      const result = await updateTrainer({ name, settings });
      return jsonResponse(result);
    }
  );

  /**
   * addPoints - Add points for an action
   */
  server.tool(
    "addPoints",
    `Add points to trainer for completing an action.
     Updates total_points, adds to point_history with timestamp.
     Checks for rank promotion and returns new rank if promoted.`,
    {
      points: z.number().positive().describe("Points to add (must be positive)"),
      action: z
        .string()
        .describe(
          "Action type (course_complete, exercise_complete, quiz_pass, etc.)"
        ),
      topic: z.string().describe("Topic name"),
      details: z
        .record(z.string())
        .optional()
        .describe("Additional details (pokemon, badge, course, etc.)"),
    },
    async ({ points, action, topic, details }) => {
      const result = await addPoints({ points, action, topic, details });
      return jsonResponse(result);
    }
  );

  /**
   * getRank - Get current rank and progress to next
   */
  server.tool(
    "getRank",
    `Get current rank and progress to next rank.
     Returns current rank, total points, and next rank info (name, points needed).`,
    {},
    async () => {
      const result = await getRank({});
      return jsonResponse(result);
    }
  );

  /**
   * getPointHistory - Get point history with filtering
   */
  server.tool(
    "getPointHistory",
    `Get point history with optional filtering.
     Can filter by topic and supports pagination with limit/offset.`,
    {
      topic: z.string().optional().describe("Filter by topic"),
      limit: z.number().optional().describe("Max entries to return (default: 20)"),
      offset: z.number().optional().describe("Skip first N entries"),
    },
    async ({ topic, limit, offset }) => {
      const result = await getPointHistory({ topic, limit, offset });
      return jsonResponse(result);
    }
  );
}
