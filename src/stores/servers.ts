import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Server } from '../types';


export const useServersStore = defineStore('servers', () => {
  const featured = ref<Server | null>(null);
  const servers = ref<Server[]>([]);
  const loadingFeatured = ref(false);
  const loadingServers = ref(false);
  const errorFeatured = ref<string | null>(null);
  const errorServers = ref<string | null>(null);

  async function fetchFeatured() {
    loadingFeatured.value = true;
    errorFeatured.value = null;
    try {
      const res = await tauriFetch('https://telescope.seleneworlds.com/featured', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        featured.value = null;
        return;
      }
      featured.value = await res.json() as Server;
    } catch (e: any) {
      errorFeatured.value = String(e?.message || e);
      featured.value = null;
    } finally {
      loadingFeatured.value = false;
    }
  }

  async function fetchServers() {
    loadingServers.value = true;
    errorServers.value = null;
    try {
      const res = await tauriFetch('https://telescope.seleneworlds.com/servers', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        servers.value = [];
        return;
      }
      servers.value = (await res.json()).servers as Server[];
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
