import { defineStore } from 'pinia';
import { ref } from 'vue';
import { invoke } from "@tauri-apps/api/core";
import { load } from '@tauri-apps/plugin-store';
import { Server } from '../types';

export type ReleaseChannel = 'stable' | 'experimental';

const SETTINGS_FILE = 'settings.json';

export const useSettingsStore = defineStore('settings', () => {
  const releaseChannel = ref<ReleaseChannel>('stable');
  const jrePath = ref<string>('');
  const lastJoinedServer = ref<Server | null>(null);

  async function loadSettings() {
    const persistentStore = await load(SETTINGS_FILE, { autoSave: false });
    const storedReleaseChannel = await persistentStore.get<ReleaseChannel>('releaseChannel');
    if (storedReleaseChannel === 'stable' || storedReleaseChannel === 'experimental') {
      releaseChannel.value = storedReleaseChannel;
    }
    const storedJrePath = await persistentStore.get<string>('jrePath');
    if (typeof storedJrePath === 'string') {
      jrePath.value = storedJrePath;
    }

    const storedLastJoined = await persistentStore.get<Server>('lastJoinedServer');
    if (storedLastJoined && typeof storedLastJoined === 'object') {
      lastJoinedServer.value = storedLastJoined as Server;
    }

    if (!jrePath.value) {
      const javaPath = await invoke<string | null>('find_java_path');
      if (javaPath) jrePath.value = javaPath;
    }
  }

  async function saveSettings() {
    const persistentStore = await load(SETTINGS_FILE, { autoSave: false });
    await persistentStore.set('releaseChannel', releaseChannel.value);
    await persistentStore.set('jrePath', jrePath.value);
    await persistentStore.set('lastJoinedServer', lastJoinedServer.value);
    await persistentStore.save();
  }

  async function setLastJoinedServer(server: Server | null) {
    lastJoinedServer.value = server;
    await saveSettings();
  }

  return {
    releaseChannel,
    jrePath,
    lastJoinedServer,
    loadSettings,
    saveSettings,
    setLastJoinedServer
  };
});
