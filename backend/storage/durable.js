import {open} from 'node:fs/promises';

// A rename only survives a power cut once the directory entry reaches disk.
// File contents are flushed separately with createWriteStream({flush: true}).
export async function syncDirectories(...directories) {
  for (const directory of directories) {
    const handle = await open(directory, 'r');
    try { await handle.sync(); } finally { await handle.close(); }
  }
}
