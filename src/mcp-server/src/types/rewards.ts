/**
 * Rewards Type Definitions
 */

export interface TopicRewards {
  version: number;
  topic: string;
  created_at: string;
  badges: Badge[];
  milestones: Milestone[];
}

export interface Badge {
  id: string;
  name: string;
  level: string;
  earned_at: string;
  gym_leader: string;
  points_earned: number;
  quiz_score: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  achieved_at: string;
  points_earned: number;
}
