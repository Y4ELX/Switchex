import * as vscode from "vscode";
import { AccountStore } from "../auth/account-store";
import { AccountSwitcher } from "../auth/account-switcher";
import type { AccountSlot } from "../types";

type PickerAction =
  | { kind: "switch"; slot: AccountSlot }
  | { kind: "save"; slot: AccountSlot }
  | { kind: "delete"; slot: AccountSlot };

interface AccountQuickPickItem extends vscode.QuickPickItem {
  action: PickerAction;
}

export function accountDisplayName(slot: AccountSlot, store: AccountStore): string {
  const metadata = store.getMetadata(slot);
  return metadata?.email ?? metadata?.label ?? `Account ${slot}`;
}

async function ensureAccountDisplayName(
  slot: AccountSlot,
  switcher: AccountSwitcher,
  store: AccountStore
): Promise<string> {
  if (store.getMetadata(slot)?.email) {
    return accountDisplayName(slot, store);
  }

  await switcher.refreshStoredMetadata(slot).catch(() => undefined);
  return accountDisplayName(slot, store);
}

export async function showAccountPicker(
  switcher: AccountSwitcher,
  store: AccountStore,
  refresh: () => Promise<void>
): Promise<void> {
  const activeSlot = await switcher.detectActiveAccount();
  const items: Array<AccountQuickPickItem | vscode.QuickPickItem> = [];

  for (const slot of [1, 2] as const) {
    await ensureAccountDisplayName(slot, switcher, store);
    const metadata = store.getMetadata(slot);
    const displayName = accountDisplayName(slot, store);
    items.push({
      label: `${activeSlot === slot ? "$(check) " : ""}Switch to ${displayName}`,
      description: metadata?.email ? `Account ${slot}` : undefined,
      detail: metadata ? "Saved Codex login" : "No saved login",
      action: { kind: "switch", slot }
    });
  }

  items.push({ label: "", kind: vscode.QuickPickItemKind.Separator });
  const account1DisplayName = await ensureAccountDisplayName(1, switcher, store);
  const account2DisplayName = await ensureAccountDisplayName(2, switcher, store);
  items.push(
    { label: "Save current login as Account 1", action: { kind: "save", slot: 1 } },
    { label: "Save current login as Account 2", action: { kind: "save", slot: 2 } },
    {
      label: `Delete ${account1DisplayName}`,
      description: store.getMetadata(1)?.email ? "Account 1" : undefined,
      action: { kind: "delete", slot: 1 }
    },
    {
      label: `Delete ${account2DisplayName}`,
      description: store.getMetadata(2)?.email ? "Account 2" : undefined,
      action: { kind: "delete", slot: 2 }
    }
  );

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a Codex account action"
  });

  if (!selected || !("action" in selected)) {
    return;
  }

  await runPickerAction(selected.action, switcher, store, refresh);
}

async function runPickerAction(
  action: PickerAction,
  switcher: AccountSwitcher,
  store: AccountStore,
  refresh: () => Promise<void>
): Promise<void> {
  switch (action.kind) {
    case "switch":
      await switcher.switchAccount(action.slot);
      await refresh();
      await reloadWindow();
      return;
    case "save":
      await saveWithConfirmation(action.slot, switcher, store);
      await refresh();
      vscode.window.showInformationMessage(`Saved current Codex login as Account ${action.slot}.`);
      return;
    case "delete": {
      const deletedDisplayName = await ensureAccountDisplayName(action.slot, switcher, store);
      const didDelete = await deleteWithConfirmation(action.slot, switcher, store);
      await refresh();
      if (!didDelete) {
        return;
      }
      vscode.window.showInformationMessage(
        `Deleted ${deletedDisplayName} from secure storage.`
      );
      return;
    }
  }
}

export async function saveWithConfirmation(
  slot: AccountSlot,
  switcher: AccountSwitcher,
  store: AccountStore
): Promise<void> {
  if (await store.hasAccount(slot)) {
    const choice = await vscode.window.showWarningMessage(
      `Account ${slot} already contains a saved Codex login. Replace it with the currently active login?`,
      { modal: true },
      "Replace"
    );
    if (choice !== "Replace") {
      return;
    }
  }

  await switcher.saveCurrentAccount(slot);
}

export async function deleteWithConfirmation(
  slot: AccountSlot,
  switcher: AccountSwitcher,
  store: AccountStore
): Promise<boolean> {
  const displayName = await ensureAccountDisplayName(slot, switcher, store);
  const choice = await vscode.window.showWarningMessage(
    `Delete ${displayName} from secure storage?`,
    { modal: true },
    "Delete"
  );
  if (choice !== "Delete") {
    return false;
  }

  await switcher.deleteAccount(slot);
  return true;
}

export async function reloadWindow(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.reloadWindow");
}
