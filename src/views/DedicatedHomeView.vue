<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import QueueModal from "../components/QueueModal.vue";
import { useSettingsStore } from "../stores/settings";
import { launcherConfig } from "../launcherConfig";
import { serverStatusSchema, type JoinableServerSchema, type ServerStatusSchema } from "../schemas";

const settings = useSettingsStore();
const dedicatedServer = launcherConfig.dedicatedServer;
const dedicatedServerStatus = ref<ServerStatusSchema | null>(null);
const selectedServer = ref<JoinableServerSchema | null>(null);
const showQueueModal = ref(false);

function onJoin(server: JoinableServerSchema) {
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
    dedicatedServerStatus.value = serverStatusSchema.parse(await res.json());
  } catch {
    dedicatedServerStatus.value = null;
  }
}

const heroCopy = computed(() => {
  if (launcherConfig.dedicatedTagline) {
    return launcherConfig.dedicatedTagline;
  }

  return dedicatedServer?.description || "Launch directly into your dedicated world.";
});

const liveStatusLabel = computed(() => (dedicatedServerStatus.value ? "Online" : "Status Unavailable"));
const liveStatusClass = computed(() => (dedicatedServerStatus.value ? "is-online" : "is-offline"));

onMounted(async () => {
  await settings.loadSettings();
  await fetchDedicatedServerStatus();
});
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
    <section class="launcher-hero panel-surface overflow-hidden">
      <div class="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
        <div class="space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <span class="launcher-pill" :class="liveStatusClass">{{ liveStatusLabel }}</span>
          </div>

          <div class="space-y-4">
            <h1 class="max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl xl:text-6xl">
              {{ dedicatedServer?.name }}
            </h1>
            <p class="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              {{ heroCopy }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <UButton
              size="xl"
              color="primary"
              class="min-w-40 justify-center px-8 font-bold uppercase tracking-[0.18em]"
              @click="dedicatedServer && onJoin(dedicatedServer)"
            >
              Play Now
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <section class="xl:col-span-2">
      <div class="grid gap-4 lg:grid-cols-3">
        <article v-for="card in launcherConfig.dedicatedUpdates" :key="card.title" class="panel-surface flex min-h-48 flex-col justify-between gap-5">
          <div class="space-y-3">
            <p v-if="card.label" class="text-[10px] font-semibold uppercase tracking-[0.28em] text-[--launcher-accent-soft]">{{ card.label }}</p>
            <h3 class="text-xl font-bold tracking-[-0.03em] text-white">{{ card.title }}</h3>
            <p class="text-sm leading-6 text-white/68">{{ card.body }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>

  <QueueModal
    v-model="showQueueModal"
    :server="selectedServer"
  />
</template>
