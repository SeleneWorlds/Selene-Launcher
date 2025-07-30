<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { useTemplateRef, computed, ref } from "vue";
import { useAuthStore } from "../stores/auth";

import SeleneLogo from "./SeleneLogo.vue";
import DeviceLoginModal from "../components/DeviceLoginModal.vue";
import SettingsModal from "../components/SettingsModal.vue";

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Selene",
    to: "/",
  },
  {
    label: "Discord",
    to: "https://discord.gg/S7maQVRRa9",
  },
]);

const auth = useAuthStore();
const loginModal = useTemplateRef('loginModal');
const settingsModalOpen = ref(false);
</script>

<template>
  <UHeader>
    <template #title>
      <SeleneLogo />
    </template>

    <UNavigationMenu variant="link" :items="items" />

    <template #body>
      <UNavigationMenu :items="items" />
    </template>

    <template #right>
      <UColorModeButton />

      <UTooltip text="Settings">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-settings"
          aria-label="Settings"
          @click="settingsModalOpen = true"
        />
      </UTooltip>

      <template v-if="!auth.isSignedIn">
        <UTooltip text="Sign in">
          <UButton
            color="neutral"
            variant="ghost"
            @click="loginModal?.open()"
            icon="i-lucide-log-in"
            aria-label="Sign in"
          />
        </UTooltip>
      </template>
      <template v-else>
        <UTooltip text="Sign out">
          <UButton
            color="neutral"
            variant="ghost"
            @click="auth.signOut()"
            icon="i-lucide-log-out"
            aria-label="Sign out"
          />
        </UTooltip>
      </template>
    </template>

    <DeviceLoginModal ref="loginModal" />
    <SettingsModal v-model="settingsModalOpen" />
  </UHeader>
</template>
