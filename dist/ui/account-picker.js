"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountDisplayName = accountDisplayName;
exports.showAccountPicker = showAccountPicker;
exports.saveWithConfirmation = saveWithConfirmation;
exports.deleteWithConfirmation = deleteWithConfirmation;
exports.showReloadMessage = showReloadMessage;
const vscode = __importStar(require("vscode"));
function accountDisplayName(slot, store) {
    const metadata = store.getMetadata(slot);
    return metadata?.email ?? metadata?.label ?? `Account ${slot}`;
}
async function ensureAccountDisplayName(slot, switcher, store) {
    if (store.getMetadata(slot)?.email) {
        return accountDisplayName(slot, store);
    }
    await switcher.refreshStoredMetadata(slot).catch(() => undefined);
    return accountDisplayName(slot, store);
}
async function showAccountPicker(switcher, store, refresh) {
    const activeSlot = await switcher.detectActiveAccount();
    const items = [];
    for (const slot of [1, 2]) {
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
    items.push({ label: "Save current login as Account 1", action: { kind: "save", slot: 1 } }, { label: "Save current login as Account 2", action: { kind: "save", slot: 2 } }, {
        label: `Delete ${account1DisplayName}`,
        description: store.getMetadata(1)?.email ? "Account 1" : undefined,
        action: { kind: "delete", slot: 1 }
    }, {
        label: `Delete ${account2DisplayName}`,
        description: store.getMetadata(2)?.email ? "Account 2" : undefined,
        action: { kind: "delete", slot: 2 }
    });
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a Codex account action"
    });
    if (!selected || !("action" in selected)) {
        return;
    }
    await runPickerAction(selected.action, switcher, store, refresh);
}
async function runPickerAction(action, switcher, store, refresh) {
    switch (action.kind) {
        case "switch":
            await switcher.switchAccount(action.slot);
            await refresh();
            await showReloadMessage(`Switched to ${await ensureAccountDisplayName(action.slot, switcher, store)}.`);
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
            vscode.window.showInformationMessage(`Deleted ${deletedDisplayName} from secure storage.`);
            return;
        }
    }
}
async function saveWithConfirmation(slot, switcher, store) {
    if (await store.hasAccount(slot)) {
        const choice = await vscode.window.showWarningMessage(`Account ${slot} already contains a saved Codex login. Replace it with the currently active login?`, { modal: true }, "Replace");
        if (choice !== "Replace") {
            return;
        }
    }
    await switcher.saveCurrentAccount(slot);
}
async function deleteWithConfirmation(slot, switcher, store) {
    const displayName = await ensureAccountDisplayName(slot, switcher, store);
    const choice = await vscode.window.showWarningMessage(`Delete ${displayName} from secure storage?`, { modal: true }, "Delete");
    if (choice !== "Delete") {
        return false;
    }
    await switcher.deleteAccount(slot);
    return true;
}
async function showReloadMessage(message) {
    const choice = await vscode.window.showInformationMessage(`${message} Reload the VS Code window if Codex still shows the previous account.`, "Reload Window");
    if (choice === "Reload Window") {
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
}
//# sourceMappingURL=account-picker.js.map