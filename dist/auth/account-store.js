"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountStore = void 0;
const types_1 = require("../types");
const SECRET_PREFIX = "codexAccountSwitcher.account";
const METADATA_KEY = "codexAccountSwitcher.metadata";
function secretKey(slot) {
    return `${SECRET_PREFIX}${slot}`;
}
class AccountStore {
    secrets;
    globalState;
    constructor(secrets, globalState) {
        this.secrets = secrets;
        this.globalState = globalState;
    }
    async saveAccount(slot, authJson, metadata) {
        await this.secrets.store(secretKey(slot), authJson);
        await this.updateMetadata(slot, metadata);
    }
    async getAccountAuthJson(slot) {
        const authJson = await this.secrets.get(secretKey(slot));
        if (!authJson) {
            throw new types_1.UserFacingError(`Account ${slot} is not saved.`);
        }
        return authJson;
    }
    async updateMetadata(slot, metadata) {
        const metadataBySlot = this.getAllMetadata();
        metadataBySlot[slot] = metadata;
        await this.globalState.update(METADATA_KEY, metadataBySlot);
    }
    async getAccount(slot) {
        const authJson = await this.getAccountAuthJson(slot);
        const metadata = this.getMetadata(slot);
        if (!metadata) {
            throw new types_1.UserFacingError(`Account ${slot} metadata is missing.`);
        }
        return { authJson, metadata };
    }
    async deleteAccount(slot) {
        await this.secrets.delete(secretKey(slot));
        const metadataBySlot = this.getAllMetadata();
        const remainingMetadata = {};
        for (const currentSlot of [1, 2]) {
            if (currentSlot !== slot && metadataBySlot[currentSlot]) {
                remainingMetadata[currentSlot] = metadataBySlot[currentSlot];
            }
        }
        await this.globalState.update(METADATA_KEY, remainingMetadata);
    }
    async hasAccount(slot) {
        return Boolean(await this.secrets.get(secretKey(slot)));
    }
    getMetadata(slot) {
        return this.getAllMetadata()[slot];
    }
    getAllMetadata() {
        const metadata = this.globalState.get(METADATA_KEY);
        return metadata ?? {};
    }
}
exports.AccountStore = AccountStore;
//# sourceMappingURL=account-store.js.map