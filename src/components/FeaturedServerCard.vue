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
  <UCard class="mx-auto my-8 max-w-xl">
    <div class="text-center px-4 py-6">
      <h2 class="text-2xl font-bold mb-2">{{ server.name }}</h2>
      <p class="mb-4">{{ server.description }}</p>
      <UButton
        size="xl"
        color="primary"
        variant="solid"
        class="font-semibold"
        @click="joinQueue"
      >
        Connect
      </UButton>
    </div>
  </UCard>
</template>
