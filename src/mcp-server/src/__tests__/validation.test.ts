import { describe, it, expect } from "vitest";
import { isValidKebabCase, toTitleCase, validateTopicName } from "../services/validation.js";

describe("Validation Service", () => {
  describe("isValidKebabCase", () => {
    it("should return true for simple lowercase word", () => {
      expect(isValidKebabCase("docker")).toBe(true);
    });

    it("should return true for hyphenated words", () => {
      expect(isValidKebabCase("python-async")).toBe(true);
      expect(isValidKebabCase("my-project-name")).toBe(true);
    });

    it("should return true for words with numbers", () => {
      expect(isValidKebabCase("vue3")).toBe(true);
      expect(isValidKebabCase("react-18")).toBe(true);
      expect(isValidKebabCase("es2024")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidKebabCase("")).toBe(false);
    });

    it("should return false for uppercase characters", () => {
      expect(isValidKebabCase("Docker")).toBe(false);
      expect(isValidKebabCase("DOCKER")).toBe(false);
      expect(isValidKebabCase("myProject")).toBe(false);
    });

    it("should return false for spaces", () => {
      expect(isValidKebabCase("my project")).toBe(false);
      expect(isValidKebabCase(" docker")).toBe(false);
    });

    it("should return false for underscores", () => {
      expect(isValidKebabCase("my_project")).toBe(false);
      expect(isValidKebabCase("snake_case")).toBe(false);
    });

    it("should return false for leading/trailing hyphens", () => {
      expect(isValidKebabCase("-docker")).toBe(false);
      expect(isValidKebabCase("docker-")).toBe(false);
      expect(isValidKebabCase("-docker-")).toBe(false);
    });

    it("should return false for consecutive hyphens", () => {
      expect(isValidKebabCase("my--project")).toBe(false);
    });

    it("should return false for special characters", () => {
      expect(isValidKebabCase("my.project")).toBe(false);
      expect(isValidKebabCase("my@project")).toBe(false);
      expect(isValidKebabCase("my/project")).toBe(false);
    });
  });

  describe("toTitleCase", () => {
    it("should capitalize single word", () => {
      expect(toTitleCase("docker")).toBe("Docker");
    });

    it("should convert kebab-case to title case", () => {
      expect(toTitleCase("python-async")).toBe("Python Async");
    });

    it("should handle multiple hyphens", () => {
      expect(toTitleCase("my-long-project-name")).toBe("My Long Project Name");
    });

    it("should handle already capitalized words", () => {
      expect(toTitleCase("Docker")).toBe("Docker");
    });

    it("should handle numbers", () => {
      expect(toTitleCase("vue-3")).toBe("Vue 3");
      expect(toTitleCase("es2024")).toBe("Es2024");
    });

    it("should handle empty string", () => {
      expect(toTitleCase("")).toBe("");
    });

    it("should handle single character", () => {
      expect(toTitleCase("a")).toBe("A");
    });
  });

  describe("validateTopicName", () => {
    it("should return valid for proper kebab-case", () => {
      expect(validateTopicName("docker")).toEqual({ valid: true });
      expect(validateTopicName("python-async")).toEqual({ valid: true });
    });

    it("should return invalid for empty string", () => {
      const result = validateTopicName("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should return invalid for whitespace only", () => {
      const result = validateTopicName("   ");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should return invalid for uppercase characters", () => {
      const result = validateTopicName("Docker");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kebab-case");
      expect(result.error).toContain("Docker");
    });

    it("should return invalid for spaces", () => {
      const result = validateTopicName("my project");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kebab-case");
    });

    it("should return invalid for special characters", () => {
      const result = validateTopicName("my@project");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("kebab-case");
    });
  });
});
