<script setup lang="ts">
import { ref, onMounted } from "vue";
import FeaturedServerCard from "../components/FeaturedServerCard.vue";
import QueueModal from "../components/QueueModal.vue";


const featuredServer = ref<null | {
  name: string;
  address: string;
  description: string;
  image_url: string;
}>(null);
const localServer = ref({
  name: "Local Server",
  address: "http://localhost:8080",
  description: "Local server for testing",
  image_url: "https://dev.selene.world/favicon.svg"
});
const selectedServer = ref<null | {
  name: string;
  address: string;
  description: string;
  image_url: string;
}>(null);
const showQueueModal = ref(false);

function onJoin(server: { name: string; address: string; description: string; image_url: string }) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

onMounted(async () => {
  featuredServer.value = {
    name: "Gobaith Test Server",
    address: "https://gobaith.selene.world",
    description: "Oldschool Illarion on Gobaith",
    image_url: "https://dev.selene.world/favicon.svg"
  }
});
</script>

<template>
  <FeaturedServerCard
    v-if="featuredServer"
    :server="featuredServer"
    @join="onJoin"
  />
  <FeaturedServerCard
    v-if="localServer"
    :server="localServer"
    @join="onJoin"
  />
  <QueueModal
    v-model="showQueueModal"
    :server="selectedServer"
  />
</template>
