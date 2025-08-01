import { appDataDir, join } from '@tauri-apps/api/path';
import { readDir, exists, mkdir } from '@tauri-apps/plugin-fs';

export async function getGlobalClientBundlesDir(): Promise<string> {
  const baseDir = await appDataDir();
  return await join(baseDir, 'global_client_bundles');
}

export async function ensureGlobalClientBundlesDir(): Promise<string> {
  const dir = await getGlobalClientBundlesDir();
  if (!(await exists(dir))) {
    await mkdir(dir);
  }
  return dir;
}

export async function countGlobalClientBundles(): Promise<number> {
  const dir = await getGlobalClientBundlesDir();
  if (!(await exists(dir))) return 0;
  const files = await readDir(dir);
  // Count only files or directories that are not hidden
  return files.filter(f => !f.name.startsWith('.')).length;
}
