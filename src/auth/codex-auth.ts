import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "../utils/atomic-file";
import { UserFacingError } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function resolveCodexHome(): string {
  const codexHome = process.env.CODEX_HOME;
  if (codexHome && codexHome.trim().length > 0) {
    return codexHome;
  }

  return join(homedir(), ".codex");
}

export function resolveAuthPath(): string {
  return join(resolveCodexHome(), "auth.json");
}

export async function readCurrentAuth(authPath = resolveAuthPath()): Promise<unknown> {
  try {
    await access(authPath, constants.R_OK);
  } catch {
    throw new UserFacingError("Codex authentication file was not found.");
  }

  let contents: string;
  try {
    contents = await readFile(authPath, "utf8");
  } catch {
    throw new UserFacingError("Unable to read the Codex authentication file.");
  }

  return parseAuthJson(contents);
}

export function parseAuthJson(contents: string): unknown {
  try {
    return JSON.parse(contents) as unknown;
  } catch {
    throw new UserFacingError("The Codex authentication file is invalid JSON.");
  }
}

export function validateAuth(auth: unknown): void {
  if (!isRecord(auth) || Object.keys(auth).length === 0) {
    throw new UserFacingError("The Codex authentication file is invalid.");
  }

  const authMode = auth["auth_mode"];
  const tokens = auth["tokens"];
  const hasAuthMode = typeof authMode === "string" && authMode.length > 0;
  const hasTokens = isRecord(tokens) && Object.keys(tokens).length > 0;
  const hasApiKey =
    typeof auth["api_key"] === "string" ||
    typeof auth["openai_api_key"] === "string" ||
    typeof auth["OPENAI_API_KEY"] === "string";

  if (!hasAuthMode && !hasTokens && !hasApiKey) {
    throw new UserFacingError("The Codex authentication file does not look like a Codex login.");
  }
}

export async function readCurrentAuthJson(authPath = resolveAuthPath()): Promise<string> {
  const auth = await readCurrentAuth(authPath);
  validateAuth(auth);
  return JSON.stringify(auth, null, 2);
}

export async function writeCurrentAuth(
  authJson: string,
  authPath = resolveAuthPath()
): Promise<void> {
  const auth = parseAuthJson(authJson);
  validateAuth(auth);
  await writeFileAtomic(authPath, `${JSON.stringify(auth, null, 2)}\n`);
}
