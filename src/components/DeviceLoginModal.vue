<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "../stores/auth";
import { writeText as copyToClipboard } from "@tauri-apps/plugin-clipboard-manager";

const visible = ref(false);
defineExpose({
  open: async () => {
    await startDeviceAuth();
    visible.value = true;
  },
  close: () => {
    closeModal()
  }
});

const loading = ref(false);
const error = ref("");
const userCode = ref("");
const polling = ref(false);
const pollError = ref("");
const verificationUriComplete = ref("");
let pollTimer: number | null = null;

const REALM_ID = "Selene";
const DEVICE_AUTH_URL = "https://id.twelveiterations.com/realms/{{realmId}}/protocol/openid-connect/auth/device";
const TOKEN_URL = "https://id.twelveiterations.com/realms/{{realmId}}/protocol/openid-connect/token";
const CLIENT_ID = "selene-launcher";
const authStore = useAuthStore();

async function startDeviceAuth() {
  loading.value = true;
  error.value = "";
  userCode.value = "";
  verificationUriComplete.value = "";
  pollError.value = "";
  try {
    const resp = await fetch(
      DEVICE_AUTH_URL.replace("{{realmId}}", REALM_ID),
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `client_id=${encodeURIComponent(CLIENT_ID)}&scope=offline_access`,
      }
    );
    if (!resp.ok) throw new Error("Failed to fetch device code");
    const data = await resp.json();
    userCode.value = data.user_code;
    verificationUriComplete.value = data.verification_uri_complete;
    pollForToken(data.device_code, data.interval || 5);
  } catch (e: any) {
    error.value = e.message || "Unknown error";
  } finally {
    loading.value = false;
  }
}

async function pollForToken(deviceCode: string, interval: number) {
  polling.value = true;
  pollError.value = "";
  async function poll() {
    try {
      const resp = await fetch(
        TOKEN_URL.replace("{{realmId}}", REALM_ID),
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=${encodeURIComponent(
            deviceCode
          )}&client_id=${encodeURIComponent(CLIENT_ID)}`,
        }
      );
      const data = await resp.json();
      if (resp.ok && data.access_token) {
        await authStore.saveDeviceAuthTokens(data);
        polling.value = false;
        visible.value = false;
        return;
      } else if (data.error === "authorization_pending") {
        pollTimer = window.setTimeout(poll, interval * 1000);
      } else {
        pollError.value =
          data.error_description || data.error || "Unknown error";
        polling.value = false;
      }
    } catch (e: any) {
      pollError.value = e.message || "Unknown error";
      polling.value = false;
      console.error(e);
    }
  }
  poll();
}

function closeModal() {
  if (pollTimer) clearTimeout(pollTimer);
  polling.value = false;
  visible.value = false;
}
</script>

<template>
  <UModal v-model:open="visible" title="Login to Selene" @close="closeModal">
    <template #body>
      <div v-if="error" class="text-center text-error">{{ error }}</div>
      <div v-else class="text-center">
        <div class="mb-3">Complete sign in on your browser</div>
        <UButton :to="verificationUriComplete">Open Browser</UButton>
        <div class="mt-4">
          <div class="mb-2 text-xs">Or copy and open this link directly</div>
          <UInput
            v-model="verificationUriComplete"
            readonly
            size="sm"
            class="w-full"
            :trailing-icon="'i-heroicons-clipboard-document'"
            @click="
                (event: any) => {
                  event.target.select();
                  copyToClipboard(verificationUriComplete);
                }
              "
          />
        </div>
        <div v-if="pollError" class="text-center text-error">{{ pollError }}</div>
      </div>
    </template>
  </UModal>
</template>
