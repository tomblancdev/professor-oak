/**
 * Validation Service
 *
 * Input validation helpers.
 */

/**
 * Check if a string is valid kebab-case
 */
export function isValidKebabCase(str: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

/**
 * Convert a string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Validate topic name
 */
export function validateTopicName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Topic name is required" };
  }
  if (!isValidKebabCase(name)) {
    return {
      valid: false,
      error: `Topic name must be kebab-case (lowercase letters, numbers, hyphens). Got: "${name}"`
    };
  }
  return { valid: true };
}
