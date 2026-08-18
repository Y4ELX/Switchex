import * as vscode from "vscode";
import { AccountStore } from "../auth/account-store";
import { AccountSwitcher } from "../auth/account-switcher";

export class CodexStatusBar {
  private readonly item: vscode.StatusBarItem;

  public constructor(
    private readonly switcher: AccountSwitcher,
    private readonly store: AccountStore
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = "codexAccountSwitcher.chooseAccount";
    this.item.tooltip = "Choose Codex account";
    this.item.show();
  }

  public disposable(): vscode.Disposable {
    return this.item;
  }

  public async refresh(): Promise<void> {
    const activeSlot = await this.switcher.detectActiveAccount();
    if (!activeSlot) {
      this.item.text = "$(warning) Switchex: Unknown account";
      return;
    }

    let metadata = this.store.getMetadata(activeSlot);
    if (!metadata?.email) {
      metadata = await this.switcher.refreshStoredMetadata(activeSlot);
    }

    this.item.text = `$(account) Switchex: ${metadata?.email ?? metadata?.label ?? `Account ${activeSlot}`}`;
  }
}
