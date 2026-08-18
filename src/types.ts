export type AccountSlot = 1 | 2;

export interface AccountMetadata {
  label: string;
  email?: string;
  fingerprint: string;
  savedAt: string;
}

export interface StoredAccount {
  authJson: string;
  metadata: AccountMetadata;
}

export class UserFacingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
