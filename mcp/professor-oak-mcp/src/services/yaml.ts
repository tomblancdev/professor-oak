/**
 * YAML Service
 *
 * Handles reading and writing YAML files with proper error handling.
 * All game state is stored in YAML format.
 */

import * as fs from "fs/promises";
import * as path from "path";
import YAML from "yaml";

const DATA_PATH = process.env.DATA_PATH || "/data";

export interface YamlResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Read a YAML file and parse it
 */
export async function readYaml<T>(relativePath: string): Promise<YamlResult<T>> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);
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
 * Write data to a YAML file
 */
export async function writeYaml<T>(
  relativePath: string,
  data: T,
  header?: string
): Promise<YamlResult<void>> {
  try {
    const fullPath = path.join(DATA_PATH, relativePath);

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
    const fullPath = path.join(DATA_PATH, relativePath);
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
    const fullPath = path.join(DATA_PATH, relativePath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create directory ${relativePath}: ${error}`
    };
  }
}
