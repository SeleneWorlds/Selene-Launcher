<script setup lang="ts">
import { computed } from "vue";
import DedicatedLayout from "./layouts/DedicatedLayout.vue";
import GenericLayout from "./layouts/GenericLayout.vue";
import { isDedicatedLauncher } from "./launcherConfig";

const layout = computed(() => (isDedicatedLauncher ? DedicatedLayout : GenericLayout));
</script>

<template>
  <UApp>
    <component :is="layout" />
  </UApp>
</template>
