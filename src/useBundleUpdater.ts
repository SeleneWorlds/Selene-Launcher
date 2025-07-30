import { hashStringSHA256 } from "./hashUtil";
import {
  readDir,
  mkdir,
  exists,
  remove,
  BaseDirectory,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";
import * as path from "@tauri-apps/api/path";
import { useAuthStore } from "./stores/auth";

export function useBundleUpdater() {
  const auth = useAuthStore();

  async function getLocalBundleHashes(serverUrl: string) {
    const serverHash = await hashStringSHA256(serverUrl);
    const bundleBaseDir = "client_bundles";
    let localBundles: Record<string, string> = {};
    try {
      // Read both shared and server-scoped bundles
      // Shared bundles (allow_shared_cache)
      const sharedDir = `${bundleBaseDir}/shared`;
      if (await exists(sharedDir, { baseDir: BaseDirectory.AppLocalData })) {
        const files = await readDir(sharedDir, {
          baseDir: BaseDirectory.AppLocalData,
        });
        for (const file of files) {
          if (file.isDirectory) {
            localBundles[file.name] = file.name;
          }
        }
      }
      // Server-scoped bundles (subfolder by hash)
      const serverDir = `${bundleBaseDir}/${serverHash}`;
      if (await exists(serverDir, { baseDir: BaseDirectory.AppLocalData })) {
        const files = await readDir(serverDir, {
          baseDir: BaseDirectory.AppLocalData,
        });
        for (const file of files) {
          if (file.isDirectory) {
            localBundles[file.name] = file.name;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return localBundles;
  }

  async function checkBundles(serverUrl: string) {
    const resp = await tauriFetch(`${serverUrl}/bundles`, {
      headers: {
        Authorization: "Bearer " + auth.joinToken,
      },
    });
    if (!resp.ok) return;
    const bundles = await resp.json() as {
      [key: string]: {
        name: string;
        hash: string;
        variants: string[];
        allow_shared_cache?: boolean;
      };
    };
    console.log(bundles)
    const localHashes = await getLocalBundleHashes(serverUrl);
    const needUpdate: Array<{
      id: string;
      name: string;
      hash: string;
      variants: string[];
      allow_shared_cache?: boolean;
    }> = [];
    for (const bundleId of Object.keys(bundles)) {
      const bundle = bundles[bundleId];
      if (!bundle.hash || !bundle.variants) continue;
      if (!localHashes[bundle.hash]) {
        needUpdate.push({
          id: bundleId,
          name: bundle.name,
          hash: bundle.hash,
          variants: bundle.variants,
          allow_shared_cache: bundle.allow_shared_cache,
        });
      }
    }
    return { bundles, bundlesToUpdate: needUpdate };
  }

  async function downloadBundles(serverUrl: string, bundlesToUpdate: Array<{ id: string; name: string; hash: string; variants: string[]; allow_shared_cache?: boolean }>, onProgress?: (msg: string | null) => void) {
    if (onProgress) onProgress(null);
    const serverHash = await hashStringSHA256(serverUrl);
    for (const b of bundlesToUpdate) {
      if (onProgress) onProgress(`Downloading ${b.name}...`);
      const variant = b.variants[0];
      const response = await tauriFetch(`${serverUrl}/bundles/${encodeURIComponent(b.id)}/${encodeURIComponent(variant)}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + auth.joinToken,
        },
      });
      const arrayBuffer = await response.arrayBuffer();
      if (response.ok) {
        const isShared = b.allow_shared_cache === true;
        const bundleDir = isShared ? "client_bundles/shared" : `client_bundles/${serverHash}`;
        // Ensure the directory exists
        if (!(await exists(bundleDir, { baseDir: BaseDirectory.AppLocalData }))) {
          await mkdir(bundleDir, {
            baseDir: BaseDirectory.AppLocalData,
            recursive: true,
          });
        }
        // Download the zip file
        const fileName = `${b.hash}.zip`;
        await writeFile(
          await path.join(bundleDir, fileName),
          new Uint8Array(arrayBuffer),
          { baseDir: BaseDirectory.AppLocalData }
        );
        // Extract the zip file
        const baseDir = await path.appLocalDataDir();
        const zipPath = await path.join(baseDir, bundleDir, fileName);
        const extractDir = await path.join(baseDir, bundleDir, b.hash);
        await invoke("extract_zip", {
          zipPath,
          destDir: extractDir,
        });
        // Delete the zip file
        await remove(await path.join(bundleDir, fileName), {
          baseDir: BaseDirectory.AppLocalData,
        });
      } else {
        console.error("Failed to download bundle", b.name, b.hash, b.variants);
        console.error(response);
      }
    }
    if (onProgress) onProgress(null);
    return null;
  }

  return {
    getLocalBundleHashes,
    checkBundles,
    downloadBundles,
  };
}
