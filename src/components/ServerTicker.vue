<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps<{
  servers: Array<{
    name: string;
    address: string;
    description: string;
  }>;
  intervalMs?: number;
}>();

const emit = defineEmits(['join']);

const currentIndex = ref(0);
let timer: number | null = null;

function start() {
  stop();
  const ms = props.intervalMs ?? 4000;
  timer = window.setInterval(() => {
    if (!props.servers?.length) return;
    currentIndex.value = (currentIndex.value + 1) % props.servers.length;
  }, ms);
}

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function next() {
  if (!props.servers?.length) return;
  currentIndex.value = (currentIndex.value + 1) % props.servers.length;
}

function prev() {
  if (!props.servers?.length) return;
  currentIndex.value = (currentIndex.value - 1 + props.servers.length) % props.servers.length;
}

function joinCurrent() {
  const s = props.servers?.[currentIndex.value];
  if (s) emit('join', s);
}

onMounted(() => {
  if (props.servers?.length) start();
});

onBeforeUnmount(() => stop());

watch(() => props.servers?.length, (len) => {
  currentIndex.value = 0;
  if (len && len > 0) start();
  else stop();
});
</script>

<template>
  <div v-if="servers?.length" class="mx-auto my-6 max-w-xl">
    <UCard class="overflow-hidden">
      <div class="px-4 py-4" @mouseenter="stop" @mouseleave="start">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="text-xl font-semibold truncate">{{ servers[currentIndex].name }}</h3>
            <p class="text-sm text-gray-600 truncate">{{ servers[currentIndex].description }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton icon="i-lucide-chevron-left" variant="soft" color="neutral" @click="prev" />
            <UButton icon="i-lucide-chevron-right" variant="soft" color="neutral" @click="next" />
          </div>
        </div>
        <div class="mt-3">
          <UButton color="primary" @click="joinCurrent">Connect</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
