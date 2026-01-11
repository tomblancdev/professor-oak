/**
 * Pokedex Type Definitions
 */

export interface PokedexData {
  version: number;
  trainer: string | null;
  created_at: string | null;
  pokemon: PokemonEntry[];
  stats: PokedexStats;
}

export interface PokemonEntry {
  id: string;
  pokedex_number: number;
  name: string;
  sprites: {
    front: string;
    back?: string;
    shiny?: string;
  };
  topic: string;
  course: string | null;
  level: string;
  title?: string;
  summary?: string;
  key_points?: string[];
  tier: number;
  caught_at: string;
  caught_during: "quiz" | "wild";
  quiz_score?: string;
  points_earned?: number;
  gym_leader?: string;
  evolved_from?: string;
  evolved_to?: string;
  evolved_at?: string;
}

export interface PokedexStats {
  total_caught: number;
  total_evolved: number;
  legendaries: number;
  by_topic: Record<string, number>;
}
