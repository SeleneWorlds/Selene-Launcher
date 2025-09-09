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
import { Server } from '../types';

const settings = useSettingsStore();
const serversStore = useServersStore();
const { lastJoinedServer } = storeToRefs(settings);
const { featured: featuredServer, servers } = storeToRefs(serversStore);
const localServer = ref<Server>({
  name: "Local Server",
  address: "http://localhost:8080",
  description: "Local server for testing",
  currentPlayers: 0,
  maxPlayers: 0,
});
const selectedServer = ref<Server | null>(null);
const showQueueModal = ref(false);

function onJoin(server: Server) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

onMounted(async () => {
  await settings.loadSettings();
  await Promise.allSettled([
    serversStore.fetchFeatured(),
    serversStore.fetchServers(),
  ]);
});
</script>

<template>
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
  <QueueModal
    v-model="showQueueModal"
    :server="selectedServer"
  />
</template>
