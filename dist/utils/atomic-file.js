"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileAtomic = writeFileAtomic;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
async function chmodBestEffort(path, mode) {
    try {
        await (0, promises_1.chmod)(path, mode);
    }
    catch {
        // Some platforms ignore POSIX modes. Security still relies on the OS account boundary.
    }
}
async function fsyncDirectoryBestEffort(path) {
    let handle;
    try {
        handle = await (0, promises_1.open)(path, node_fs_1.constants.O_RDONLY);
        await handle.sync();
    }
    catch {
        // Directory fsync is not supported on all platforms.
    }
    finally {
        await handle?.close();
    }
}
async function writeFileAtomic(targetPath, contents) {
    const parentDirectory = (0, node_path_1.dirname)(targetPath);
    await (0, promises_1.mkdir)(parentDirectory, { recursive: true, mode: 0o700 });
    await chmodBestEffort(parentDirectory, 0o700);
    const tempPath = (0, node_path_1.join)(parentDirectory, `.auth.json.${process.pid}.${(0, node_crypto_1.randomUUID)()}.tmp`);
    let tempCreated = false;
    try {
        const handle = await (0, promises_1.open)(tempPath, node_fs_1.constants.O_CREAT | node_fs_1.constants.O_EXCL | node_fs_1.constants.O_WRONLY, 0o600);
        tempCreated = true;
        try {
            await handle.writeFile(contents, "utf8");
            await handle.sync();
        }
        finally {
            await handle.close();
        }
        await chmodBestEffort(tempPath, 0o600);
        await (0, promises_1.rename)(tempPath, targetPath);
        tempCreated = false;
        await chmodBestEffort(targetPath, 0o600);
        await fsyncDirectoryBestEffort(parentDirectory);
    }
    finally {
        if (tempCreated) {
            await (0, promises_1.rm)(tempPath, { force: true });
        }
    }
}
//# sourceMappingURL=atomic-file.js.map