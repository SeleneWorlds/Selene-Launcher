<script setup lang="ts">
import { ref, watch } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const props = defineProps<{
  server: {
    name: string;
    address: string;
    description: string;
    image_url: string;
  } | null;
}>();

const modelValue = defineModel<boolean>();

const queueStatus = ref<{
  status: string;
  message: string;
  token?: string;
} | null>(null);
const pollingActive = ref(false);
const errorMessage = ref<string | null>(null);

import { useBundleUpdater } from "../useBundleUpdater";
const { checkBundles, downloadBundles } = useBundleUpdater();

const bundles = ref<{
  [key: string]: {
    name: string;
    hash: string;
    variants: string[];
    allow_shared_cache?: boolean;
  };
}>();
const bundlesToUpdate = ref<
  Array<{
    id: string;
    name: string;
    hash: string;
    variants: string[];
    allow_shared_cache?: boolean;
  }>
>([]);
const bundleDownloadProgress = ref<string | null>(null);
const showBundlePrompt = ref(false);

async function attemptJoin() {
  errorMessage.value = null;
  try {
    if (!props.server) throw new Error("No server selected");
    const res = await tauriFetch(`${props.server.address}/join`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + (await auth.accessToken()),
      },
    });
    if (res.status === 401) {
      errorMessage.value = "Session expired, please log in again.";
      pollingActive.value = false;
      return;
    }
    if (!res.ok) {
      console.log("[QueueModal] Failed to join queue", {
        status: res.status,
        statusText: res.statusText,
      });
      errorMessage.value = `Failed to join queue: ${res.status} ${res.statusText}`;
      pollingActive.value = false;
      return;
    }
    queueStatus.value = await res.json();
    if (queueStatus.value) {
      if (queueStatus.value.status === "Rejected") {
        console.log("[QueueModal] Queue status: Rejected");
        pollingActive.value = false;
      } else if (
        queueStatus.value.status === "Accepted" &&
        queueStatus.value.token
      ) {
        console.log("[QueueModal] Queue status: Accepted");
        auth.updateJoinToken(queueStatus.value.token);
        pollingActive.value = false;
        console.log(
          "[QueueModal] Retrieving bundles for server",
          props.server.address
        );
        const bundleResult = (await checkBundles(props.server.address))
        bundles.value = bundleResult?.bundles ?? {};
        bundlesToUpdate.value = bundleResult?.bundlesToUpdate ?? [];
        showBundlePrompt.value = bundlesToUpdate.value.length > 0;
        if(!showBundlePrompt.value) {
          await finalizeJoin();
        }
      }
    }
  } catch (err) {
    errorMessage.value = "Network error or unexpected error.";
    pollingActive.value = false;
    console.error(err);
  }
}

async function acceptBundleDownloads() {
  if (!props.server) return;
  bundleDownloadProgress.value = null;
  showBundlePrompt.value = false;
  await downloadBundles(props.server.address, bundlesToUpdate.value, (msg) => {
    bundleDownloadProgress.value = msg;
  });
  bundlesToUpdate.value.length = 0;
  await finalizeJoin();
}

async function finalizeJoin() {
  console.log('Joining server with bundles', bundles.value);
  modelValue.value = false;
}

const { pause, resume } = useIntervalFn(attemptJoin, 3000, {
  immediate: false,
  immediateCallback: false,
});

async function close() {
  errorMessage.value = null;
  try {
    if (!props.server) throw new Error("No server selected");
    console.log("[QueueModal] Leaving queue", {
      url: `${props.server.address}/leave`,
    });
    const res = await tauriFetch(`${props.server.address}/leave`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + (await auth.accessToken()),
      },
    });
    if (res.status === 401) {
      errorMessage.value = "Session expired, please log in again.";
    } else if (!res.ok) {
      console.log(
        `[QueueModal] Failed to leave queue: ${res.status} ${res.statusText}`
      );
      console.log(`Failed to leave queue: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error(err);
    errorMessage.value = "Network error or unexpected error.";
  }
  modelValue.value = false;
}

watch(
  () => modelValue.value,
  async (visible) => {
    if (visible) {
      await attemptJoin();
      pollingActive.value = true;
    } else {
      pollingActive.value = false;
    }
  },
  { immediate: true }
);

watch(
  pollingActive,
  (active) => {
    if (active) {
      resume();
    } else {
      pause();
    }
  },
  { immediate: true }
);
</script>

<template>
  <UModal v-model:open="modelValue" title="Connection Status">
    <template #body>
      <div class="p-6">
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <div v-if="queueStatus">
          <p>{{ queueStatus.message }}</p>
        </div>
        <UButton class="mt-4" @click="close">Cancel</UButton>
      </div>
    </template>
  </UModal>

  <!-- Bundle update prompt modal -->
  <UModal v-model:open="showBundlePrompt" title="Bundle Update Required">
    <template #body>
      <div>
        <div v-if="bundlesToUpdate.length">
          <ul class="list-inside list-disc">
            <li v-for="b in bundlesToUpdate" :key="b.name">
              {{ b.name }}
            </li>
          </ul>
        </div>
        <UButton color="primary" class="mt-4" @click="acceptBundleDownloads">
          Download Bundles
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Download progress -->
  <UModal :open="!!bundleDownloadProgress" title="Downloading Bundles">
    <template #body>
      <div class="p-6">
        <p>{{ bundleDownloadProgress }}</p>
      </div>
    </template>
  </UModal>
</template>
