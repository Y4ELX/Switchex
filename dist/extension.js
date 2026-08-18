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
exports.activate = activate;
exports.deactivate = deactivate;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const vscode = __importStar(require("vscode"));
const account_store_1 = require("./auth/account-store");
const account_switcher_1 = require("./auth/account-switcher");
const codex_auth_1 = require("./auth/codex-auth");
const status_bar_1 = require("./ui/status-bar");
const account_picker_1 = require("./ui/account-picker");
const types_1 = require("./types");
function handleError(error) {
    if (error instanceof types_1.UserFacingError) {
        vscode.window.showErrorMessage(error.message);
        return;
    }
    vscode.window.showErrorMessage("Switchex failed. No credentials were logged.");
}
function registerCommand(context, command, callback) {
    context.subscriptions.push(vscode.commands.registerCommand(command, () => {
        void callback().catch(handleError);
    }));
}
function watchAuthFile(context, refresh) {
    const authPath = (0, codex_auth_1.resolveAuthPath)();
    const directory = path.dirname(authPath);
    const fileName = path.basename(authPath);
    let watcher;
    try {
        watcher = fs.watch(directory, (eventType, changedFileName) => {
            if (!changedFileName || changedFileName === fileName) {
                void refresh().catch(handleError);
            }
        });
    }
    catch {
        return;
    }
    context.subscriptions.push({
        dispose: () => {
            watcher.close();
        }
    });
}
function activate(context) {
    const store = new account_store_1.AccountStore(context.secrets, context.globalState);
    const switcher = new account_switcher_1.AccountSwitcher(store);
    const statusBar = new status_bar_1.CodexStatusBar(switcher, store);
    const refresh = async () => {
        await statusBar.refresh();
    };
    context.subscriptions.push(statusBar.disposable());
    watchAuthFile(context, refresh);
    registerCommand(context, "codexAccountSwitcher.chooseAccount", async () => {
        await (0, account_picker_1.showAccountPicker)(switcher, store, refresh);
    });
    registerCommand(context, "codexAccountSwitcher.switchAccount1", async () => {
        await switcher.switchAccount(1);
        await refresh();
        await (0, account_picker_1.reloadWindow)();
    });
    registerCommand(context, "codexAccountSwitcher.switchAccount2", async () => {
        await switcher.switchAccount(2);
        await refresh();
        await (0, account_picker_1.reloadWindow)();
    });
    registerCommand(context, "codexAccountSwitcher.saveAccount1", async () => {
        await (0, account_picker_1.saveWithConfirmation)(1, switcher, store);
        await refresh();
    });
    registerCommand(context, "codexAccountSwitcher.saveAccount2", async () => {
        await (0, account_picker_1.saveWithConfirmation)(2, switcher, store);
        await refresh();
    });
    registerCommand(context, "codexAccountSwitcher.deleteAccount1", async () => {
        await (0, account_picker_1.deleteWithConfirmation)(1, switcher, store);
        await refresh();
    });
    registerCommand(context, "codexAccountSwitcher.deleteAccount2", async () => {
        await (0, account_picker_1.deleteWithConfirmation)(2, switcher, store);
        await refresh();
    });
    void refresh().catch(handleError);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map