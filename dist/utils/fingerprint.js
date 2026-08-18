"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stableStringify = stableStringify;
exports.createAuthFingerprint = createAuthFingerprint;
const node_crypto_1 = require("node:crypto");
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (!isPlainObject(value)) {
        return JSON.stringify(value);
    }
    const entries = Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
        .join(",")}}`;
}
function createAuthFingerprint(auth) {
    return (0, node_crypto_1.createHash)("sha256").update(stableStringify(auth), "utf8").digest("hex");
}
//# sourceMappingURL=fingerprint.js.map