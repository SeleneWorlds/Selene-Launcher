import { defineStore } from 'pinia';
import { ref } from 'vue';
import { load } from '@tauri-apps/plugin-store';

export type ReleaseChannel = 'stable' | 'experimental';

const SETTINGS_FILE = 'settings.json';

export const useSettingsStore = defineStore('settings', () => {
  const releaseChannel = ref<ReleaseChannel>('stable');
  const jrePath = ref<string>('');

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
  }

  async function saveSettings() {
    const persistentStore = await load(SETTINGS_FILE, { autoSave: false });
    await persistentStore.set('releaseChannel', releaseChannel.value);
    await persistentStore.set('jrePath', jrePath.value);
    await persistentStore.save();
  }

  return {
    releaseChannel,
    jrePath,
    loadSettings,
    saveSettings
  };
});
