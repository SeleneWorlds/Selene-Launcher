import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export type ServerInfo = {
  name: string;
  address: string;
  description: string;
};

export const useServersStore = defineStore('servers', () => {
  const featured = ref<ServerInfo | null>(null);
  const servers = ref<ServerInfo[]>([]);
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
      const data = await res.json();
      if (data && data.name && data.address) {
        featured.value = {
          name: String(data.name),
          address: String(data.address),
          description: String(data.description || ''),
        };
      } else {
        featured.value = null;
      }
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
      const data = await res.json();
      if (Array.isArray(data.servers)) {
        servers.value = data.servers
          .filter((s: any) => s && s.name && s.address)
          .map((s: any) => ({
            name: String(s.name),
            address: String(s.address),
            description: String(s.description || ''),
          }));
      } else {
        servers.value = [];
      }
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
