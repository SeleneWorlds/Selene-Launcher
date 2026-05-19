<script setup lang="ts">
import { computed, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAuthStore } from "../stores/auth";
import { launcherConfig } from "../launcherConfig";

import SeleneLogo from "../components/SeleneLogo.vue";
import SettingsModal from "../components/SettingsModal.vue";

const auth = useAuthStore();
const settingsModalOpen = ref(false);

const quickLinks = computed(() => [
  {
    label: launcherConfig.communityLabel,
    icon: "i-lucide-messages-square",
    action: () => openUrl(launcherConfig.communityUrl),
  },
  {
    label: "Settings",
    icon: "i-lucide-settings-2",
    action: () => {
      settingsModalOpen.value = true;
    },
  },
]);
</script>

<template>
  <div class="dedicated-shell min-h-screen text-[var(--launcher-foreground)]">
    <div class="dedicated-shell__backdrop" />

    <div class="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <header class="dedicated-topbar">
        <div class="flex min-w-0 items-center gap-4">
          <SeleneLogo />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            v-for="link in quickLinks"
            :key="link.label"
            color="neutral"
            variant="ghost"
            class="hidden text-white/80 hover:bg-white/10 hover:text-white md:inline-flex"
            :icon="link.icon"
            @click="link.action"
          >
            {{ link.label }}
          </UButton>

          <UButton
            v-if="!auth.isSignedIn"
            color="primary"
            class="font-semibold"
            icon="i-lucide-log-in"
            @click="auth.startSignIn()"
          >
            Sign In
          </UButton>
          <UButton
            v-else
            color="neutral"
            variant="soft"
            class="font-semibold"
            icon="i-lucide-log-out"
            @click="auth.signOut()"
          >
            Sign Out
          </UButton>
        </div>
      </header>

      <main class="flex-1 py-6 lg:py-8">
        <RouterView />
      </main>
    </div>

    <SettingsModal v-model="settingsModalOpen" />
  </div>
</template>
