/**
 * Quiz Type Definitions
 */

export interface QuizSession {
  sessionId: string;
  topic: string;
  course: string | null;
  level: string;
  type: "standard" | "wild";
  pokemon: {
    pokedexNumber: number;
    name: string;
    tier: number;
  };
  parameters: {
    questionCount: number;
    passThreshold: number;
    passCount: number;
  };
  startedAt: string;
}

export interface QuizResult {
  sessionId: string;
  passed: boolean;
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  pokemon: {
    caught: boolean;
    name: string;
    message: string;
  };
  points: {
    earned: number;
    breakdown?: Record<string, number>;
  };
}

export interface QuizHistoryEntry {
  session_id: string;
  date: string;
  topic: string;
  course: string | null;
  level: string;
  type: "standard" | "wild";
  pokemon: {
    pokedexNumber: number;
    name: string;
    tier: number;
  };
  result: {
    questions: number;
    correct: number;
    passed: boolean;
    points_earned: number;
  };
  gym_leader?: string;
}
