/**
 * Quiz Tools
 *
 * Tools for managing quizzes and Pokemon catching.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import { readYaml, writeYaml } from "../services/yaml.js";
import { calculateRank } from "../services/points.js";
import { QUIZ_TIERS, LEVEL_TIERS, GYM_LEADERS, type Level } from "../config/constants.js";
import type { TopicProgress } from "../types/progress.js";
import type { TrainerData } from "../types/trainer.js";
import type { PokedexData, PokemonEntry } from "../types/pokedex.js";
import type { QuizSession, QuizResult, QuizHistoryEntry } from "../types/quiz.js";

// Session persistence service
import { getSession, saveSession, removeSession } from "../services/quiz-sessions.js";

// Pokemon by tier (simplified)
export const pokemonByTier: Record<number, Array<{ id: number; name: string }>> = {
  1: [
    { id: 16, name: "Pidgey" },
    { id: 19, name: "Rattata" },
    { id: 10, name: "Caterpie" },
    { id: 13, name: "Weedle" },
  ],
  2: [
    { id: 4, name: "Charmander" },
    { id: 25, name: "Pikachu" },
    { id: 1, name: "Bulbasaur" },
    { id: 7, name: "Squirtle" },
  ],
  3: [
    { id: 6, name: "Charizard" },
    { id: 130, name: "Gyarados" },
    { id: 9, name: "Blastoise" },
    { id: 3, name: "Venusaur" },
  ],
  4: [
    { id: 149, name: "Dragonite" },
    { id: 248, name: "Tyranitar" },
    { id: 143, name: "Snorlax" },
    { id: 131, name: "Lapras" },
  ],
  5: [
    { id: 150, name: "Mewtwo" },
    { id: 384, name: "Rayquaza" },
    { id: 249, name: "Lugia" },
    { id: 250, name: "Ho-Oh" },
  ],
};

// Types for handler responses
interface StartQuizResponse {
  success: boolean;
  error?: string;
  sessionId: string;
  pokemon: { pokedexNumber: number; name: string; tier: number };
  parameters: { questionCount: number; passThreshold: number; passCount: number };
  gymLeader: { name: string; badge: string };
  context: { topic: string; course: string | null; level: string; type: "standard" | "wild" };
}

interface SubmitQuizResultResponse {
  success: boolean;
  error?: string;
  passed: boolean;
  score: { correct: number; total: number; percentage: number };
  pokemon: { caught: boolean; name: string; message: string };
  points: { earned: number; breakdown?: Record<string, number> };
}

interface GetQuizHistoryResponse {
  success: boolean;
  error?: string;
  entries: QuizHistoryEntry[];
}

/**
 * Select a random Pokemon from the available tiers
 */
function selectPokemon(level: Level): { pokedexNumber: number; name: string; tier: number } {
  const [minTier, maxTier] = LEVEL_TIERS[level];
  // Randomly choose a tier within the range
  const tier = Math.floor(Math.random() * (maxTier - minTier + 1)) + minTier;
  const pokemonList = pokemonByTier[tier];
  const selected = pokemonList[Math.floor(Math.random() * pokemonList.length)];
  return {
    pokedexNumber: selected.id,
    name: selected.name,
    tier,
  };
}

/**
 * Get quiz parameters from tier
 */
function getQuizParameters(tier: number): { questionCount: number; passThreshold: number; passCount: number } {
  const tierConfig = QUIZ_TIERS[tier as keyof typeof QUIZ_TIERS];
  const passCount = Math.ceil(tierConfig.questions * tierConfig.passRate);
  return {
    questionCount: tierConfig.questions,
    passThreshold: tierConfig.passRate,
    passCount,
  };
}

/**
 * Calculate points for quiz result
 */
function calculateQuizPoints(
  tier: number,
  correct: number,
  passed: boolean
): { total: number; breakdown: Record<string, number> } {
  const tierConfig = QUIZ_TIERS[tier as keyof typeof QUIZ_TIERS];

  if (correct === 0) {
    return { total: 0, breakdown: { base: 0, catchBonus: 0, perCorrect: 0 } };
  }

  const perCorrectPoints = correct * tierConfig.perCorrect;

  if (passed) {
    // Full points: base + catchBonus + perCorrect
    const base = tierConfig.base;
    const catchBonus = tierConfig.catchBonus;
    return {
      total: base + catchBonus + perCorrectPoints,
      breakdown: { base, catchBonus, perCorrect: perCorrectPoints },
    };
  } else {
    // Partial points: only perCorrect (no base or catchBonus)
    return {
      total: perCorrectPoints,
      breakdown: { base: 0, catchBonus: 0, perCorrect: perCorrectPoints },
    };
  }
}

/**
 * Handler for startQuiz tool
 */
