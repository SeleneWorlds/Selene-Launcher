import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory, type RouteRecordRaw } from "vue-router";
import ui from "@nuxt/ui/vue-plugin";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

import App from "./App.vue";
import DedicatedHomeView from "./views/DedicatedHomeView.vue";
import HomeView from "./views/HomeView.vue";
import BrowseView from "./views/BrowseView.vue";
import { useAuthStore } from "./stores/auth";
import { isDedicatedLauncher, isGenericLauncher, launcherConfig } from "./launcherConfig";
import { initTauriLogging, logError, logInfo } from "./logger";
import { deepLinkAuthQuerySchema } from "./schemas";

const routes: RouteRecordRaw[] = [
  { path: "/", component: isDedicatedLauncher ? DedicatedHomeView : HomeView },
];

if (isGenericLauncher) {
  routes.push({ path: "/browse", component: BrowseView });
} else {
  routes.push({ path: "/browse", redirect: "/" });
}

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

const pinia = createPinia();

document.title = launcherConfig.windowTitle;
initTauriLogging();

createApp(App).use(ui).use(router).use(pinia).mount("#app");

onOpenUrl(async ([url]) => {
  logInfo("[Auth] Received deep link", { url });
  const parsedUrl = new URL(url);
  const path = parsedUrl.host;
  if (path === "auth") {
    logInfo("[Auth] Handling auth deep link", { path });
    const parsedAuthQuery = deepLinkAuthQuerySchema.safeParse({
      state: parsedUrl.searchParams.get("state"),
      code: parsedUrl.searchParams.get("code"),
    });
    if (parsedAuthQuery.success) {
      useAuthStore().validateAuthorizationCode(parsedAuthQuery.data.code, parsedAuthQuery.data.state);
    } else {
      logError("[Auth] Missing code or state in deep link", { url });
    }
  }
});

useAuthStore().loadState()
