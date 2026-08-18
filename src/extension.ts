import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { AccountStore } from "./auth/account-store";
import { AccountSwitcher } from "./auth/account-switcher";
import { resolveAuthPath } from "./auth/codex-auth";
import { CodexStatusBar } from "./ui/status-bar";
import {
  accountDisplayName,
  deleteWithConfirmation,
  saveWithConfirmation,
  showAccountPicker,
  showReloadMessage
} from "./ui/account-picker";
import { UserFacingError } from "./types";

function handleError(error: unknown): void {
  if (error instanceof UserFacingError) {
    vscode.window.showErrorMessage(error.message);
    return;
  }

  vscode.window.showErrorMessage("Switchex failed. No credentials were logged.");
}

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: () => Promise<void>
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, () => {
      void callback().catch(handleError);
    })
  );
}

function watchAuthFile(context: vscode.ExtensionContext, refresh: () => Promise<void>): void {
  const authPath = resolveAuthPath();
  const directory = path.dirname(authPath);
  const fileName = path.basename(authPath);

  let watcher: fs.FSWatcher | undefined;
  try {
    watcher = fs.watch(directory, (eventType, changedFileName) => {
      if (!changedFileName || changedFileName === fileName) {
        void refresh().catch(handleError);
      }
    });
  } catch {
    return;
  }

  context.subscriptions.push({
    dispose: () => {
      watcher.close();
    }
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const store = new AccountStore(context.secrets, context.globalState);
  const switcher = new AccountSwitcher(store);
  const statusBar = new CodexStatusBar(switcher, store);

  const refresh = async (): Promise<void> => {
    await statusBar.refresh();
  };

  context.subscriptions.push(statusBar.disposable());
  watchAuthFile(context, refresh);

  registerCommand(context, "codexAccountSwitcher.chooseAccount", async () => {
    await showAccountPicker(switcher, store, refresh);
  });

  registerCommand(context, "codexAccountSwitcher.switchAccount1", async () => {
    await switcher.switchAccount(1);
    await refresh();
    await showReloadMessage(`Switched to ${accountDisplayName(1, store)}.`);
  });

  registerCommand(context, "codexAccountSwitcher.switchAccount2", async () => {
    await switcher.switchAccount(2);
    await refresh();
    await showReloadMessage(`Switched to ${accountDisplayName(2, store)}.`);
  });

  registerCommand(context, "codexAccountSwitcher.saveAccount1", async () => {
    await saveWithConfirmation(1, switcher, store);
    await refresh();
  });

  registerCommand(context, "codexAccountSwitcher.saveAccount2", async () => {
    await saveWithConfirmation(2, switcher, store);
    await refresh();
  });

  registerCommand(context, "codexAccountSwitcher.deleteAccount1", async () => {
    await deleteWithConfirmation(1, switcher, store);
    await refresh();
  });

  registerCommand(context, "codexAccountSwitcher.deleteAccount2", async () => {
    await deleteWithConfirmation(2, switcher, store);
    await refresh();
  });

  void refresh().catch(handleError);
}

export function deactivate(): void {}
