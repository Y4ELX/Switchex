import { createAuthFingerprint } from "../utils/fingerprint";
import { parseAuthJson, readCurrentAuthJson, validateAuth, writeCurrentAuth } from "./codex-auth";
import { AccountStore } from "./account-store";
import type { AccountMetadata, AccountSlot } from "../types";
import { UserFacingError } from "../types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function findEmailInJwt(value: string): string | undefined {
  if (!JWT_PATTERN.test(value)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(value.split(".")[1] ?? "")) as unknown;
    return findEmail(payload);
  } catch {
    return undefined;
  }
}

function findEmail(value: unknown, depth = 0): string | undefined {
  if (depth > 5) {
    return undefined;
  }

  if (typeof value === "string") {
    if (EMAIL_PATTERN.test(value)) {
      return value;
    }

    return findEmailInJwt(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const email = findEmail(item, depth + 1);
      if (email) {
        return email;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const [key, entryValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      typeof entryValue === "string" &&
      normalizedKey.includes("email") &&
      EMAIL_PATTERN.test(entryValue)
    ) {
      return entryValue;
    }

    if (typeof entryValue === "string") {
      const email = findEmailInJwt(entryValue);
      if (email) {
        return email;
      }
    }
  }

  for (const [key, entryValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("secret")) {
      continue;
    }

    const email = findEmail(entryValue, depth + 1);
    if (email) {
      return email;
    }
  }

  return undefined;
}

export function metadataFor(
  slot: AccountSlot,
  auth: unknown,
  savedAt = new Date().toISOString()
): AccountMetadata {
  return {
    label: `Account ${slot}`,
    email: findEmail(auth),
    fingerprint: createAuthFingerprint(auth),
    savedAt
  };
}

export class AccountSwitcher {
  private operationInProgress = false;

  public constructor(private readonly store: AccountStore) {}

  public async saveCurrentAccount(slot: AccountSlot): Promise<AccountMetadata> {
    return this.runExclusive(async () => {
      const authJson = await readCurrentAuthJson();
      const auth = parseAuthJson(authJson);
      validateAuth(auth);
      const metadata = metadataFor(slot, auth);
      await this.store.saveAccount(slot, authJson, metadata);
      return metadata;
    });
  }

  public async switchAccount(slot: AccountSlot): Promise<AccountMetadata> {
    return this.runExclusive(async () => {
      const authJson = await this.store.getAccountAuthJson(slot);
      const auth = parseAuthJson(authJson);
      validateAuth(auth);
      const metadata = metadataFor(slot, auth, this.store.getMetadata(slot)?.savedAt);
      await this.store.updateMetadata(slot, metadata);
      await writeCurrentAuth(authJson);
      return metadata;
    });
  }

  public async deleteAccount(slot: AccountSlot): Promise<void> {
    await this.runExclusive(async () => {
      await this.store.deleteAccount(slot);
    });
  }

  public async refreshStoredMetadata(slot: AccountSlot): Promise<AccountMetadata | undefined> {
    if (!(await this.store.hasAccount(slot))) {
      return undefined;
    }

    const authJson = await this.store.getAccountAuthJson(slot);
    const auth = parseAuthJson(authJson);
    validateAuth(auth);

    const metadata = metadataFor(slot, auth, this.store.getMetadata(slot)?.savedAt);
    await this.store.updateMetadata(slot, metadata);
    return metadata;
  }

  public async detectActiveAccount(): Promise<AccountSlot | null> {
    let auth: unknown;
    try {
      auth = parseAuthJson(await readCurrentAuthJson());
      validateAuth(auth);
    } catch {
      return null;
    }

    const activeFingerprint = createAuthFingerprint(auth);
    for (const slot of [1, 2] as const) {
      let metadata = this.store.getMetadata(slot);
      if (!metadata?.fingerprint || !metadata.email) {
        metadata = await this.refreshStoredMetadata(slot).catch(() => undefined);
      }

      if (metadata?.fingerprint === activeFingerprint) {
        return slot;
      }
    }

    return null;
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.operationInProgress) {
      throw new UserFacingError("Another Codex account operation is already in progress.");
    }

    this.operationInProgress = true;
    try {
      return await operation();
    } finally {
      this.operationInProgress = false;
    }
  }
}
