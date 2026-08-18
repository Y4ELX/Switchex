"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountSwitcher = void 0;
exports.metadataFor = metadataFor;
const fingerprint_1 = require("../utils/fingerprint");
const codex_auth_1 = require("./codex-auth");
const types_1 = require("../types");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function decodeBase64Url(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return Buffer.from(padded, "base64").toString("utf8");
}
function findEmailInJwt(value) {
    if (!JWT_PATTERN.test(value)) {
        return undefined;
    }
    try {
        const payload = JSON.parse(decodeBase64Url(value.split(".")[1] ?? ""));
        return findEmail(payload);
    }
    catch {
        return undefined;
    }
}
function findEmail(value, depth = 0) {
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
        if (typeof entryValue === "string" &&
            normalizedKey.includes("email") &&
            EMAIL_PATTERN.test(entryValue)) {
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
function metadataFor(slot, auth, savedAt = new Date().toISOString()) {
    return {
        label: `Account ${slot}`,
        email: findEmail(auth),
        fingerprint: (0, fingerprint_1.createAuthFingerprint)(auth),
        savedAt
    };
}
class AccountSwitcher {
    store;
    operationInProgress = false;
    constructor(store) {
        this.store = store;
    }
    async saveCurrentAccount(slot) {
        return this.runExclusive(async () => {
            const authJson = await (0, codex_auth_1.readCurrentAuthJson)();
            const auth = (0, codex_auth_1.parseAuthJson)(authJson);
            (0, codex_auth_1.validateAuth)(auth);
            const metadata = metadataFor(slot, auth);
            await this.store.saveAccount(slot, authJson, metadata);
            return metadata;
        });
    }
    async switchAccount(slot) {
        return this.runExclusive(async () => {
            const authJson = await this.store.getAccountAuthJson(slot);
            const auth = (0, codex_auth_1.parseAuthJson)(authJson);
            (0, codex_auth_1.validateAuth)(auth);
            const metadata = metadataFor(slot, auth, this.store.getMetadata(slot)?.savedAt);
            await this.store.updateMetadata(slot, metadata);
            await (0, codex_auth_1.writeCurrentAuth)(authJson);
            return metadata;
        });
    }
    async deleteAccount(slot) {
        await this.runExclusive(async () => {
            await this.store.deleteAccount(slot);
        });
    }
    async refreshStoredMetadata(slot) {
        if (!(await this.store.hasAccount(slot))) {
            return undefined;
        }
        const authJson = await this.store.getAccountAuthJson(slot);
        const auth = (0, codex_auth_1.parseAuthJson)(authJson);
        (0, codex_auth_1.validateAuth)(auth);
        const metadata = metadataFor(slot, auth, this.store.getMetadata(slot)?.savedAt);
        await this.store.updateMetadata(slot, metadata);
        return metadata;
    }
    async detectActiveAccount() {
        let auth;
        try {
            auth = (0, codex_auth_1.parseAuthJson)(await (0, codex_auth_1.readCurrentAuthJson)());
            (0, codex_auth_1.validateAuth)(auth);
        }
        catch {
            return null;
        }
        const activeFingerprint = (0, fingerprint_1.createAuthFingerprint)(auth);
        for (const slot of [1, 2]) {
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
    async runExclusive(operation) {
        if (this.operationInProgress) {
            throw new types_1.UserFacingError("Another Codex account operation is already in progress.");
        }
        this.operationInProgress = true;
        try {
            return await operation();
        }
        finally {
            this.operationInProgress = false;
        }
    }
}
exports.AccountSwitcher = AccountSwitcher;
//# sourceMappingURL=account-switcher.js.map