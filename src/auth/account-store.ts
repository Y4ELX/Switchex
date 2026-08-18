import type * as vscode from "vscode";
import type { AccountMetadata, AccountSlot, StoredAccount } from "../types";
import { UserFacingError } from "../types";

const SECRET_PREFIX = "codexAccountSwitcher.account";
const METADATA_KEY = "codexAccountSwitcher.metadata";

type MetadataBySlot = Partial<Record<AccountSlot, AccountMetadata>>;

function secretKey(slot: AccountSlot): string {
  return `${SECRET_PREFIX}${slot}`;
}

export class AccountStore {
  public constructor(
    private readonly secrets: vscode.SecretStorage,
    private readonly globalState: vscode.Memento
  ) {}

  public async saveAccount(
    slot: AccountSlot,
    authJson: string,
    metadata: AccountMetadata
  ): Promise<void> {
    await this.secrets.store(secretKey(slot), authJson);
    await this.updateMetadata(slot, metadata);
  }

  public async getAccountAuthJson(slot: AccountSlot): Promise<string> {
    const authJson = await this.secrets.get(secretKey(slot));
    if (!authJson) {
      throw new UserFacingError(`Account ${slot} is not saved.`);
    }

    return authJson;
  }

  public async updateMetadata(slot: AccountSlot, metadata: AccountMetadata): Promise<void> {
    const metadataBySlot = this.getAllMetadata();
    metadataBySlot[slot] = metadata;
    await this.globalState.update(METADATA_KEY, metadataBySlot);
  }

  public async getAccount(slot: AccountSlot): Promise<StoredAccount> {
    const authJson = await this.getAccountAuthJson(slot);
    const metadata = this.getMetadata(slot);
    if (!metadata) {
      throw new UserFacingError(`Account ${slot} metadata is missing.`);
    }

    return { authJson, metadata };
  }

  public async deleteAccount(slot: AccountSlot): Promise<void> {
    await this.secrets.delete(secretKey(slot));
    const metadataBySlot = this.getAllMetadata();
    const remainingMetadata: MetadataBySlot = {};
    for (const currentSlot of [1, 2] as const) {
      if (currentSlot !== slot && metadataBySlot[currentSlot]) {
        remainingMetadata[currentSlot] = metadataBySlot[currentSlot];
      }
    }
    await this.globalState.update(METADATA_KEY, remainingMetadata);
  }

  public async hasAccount(slot: AccountSlot): Promise<boolean> {
    return Boolean(await this.secrets.get(secretKey(slot)));
  }

  public getMetadata(slot: AccountSlot): AccountMetadata | undefined {
    return this.getAllMetadata()[slot];
  }

  public getAllMetadata(): MetadataBySlot {
    const metadata = this.globalState.get<MetadataBySlot>(METADATA_KEY);
    return metadata ?? {};
  }
}
