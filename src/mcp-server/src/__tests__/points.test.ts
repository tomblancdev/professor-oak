import { describe, it, expect } from "vitest";
import { calculatePoints, calculateRank, pointsToNextRank } from "../../services/points.js";

describe("Points Service", () => {
  describe("calculatePoints", () => {
    it("returns correct points for COURSE_COMPLETE", () => {
      expect(calculatePoints("COURSE_COMPLETE")).toBe(25);
    });

    it("applies multiplier correctly", () => {
      expect(calculatePoints("COURSE_COMPLETE", 2)).toBe(50);
    });

    it("rounds to nearest integer", () => {
      expect(calculatePoints("COURSE_COMPLETE", 1.5)).toBe(38);
    });
  });

  describe("calculateRank", () => {
    it("returns Rookie Trainer for 0 points", () => {
      expect(calculateRank(0)).toBe("Rookie Trainer");
    });

    it("returns Pokemon Master for 10000+ points", () => {
      expect(calculateRank(10000)).toBe("Pokemon Master");
    });

    it("handles rank boundaries", () => {
      expect(calculateRank(499)).toBe("Rookie Trainer");
      expect(calculateRank(500)).toBe("Pokemon Trainer");
    });
  });

  describe('pointsToNextRank', () => {
    it('should calculate points required for the next rank correctly', () => {
      const result = pointsToNextRank(100);
      expect(result).not.toBeNull();
      expect(result?.points).toBeGreaterThanOrEqual(0);
      expect(result?.rank).toBe("Pokemon Trainer");
    });
  });
});