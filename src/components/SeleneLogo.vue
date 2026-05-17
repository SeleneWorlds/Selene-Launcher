<script setup lang="ts">
import { launcherConfig } from "../launcherConfig";
import seleneLogoUrl from "../assets/selene.svg";
</script>

<template>
  <div class="flex items-center gap-2">
    <img :src="seleneLogoUrl" :alt="`${launcherConfig.appName} logo`" class="h-8 w-auto light:invert" />
    <span class="text-sm font-semibold uppercase tracking-[0.2em]">{{ launcherConfig.appName }}</span>
  </div>
</template>
