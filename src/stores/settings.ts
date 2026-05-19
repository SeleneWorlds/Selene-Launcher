import { defineStore } from 'pinia';
import { ref } from 'vue';
import { invoke } from "@tauri-apps/api/core";
import { load } from '@tauri-apps/plugin-store';
import {
  joinableServerSchema,
  releaseChannelSchema,
  type JoinableServerSchema,
  type ReleaseChannel,
} from '../schemas';

const SETTINGS_FILE = 'settings.json';

export const useSettingsStore = defineStore('settings', () => {
  const releaseChannel = ref<ReleaseChannel>('stable');
  const jrePath = ref<string>('');
  const lastJoinedServer = ref<JoinableServerSchema | null>(null);

  async function loadSettings() {
    const persistentStore = await load(SETTINGS_FILE, { autoSave: false, defaults: {} });
    const storedReleaseChannel = releaseChannelSchema.safeParse(await persistentStore.get('releaseChannel'));
    if (storedReleaseChannel.success) {
      releaseChannel.value = storedReleaseChannel.data;
    }
    const storedJrePath = await persistentStore.get('jrePath');
    if (typeof storedJrePath === 'string') {
      jrePath.value = storedJrePath;
    }

    const storedLastJoined = joinableServerSchema.safeParse(await persistentStore.get('lastJoinedServer'));
    if (storedLastJoined.success) {
      lastJoinedServer.value = storedLastJoined.data;
    }

    if (!jrePath.value) {
      const javaPath = await invoke<string | null>('find_java_path');
      if (javaPath) jrePath.value = javaPath;
    }
  }

  async function saveSettings() {
    const persistentStore = await load(SETTINGS_FILE, { autoSave: false, defaults: {} });
    await persistentStore.set('releaseChannel', releaseChannel.value);
    await persistentStore.set('jrePath', jrePath.value);
    await persistentStore.set('lastJoinedServer', lastJoinedServer.value);
    await persistentStore.save();
  }

  async function setLastJoinedServer(server: JoinableServerSchema | null) {
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
