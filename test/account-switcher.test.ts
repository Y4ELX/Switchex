import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AccountStore } from "../src/auth/account-store";
import { AccountSwitcher } from "../src/auth/account-switcher";
import { MockMemento, MockSecretStorage } from "./mocks";

const originalCodexHome = process.env.CODEX_HOME;

let tempDirectory: string;
let secrets: MockSecretStorage;
let store: AccountStore;
let switcher: AccountSwitcher;

function createJwt(payload: unknown): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value), "utf8")
      .toString("base64url");

  return `${encode({ alg: "none" })}.${encode(payload)}.signature`;
}

async function writeAuth(auth: unknown): Promise<void> {
  await writeFile(join(tempDirectory, "auth.json"), JSON.stringify(auth, null, 2), "utf8");
}

beforeEach(async () => {
  tempDirectory = await mkdtemp(join(tmpdir(), "codex-account-switcher-"));
  process.env.CODEX_HOME = tempDirectory;
  secrets = new MockSecretStorage();
  store = new AccountStore(secrets, new MockMemento());
  switcher = new AccountSwitcher(store);
});

afterEach(async () => {
  if (originalCodexHome === undefined) {
    delete process.env.CODEX_HOME;
  } else {
    process.env.CODEX_HOME = originalCodexHome;
  }

  await rm(tempDirectory, { recursive: true, force: true });
});

describe("account switcher", () => {
  it("saves the current account in SecretStorage with metadata", async () => {
    await writeAuth({
      auth_mode: "chatgpt",
      user: { email: "account1@example.com" },
      tokens: { access_token: "fake-access-token", refresh_token: "fake-refresh-token" }
    });

    const metadata = await switcher.saveCurrentAccount(1);

    expect(metadata.email).toBe("account1@example.com");
    expect(await store.hasAccount(1)).toBe(true);
    expect(store.getMetadata(1)?.fingerprint).toHaveLength(64);
  });

  it("extracts account email from the id token payload", async () => {
    await writeAuth({
      auth_mode: "chatgpt",
      tokens: {
        id_token: createJwt({ email: "jwt-account@example.com" }),
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token"
      }
    });

    const metadata = await switcher.saveCurrentAccount(1);

    expect(metadata.email).toBe("jwt-account@example.com");
  });

  it("refreshes saved metadata when an existing account has no email", async () => {
    const auth = {
      auth_mode: "chatgpt",
      tokens: {
        id_token: createJwt({ email: "existing-account@example.com" }),
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token"
      }
    };

    await store.saveAccount(1, JSON.stringify(auth), {
      label: "Account 1",
      fingerprint: "old-fingerprint",
      savedAt: "2026-01-01T00:00:00.000Z"
    });

    const metadata = await switcher.refreshStoredMetadata(1);

    expect(metadata?.email).toBe("existing-account@example.com");
    expect(store.getMetadata(1)?.email).toBe("existing-account@example.com");
    expect(store.getMetadata(1)?.savedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("refreshes saved metadata when metadata is missing", async () => {
    const auth = {
      auth_mode: "chatgpt",
      tokens: {
        id_token: createJwt({ email: "missing-metadata@example.com" }),
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token"
      }
    };

    await secrets.store("codexAccountSwitcher.account1", JSON.stringify(auth));

    const metadata = await switcher.refreshStoredMetadata(1);

    expect(metadata?.email).toBe("missing-metadata@example.com");
    expect(store.getMetadata(1)?.email).toBe("missing-metadata@example.com");
  });

  it("switches to a saved account by replacing auth.json", async () => {
    const account1 = {
      auth_mode: "chatgpt",
      user: { email: "account1@example.com" },
      tokens: { access_token: "fake-access-token-1", refresh_token: "fake-refresh-token-1" }
    };
    const account2 = {
      auth_mode: "chatgpt",
      user: { email: "account2@example.com" },
      tokens: { access_token: "fake-access-token-2", refresh_token: "fake-refresh-token-2" }
    };

    await writeAuth(account1);
    await switcher.saveCurrentAccount(1);
    await writeAuth(account2);
    await switcher.saveCurrentAccount(2);

    await switcher.switchAccount(1);

    const activeAuth = JSON.parse(await readFile(join(tempDirectory, "auth.json"), "utf8")) as {
      user: { email: string };
    };
    expect(activeAuth.user.email).toBe("account1@example.com");
  });

  it("detects the active account using fingerprints", async () => {
    const account1 = {
      tokens: { refresh_token: "fake-refresh-token-1", access_token: "fake-access-token-1" },
      auth_mode: "chatgpt"
    };

    await writeAuth(account1);
    await switcher.saveCurrentAccount(1);

    await writeAuth({
      auth_mode: "chatgpt",
      tokens: { access_token: "fake-access-token-1", refresh_token: "fake-refresh-token-1" }
    });

    await expect(switcher.detectActiveAccount()).resolves.toBe(1);
  });

  it("refreshes stale metadata while detecting the active account", async () => {
    const account1 = {
      auth_mode: "chatgpt",
      tokens: {
        id_token: createJwt({ email: "active-account@example.com" }),
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token"
      }
    };

    await store.saveAccount(1, JSON.stringify(account1), {
      label: "Account 1",
      fingerprint: "old-fingerprint",
      savedAt: "2026-01-01T00:00:00.000Z"
    });
    await writeAuth(account1);

    await expect(switcher.detectActiveAccount()).resolves.toBe(1);
    expect(store.getMetadata(1)?.email).toBe("active-account@example.com");
  });

  it("deletes saved accounts", async () => {
    await writeAuth({ auth_mode: "chatgpt", tokens: { access_token: "fake-access-token" } });
    await switcher.saveCurrentAccount(1);

    await switcher.deleteAccount(1);

    await expect(store.hasAccount(1)).resolves.toBe(false);
    expect(store.getMetadata(1)).toBeUndefined();
  });
});
