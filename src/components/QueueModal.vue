<script setup lang="ts">
import { ref, watch, useTemplateRef, onMounted } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useAuthStore } from "../stores/auth";
import { useVersionStore } from "../stores/version";
import { useSettingsStore } from "../stores/settings";
import { storeToRefs } from "pinia";
import { useGameLauncher } from "../useGameLauncher";
import { useBundleUpdater } from "../useBundleUpdater";
import { useGameDownloader } from "../useGameDownloader";
import { appDataDir, join } from "@tauri-apps/api/path";
import { hashStringSHA256 } from "../hashUtil";
import { ensureGlobalClientBundlesDir } from "../globalBundlesUtil";
import { readDir } from "@tauri-apps/plugin-fs";
import { UnauthorizedError } from "../errors";
import { logError, logInfo, logWarn } from "../logger";

import DownloadGameModal from "./DownloadGameModal.vue";
import DownloadJreModal from "./DownloadJreModal.vue";
import DeviceLoginModal from "./DeviceLoginModal.vue";
import { Server } from '../types';

const auth = useAuthStore();

function logJoinFlowError(message: string, details?: Record<string, unknown>): void {
  logError(`[QueueModal] ${message}`, {
    serverId: props.server?.id,
    serverName: props.server?.name,
    serverApiUrl: props.server?.apiUrl,
    ...details,
  });
}

async function readResponseDetails(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function shouldPromptLogin(err: UnauthorizedError): boolean {
  const step = err.context?.step;
  return step === "accessToken" || step === "refreshAccessToken" || step === "brokerAccessToken";
}

function handleError(err: unknown): void {
  if (err instanceof UnauthorizedError && shouldPromptLogin(err)) {
    errorMessage.value = "Session expired. Please log in again.";
    logJoinFlowError("Unauthorized during join flow", {
      errorMessage: err.message,
      context: err.context,
      cause: err.cause,
    });
    // Start sign in flow for session expiration
    loginModal.value?.open();
  } else if (err instanceof UnauthorizedError) {
    errorMessage.value = err.message || "Join request was rejected by the server.";
    logJoinFlowError("Join flow rejected by server", {
      errorMessage: err.message,
      context: err.context,
      cause: err.cause,
    });
  } else if (err instanceof Error) {
    errorMessage.value = err.message || "Network error or unexpected error.";
    logJoinFlowError("Join flow failed", {
      errorMessage: err.message,
      error: err,
    });
  } else {
    errorMessage.value = "Network error or unexpected error.";
    logJoinFlowError("Unexpected join flow error", {
      error: err,
    });
  }
  pollingActive.value = false;
}
const props = defineProps<{
  server: Server | null;
}>();

const modelValue = defineModel<boolean>();

const queueStatus = ref<{
  status: string;
  message: string;
  token?: string;
} | null>(null);
const pollingActive = ref(false);
const errorMessage = ref<string | null>(null);

const { checkBundles, downloadBundles } = useBundleUpdater();
const versionStore = useVersionStore();
const { latestVersion } = storeToRefs(versionStore);
const settings = useSettingsStore();
const { launchGame } = useGameLauncher();
const { isDownloaded } = useGameDownloader();

const showDownloadModal = ref(false);
const jreDownloadModal = useTemplateRef('jreDownloadModal');
const loginModal = useTemplateRef('loginModal');

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

function normalizeServerAddress(address: string): string {
  try {
    return new URL(address).hostname;
  } catch {
    return address
      .replace(/^[a-z]+:\/\//i, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");
  }
}

async function attemptJoin() {
  errorMessage.value = null;
  try {
    if (!props.server) throw new Error("No server selected");
    if (!props.server.id) throw new Error("Selected server is missing an ID");
    
    // Check session validity before attempting to connect
    try {
      await auth.accessToken();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        // Session expired, start sign in flow
        await close();
        await loginModal.value?.open();
        return;
      }
      throw err;
    }
    
    const brokerAccessToken = await auth.brokerAccessToken(props.server.id);
    const res = await tauriFetch(`${props.server.apiUrl}/join`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + brokerAccessToken,
      },
    });
    if (res.status === 401) {
      const responseBody = await readResponseDetails(res);
      logJoinFlowError("Join request returned 401", {
        status: res.status,
        statusText: res.statusText,
        responseBody,
      });
      throw new Error("Join request rejected by server");
    }
    if (!res.ok) {
      const responseBody = await readResponseDetails(res);
      logJoinFlowError("Failed to join queue", {
        status: res.status,
        statusText: res.statusText,
        responseBody,
      });
      errorMessage.value = `Failed to join queue: ${res.status} ${res.statusText}`;
      pollingActive.value = false;
      return;
    }
    queueStatus.value = await res.json();
    if (queueStatus.value) {
      if (queueStatus.value.status === "Rejected") {
        logWarn("[QueueModal] Queue status rejected", {
          serverId: props.server.id,
          queueStatus: queueStatus.value,
        });
        pollingActive.value = false;
      } else if (
        queueStatus.value.status === "Accepted" &&
        queueStatus.value.token
      ) {
        logInfo("[QueueModal] Queue status accepted", {
          serverId: props.server.id,
        });
        auth.updateJoinToken(queueStatus.value.token);
        settings.setLastJoinedServer(props.server);
        pollingActive.value = false;
        logInfo("[QueueModal] Retrieving bundles for server", {
          serverApiUrl: props.server.apiUrl,
        });
        const bundleResult = (await checkBundles(props.server.apiUrl))
        bundles.value = bundleResult?.bundles ?? {};
        bundlesToUpdate.value = bundleResult?.bundlesToUpdate ?? [];
        showBundlePrompt.value = bundlesToUpdate.value.length > 0;
        if(!showBundlePrompt.value) {
          await finalizeJoin();
        }
      }
    }
  } catch (err) {
    logJoinFlowError("Attempt join failed", {
      error: err,
    });
    handleError(err);
  }
}

