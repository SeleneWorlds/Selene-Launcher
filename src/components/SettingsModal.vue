<script setup lang="ts">
import { ref, watch, onMounted, useTemplateRef } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsStore } from "../stores/settings";
import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { countGlobalClientBundles, ensureGlobalClientBundlesDir } from '../globalBundlesUtil';

import DownloadJreModal from "./DownloadJreModal.vue";

const jreDownloadModal = useTemplateRef('jreDownloadModal');
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

const modelValue = defineModel<boolean>();
const settings = useSettingsStore();
const { releaseChannel, jrePath } = storeToRefs(settings);

const releaseChannelOptions = [
  { label: "Stable", value: "stable" },
  { label: "Experimental", value: "experimental" },
];

onMounted(async () => {
  await settings.loadSettings();
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
          <div class="flex gap-2">
            <UInput
              v-model="jrePath"
              placeholder="Path to Java directory"
              class="flex-1"
            />
            <UButton @click="pickJrePath" color="primary" variant="soft">
              Browse
            </UButton>
            <UButton v-if="!jrePath" @click="() => jreDownloadModal?.open()" color="primary" variant="soft" icon="i-lucide-download" />
          </div>
        </UFormField>

        <div class="flex items-center gap-2 mb-4">
          <UButton @click="openGlobalBundles" icon="i-lucide-folder" color="primary" variant="soft" />
          <span>{{ globalBundleCount }} global client bundles</span>
        </div>
      </div>

      <DownloadJreModal ref="jreDownloadModal" />
    </template>
  </UModal>
</template>
