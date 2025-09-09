<script setup lang="ts">
import { ref, onMounted } from "vue";
import { storeToRefs } from "pinia";
import FeaturedServerCard from "../components/FeaturedServerCard.vue";
import LastJoinedServerCard from "../components/LastJoinedServerCard.vue";
import LocalServerCard from "../components/LocalServerCard.vue";
import QueueModal from "../components/QueueModal.vue";
import { useSettingsStore } from "../stores/settings";

type Server = { name: string; address: string; description: string };

const settings = useSettingsStore();
const { lastJoinedServer } = storeToRefs(settings);

const featuredServer = ref<Server | null>(null);
const localServer = ref<Server>({
  name: "Local Server",
  address: "http://localhost:8080",
  description: "Local server for testing",
});
const selectedServer = ref<Server | null>(null);
const showQueueModal = ref(false);

function onJoin(server: Server) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

onMounted(async () => {
  await settings.loadSettings();

  try {
    const res = await fetch("https://telescope.seleneworlds.com/featured", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === "object" && data.name && data.address) {
      featuredServer.value = {
        name: String(data.name),
        address: String(data.address),
        description: String(data.description || ""),
      };
    }
  } catch (e) {
    console.error(e);
  }
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
