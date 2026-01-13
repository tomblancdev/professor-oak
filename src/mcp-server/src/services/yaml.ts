/**
 * YAML Service
 *
 * Handles reading and writing YAML files with proper error handling.
 * All game state is stored in YAML format.
 */

import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";
import { z } from "zod";

/**
 * Get the data path from environment variable.
 * Uses lazy evaluation to allow tests to set DATA_PATH before each test.
 */
function getDataPath(): string {
  return process.env.DATA_PATH || "/data";
}

/**
 * Result type for YAML operations
 */
export interface YamlResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Result type for validated YAML reads
 */
export type ValidatedYamlResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; validationErrors?: z.ZodIssue[] };

/**
 * Read a YAML file and parse it
 */
export async function readYaml<T>(relativePath: string): Promise<YamlResult<T>> {
  try {
    const fullPath = path.join(getDataPath(), relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const data = YAML.parse(content) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read ${relativePath}: ${error}`
    };
  }
}

/**
 * Read a YAML file, parse it, and validate against a Zod schema.
 * Returns detailed validation errors if the data doesn't match the schema.
 */
export async function readYamlWithSchema<T>(
  relativePath: string,
  schema: z.ZodType<T>
): Promise<ValidatedYamlResult<T>> {
  try {
    const fullPath = path.join(getDataPath(), relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    const parsed = YAML.parse(content);
    
    // Validate with Zod schema
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid data in ${relativePath}: ${result.error.issues.map(i => i.message).join(", ")}`,
        validationErrors: result.error.issues,
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read ${relativePath}: ${error}`
    };
  }
}

/**
 * Write data to a YAML file
 */
export async function writeYaml<T>(
  relativePath: string,
  data: T,
  header?: string
): Promise<YamlResult<void>> {
  try {
    const fullPath = path.join(getDataPath(), relativePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Format YAML with optional header
    let content = YAML.stringify(data, { lineWidth: 0 });
    if (header) {
      content = `# ${header}\n# DO NOT EDIT DIRECTLY - Use MCP tools\n\n${content}`;
    }

    await fs.writeFile(fullPath, content, "utf-8");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to write ${relativePath}: ${error}`
    };
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(getDataPath(), relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a directory structure
 */
export async function createDirectory(relativePath: string): Promise<YamlResult<void>> {
  try {
    const fullPath = path.join(getDataPath(), relativePath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create directory ${relativePath}: ${error}`
    };
  }
}

// Import lock functions for atomic operations
import { withFileLock, withMultiFileLock } from "./lock.js";

// Re-export lock functions for convenience
export { withFileLock, withMultiFileLock };

/**
 * Atomically read, modify, and write a YAML file with locking.
 * This is the recommended way to update YAML files to prevent race conditions.
 *
 * @param relativePath - The file path to modify
 * @param modifier - Function that receives current data and returns modified data
 * @param options - Optional settings (defaultData, header)
 * @returns The result with the modified data
 */
export async function modifyYaml<T>(
  relativePath: string,
  modifier: (data: T) => T | Promise<T>,
  options?: {
    defaultData?: T;
    header?: string;
  }
): Promise<YamlResult<T>> {
  return withFileLock(relativePath, async () => {
    // Read current data
    const result = await readYaml<T>(relativePath);
    let data: T;

    if (!result.success) {
      if (options?.defaultData !== undefined) {
        data = options.defaultData;
      } else {
        return result;
      }
    } else {
      data = result.data!;
    }

    // Apply modification
    data = await modifier(data);

    // Write updated data
    const writeResult = await writeYaml(relativePath, data, options?.header);
    if (!writeResult.success) {
      return {
        success: false,
        error: writeResult.error
      };
    }

    return { success: true, data };
  });
}
