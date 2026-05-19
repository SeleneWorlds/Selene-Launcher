<script setup lang="ts">
import { computed } from "vue";
import { launcherConfig } from "../launcherConfig";
import seleneLogoUrl from "../assets/selene.svg";

const logoUrl = computed(() => launcherConfig.dedicatedLogoUrl ?? seleneLogoUrl);
</script>

<template>
  <div class="flex items-center gap-2">
    <img :src="logoUrl" :alt="`${launcherConfig.appName} logo`" class="h-8 w-auto light:invert" />
    <span class="text-sm font-semibold uppercase tracking-[0.2em]">{{ launcherConfig.appName }}</span>
  </div>
</template>