export async function startQuizHandler(args: {
  topic: string;
  course?: string;
  type?: "standard" | "wild";
}): Promise<StartQuizResponse> {
  const { topic, course, type = "standard" } = args;

  // Read topic progress
  const topicPath = `topics/${topic}`;
  const result = await readYaml<TopicProgress>(`${topicPath}/progress.yaml`);

  if (!result.success || !result.data) {
    return {
      success: false,
      error: `Topic "${topic}" not found`,
      sessionId: "",
      pokemon: { pokedexNumber: 0, name: "", tier: 0 },
      parameters: { questionCount: 0, passThreshold: 0, passCount: 0 },
      gymLeader: { name: "", badge: "" },
      context: { topic: "", course: null, level: "", type: "standard" },
    };
  }

  const data = result.data;

  // Check if level is set
  if (!data.current_level) {
    return {
      success: false,
      error: "No level set for this topic. Please select a level first.",
      sessionId: "",
      pokemon: { pokedexNumber: 0, name: "", tier: 0 },
      parameters: { questionCount: 0, passThreshold: 0, passCount: 0 },
      gymLeader: { name: "", badge: "" },
      context: { topic: "", course: null, level: "", type: "standard" },
    };
  }

  const level = data.current_level as Level;

  // Select Pokemon and get parameters
  const pokemon = selectPokemon(level);
  const parameters = getQuizParameters(pokemon.tier);
  const gymLeader = GYM_LEADERS[level];

  // Create session
  const sessionId = randomUUID();
  const session: QuizSession = {
    sessionId,
    topic,
    course: course || null,
    level,
    type,
    pokemon,
    parameters,
    startedAt: new Date().toISOString(),
  };

  // Store session
  await saveSession(session);

  return {
    success: true,
    sessionId,
    pokemon,
    parameters,
    gymLeader,
    context: {
      topic,
      course: course || null,
      level,
      type,
    },
  };
}

/**
 * Handler for submitQuizResult tool
 */
