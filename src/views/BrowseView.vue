<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useServersStore } from '../stores/servers';
import QueueModal from '../components/QueueModal.vue';
import { Server } from '../types';
import type { TableRow } from '@nuxt/ui'

const serversStore = useServersStore();
const { servers } = storeToRefs(serversStore);

const selectedServer = ref<Server | null>(null);
const showQueueModal = ref(false);

function onJoin(server: Server) {
  selectedServer.value = server;
  showQueueModal.value = true;
}

onMounted(async () => {
  await serversStore.fetchServers();
});

const columns: any[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'currentPlayers', header: 'Players' },
];

function onSelect(row: TableRow<Server>) {
    onJoin(row.original as Server);
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4">
    <UTable :data="servers" :columns="columns" @select="onSelect">
      <template #currentPlayers-cell="{ row }">
        {{ row.original.currentPlayers ?? 0 }} / {{ row.original.maxPlayers }}
      </template>
    </UTable>

    <QueueModal v-model="showQueueModal" :server="selectedServer" />
  </div>
</template>
