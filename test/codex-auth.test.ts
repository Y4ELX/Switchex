import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseAuthJson,
  readCurrentAuth,
  resolveAuthPath,
  resolveCodexHome,
  validateAuth,
  writeCurrentAuth
} from "../src/auth/codex-auth";

const originalCodexHome = process.env.CODEX_HOME;
const tempDirs: string[] = [];

async function tempCodexHome(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "codex-account-switcher-"));
  tempDirs.push(directory);
  process.env.CODEX_HOME = directory;
  return directory;
}

afterEach(async () => {
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }

  await Promise.all(
    tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("codex auth", () => {
  it("resolves CODEX_HOME when set", () => {
    process.env.CODEX_HOME = "/tmp/example-codex-home";

    expect(resolveCodexHome()).toBe("/tmp/example-codex-home");
    expect(resolveAuthPath()).toBe("/tmp/example-codex-home/auth.json");
  });

  it("falls back to the user .codex directory", () => {
    delete process.env.CODEX_HOME;

    expect(resolveCodexHome().endsWith("/.codex")).toBe(true);
  });

  it("validates plausible auth", () => {
    expect(() => {
      validateAuth({
        auth_mode: "chatgpt",
        tokens: {
          access_token: "fake-access-token",
          refresh_token: "fake-refresh-token"
        }
      });
    }).not.toThrow();
  });

  it("rejects invalid auth", () => {
    expect(() => {
      validateAuth({ unrelated: true });
    }).toThrow("does not look like a Codex login");
    expect(() => {
      parseAuthJson("{");
    }).toThrow("invalid JSON");
  });

  it("reads auth only from CODEX_HOME", async () => {
    const codexHome = await tempCodexHome();
    const authPath = join(codexHome, "auth.json");
    await writeFile(
      authPath,
      JSON.stringify({ auth_mode: "chatgpt", tokens: { access_token: "fake" } })
    );

    await expect(readCurrentAuth()).resolves.toMatchObject({ auth_mode: "chatgpt" });
  });

  it("writes auth atomically as a regular file", async () => {
    const codexHome = await tempCodexHome();
    await writeCurrentAuth(
      JSON.stringify({ auth_mode: "chatgpt", tokens: { access_token: "fake" } })
    );

    const written = await readFile(join(codexHome, "auth.json"), "utf8");
    expect(JSON.parse(written) as unknown).toMatchObject({ auth_mode: "chatgpt" });
  });
});
