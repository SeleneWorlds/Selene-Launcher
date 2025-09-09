import { defineStore } from 'pinia';
import { ref } from 'vue';
import { join } from '@tauri-apps/api/path';
import { readTextFile, writeTextFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const UPDATE_URL = 'https://update.seleneworlds.com/selene-client/{{channel}}/latest.json';
const VERSIONS_DIR = 'versions';

type VersionMetadata = {
  version: string;
  url: string;
  fileName: string;
  libraries: Record<string, string>;
}

export const useVersionStore = defineStore('version', () => {
  const latestVersion = ref<string | null>(null);
  const versionMetadatas = ref<Record<string, VersionMetadata>>({});

  async function ensureVersionsDir() {
    if (!(await exists(VERSIONS_DIR, { baseDir: BaseDirectory.AppData }))) {
      await mkdir(VERSIONS_DIR, { baseDir: BaseDirectory.AppData });
    }
  }

  async function storeVersionMetadata(metadata: VersionMetadata) {
    await ensureVersionsDir();
    const versionPath = await join(VERSIONS_DIR, `${metadata.version}.json`);
    const json = JSON.stringify(metadata, null, 2);
    await writeTextFile(versionPath, json, { baseDir: BaseDirectory.AppData });
    versionMetadatas.value[metadata.version] = metadata;
    latestVersion.value = metadata.version;
  }

  async function readVersionMetadata(version: string) {
    const versionPath = await join(VERSIONS_DIR, `${version}.json`);
    const json = await readTextFile(versionPath, { baseDir: BaseDirectory.AppData });
    const meta = JSON.parse(json) as VersionMetadata;
    versionMetadatas.value[version] = meta;
    return meta;
  }

  async function fetchLatestVersion(channel: string) {
    const url = UPDATE_URL.replace('{{channel}}', channel);
    const response = await tauriFetch(url);
    if (!response.ok) throw new Error(`Failed to fetch version info: ${response.statusText}`);
    const meta = await response.json() as VersionMetadata;
    latestVersion.value = meta.version;
    await storeVersionMetadata(meta);
    return meta;
  }

  return {
    latestVersion,
    versionMetadatas,
    storeVersionMetadata,
    readVersionMetadata,
    fetchLatestVersion,
  };
});
