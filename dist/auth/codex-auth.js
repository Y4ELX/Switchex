"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCodexHome = resolveCodexHome;
exports.resolveAuthPath = resolveAuthPath;
exports.readCurrentAuth = readCurrentAuth;
exports.parseAuthJson = parseAuthJson;
exports.validateAuth = validateAuth;
exports.readCurrentAuthJson = readCurrentAuthJson;
exports.writeCurrentAuth = writeCurrentAuth;
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const atomic_file_1 = require("../utils/atomic-file");
const types_1 = require("../types");
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolveCodexHome() {
    const codexHome = process.env.CODEX_HOME;
    if (codexHome && codexHome.trim().length > 0) {
        return codexHome;
    }
    return (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex");
}
function resolveAuthPath() {
    return (0, node_path_1.join)(resolveCodexHome(), "auth.json");
}
async function readCurrentAuth(authPath = resolveAuthPath()) {
    try {
        await (0, promises_1.access)(authPath, node_fs_1.constants.R_OK);
    }
    catch {
        throw new types_1.UserFacingError("Codex authentication file was not found.");
    }
    let contents;
    try {
        contents = await (0, promises_1.readFile)(authPath, "utf8");
    }
    catch {
        throw new types_1.UserFacingError("Unable to read the Codex authentication file.");
    }
    return parseAuthJson(contents);
}
function parseAuthJson(contents) {
    try {
        return JSON.parse(contents);
    }
    catch {
        throw new types_1.UserFacingError("The Codex authentication file is invalid JSON.");
    }
}
function validateAuth(auth) {
    if (!isRecord(auth) || Object.keys(auth).length === 0) {
        throw new types_1.UserFacingError("The Codex authentication file is invalid.");
    }
    const authMode = auth["auth_mode"];
    const tokens = auth["tokens"];
    const hasAuthMode = typeof authMode === "string" && authMode.length > 0;
    const hasTokens = isRecord(tokens) && Object.keys(tokens).length > 0;
    const hasApiKey = typeof auth["api_key"] === "string" ||
        typeof auth["openai_api_key"] === "string" ||
        typeof auth["OPENAI_API_KEY"] === "string";
    if (!hasAuthMode && !hasTokens && !hasApiKey) {
        throw new types_1.UserFacingError("The Codex authentication file does not look like a Codex login.");
    }
}
async function readCurrentAuthJson(authPath = resolveAuthPath()) {
    const auth = await readCurrentAuth(authPath);
    validateAuth(auth);
    return JSON.stringify(auth, null, 2);
}
async function writeCurrentAuth(authJson, authPath = resolveAuthPath()) {
    const auth = parseAuthJson(authJson);
    validateAuth(auth);
    await (0, atomic_file_1.writeFileAtomic)(authPath, `${JSON.stringify(auth, null, 2)}\n`);
}
//# sourceMappingURL=codex-auth.js.map