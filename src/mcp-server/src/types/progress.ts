/**
 * Progress Type Definitions
 */

export interface TopicProgress {
  version: number;
  topic: string;
  display_name: string;
  description: string;
  created_at: string;
  current_level: string | null;
  roadmap: Record<string, LevelRoadmap>;
  progress: Record<string, unknown>;
  extras: ExtraLearning[];
}

export interface LevelRoadmap {
  status: "pending" | "active" | "completed";
  courses: CourseProgress[];
  exercices: Record<string, ExerciseProgress[]>;
  quizRequired?: boolean;
  quizPassed?: boolean;
  completed_at?: string;
}

export interface CourseProgress {
  id: string;
  name: string;
  mandatory: boolean;
  completed: boolean;
  completed_at?: string;
}

export interface ExerciseProgress {
  id: string;
  name: string;
  mandatory: boolean;
  completed: boolean;
  completed_at?: string;
}

export interface ExtraLearning {
  id: string;
  name: string;
  display_name: string;
  tags: string[];
  created_at: string;
  has_pokemon: boolean;
}
