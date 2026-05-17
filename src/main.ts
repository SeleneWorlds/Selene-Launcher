import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createMemoryHistory, type RouteRecordRaw } from "vue-router";
import ui from "@nuxt/ui/vue-plugin";
import { onOpenUrl } from "@tauri-apps/plugin-deep-link";

import App from "./App.vue";
import HomeView from "./views/HomeView.vue";
import BrowseView from "./views/BrowseView.vue";
import { useAuthStore } from "./stores/auth";
import { isGenericLauncher, launcherConfig } from "./launcherConfig";

const routes: RouteRecordRaw[] = [
  { path: "/", component: HomeView },
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

createApp(App).use(ui).use(router).use(pinia).mount("#app");

onOpenUrl(async ([url]) => {
  console.log(url)
  const parsedUrl = new URL(url);
  const path = parsedUrl.host;
  if (path === "auth") {
    console.log(path)
    const state = parsedUrl.searchParams.get("state");
    const code = parsedUrl.searchParams.get("code");
    if (code && state) {
      useAuthStore().validateAuthorizationCode(code, state);
    } else {
      console.error("Missing code or state")
    }
  }
});

useAuthStore().loadState()
