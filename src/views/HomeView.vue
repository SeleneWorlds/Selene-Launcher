<script setup lang="ts">
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import FeaturedServerCard from "../components/FeaturedServerCard.vue";
import LastJoinedServerCard from "../components/LastJoinedServerCard.vue";
import LocalServerCard from "../components/LocalServerCard.vue";
import ServerTicker from "../components/ServerTicker.vue";
import QueueModal from "../components/QueueModal.vue";
import { useSettingsStore } from "../stores/settings";
import { useServersStore } from "../stores/servers";
import type { JoinableServer, Server } from '../types';
import { isDedicatedLauncher, launcherConfig } from "../launcherConfig";

const settings = useSettingsStore();
const serversStore = useServersStore();
const { lastJoinedServer } = storeToRefs(settings);
const { featured: featuredServer, servers } = storeToRefs(serversStore);
const localServer = ref<Server>({
  id: "local-server",
  name: "Local Server",
  address: "localhost",
  port: 8147,
  apiUrl: "http://localhost:8080",
  description: "Local server for testing",
  currentPlayers: 0,
  maxPlayers: 0,
});
const dedicatedServer = launcherConfig.dedicatedServer;
const selectedServer = ref<JoinableServer | null>(null);
const showQueueModal = ref(false);

function onJoin(server: Server) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

onMounted(async () => {
  await settings.loadSettings();
  if (isDedicatedLauncher) {
    return;
  }
  await Promise.allSettled([serversStore.fetchFeatured(), serversStore.fetchServers()]);
});
</script>

<template>
  <template v-if="isDedicatedLauncher">
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
                <dd class="mt-1 text-base font-medium">{{ dedicatedServer?.currentPlayers ?? 0 }} / {{ dedicatedServer?.maxPlayers ?? 0 }}</dd>
              </div>
              <div v-if="lastJoinedServer">
                <dt class="text-xs uppercase tracking-[0.2em] text-toned">Last Played</dt>
                <dd class="mt-1 text-base font-medium">{{ lastJoinedServer.name }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </UCard>
    </div>
  </template>
  <template v-else>
    <LastJoinedServerCard
      v-if="lastJoinedServer"
      :server="lastJoinedServer"
      @join="onJoin"
    />

    <FeaturedServerCard
      v-if="featuredServer"
      :server="featuredServer"
      @join="onJoin"
    />

    <ServerTicker
      v-if="servers?.length"
      :servers="servers"
      @join="onJoin"
    />

    <LocalServerCard
      v-if="localServer"
      :server="localServer"
      @join="onJoin"
    />
  </template>
  <QueueModal
    v-model="showQueueModal"
    :server="selectedServer"
  />
</template>
