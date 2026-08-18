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
exports.CodexStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class CodexStatusBar {
    switcher;
    store;
    item;
    constructor(switcher, store) {
        this.switcher = switcher;
        this.store = store;
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.item.command = "codexAccountSwitcher.chooseAccount";
        this.item.tooltip = "Choose Codex account";
        this.item.show();
    }
    disposable() {
        return this.item;
    }
    async refresh() {
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
exports.CodexStatusBar = CodexStatusBar;
//# sourceMappingURL=status-bar.js.map