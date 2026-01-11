/**
 * Pokedex Tools Tests
 *
 * TDD tests for pokedex management tools.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";

// Mock the DATA_PATH for tests
const TEST_DATA_PATH = path.join(process.cwd(), "test-data-pokedex");

// Set environment variable before importing modules
process.env.DATA_PATH = TEST_DATA_PATH;

// Import tools after setting env
import {
  getPokedex,
  addPokemon,
  evolvePokemon,
  getPokedexStats,
} from "../tools/pokedex.js";
import type { PokedexData, PokemonEntry, PokedexStats } from "../types/pokedex.js";

// Helper to create initial pokedex.yaml
async function createPokedexFile(data: Partial<PokedexData> = {}) {
  const defaultData: PokedexData = {
    version: 1,
    trainer: null,
    created_at: null,
    pokemon: [],
    stats: {
      total_caught: 0,
      total_evolved: 0,
      legendaries: 0,
      by_topic: {},
    },
    ...data,
  };

  await fs.mkdir(TEST_DATA_PATH, { recursive: true });
  await fs.writeFile(
    path.join(TEST_DATA_PATH, "pokedex.yaml"),
    YAML.stringify(defaultData),
    "utf-8"
  );
  return defaultData;
}

// Helper to read pokedex.yaml
async function readPokedexFile(): Promise<PokedexData> {
  const content = await fs.readFile(
    path.join(TEST_DATA_PATH, "pokedex.yaml"),
    "utf-8"
  );
  return YAML.parse(content) as PokedexData;
}

describe("Pokedex Tools", () => {
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

  describe("getPokedex", () => {
    it("should return empty pokemon array when pokedex is empty", async () => {
      await createPokedexFile();

      const result = await getPokedex({});

      expect(result.success).toBe(true);
      expect(result.pokemon).toEqual([]);
      expect(result.stats.total_caught).toBe(0);
    });

    it("should return all pokemon when no filters", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 25,
            name: "Pikachu",
            sprites: { front: "https://example.com/pikachu.png" },
            topic: "aws",
            course: "02-basics",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "wild",
          },
        ],
        stats: {
          total_caught: 2,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1, aws: 1 },
        },
      });

      const result = await getPokedex({});

      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(2);
      expect(result.stats.total_caught).toBe(2);
    });

    it("should filter by topic", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 25,
            name: "Pikachu",
            sprites: { front: "https://example.com/pikachu.png" },
            topic: "aws",
            course: "02-basics",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "wild",
          },
        ],
        stats: {
          total_caught: 2,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1, aws: 1 },
        },
      });

      const result = await getPokedex({ topic: "docker" });

      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(1);
      expect(result.pokemon[0].name).toBe("Charmander");
      expect(result.filtersApplied).toEqual({ topic: "docker" });
    });

    it("should filter by level", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 25,
            name: "Pikachu",
            sprites: { front: "https://example.com/pikachu.png" },
            topic: "aws",
            course: "02-basics",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "wild",
          },
        ],
        stats: {
          total_caught: 2,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1, aws: 1 },
        },
      });

      const result = await getPokedex({ level: "beginner" });

      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(1);
      expect(result.pokemon[0].name).toBe("Pikachu");
      expect(result.filtersApplied).toEqual({ level: "beginner" });
    });

    it("should filter by both topic and level", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 5,
            name: "Charmeleon",
            sprites: { front: "https://example.com/charmeleon.png" },
            topic: "docker",
            course: "02-basics",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "quiz",
          },
          {
            id: "pokemon-003",
            pokedex_number: 25,
            name: "Pikachu",
            sprites: { front: "https://example.com/pikachu.png" },
            topic: "aws",
            course: "01-intro",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-09",
            caught_during: "wild",
          },
        ],
        stats: {
          total_caught: 3,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 2, aws: 1 },
        },
      });

      const result = await getPokedex({ topic: "docker", level: "beginner" });

      expect(result.success).toBe(true);
      expect(result.pokemon).toHaveLength(1);
      expect(result.pokemon[0].name).toBe("Charmeleon");
      expect(result.filtersApplied).toEqual({ topic: "docker", level: "beginner" });
    });

    it("should return error when pokedex.yaml does not exist", async () => {
      const result = await getPokedex({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read");
    });
  });

  describe("addPokemon", () => {
    it("should add first pokemon with auto-generated ID pokemon-001", async () => {
      await createPokedexFile();

      const result = await addPokemon({
        pokedexNumber: 4,
        name: "Charmander",
        sprites: { front: "https://example.com/charmander.png" },
        topic: "docker",
        course: "01-introduction",
        level: "starter",
        tier: 1,
        caughtDuring: "quiz",
        quizScore: "3/3",
        pointsEarned: 72,
      });

      expect(result.success).toBe(true);
      expect(result.pokemon.id).toBe("pokemon-001");
      expect(result.pokemon.name).toBe("Charmander");
      expect(result.pokemon.caught_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.firstPokemon).toBe(true);

      const pokedexData = await readPokedexFile();
      expect(pokedexData.pokemon).toHaveLength(1);
      expect(pokedexData.stats.total_caught).toBe(1);
      expect(pokedexData.stats.by_topic.docker).toBe(1);
    });

    it("should auto-generate sequential IDs", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      const result = await addPokemon({
        pokedexNumber: 25,
        name: "Pikachu",
        sprites: { front: "https://example.com/pikachu.png" },
        topic: "aws",
        course: "01-intro",
        level: "beginner",
        tier: 2,
        caughtDuring: "wild",
      });

      expect(result.success).toBe(true);
      expect(result.pokemon.id).toBe("pokemon-002");
      expect(result.firstPokemon).toBe(false);

      const pokedexData = await readPokedexFile();
      expect(pokedexData.pokemon).toHaveLength(2);
      expect(pokedexData.stats.total_caught).toBe(2);
    });

    it("should update stats by_topic correctly", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      const result = await addPokemon({
        pokedexNumber: 5,
        name: "Charmeleon",
        sprites: { front: "https://example.com/charmeleon.png" },
        topic: "docker",
        course: "02-basics",
        level: "beginner",
        tier: 2,
        caughtDuring: "quiz",
      });

      expect(result.success).toBe(true);

      const pokedexData = await readPokedexFile();
      expect(pokedexData.stats.by_topic.docker).toBe(2);
    });

    it("should store optional fields when provided", async () => {
      await createPokedexFile();

      const result = await addPokemon({
        pokedexNumber: 4,
        name: "Charmander",
        sprites: {
          front: "https://example.com/charmander.png",
          back: "https://example.com/charmander-back.png",
          shiny: "https://example.com/charmander-shiny.png",
        },
        topic: "docker",
        course: "01-introduction",
        level: "starter",
        tier: 1,
        caughtDuring: "quiz",
        quizScore: "3/3",
        pointsEarned: 72,
        gymLeader: "Brock",
      });

      expect(result.success).toBe(true);

      const pokedexData = await readPokedexFile();
      const pokemon = pokedexData.pokemon[0];
      expect(pokemon.quiz_score).toBe("3/3");
      expect(pokemon.points_earned).toBe(72);
      expect(pokemon.gym_leader).toBe("Brock");
      expect(pokemon.sprites.back).toBe("https://example.com/charmander-back.png");
      expect(pokemon.sprites.shiny).toBe("https://example.com/charmander-shiny.png");
    });

    it("should track legendaries when tier is 5", async () => {
      await createPokedexFile();

      const result = await addPokemon({
        pokedexNumber: 150,
        name: "Mewtwo",
        sprites: { front: "https://example.com/mewtwo.png" },
        topic: "advanced-topics",
        course: "final-exam",
        level: "expert",
        tier: 5,
        caughtDuring: "quiz",
        quizScore: "8/8",
        pointsEarned: 250,
      });

      expect(result.success).toBe(true);

      const pokedexData = await readPokedexFile();
      expect(pokedexData.stats.legendaries).toBe(1);
    });

    it("should return error when pokedex.yaml does not exist", async () => {
      const result = await addPokemon({
        pokedexNumber: 4,
        name: "Charmander",
        sprites: { front: "https://example.com/charmander.png" },
        topic: "docker",
        course: "01-introduction",
        level: "starter",
        tier: 1,
        caughtDuring: "quiz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read");
    });
  });

  describe("evolvePokemon", () => {
    it("should evolve a pokemon and link evolved_from/evolved_to", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      const result = await evolvePokemon({
        pokemonId: "pokemon-001",
        evolvedPokedexNumber: 5,
        evolvedName: "Charmeleon",
        evolvedSprites: { front: "https://example.com/charmeleon.png" },
      });

      expect(result.success).toBe(true);
      expect(result.evolvedPokemon.id).toBe("pokemon-002");
      expect(result.evolvedPokemon.name).toBe("Charmeleon");
      expect(result.evolvedPokemon.evolved_from).toBe("pokemon-001");
      expect(result.pointsAwarded).toBe(100);

      const pokedexData = await readPokedexFile();
      expect(pokedexData.pokemon).toHaveLength(2);

      // Check original pokemon has evolved_to link
      const originalPokemon = pokedexData.pokemon.find(p => p.id === "pokemon-001");
      expect(originalPokemon?.evolved_to).toBe("pokemon-002");

      // Check evolved pokemon has evolved_from link
      const evolvedPokemon = pokedexData.pokemon.find(p => p.id === "pokemon-002");
      expect(evolvedPokemon?.evolved_from).toBe("pokemon-001");
      expect(evolvedPokemon?.evolved_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should update total_evolved stat", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      await evolvePokemon({
        pokemonId: "pokemon-001",
        evolvedPokedexNumber: 5,
        evolvedName: "Charmeleon",
        evolvedSprites: { front: "https://example.com/charmeleon.png" },
      });

      const pokedexData = await readPokedexFile();
      expect(pokedexData.stats.total_evolved).toBe(1);
    });

    it("should inherit topic, course, level from original pokemon", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      const result = await evolvePokemon({
        pokemonId: "pokemon-001",
        evolvedPokedexNumber: 5,
        evolvedName: "Charmeleon",
        evolvedSprites: { front: "https://example.com/charmeleon.png" },
      });

      expect(result.success).toBe(true);
      expect(result.evolvedPokemon.topic).toBe("docker");
      expect(result.evolvedPokemon.course).toBe("01-introduction");
      expect(result.evolvedPokemon.level).toBe("starter");
    });

    it("should return error when pokemon not found", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      const result = await evolvePokemon({
        pokemonId: "pokemon-999",
        evolvedPokedexNumber: 5,
        evolvedName: "Charmeleon",
        evolvedSprites: { front: "https://example.com/charmeleon.png" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Pokemon not found");
    });

    it("should return error when pokemon already evolved", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
            evolved_to: "pokemon-002",
          },
          {
            id: "pokemon-002",
            pokedex_number: 5,
            name: "Charmeleon",
            sprites: { front: "https://example.com/charmeleon.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 2,
            caught_at: "2026-01-11",
            caught_during: "quiz",
            evolved_from: "pokemon-001",
          },
        ],
        stats: {
          total_caught: 2,
          total_evolved: 1,
          legendaries: 0,
          by_topic: { docker: 2 },
        },
      });

      const result = await evolvePokemon({
        pokemonId: "pokemon-001",
        evolvedPokedexNumber: 6,
        evolvedName: "Charizard",
        evolvedSprites: { front: "https://example.com/charizard.png" },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already evolved");
    });

    it("should update by_topic stats when evolving", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 1,
          total_evolved: 0,
          legendaries: 0,
          by_topic: { docker: 1 },
        },
      });

      await evolvePokemon({
        pokemonId: "pokemon-001",
        evolvedPokedexNumber: 5,
        evolvedName: "Charmeleon",
        evolvedSprites: { front: "https://example.com/charmeleon.png" },
      });

      const pokedexData = await readPokedexFile();
      expect(pokedexData.stats.by_topic.docker).toBe(2);
      expect(pokedexData.stats.total_caught).toBe(2);
    });
  });

  describe("getPokedexStats", () => {
    it("should return all stats", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 25,
            name: "Pikachu",
            sprites: { front: "https://example.com/pikachu.png" },
            topic: "aws",
            course: "01-intro",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "wild",
          },
          {
            id: "pokemon-003",
            pokedex_number: 150,
            name: "Mewtwo",
            sprites: { front: "https://example.com/mewtwo.png" },
            topic: "advanced",
            course: "final",
            level: "expert",
            tier: 5,
            caught_at: "2026-01-09",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 3,
          total_evolved: 1,
          legendaries: 1,
          by_topic: { docker: 1, aws: 1, advanced: 1 },
        },
      });

      const result = await getPokedexStats({});

      expect(result.success).toBe(true);
      expect(result.stats.total_caught).toBe(3);
      expect(result.stats.total_evolved).toBe(1);
      expect(result.stats.legendaries).toBe(1);
      expect(result.stats.by_topic).toEqual({ docker: 1, aws: 1, advanced: 1 });
    });

    it("should include by_tier statistics", async () => {
      await createPokedexFile({
        pokemon: [
          {
            id: "pokemon-001",
            pokedex_number: 4,
            name: "Charmander",
            sprites: { front: "https://example.com/charmander.png" },
            topic: "docker",
            course: "01-introduction",
            level: "starter",
            tier: 1,
            caught_at: "2026-01-11",
            caught_during: "quiz",
          },
          {
            id: "pokemon-002",
            pokedex_number: 5,
            name: "Charmeleon",
            sprites: { front: "https://example.com/charmeleon.png" },
            topic: "docker",
            course: "02-basics",
            level: "beginner",
            tier: 2,
            caught_at: "2026-01-10",
            caught_during: "quiz",
          },
          {
            id: "pokemon-003",
            pokedex_number: 6,
            name: "Charizard",
            sprites: { front: "https://example.com/charizard.png" },
            topic: "docker",
            course: "03-advanced",
            level: "advanced",
            tier: 3,
            caught_at: "2026-01-09",
            caught_during: "quiz",
          },
        ],
        stats: {
          total_caught: 3,
          total_evolved: 2,
          legendaries: 0,
          by_topic: { docker: 3 },
        },
      });

      const result = await getPokedexStats({});

      expect(result.success).toBe(true);
      expect(result.stats.by_tier).toBeDefined();
      expect(result.stats.by_tier[1]).toBe(1);
      expect(result.stats.by_tier[2]).toBe(1);
      expect(result.stats.by_tier[3]).toBe(1);
    });

    it("should return zeros when pokedex is empty", async () => {
      await createPokedexFile();

      const result = await getPokedexStats({});

      expect(result.success).toBe(true);
      expect(result.stats.total_caught).toBe(0);
      expect(result.stats.total_evolved).toBe(0);
      expect(result.stats.legendaries).toBe(0);
      expect(result.stats.by_topic).toEqual({});
    });

    it("should return error when pokedex.yaml does not exist", async () => {
      const result = await getPokedexStats({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read");
    });
  });
});
