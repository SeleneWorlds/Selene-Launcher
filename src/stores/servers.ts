import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isDedicatedLauncher, launcherConfig } from '../launcherConfig';
import {
  featuredServerSchema,
  serversResponseSchema,
  type FeaturedServerSchema,
  type ListedServerSchema,
} from '../schemas';


export const useServersStore = defineStore('servers', () => {
  const featured = ref<FeaturedServerSchema | null>(null);
  const servers = ref<ListedServerSchema[]>([]);
  const loadingFeatured = ref(false);
  const loadingServers = ref(false);
  const errorFeatured = ref<string | null>(null);
  const errorServers = ref<string | null>(null);

  async function fetchFeatured() {
    if (isDedicatedLauncher) {
      featured.value = null;
      return;
    }

    loadingFeatured.value = true;
    errorFeatured.value = null;
    try {
      const res = await tauriFetch(launcherConfig.discovery.featuredUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        featured.value = null;
        return;
      }
      featured.value = featuredServerSchema.parse(await res.json());
    } catch (e: any) {
      errorFeatured.value = String(e?.message || e);
      featured.value = null;
    } finally {
      loadingFeatured.value = false;
    }
  }

  async function fetchServers() {
    if (isDedicatedLauncher) {
      servers.value = [];
      return;
    }

    loadingServers.value = true;
    errorServers.value = null;
    try {
      const res = await tauriFetch(launcherConfig.discovery.serversUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        servers.value = [];
        return;
      }
      servers.value = serversResponseSchema.parse(await res.json()).servers;
    } catch (e: any) {
      errorServers.value = String(e?.message || e);
      servers.value = [];
    } finally {
      loadingServers.value = false;
    }
  }

  return {
    featured,
    servers,
    loadingFeatured,
    loadingServers,
    errorFeatured,
    errorServers,
    fetchFeatured,
    fetchServers,
  };
});
