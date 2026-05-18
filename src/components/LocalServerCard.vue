<script setup lang="ts">
import type { JoinableServer } from '../types';

const props = defineProps<{
  server: JoinableServer;
}>();

const emit = defineEmits(['join']);

function joinQueue() {
  emit('join', props.server);
}
</script>

<template>
  <UCard class="mx-auto my-4 max-w-md">
    <div class="flex items-center gap-4 px-4 py-3">
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold truncate">{{ server.name || "Local Server" }}</h3>
      </div>
      <UButton
        size="md"
        color="neutral"
        variant="solid"
        class="font-medium"
        @click="joinQueue"
      >
        Connect
      </UButton>
    </div>
  </UCard>
</template>
