import { constants } from "node:fs";
import { chmod, mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

async function chmodBestEffort(path: string, mode: number): Promise<void> {
  try {
    await chmod(path, mode);
  } catch {
    // Some platforms ignore POSIX modes. Security still relies on the OS account boundary.
  }
}

async function fsyncDirectoryBestEffort(path: string): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, constants.O_RDONLY);
    await handle.sync();
  } catch {
    // Directory fsync is not supported on all platforms.
  } finally {
    await handle?.close();
  }
}

export async function writeFileAtomic(targetPath: string, contents: string): Promise<void> {
  const parentDirectory = dirname(targetPath);
  await mkdir(parentDirectory, { recursive: true, mode: 0o700 });
  await chmodBestEffort(parentDirectory, 0o700);

  const tempPath = join(parentDirectory, `.auth.json.${process.pid}.${randomUUID()}.tmp`);
  let tempCreated = false;

  try {
    const handle = await open(
      tempPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600
    );
    tempCreated = true;
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }

    await chmodBestEffort(tempPath, 0o600);
    await rename(tempPath, targetPath);
    tempCreated = false;
    await chmodBestEffort(targetPath, 0o600);
    await fsyncDirectoryBestEffort(parentDirectory);
  } finally {
    if (tempCreated) {
      await rm(tempPath, { force: true });
    }
  }
}
