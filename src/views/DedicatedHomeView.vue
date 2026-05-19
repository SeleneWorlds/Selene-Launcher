<script setup lang="ts">
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import QueueModal from "../components/QueueModal.vue";
import { useSettingsStore } from "../stores/settings";
import type { JoinableServer, ServerStatus } from "../types";
import { launcherConfig } from "../launcherConfig";

const settings = useSettingsStore();
const { lastJoinedServer } = storeToRefs(settings);
const dedicatedServer = launcherConfig.dedicatedServer;
const dedicatedServerStatus = ref<ServerStatus | null>(null);
const selectedServer = ref<JoinableServer | null>(null);
const showQueueModal = ref(false);

function onJoin(server: JoinableServer) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

async function fetchDedicatedServerStatus() {
  if (!dedicatedServer) {
    dedicatedServerStatus.value = null;
    return;
  }

  try {
    const res = await tauriFetch(dedicatedServer.apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      dedicatedServerStatus.value = null;
      return;
    }
    dedicatedServerStatus.value = await res.json() as ServerStatus;
  } catch {
    dedicatedServerStatus.value = null;
  }
}

onMounted(async () => {
  await settings.loadSettings();
  await fetchDedicatedServerStatus();
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <UCard class="overflow-hidden border border-primary/20 shadow-2xl">
      <div class="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_0.9fr] md:px-10 md:py-10">
        <div class="space-y-5">
          <div class="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
            {{ launcherConfig.appName }}
          </div>
          <div class="space-y-3">
            <h1 class="text-4xl font-black tracking-tight md:text-5xl">
              {{ dedicatedServer?.name }}
            </h1>
            <p class="max-w-2xl text-lg text-muted">
              {{ dedicatedServer?.description || "Launch directly into your server." }}
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <UButton
              size="xl"
              color="primary"
              class="px-8 font-bold"
              @click="dedicatedServer && onJoin(dedicatedServer)"
            >
              Play
            </UButton>
          </div>
        </div>

        <div class="rounded-sm border border-default bg-muted/30 p-5">
          <div class="text-sm font-semibold uppercase tracking-[0.2em] text-toned">
            Server
          </div>
          <dl class="mt-4 space-y-4">
            <div>
              <dt class="text-xs uppercase tracking-[0.2em] text-toned">Address</dt>
              <dd class="mt-1 text-base font-medium">{{ dedicatedServer?.address }}:{{ dedicatedServer?.port }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-[0.2em] text-toned">Players</dt>
              <dd class="mt-1 text-base font-medium">{{ dedicatedServerStatus?.currentPlayers ?? 0 }} / {{ dedicatedServerStatus?.maxPlayers ?? 0 }}</dd>
            </div>
            <div v-if="lastJoinedServer">
              <dt class="text-xs uppercase tracking-[0.2em] text-toned">Last Played</dt>
              <dd class="mt-1 text-base font-medium">{{ lastJoinedServer.name || lastJoinedServer.apiUrl }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </UCard>
  </div>

  <QueueModal
    v-model="showQueueModal"
    :server="selectedServer"
  />
</template>
