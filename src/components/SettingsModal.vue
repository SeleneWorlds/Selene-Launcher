<script setup lang="ts">
import { ref, watch, onMounted, watchEffect } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir, join } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import { useVersionStore } from "../stores/version";
import { useGameDownloader } from "../useGameDownloader";
import { countGlobalClientBundles, ensureGlobalClientBundlesDir } from '../globalBundlesUtil';

import DownloadGameModal from "./DownloadGameModal.vue";

const { isDownloaded } = useGameDownloader();
const showDownloadModal = ref(false);
const globalBundleCount = ref<number>(0);

async function refreshGlobalBundleCount() {
  globalBundleCount.value = await countGlobalClientBundles();
}

async function openGlobalBundles() {
  const dir = await ensureGlobalClientBundlesDir();
  await openPath(dir);
}

onMounted(() => {
  refreshGlobalBundleCount();
});

function openDownloadModal() {
  showDownloadModal.value = true;
}
function closeDownloadModal() {
  showDownloadModal.value = false;
}

const modelValue = defineModel<boolean>();
const settings = useSettingsStore();
const { releaseChannel, jrePath } = storeToRefs(settings);

const releaseChannelOptions = [
  { label: "Stable", value: "stable" },
  { label: "Experimental", value: "experimental" },
];

const versionStore = useVersionStore();
const { latestVersion } = storeToRefs(versionStore);

onMounted(async () => {
  await settings.loadSettings();
  await versionStore.fetchLatestVersion(releaseChannel.value);
});

watch([releaseChannel, jrePath], async () => {
  await settings.saveSettings();
});

async function pickJrePath() {
  const result = await open({
    directory: true,
    multiple: false,
    title: "Select Java Directory",
  });
  if (typeof result === "string") {
    jrePath.value = result;
  }
}

function closeModal() {
  modelValue.value = false;
}

async function openGameFiles() {
  const baseDir = await appDataDir();
  const gameDir = await join(baseDir, "game_client");
  await openPath(gameDir);
}

const isLatestVersionDownloaded = ref(false)
watchEffect(async () => {
  if (!latestVersion.value) return;
  isLatestVersionDownloaded.value = await isDownloaded(latestVersion.value);
})
</script>

<template>
  <UModal v-model:open="modelValue" title="Settings">
    <template #body>
      <div class="space-y-6 p-4">
        <UFormField label="Release Channel">
          <USelect
            v-model="releaseChannel"
            :items="releaseChannelOptions"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="JRE Path"
          help="Select the root directory of your Java installation."
        >
          <UInput
            v-model="jrePath"
            placeholder="Path to Java directory"
            class="flex-1"
          />
          <UButton @click="pickJrePath" color="primary" variant="soft"
            >Browse</UButton
          >
        </UFormField>
        <UFormField label="Client Version">
          <div class="flex items-center">
            <UInput
              :value="latestVersion"
              variant="ghost"
              readonly
              placeholder="N/A"
            />
            <UButton
              v-if="latestVersion && !isLatestVersionDownloaded"
              @click="openDownloadModal"
              color="primary"
              variant="soft"
              icon="i-lucide-download"
            />
            <UButton
              v-else
              @click="openGameFiles"
              color="primary"
              variant="soft"
              icon="i-lucide-folder"
            />
          </div>
        </UFormField>

        <div class="flex items-center gap-2 mb-4">
          <UButton @click="openGlobalBundles" icon="i-lucide-folder" color="primary" variant="soft" />
          <span>{{ globalBundleCount }} global client bundles</span>
        </div>
      </div>

      <DownloadGameModal
        v-if="latestVersion"
        :open="showDownloadModal"
        :version="latestVersion"
        @close="closeDownloadModal"
      />
    </template>
    <template #footer>
      <UButton color="primary" block @click="closeModal">Close</UButton>
    </template>
  </UModal>
</template>
