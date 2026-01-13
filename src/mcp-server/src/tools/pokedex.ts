/**
 * Pokedex Tools
 *
 * Tools for managing Pokemon collection and evolution.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readYaml, writeYaml, fileExists } from "../services/yaml.js";
import { POINTS } from "../config/constants.js";
import type { PokedexData, PokemonEntry } from "../types/pokedex.js";

/**
 * Get Pokemon collection with optional filtering
 */
export async function getPokedex(input: {
  topic?: string;
  level?: string;
}): Promise<any> {
  // Initialize pokedex.yaml if it doesn't exist
  const exists = await fileExists("pokedex.yaml");
  if (!exists) {
    const initialPokedex: PokedexData = {
      version: 1,
      trainer: null,
      created_at: new Date().toISOString().split("T")[0],
      pokemon: [],
      stats: {
        total_caught: 0,
        total_evolved: 0,
        legendaries: 0,
        by_topic: {},
      },
    };
    await writeYaml("pokedex.yaml", initialPokedex, "Professor Oak - Pokedex");
  }

  const result = await readYaml<PokedexData>("pokedex.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  let pokemon = data.pokemon;
  const filtersApplied: Record<string, string> = {};

  // Filter by topic
  if (input.topic) {
    pokemon = pokemon.filter((p) => p.topic === input.topic);
    filtersApplied.topic = input.topic;
  }

  // Filter by level
  if (input.level) {
    pokemon = pokemon.filter((p) => p.level === input.level);
    filtersApplied.level = input.level;
  }

  const response: any = {
    success: true,
    pokemon,
    stats: data.stats,
  };

  if (Object.keys(filtersApplied).length > 0) {
    response.filtersApplied = filtersApplied;
  }

  return response;
}

/**
 * Add a caught Pokemon to the Pokedex
 */
export async function addPokemon(input: {
  pokedexNumber: number;
  name: string;
  sprites: { front: string; back?: string; shiny?: string };
  topic: string;
  course: string | null;
  level: string;
  tier: number;
  caughtDuring: "quiz" | "wild";
  quizScore?: string;
  pointsEarned?: number;
  gymLeader?: string;
}): Promise<any> {
  const result = await readYaml<PokedexData>("pokedex.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;
  const isFirstPokemon = data.pokemon.length === 0;

  // Generate next ID
  const nextNumber = data.pokemon.length + 1;
  const id = `pokemon-${String(nextNumber).padStart(3, "0")}`;

  // Create new Pokemon entry
  const newPokemon: PokemonEntry = {
    id,
    pokedex_number: input.pokedexNumber,
    name: input.name,
    sprites: input.sprites,
    topic: input.topic,
    course: input.course,
    level: input.level,
    tier: input.tier,
    caught_at: new Date().toISOString().split("T")[0],
    caught_during: input.caughtDuring,
  };

  // Add optional fields
  if (input.quizScore !== undefined) {
    newPokemon.quiz_score = input.quizScore;
  }
  if (input.pointsEarned !== undefined) {
    newPokemon.points_earned = input.pointsEarned;
  }
  if (input.gymLeader !== undefined) {
    newPokemon.gym_leader = input.gymLeader;
  }

  // Add to collection
  data.pokemon.push(newPokemon);

  // Update stats
  data.stats.total_caught += 1;

  // Update by_topic
  if (!data.stats.by_topic[input.topic]) {
    data.stats.by_topic[input.topic] = 0;
  }
  data.stats.by_topic[input.topic] += 1;

  // Track legendaries (tier 5)
  if (input.tier === 5) {
    data.stats.legendaries += 1;
  }

  // Save changes
  await writeYaml("pokedex.yaml", data, "Professor Oak - Pokedex");

  return {
    success: true,
    pokemon: newPokemon,
    firstPokemon: isFirstPokemon,
  };
}

/**
 * Evolve a Pokemon into its next form
 */
export async function evolvePokemon(input: {
  pokemonId: string;
  evolvedPokedexNumber: number;
  evolvedName: string;
  evolvedSprites: { front: string; back?: string; shiny?: string };
}): Promise<any> {
  const result = await readYaml<PokedexData>("pokedex.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;

  // Find the original Pokemon
  const originalPokemon = data.pokemon.find((p) => p.id === input.pokemonId);
  if (!originalPokemon) {
    return {
      success: false,
      error: `Pokemon not found: ${input.pokemonId}`,
    };
  }

  // Check if already evolved
  if (originalPokemon.evolved_to) {
    return {
      success: false,
      error: `Pokemon ${input.pokemonId} has already evolved to ${originalPokemon.evolved_to}`,
    };
  }


  // Check if Pokemon is already at max tier (Legendary - tier 5)
  if (originalPokemon.tier >= 5) {
    return {
      success: false,
      error: "Legendary Pokemon cannot evolve further - they have reached maximum tier",
    };
  }

  // Generate next ID
  const nextNumber = data.pokemon.length + 1;
  const evolvedId = `pokemon-${String(nextNumber).padStart(3, "0")}`;

  // Create evolved Pokemon entry
  const evolvedPokemon: PokemonEntry = {
    id: evolvedId,
    pokedex_number: input.evolvedPokedexNumber,
    name: input.evolvedName,
    sprites: input.evolvedSprites,
    topic: originalPokemon.topic,
    course: originalPokemon.course,
    level: originalPokemon.level,
    tier: originalPokemon.tier + 1, // Evolved Pokemon is one tier higher
    caught_at: new Date().toISOString().split("T")[0],
    caught_during: originalPokemon.caught_during,
    evolved_from: originalPokemon.id,
    evolved_at: new Date().toISOString().split("T")[0],
  };

  // Link original to evolved
  originalPokemon.evolved_to = evolvedId;

  // Add evolved Pokemon to collection
  data.pokemon.push(evolvedPokemon);

  // Update stats
  data.stats.total_caught += 1;
  data.stats.total_evolved += 1;

  // Update by_topic
  if (!data.stats.by_topic[originalPokemon.topic]) {
    data.stats.by_topic[originalPokemon.topic] = 0;
  }
  data.stats.by_topic[originalPokemon.topic] += 1;

  // Save changes
  await writeYaml("pokedex.yaml", data, "Professor Oak - Pokedex");

  return {
    success: true,
    evolvedPokemon,
    pointsAwarded: POINTS.POKEMON_EVOLVED,
  };
}

/**
 * Get Pokedex statistics
 */
export async function getPokedexStats(input: {}): Promise<any> {
  const result = await readYaml<PokedexData>("pokedex.yaml");

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const data = result.data!;

  // Calculate by_tier stats from pokemon entries
  const by_tier: Record<number, number> = {};
  for (const pokemon of data.pokemon) {
    if (!by_tier[pokemon.tier]) {
      by_tier[pokemon.tier] = 0;
    }
    by_tier[pokemon.tier] += 1;
  }

  return {
    success: true,
    stats: {
      total_caught: data.stats.total_caught,
      total_evolved: data.stats.total_evolved,
      legendaries: data.stats.legendaries,
      by_topic: data.stats.by_topic,
      by_tier,
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
 * Register pokedex tools with the MCP server
 */
export function registerPokedexTools(server: McpServer) {
  /**
   * getPokedex - Get Pokemon collection
   */
  server.tool(
    "getPokedex",
    `Get Pokemon collection from the Pokedex.
     Returns all caught Pokemon with optional filtering by topic or level.
     Includes collection stats (total_caught, by_topic, etc.).`,
    {
      topic: z.string().optional().describe("Filter by topic (e.g., 'docker')"),
      level: z
        .string()
        .optional()
        .describe("Filter by level (starter, beginner, advanced, expert)"),
    },
    async ({ topic, level }) => {
      const result = await getPokedex({ topic, level });
      return jsonResponse(result);
    }
  );

  /**
   * addPokemon - Add caught Pokemon to Pokedex
   */
  server.tool(
    "addPokemon",
    `Add a caught Pokemon to the Pokedex.
     Auto-generates sequential ID (pokemon-001, pokemon-002, etc.).
     Updates stats (total_caught, by_topic).
     Tracks first_pokemon achievement.`,
    {
      pokedexNumber: z.number().describe("National Pokedex number"),
      name: z.string().describe("Pokemon name"),
      sprites: z
        .object({
          front: z.string().describe("Front sprite URL"),
          back: z.string().optional().describe("Back sprite URL"),
          shiny: z.string().optional().describe("Shiny sprite URL"),
        })
        .describe("Pokemon sprites"),
      topic: z.string().describe("Topic the Pokemon was caught in"),
      course: z.string().nullable().describe("Course name if caught during quiz"),
      level: z
        .string()
        .describe("Level (starter, beginner, advanced, expert)"),
      tier: z.number().describe("Pokemon tier (1-5, 5 = legendary)"),
      caughtDuring: z
        .enum(["quiz", "wild"])
        .describe("How the Pokemon was caught"),
      quizScore: z.string().optional().describe("Quiz score (e.g., '3/3')"),
      pointsEarned: z.number().optional().describe("Points earned from catch"),
      gymLeader: z.string().optional().describe("Gym leader who administered quiz"),
    },
    async ({
      pokedexNumber,
      name,
      sprites,
      topic,
      course,
      level,
      tier,
      caughtDuring,
      quizScore,
      pointsEarned,
      gymLeader,
    }) => {
      const result = await addPokemon({
        pokedexNumber,
        name,
        sprites,
        topic,
        course,
        level,
        tier,
        caughtDuring,
        quizScore,
        pointsEarned,
        gymLeader,
      });
      return jsonResponse(result);
    }
  );

  /**
   * evolvePokemon - Evolve a Pokemon
   */
  server.tool(
    "evolvePokemon",
    `Evolve a Pokemon into its next form.
     Links evolved_from and evolved_to between original and evolved Pokemon.
     Awards POKEMON_EVOLVED points (100).
     Updates total_evolved stat.`,
    {
      pokemonId: z.string().describe("ID of Pokemon to evolve (e.g., 'pokemon-001')"),
      evolvedPokedexNumber: z.number().describe("National Pokedex number of evolved form"),
      evolvedName: z.string().describe("Name of evolved form"),
      evolvedSprites: z
        .object({
          front: z.string().describe("Front sprite URL"),
          back: z.string().optional().describe("Back sprite URL"),
          shiny: z.string().optional().describe("Shiny sprite URL"),
        })
        .describe("Evolved Pokemon sprites"),
    },
    async ({ pokemonId, evolvedPokedexNumber, evolvedName, evolvedSprites }) => {
      const result = await evolvePokemon({
        pokemonId,
        evolvedPokedexNumber,
        evolvedName,
        evolvedSprites,
      });
      return jsonResponse(result);
    }
  );

  /**
   * getPokedexStats - Get collection statistics
   */
  server.tool(
    "getPokedexStats",
    `Get Pokedex collection statistics.
     Returns total_caught, total_evolved, legendaries count.
     Includes by_topic and by_tier breakdowns.`,
    {},
    async () => {
      const result = await getPokedexStats({});
      return jsonResponse(result);
    }
  );
}
