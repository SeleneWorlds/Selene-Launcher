<script setup lang="ts">
import { ref, computed } from "vue";
import { useJreDownloader } from "../useJreDownloader";

const visible = ref(false);
defineExpose({
  open: () => {
    startDownload();
    visible.value = true;
  },
});

const { downloadJre, progress, total, error, status } = useJreDownloader();

const downloadStatus = computed(() => {
  if (status.value === "downloading") {
    return `Downloading JRE... (${((progress.value / total.value) * 100).toFixed(0)}%)`;
  } else if (status.value === "error") {
    return `Download failed: ${error.value}`;
  } else if (status.value === "extracting") {
    return "Extracting JRE...";
  } else if (status.value === "done") {
    return "JRE downloaded successfully.";
  } else {
    return "";
  }
})

const startDownload = () => {
  downloadJre()
    .then(() => {
      visible.value = false;
    })
    .catch((e: any) => {
      error.value = e.message || e;
    });
};
</script>

<template>
  <UModal v-model:open="visible" title="Download JRE">
    <template #body>
      <div class="space-y-4 p-4">
        <div>
          <div class="mb-1">{{ downloadStatus }}</div>
          <UProgress v-if="status === 'downloading'" :model-value="progress" :max="total" class="w-full" />
          <UProgress v-if="status === 'extracting'" class="w-full" />
        </div>
      </div>
    </template>
    <template #footer>
      <div v-if="error" class="mt-2 text-xs text-error">
        {{ error }}
      </div>
    </template>
  </UModal>
</template>