export async function submitQuizResultHandler(args: {
  sessionId: string;
  answers: { total: number; correct: number };
}): Promise<SubmitQuizResultResponse> {
  const { sessionId, answers } = args;

  // Get session
  const session = await getSession(sessionId);
  if (!session) {
    return {
      success: false,
      error: "Invalid session ID. Quiz session not found or expired.",
      passed: false,
      score: { correct: 0, total: 0, percentage: 0 },
      pokemon: { caught: false, name: "", message: "" },
      points: { earned: 0 },
    };
  }

  // Validate answers don't exceed total
  if (answers.correct > answers.total) {
    return {
      success: false,
      error: "Invalid answers: correct answers cannot exceed total questions",
      passed: false,
      score: { correct: 0, total: 0, percentage: 0 },
      pokemon: { caught: false, name: "", message: "" },
      points: { earned: 0 },
    };
  }

  // Validate total matches session question count
  if (answers.total !== session.parameters.questionCount) {
    return {
      success: false,
      error: `Invalid answers: expected ${session.parameters.questionCount} questions but received ${answers.total}`,
      passed: false,
      score: { correct: 0, total: 0, percentage: 0 },
      pokemon: { caught: false, name: "", message: "" },
      points: { earned: 0 },
    };
  }

  // Calculate result
  const passed = answers.correct >= session.parameters.passCount;
  const percentage = answers.total > 0 ? Math.round((answers.correct / answers.total) * 100) : 0;
  const pointsResult = calculateQuizPoints(session.pokemon.tier, answers.correct, passed);

  // Update trainer points
  if (pointsResult.total > 0) {
    const trainerResult = await readYaml<TrainerData>("trainer.yaml");
    if (trainerResult.success && trainerResult.data) {
      const trainer = trainerResult.data;
      trainer.total_points += pointsResult.total;

      // Add to history
      if (!trainer.point_history) trainer.point_history = [];
      trainer.point_history.push({
        date: new Date().toISOString().split("T")[0],
        action: passed ? "quiz_passed" : "quiz_partial",
        topic: session.topic,
        points: `+${pointsResult.total}`,
        pokemon: passed ? session.pokemon.name : undefined,
        level: session.level,
      });

      // Check for rank promotion
      const newRank = calculateRank(trainer.total_points);
      if (newRank !== trainer.rank) {
        trainer.rank = newRank;
      }

      await writeYaml("trainer.yaml", trainer, "Professor Oak - Trainer Profile");
    }
  }

  // Add Pokemon to pokedex if caught
  if (passed) {
    const pokedexResult = await readYaml<PokedexData>("pokedex.yaml");
    if (pokedexResult.success && pokedexResult.data) {
      const pokedex = pokedexResult.data;

      const newPokemon: PokemonEntry = {
        id: `${session.pokemon.name.toLowerCase()}-${Date.now()}`,
        pokedex_number: session.pokemon.pokedexNumber,
        name: session.pokemon.name,
        sprites: {
          front: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${session.pokemon.pokedexNumber}.png`,
        },
        topic: session.topic,
        course: session.course,
        level: session.level,
        tier: session.pokemon.tier,
        caught_at: new Date().toISOString().split("T")[0],
        caught_during: "quiz",
        quiz_score: `${answers.correct}/${answers.total}`,
        points_earned: pointsResult.total,
        gym_leader: GYM_LEADERS[session.level as Level].name,
      };

      pokedex.pokemon.push(newPokemon);
      pokedex.stats.total_caught += 1;
      pokedex.stats.by_topic[session.topic] = (pokedex.stats.by_topic[session.topic] || 0) + 1;

      // Check for legendary
      if (session.pokemon.tier === 5) {
        pokedex.stats.legendaries += 1;
      }

      await writeYaml("pokedex.yaml", pokedex, "Professor Oak - Pokedex");
    }
  }

  // Record in quiz history
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const historyPath = `quiz-history/${monthKey}.yaml`;

  const historyResult = await readYaml<{ entries: QuizHistoryEntry[] }>(historyPath);
  const historyData = historyResult.success && historyResult.data
    ? historyResult.data
    : { entries: [] };

  const historyEntry: QuizHistoryEntry = {
    session_id: sessionId,
    date: now.toISOString().split("T")[0],
    topic: session.topic,
    course: session.course,
    level: session.level,
    type: session.type,
    pokemon: session.pokemon,
    result: {
      questions: answers.total,
      correct: answers.correct,
      passed,
      points_earned: pointsResult.total,
    },
    gym_leader: GYM_LEADERS[session.level as Level].name,
  };

  historyData.entries.push(historyEntry);
  await writeYaml(historyPath, historyData, "Quiz History");

  // Remove session
  await removeSession(sessionId);

  // Prepare response
  const pokemonMessage = passed
    ? `You caught ${session.pokemon.name}!`
    : `${session.pokemon.name} fled!`;

  return {
    success: true,
    passed,
    score: {
      correct: answers.correct,
      total: answers.total,
      percentage,
    },
    pokemon: {
      caught: passed,
      name: session.pokemon.name,
      message: pokemonMessage,
    },
    points: {
      earned: pointsResult.total,
      breakdown: pointsResult.breakdown,
    },
  };
}

/**
 * Handler for getQuizHistory tool
 */
export async function getQuizHistoryHandler(args: {
  topic?: string;
  month?: string;
  limit?: number;
}): Promise<GetQuizHistoryResponse> {
  const { topic, month, limit } = args;

  let entries: QuizHistoryEntry[] = [];

  if (month) {
    // Read specific month
    const historyResult = await readYaml<{ entries: QuizHistoryEntry[] }>(`quiz-history/${month}.yaml`);
    if (historyResult.success && historyResult.data) {
      entries = historyResult.data.entries;
    }
  } else {
    // Read current month by default
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const historyResult = await readYaml<{ entries: QuizHistoryEntry[] }>(`quiz-history/${monthKey}.yaml`);
    if (historyResult.success && historyResult.data) {
      entries = historyResult.data.entries;
    }
  }

  // Filter by topic if specified
  if (topic) {
    entries = entries.filter((e) => e.topic === topic);
  }

  // Apply limit if specified
  if (limit && limit > 0) {
    entries = entries.slice(0, limit);
  }

  return {
    success: true,
    entries,
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
 * Register quiz tools with MCP server
 */
export function registerQuizTools(server: McpServer) {
  /**
   * Start a new quiz session
   */
  server.tool(
    "startQuiz",
    `Initialize a quiz session for a topic.
     Selects a Pokemon based on the topic's current level tier.
     Returns session details needed to conduct the quiz.`,
    {
      topic: z.string().describe("Topic name (e.g., 'docker')"),
      course: z.string().optional().describe("Optional specific course ID"),
      type: z.enum(["standard", "wild"]).optional().describe("Quiz type (default: standard)"),
    },
    async (args) => {
      const result = await startQuizHandler(args);
      return jsonResponse(result);
    }
  );

  /**
   * Submit quiz result and process rewards
   */
  server.tool(
    "submitQuizResult",
    `Record quiz completion and process rewards.
     If passed: catches Pokemon, awards full points.
     If failed: partial points, Pokemon flees.
     Records result in quiz history.`,
    {
      sessionId: z.string().describe("Quiz session ID from startQuiz"),
      answers: z.object({
        total: z.number().describe("Total questions asked"),
        correct: z.number().describe("Number of correct answers"),
      }).describe("Quiz answers summary"),
    },
    async (args) => {
      const result = await submitQuizResultHandler(args);
      return jsonResponse(result);
    }
  );

  /**
   * Get quiz history
   */
  server.tool(
    "getQuizHistory",
    `Get past quiz attempts with optional filtering.
     Can filter by topic and/or month.
     Returns entries sorted by date.`,
    {
      topic: z.string().optional().describe("Filter by topic name"),
      month: z.string().optional().describe("Month in YYYY-MM format (default: current month)"),
      limit: z.number().optional().describe("Maximum entries to return"),
    },
    async (args) => {
      const result = await getQuizHistoryHandler(args);
      return jsonResponse(result);
    }
  );
}