async function acceptBundleDownloads() {
  if (!props.server) return;
  bundleDownloadProgress.value = null;
  showBundlePrompt.value = false;
  await downloadBundles(props.server.apiUrl, bundlesToUpdate.value, (msg) => {
    bundleDownloadProgress.value = msg;
  });
  bundlesToUpdate.value.length = 0;
  await finalizeJoin();
}

async function finalizeJoin() {
  try {
    if (!props.server) throw new Error('No server selected');
    if (!latestVersion.value) throw new Error('No game version available');

    // Ensure latest version is downloaded before launching
    let downloaded = await isDownloaded(latestVersion.value);
    if (!downloaded) {
      showDownloadModal.value = true;
      // Wait for download to complete
      while (!downloaded) {
        await new Promise(resolve => setTimeout(resolve, 500));
        downloaded = await isDownloaded(latestVersion.value);
        if (!showDownloadModal.value) {
          // Abort if the user closed the modal
          break;
        }
      }
      showDownloadModal.value = false;
      // If still not downloaded, abort
      if (!downloaded) {
        errorMessage.value = 'Unable to launch. Game client download aborted or unsuccessful.';
        return;
      }
    }

    // Ensure valid JRE before launching
    let validJava = await invoke<boolean>('is_valid_java_path', { jrePath: settings.jrePath });
    if (!validJava) {
      await new Promise((resolve) => {
        jreDownloadModal.value?.open();
        // Poll for valid java after modal opens
        const interval = setInterval(async () => {
          validJava = await invoke<boolean>('is_valid_java_path', { jrePath: settings.jrePath });
          if (validJava) {
            clearInterval(interval);
            resolve(true);
          }
        }, 500);
      });
    }

    // Build gameArgs: -h host -p port -b bundleId path (for each bundle)
    const gameArgs = ['-h', normalizeServerAddress(props.server.address), '-p', String(props.server.port), '-t', auth.joinToken];
    const serverHash = await hashStringSHA256(props.server.apiUrl);
    for (const [bundleId, bundle] of Object.entries(bundles.value || {})) {
      let bundleDir;
      if (bundle.allow_shared_cache) {
        bundleDir = await join('client_bundles', 'shared', bundle.hash);
      } else {
        bundleDir = await join('client_bundles', serverHash, bundle.hash);
      }
      const baseDir = await appDataDir();
      const bundlePath = await join(baseDir, bundleDir);
      gameArgs.push('-b', bundleId, bundlePath);
    }

    // Always include global client bundles in -b args
    const globalBundlesDir = await ensureGlobalClientBundlesDir();
    const bundleEntries = await readDir(globalBundlesDir);
    for (const entry of bundleEntries) {
      if (entry.name.startsWith('.')) continue;
      gameArgs.push('-b', entry.name, `${globalBundlesDir}/${entry.name}`);
    }

    await launchGame(latestVersion.value, { gameArgs });
    modelValue.value = false;
  } catch (err) {
    if (err instanceof Error) {
      errorMessage.value = err.message || String(err);
    } else {
      errorMessage.value = String(err);
    }
    logError("[QueueModal] Finalize join failed", {
      error: err,
    });
  }
}

const { pause, resume } = useIntervalFn(attemptJoin, 3000, {
  immediate: false,
  immediateCallback: false,
});

async function close() {
  errorMessage.value = null;
  try {
    if (!props.server) throw new Error("No server selected");
    if (!props.server.id) throw new Error("Selected server is missing an ID");
    logInfo("[QueueModal] Leaving queue", {
      url: `${props.server.apiUrl}/leave`,
    });
    const brokerAccessToken = await auth.brokerAccessToken(props.server.id);
    const res = await tauriFetch(`${props.server.apiUrl}/leave`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + brokerAccessToken,
      },
    });
    if (res.status === 401) {
      throw new UnauthorizedError();
    } else if (!res.ok) {
      logError("[QueueModal] Failed to leave queue", {
        status: res.status,
        statusText: res.statusText,
      });
    }
  } catch (err) {
    handleError(err);
  }
  modelValue.value = false;
}

onMounted(async () => {
  await versionStore.fetchLatestVersion(settings.releaseChannel);
})

watch(
  () => modelValue.value,
  async (visible) => {
    if (visible) {
      pollingActive.value = true;
      await attemptJoin();
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

  <DownloadGameModal
    v-if="latestVersion"
    v-model:open="showDownloadModal"
    :version="latestVersion"
  />
  <DownloadJreModal ref="jreDownloadModal" />
  <DeviceLoginModal ref="loginModal" />
</template>
