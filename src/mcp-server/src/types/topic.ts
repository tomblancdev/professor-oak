/**
 * Topic Type Definitions
 */

import type { Level } from "../config/constants.js";

export interface Topic {
  name: string;
  displayName: string;
  description: string;
  path: string;
  currentLevel: Level | null;
  createdAt: string;
}

export interface TopicCreateInput {
  name: string;
  displayName?: string;
  description?: string;
}

export interface TopicStats {
  totalCourses: number;
  completedCourses: number;
  totalExercises: number;
  completedExercises: number;
  completion: number;
}
