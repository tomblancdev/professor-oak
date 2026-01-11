/**
 * Trainer Type Definitions
 */

export interface TrainerData {
  version: number;
  trainer: string | null;
  started_at: string | null;
  total_points: number;
  rank: string;
  settings: TrainerSettings;
  achievements: TrainerAchievements;
  point_history: PointHistoryEntry[];
}

export interface TrainerSettings {
  wild_encounters: boolean;
  notifications: boolean;
}

export interface TrainerAchievements {
  first_pokemon: string | null;
  first_badge: string | null;
  first_legendary: string | null;
}

export interface PointHistoryEntry {
  date: string;
  action: string;
  topic: string;
  points: string;
  pokemon?: string;
  badge?: string;
  level?: string;
  course?: string;
  exercise?: string;
}
