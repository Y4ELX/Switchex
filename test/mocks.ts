import type * as vscode from "vscode";

export class MockSecretStorage implements vscode.SecretStorage {
  public readonly onDidChange: vscode.Event<vscode.SecretStorageChangeEvent> = (() => ({
    dispose: () => {}
  })) as vscode.Event<vscode.SecretStorageChangeEvent>;

  private readonly values = new Map<string, string>();

  public keys(): Thenable<string[]> {
    return Promise.resolve([...this.values.keys()]);
  }

  public get(key: string): Thenable<string | undefined> {
    return Promise.resolve(this.values.get(key));
  }

  public store(key: string, value: string): Thenable<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }

  public delete(key: string): Thenable<void> {
    this.values.delete(key);
    return Promise.resolve();
  }
}

export class MockMemento implements vscode.Memento {
  private readonly values = new Map<string, unknown>();

  public keys(): readonly string[] {
    return [...this.values.keys()];
  }

  public get<T>(key: string): T | undefined;
  public get<T>(key: string, defaultValue: T): T;
  public get<T>(key: string, defaultValue?: T): T | undefined {
    return (this.values.get(key) as T | undefined) ?? defaultValue;
  }

  public update(key: string, value: unknown): Thenable<void> {
    if (value === undefined) {
      this.values.delete(key);
      return Promise.resolve();
    }

    this.values.set(key, value);
    return Promise.resolve();
  }
}
