<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGameDownloader, DownloadStatus } from '../useGameDownloader';

const props = defineProps<{
  open: boolean;
  version: string;
}>();
const emit = defineEmits(['close']);

const {
  startDownload,
  progress: downloadProgress,
  isDownloading,
  error: downloadError,
  isComplete: downloadComplete,
  reset: resetDownloader
} = useGameDownloader();

const downloadStatus = ref("");
const downloadStatusClass = ref("");
const currentFile = ref<string | null>(null);
const currentFileIndex = ref<number>(0);
const totalFiles = ref<number>(0);

watch(() => props.open, async (val) => {
  if (val) {
    downloadStatus.value = "";
    downloadStatusClass.value = "";
    currentFile.value = null;
    currentFileIndex.value = 0;
    totalFiles.value = 0;
    resetDownloader();
    try {
      await startDownload(props.version, (status: DownloadStatus) => {
        currentFile.value = status.file;
        currentFileIndex.value = status.index;
        totalFiles.value = status.total;
        if (status.status === 'downloading') {
          downloadStatus.value = `Downloading ${status.file} (${status.index}/${status.total})...`;
          downloadStatusClass.value = "";
        } else if (status.status === 'done') {
          downloadStatus.value = `Downloaded ${status.file} (${status.index}/${status.total})`;
          downloadStatusClass.value = "text-success";
        } else if (status.status === 'error') {
          downloadStatus.value = `Error downloading ${status.file}: ${status.error}`;
          downloadStatusClass.value = "text-error";
        }
      });
      if (downloadError.value) {
        downloadStatus.value = `Download failed: ${downloadError.value}`;
        downloadStatusClass.value = "text-error";
      } else if (downloadComplete.value) {
        downloadStatus.value = `All files downloaded successfully.`;
        downloadStatusClass.value = "text-success";
      }
    } catch (e: any) {
      console.error(e);
      downloadStatus.value = `Download failed: ${e.message || e}`;
      downloadStatusClass.value = "text-error";
    }
  }
});

const progressPercent = computed(() => downloadProgress.value);

function closeModal() {
  emit('close');
}
</script>

<template>
  <UModal :open="open" title="Download Game Files" @close="closeModal">
    <template #body>
      <div class="space-y-4 p-4">
        <div v-if="currentFile">
          <div class="mb-2">{{ downloadStatus }}</div>
          <UProgress :model-value="progressPercent" class="w-full" />
          <div class="text-xs text-neutral mt-1">
            File {{ currentFileIndex }} of {{ totalFiles }}
          </div>
        </div>
        <div v-else class="text-center text-neutral">Preparing download...</div>
      </div>
    </template>
    <template #footer>
      <div v-if="downloadError" class="mt-2 text-xs text-error">
        {{ downloadError }}
      </div>
    </template>
  </UModal>
</template>
