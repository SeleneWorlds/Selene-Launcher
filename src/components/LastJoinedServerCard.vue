<script setup lang="ts">
const props = defineProps<{
  server: {
    name: string;
    address: string;
    description: string;
  };
}>();

const emit = defineEmits(['join']);

function joinQueue() {
  emit('join', props.server);
}
</script>

<template>
  <UCard class="mx-auto my-8 max-w-2xl ring-2 ring-primary-500">
    <div class="px-6 py-6">
      <div class="mb-3 text-sm uppercase tracking-wide text-primary-600 font-semibold">
        Last Joined Server
      </div>
      <h2 class="text-3xl font-extrabold mb-2">{{ server.name }}</h2>
      <p class="mb-5 text-lg text-gray-700">{{ server.description }}</p>
      <div class="flex gap-3">
        <UButton
          size="xl"
          color="primary"
          variant="solid"
          class="font-semibold"
          @click="joinQueue"
        >
          Reconnect
        </UButton>
      </div>
    </div>
  </UCard>
</template>
